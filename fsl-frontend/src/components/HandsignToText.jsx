import { useRef, useState, useEffect } from 'react';

export default function HandsignToText({ onTelemetryUpdate, onPredictionUpdate }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [prediction, setPrediction] = useState("");
  const [translationMode, setTranslationMode] = useState('static'); // 'static' or 'dynamic'
  
  const frameBuffer = useRef([]);
  const isPredicting = useRef(false);

  // We use a ref for the mode so the interval inside useEffect always sees the latest state
  const currentMode = useRef('static');
  useEffect(() => {
    currentMode.current = translationMode;
    // Clear buffer and prediction when switching modes
    frameBuffer.current = [];
    setPrediction("");
    if (onPredictionUpdate) onPredictionUpdate("");
  }, [translationMode, onPredictionUpdate]);

  useEffect(() => {
    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2, 
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const canvasCtx = canvas.getContext("2d");
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      let combinedCoordinates = new Array(126).fill(0);
      let detectedHandLabel = "Waiting...";
      let highestScore = 0;

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        let handTypes = [];
        
        results.multiHandLandmarks.forEach((landmarks, index) => {
          if (window.drawConnectors && window.drawLandmarks) {
            window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: "#10b981", lineWidth: 3 });
            window.drawLandmarks(canvasCtx, landmarks, { color: "#047857", lineWidth: 2 });
          }

          const rawHand = results.multiHandedness[index]?.label || "Right";
          const actualHand = rawHand === "Left" ? "Right" : "Left";
          handTypes.push(actualHand);
          
          const score = results.multiHandedness[index]?.score || 0;
          if (score > highestScore) highestScore = score;
          
          const wrist = landmarks[0]; 
          const handCoords = [];

          landmarks.forEach(lm => {
            handCoords.push(lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z);
          });

          if (actualHand === "Left") {
            combinedCoordinates.splice(0, 63, ...handCoords);
          } else {
            combinedCoordinates.splice(63, 63, ...handCoords);
          }
        });

        if (handTypes.length === 2) {
          detectedHandLabel = "Both Hands";
        } else {
          detectedHandLabel = handTypes[0];
        }

        const confidenceScore = Math.round(highestScore * 100);
        if (onTelemetryUpdate) onTelemetryUpdate({ hand: detectedHandLabel, confidence: confidenceScore });

        // Maintain 30-frame rolling buffer (only really needed for dynamic, but good to keep synced)
        frameBuffer.current.push(combinedCoordinates);
        if (frameBuffer.current.length > 30) frameBuffer.current.shift();

        // NON-BLOCKING API FETCH LOCK
        if (!isPredicting.current) {
          isPredicting.current = true;

          const runPrediction = async () => {
            try {
              let currentDetected = "";

              if (currentMode.current === 'static') {
                // STRICTLY STATIC MODE
                const staticRes = await fetch("http://127.0.0.1:8000/api/predict-static", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ coordinates: combinedCoordinates }),
                });

                if (staticRes.ok) {
                  const staticData = await staticRes.json();
                  if (staticData.prediction) currentDetected = staticData.prediction;
                }

              } else if (currentMode.current === 'dynamic') {
                // STRICTLY DYNAMIC MODE
                if (frameBuffer.current.length === 30) {
                  const dynamicRes = await fetch("http://127.0.0.1:8000/api/predict-dynamic", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sequence: frameBuffer.current }),
                  });

                  if (dynamicRes.ok) {
                    const dynamicData = await dynamicRes.json();
                    if (dynamicData.prediction && dynamicData.confidence > 65) {
                      currentDetected = dynamicData.prediction;
                    }
                  }
                } else {
                  currentDetected = "Tracking motion...";
                }
              }

              if (currentDetected) {
                setPrediction(currentDetected);
                if (onPredictionUpdate) onPredictionUpdate(currentDetected);
              }
            } catch (error) {
              // Fail silently if models aren't ready yet
            } finally {
              isPredicting.current = false; 
            }
          };

          runPrediction();
        }
      } else {
        setPrediction("");
        if (onPredictionUpdate) onPredictionUpdate("");
        frameBuffer.current = []; 
        if (onTelemetryUpdate) onTelemetryUpdate({ hand: "Waiting...", confidence: 0 });
      }
      canvasCtx.restore();
    });

    let camera;
    if (videoRef.current) {
      camera = new window.Camera(videoRef.current, {
        onFrame: async () => { 
          if (videoRef.current) await hands.send({ image: videoRef.current }); 
        },
        width: 1280, 
        height: 720,
      });
      camera.start();
    }

    return () => { 
      if (camera) camera.stop(); 
      hands.close(); 
    };
  }, [onTelemetryUpdate, onPredictionUpdate]);

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-video bg-stone-900 rounded-[2.2rem] overflow-hidden shadow-inner flex flex-col items-center justify-center">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100" autoPlay playsInline></video>
      <canvas ref={canvasRef} width="1280" height="720" className="absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none z-10"></canvas>

      {/* Prediction Output */}
      <div className="absolute top-4 left-4 bg-stone-900/85 backdrop-blur-md px-4 py-2 rounded-full border border-stone-700 z-20 flex items-center gap-2 shadow-lg">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="text-white text-xs font-bold tracking-wide uppercase">
          {prediction ? prediction : "Detecting..."}
        </span>
      </div>

      {/* Translation Mode Toggle UI */}
      <div className="absolute bottom-6 z-20 flex bg-stone-900/80 backdrop-blur-md rounded-full p-1.5 shadow-xl border border-stone-700">
        <button 
          onClick={() => setTranslationMode('static')} 
          className={`px-6 py-2.5 rounded-full text-[11px] font-black tracking-widest transition-all ${translationMode === 'static' ? 'bg-emerald-500 text-white shadow-md' : 'text-stone-400 hover:text-white'}`}
        >
          STATIC (LETTERS)
        </button>
        <button 
          onClick={() => setTranslationMode('dynamic')} 
          className={`px-6 py-2.5 rounded-full text-[11px] font-black tracking-widest transition-all ${translationMode === 'dynamic' ? 'bg-indigo-500 text-white shadow-md' : 'text-stone-400 hover:text-white'}`}
        >
          DYNAMIC (PHRASES)
        </button>
      </div>
    </div>
  );
}