import { Link, useLocation } from 'react-router-dom';
import { Settings, Hand } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  let statusText = "Workspace Idle";
  let statusColor = "text-stone-500";
  let dotColor = "bg-stone-300";

  if (location.pathname === '/admin') {
    statusText = "Secure Portal";
    statusColor = "text-amber-600";
    dotColor = "bg-amber-400";
  } else if (location.pathname === '/translate' || location.pathname === '/speech') {
    statusText = "Translating Live";
    statusColor = "text-emerald-600";
    dotColor = "bg-emerald-400";
  }

  return (
    <nav className="w-full bg-[#FAF8F5] h-[80px] flex items-center justify-between px-8 border-b-4 border-white shadow-sm z-10 relative">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md rotate-3">
          <Hand size={28} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-stone-800 font-black text-2xl tracking-tight leading-tight">FSL Translator</h1>
          <p className="text-stone-500 text-[10px] font-black tracking-[0.2em] uppercase">Sign Language Digitized</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-full shadow-sm border-2 border-stone-100">
          <div className="text-right hidden md:block">
            <p className="text-stone-400 text-[10px] font-black tracking-widest uppercase">System Status</p>
            <p className={`${statusColor} font-black text-sm tracking-wide`}>{statusText}</p>
          </div>
          <div className="relative flex h-3 w-3">
            {location.pathname !== '/' && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`}></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${dotColor}`}></span>
          </div>
        </div>

        <Link to="/admin" className="text-emerald-900 font-black text-sm flex items-center gap-2 bg-emerald-200 px-6 py-3 rounded-full hover:bg-emerald-300 transition-colors shadow-sm">
          <Settings size={18} strokeWidth={2.5} />
          <span>ADMIN</span>
        </Link>
      </div>
    </nav>
  );
}