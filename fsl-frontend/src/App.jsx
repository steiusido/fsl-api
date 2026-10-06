import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Import our newly created components
import Navbar from './components/Navbar';
import MainMenu from './pages/MainMenu';
import TranslateModule from './pages/TranslateModule';
import AdminDashboard from './pages/AdminDashboard';
import SpeechToHandsign from './pages/SpeechToHandsign'; 

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#e8e4db] font-sans flex flex-col pb-12">
        <Navbar />
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/translate" element={<TranslateModule />} />
          <Route path="/speech" element={<SpeechToHandsign />} />
        </Routes>
      </div>
    </Router>
  );
}