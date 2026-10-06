from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import csv
import os
import pickle
import numpy as np
import pandas as pd

# Machine Learning Imports
from sklearn.ensemble import RandomForestClassifier
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout

app = FastAPI(
    title="FSL Translator API",
    description="Backend API for the FSL Translator capstone project (Static & Dynamic)."
)

# Enable CORS so your React frontend can talk to it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- GLOBAL VARIABLES & FILE PATHS ---
STATIC_MODEL_PATH = "fsl_model.pkl"
STATIC_CSV_PATH = "fsl_dataset.csv"

DYNAMIC_MODEL_PATH = "fsl_dynamic_model.keras"
DYNAMIC_DATASET_PATH = "fsl_dynamic_dataset.pkl"
DYNAMIC_LABELS_PATH = "fsl_labels.pkl"

static_model = None
dynamic_model = None
dynamic_labels_map = {}

# --- STARTUP LOADERS ---
def load_static_model():
    global static_model
    if os.path.exists(STATIC_MODEL_PATH):
        with open(STATIC_MODEL_PATH, "rb") as f:
            static_model = pickle.load(f)
        print("Static Model loaded successfully.")

def load_dynamic_models():
    global dynamic_model, dynamic_labels_map
    if os.path.exists(DYNAMIC_MODEL_PATH):
        dynamic_model = load_model(DYNAMIC_MODEL_PATH)
        print("Dynamic LSTM Model loaded successfully.")
    if os.path.exists(DYNAMIC_LABELS_PATH):
        with open(DYNAMIC_LABELS_PATH, "rb") as f:
            dynamic_labels_map = pickle.load(f)
        print("Dynamic Labels mapped.")

load_static_model()
load_dynamic_models()


# --- PYDANTIC SCHEMAS ---

# Static (1-Frame) Schemas
class StaticSample(BaseModel):
    label: str
    coordinates: List[float]  # Expects 126 coordinates

class StaticTrainingPayload(BaseModel):
    dataset: List[StaticSample]

class StaticPredictionPayload(BaseModel):
    coordinates: List[float]  # Expects 126 coordinates

# Dynamic (30-Frame Sequence) Schemas
class DynamicSample(BaseModel):
    label: str
    sequence: List[List[float]] # Expects 30 frames, each with 126 coordinates

class DynamicTrainingPayload(BaseModel):
    dataset: List[DynamicSample]

class DynamicPredictionPayload(BaseModel):
    sequence: List[List[float]] 


# ==========================================
#        STATIC ENDPOINTS (RANDOM FOREST)
# ==========================================

@app.post("/api/train")
def train_static(payload: StaticTrainingPayload):
    global static_model
    if not payload.dataset:
        raise HTTPException(status_code=400, detail="Dataset is empty.")

    file_exists = os.path.isfile(STATIC_CSV_PATH)
    
    # 1. Append new data to CSV
    with open(STATIC_CSV_PATH, mode='a', newline='') as f:
        writer = csv.writer(f)
        if not file_exists:
            # Header generation for 126 columns
            header = ['label'] + [f'coord_{i}' for i in range(126)]
            writer.writerow(header)
        
        for sample in payload.dataset:
            row = [sample.label] + sample.coordinates
            writer.writerow(row)

    # 2. Read entire dataset from CSV
    df = pd.read_csv(STATIC_CSV_PATH)
    X = df.iloc[:, 1:].values
    y = df.iloc[:, 0].values

    # 3. Train Random Forest Model
    static_model = RandomForestClassifier(n_estimators=100, random_state=42)
    static_model.fit(X, y)

    # 4. Save Model
    with open(STATIC_MODEL_PATH, "wb") as f:
        pickle.dump(static_model, f)

    return {"message": "Static model trained successfully!", "total_samples": len(df)}


@app.post("/api/predict-static")
def predict_static(payload: StaticPredictionPayload):
    global static_model
    if static_model is None:
        raise HTTPException(status_code=500, detail="Static model not trained yet.")
    
    if len(payload.coordinates) != 126:
        raise HTTPException(status_code=400, detail=f"Expected 126 coordinates, got {len(payload.coordinates)}")

    try:
        prediction = static_model.predict([payload.coordinates])
        return {"prediction": str(prediction[0])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
#        DYNAMIC ENDPOINTS (LSTM)
# ==========================================

@app.post("/api/train-dynamic")
def train_dynamic(payload: DynamicTrainingPayload):
    global dynamic_model, dynamic_labels_map
    if not payload.dataset:
        raise HTTPException(status_code=400, detail="Dataset is empty.")

    try:
        # 1. Load existing database so we don't overwrite old data
        master_dataset = []
        if os.path.exists(DYNAMIC_DATASET_PATH):
            with open(DYNAMIC_DATASET_PATH, "rb") as f:
                master_dataset = pickle.load(f)

        # 2. Add the new captures to the pile
        for sample in payload.dataset:
            master_dataset.append({
                "label": sample.label,
                "sequence": sample.sequence
            })

        # 3. Save the combined pile back to the hard drive
        with open(DYNAMIC_DATASET_PATH, "wb") as f:
            pickle.dump(master_dataset, f)

        # 4. Format data for the Neural Network
        X = []
        y_raw = []
        for data in master_dataset:
            X.append(data["sequence"])
            y_raw.append(data["label"])

        X = np.array(X)
        
        # Convert String labels to Integer IDs
        unique_labels = sorted(list(set(y_raw)))
        label_to_id = {label: i for i, label in enumerate(unique_labels)}
        y = np.array([label_to_id[label] for label in y_raw])
        
        # Save Label Map
        with open(DYNAMIC_LABELS_PATH, "wb") as f:
            pickle.dump(label_to_id, f)

        # 5. Build and train LSTM Architecture
        model = Sequential([
            LSTM(64, return_sequences=True, input_shape=(X.shape[1], X.shape[2])),
            Dropout(0.2),
            LSTM(32),
            Dropout(0.2),
            Dense(32, activation='relu'),
            Dense(len(unique_labels), activation='softmax')
        ])

        model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        model.fit(X, y, epochs=30, batch_size=8, verbose=1)
        
        # Save keras model and hot-reload it
        model.save(DYNAMIC_MODEL_PATH)
        load_dynamic_models()

        return {
            "message": "Dynamic Model trained successfully!", 
            "classes": unique_labels,
            "total_samples": len(master_dataset)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/predict-dynamic")
def predict_dynamic(payload: DynamicPredictionPayload):
    global dynamic_model, dynamic_labels_map
    if dynamic_model is None or not dynamic_labels_map:
        raise HTTPException(status_code=500, detail="Dynamic model not trained yet.")

    try:
        # Prevent Keras from printing to terminal constantly with verbose=0
        input_data = np.array([payload.sequence]) 
        prediction = dynamic_model.predict(input_data, verbose=0)
        
        predicted_class_id = np.argmax(prediction[0])
        confidence = float(np.max(prediction[0]))

        # Translate ID back to string
        id_to_label = {i: label for label, i in dynamic_labels_map.items()}

        return {
            "prediction": id_to_label.get(predicted_class_id, "Unknown"),
            "confidence": round(confidence * 100, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))