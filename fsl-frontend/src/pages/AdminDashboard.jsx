import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Repeat, Hand } from 'lucide-react';

export default function AdminDashboard() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [captureMode, setCaptureMode] = useState('static'); 
  const [customLabel, setCustomLabel] = useState('');
  
  const [staticDataset, setStaticDataset] = useState([]);
  const [dynamicDataset, setDynamicDataset] = useState([]);
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState(null);

  const recordingState = useRef({
    isRecording: false,
    mode: 'static',
    label: '',
    count: 0,
    tempDataset: []
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsUnlocked(true); setError(false);
    } else {
      setError(true); setPassword('');
    }
  };

  useEffect(() => {
    if (!isUnlocked) return;

    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2, // 2 Hands Enabled
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const canvasCtx = canvas.getContext("2d");
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      // The 126-Coordinate Padding Array
      let combinedCoordinates = new Array(126).fill(0);
      const hasHands = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

      if (hasHands) {
        results.multiHandLandmarks.forEach((landmarks, index) => {
          window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: "#10b981", lineWidth: 3 });
          window.drawLandmarks(canvasCtx, landmarks, { color: "#047857", lineWidth: 2 });

          const rawHand = results.multiHandedness[index].label; 
          const actualHand = rawHand === "Left" ? "Right" : "Left";
          const wrist = landmarks[0];
          const handCoords = [];

          landmarks.forEach(lm => {
            handCoords.push(lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z);
          });

          // Left hand: 0-62 | Right hand: 63-125
          if (actualHand === "Left") {
            combinedCoordinates.splice(0, 63, ...handCoords);
          } else {
            combinedCoordinates.splice(63, 63, ...handCoords);
          }
        });
      }

      if (recordingState.current.isRecording) {
        const mode = recordingState.current.mode;

        if (mode === 'static' && hasHands) { 
          recordingState.current.tempDataset.push({
            label: recordingState.current.label,
            coordinates: combinedCoordinates
          });
          recordingState.current.count += 1;
          setCaptureProgress(recordingState.current.count);

          if (recordingState.current.count >= 200) {
            recordingState.current.isRecording = false;
            const capturedFrames = [...recordingState.current.tempDataset];
            setStaticDataset(prev => [...prev, ...capturedFrames]);
            recordingState.current.tempDataset = [];
            setIsCapturing(false);
            setCaptureProgress(0);
          }
        }

        if (mode === 'dynamic') {
          recordingState.current.tempDataset.push(combinedCoordinates);
          recordingState.current.count += 1;
          setCaptureProgress(recordingState.current.count);

          if (recordingState.current.count >= 30) {
            recordingState.current.isRecording = false;
            const capturedSequence = [...recordingState.current.tempDataset];
            setDynamicDataset(prev => [...prev, {
              label: recordingState.current.label,
              sequence: capturedSequence
            }]);
            recordingState.current.tempDataset = [];
            setIsCapturing(false);
            setCaptureProgress(0);
          }
        }
      }
      canvasCtx.restore();
    });

    let camera;
    if (videoRef.current) {
      camera = new window.Camera(videoRef.current, {
        onFrame: async () => { if (videoRef.current) await hands.send({ image: videoRef.current }); },
        width: 1280, height: 720,
      });
      camera.start();
    }

    return () => { if (camera) camera.stop(); hands.close(); };
  }, [isUnlocked]);

  const handleCapture = () => {
    if (!customLabel.trim()) { alert("Please enter a label first."); return; }
    recordingState.current = {
      isRecording: true, mode: captureMode, label: customLabel.trim().toUpperCase(), count: 0, tempDataset: []
    };
    setIsCapturing(true); setCaptureProgress(0);
  };

  const submitData = async () => {
    const isStatic = captureMode === 'static';
    const dataset = isStatic ? staticDataset : dynamicDataset;
    const endpoint = isStatic ? "/api/train" : "/api/train-dynamic";
    
    if (dataset.length === 0) return;
    setIsTraining(true); setTrainingResult(null);

    try {
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataset })
      });
      if (response.ok) {
        setTrainingResult(`Success! Model trained.`);
        if (isStatic) setStaticDataset([]); else setDynamicDataset([]);
        setCustomLabel(''); 
      } else {
        alert("Training failed.");
      }
    } catch (error) { console.error(error); } finally { setIsTraining(false); }
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full px-6 mt-12">
        <div className="bg-[#FAF8F5] w-full max-w-md rounded-[3.5rem] shadow-md border-8 border-white p-10 text-center">
          <Lock size={36} strokeWidth={2.5} className="text-stone-400 mx-auto mb-6" />
          <h2 className="text-stone-800 text-3xl font-black mb-2">Restricted</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-8">
            <input type="password" placeholder="Passcode" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white border-4 border-stone-100 px-6 py-4 rounded-full text-center font-black outline-none" />
            <button type="submit" className="bg-stone-800 text-white font-black px-8 py-4 rounded-full w-full">Unlock</button>
          </form>
          <Link to="/" className="inline-block mt-6 text-xs font-black text-stone-400 uppercase hover:text-stone-600 transition-colors">
            ← Back to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center flex-1 w-full mt-6 px-6 max-w-7xl mx-auto mb-12">
      <div className="flex w-full justify-between items-center mb-6">
        <div>
          <h2 className="text-stone-800 text-3xl font-black tracking-tight">Data Collection Studio</h2>
        </div>
        <Link to="/" className="bg-white border-2 border-stone-200 text-stone-700 hover:text-stone-900 font-black tracking-widest uppercase text-xs px-6 py-3 rounded-full transition-colors shadow-sm">
        ← Back to Workspace
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        <div className="lg:col-span-8">
          <div className="w-full bg-[#FAF8F5] p-6 rounded-[3rem] border-8 border-white flex justify-center relative shadow-sm">
            <div className="absolute top-10 left-10 z-20 flex bg-white rounded-full p-1 shadow-lg border-2 border-stone-100">
              <button onClick={() => setCaptureMode('static')} disabled={isCapturing} className={`px-6 py-2.5 rounded-full text-xs font-black tracking-wide transition-all ${captureMode === 'static' ? 'bg-emerald-500 text-white shadow-md' : 'text-stone-400 hover:bg-stone-100'}`}>STATIC (1 FRAME)</button>
              <button onClick={() => setCaptureMode('dynamic')} disabled={isCapturing} className={`px-6 py-2.5 rounded-full text-xs font-black tracking-wide transition-all ${captureMode === 'dynamic' ? 'bg-indigo-500 text-white shadow-md' : 'text-stone-400 hover:bg-stone-100'}`}>DYNAMIC (30 FRAMES)</button>
            </div>
            <div className="relative w-full aspect-[4/3] md:aspect-video bg-stone-900 rounded-[2.2rem] overflow-hidden shadow-inner">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100" autoPlay playsInline></video>
              <canvas ref={canvasRef} width="1280" height="720" className="absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none z-10"></canvas>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#FAF8F5] p-8 rounded-[2.5rem] border-4 border-white flex flex-col gap-6 shadow-sm">
            <div>
              <h3 className="text-stone-800 font-black text-lg tracking-tight flex items-center gap-2">
                {captureMode === 'static' ? <Hand size={20} className="text-emerald-500"/> : <Repeat size={20} className="text-indigo-500"/>}
                {captureMode === 'static' ? 'Static Capture' : 'Dynamic Sequence'}
              </h3>
            </div>
            <input type="text" placeholder={captureMode === 'static' ? "Label (e.g., A, B)" : "Phrase (e.g., MAHAL KITA)"} value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} disabled={isCapturing} className="w-full bg-white border-2 border-stone-100 focus:border-emerald-300 px-5 py-4 rounded-2xl font-black uppercase text-center" />
            <button onClick={handleCapture} disabled={isCapturing} className={`w-full border-2 font-black py-4 rounded-2xl transition-all flex flex-col items-center justify-center overflow-hidden relative ${isCapturing ? 'bg-stone-100 text-stone-800' : 'bg-white hover:border-emerald-300 text-stone-700'}`}>
              {isCapturing && <div className={`absolute left-0 top-0 bottom-0 transition-all duration-75 ${captureMode === 'static' ? 'bg-emerald-200' : 'bg-indigo-200'}`} style={{ width: `${(captureProgress / (captureMode === 'static' ? 200 : 30)) * 100}%` }}></div>}
              <span className="relative z-10">{isCapturing ? `Capturing... (${captureProgress}/${captureMode === 'static' ? '200' : '30'})` : `Start Recording`}</span>
            </button>
            <div className="bg-white p-4 rounded-2xl border-2 border-stone-100 flex justify-between items-center shadow-inner">
              <span className="text-stone-500 text-xs font-black">Ready to Train</span>
              <span className={`font-black text-lg ${captureMode === 'static' ? 'text-emerald-700' : 'text-indigo-700'}`}>{captureMode === 'static' ? staticDataset.length : dynamicDataset.length}</span>
            </div>
            <button onClick={submitData} disabled={isTraining || (captureMode === 'static' ? staticDataset.length === 0 : dynamicDataset.length === 0)} className={`w-full font-black tracking-wide px-8 py-4 rounded-full transition-colors text-white ${isTraining ? 'bg-stone-300' : (captureMode === 'static' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700')}`}>
              {isTraining ? 'Training...' : 'Train & Deploy'}
            </button>
            {trainingResult && <div className="bg-stone-100 p-3 rounded-xl text-xs font-bold text-center">{trainingResult}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}