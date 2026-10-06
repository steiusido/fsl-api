import { Link } from 'react-router-dom';
import { Video, Mic } from 'lucide-react';

export default function MainMenu() {
  return (
    <div className="flex flex-col items-center flex-1 w-full mt-12 px-6">
      <div className="w-full max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="text-stone-800 text-5xl font-black tracking-tight mb-3">What would you like to do?</h2>
          <p className="text-stone-500 font-medium">Select a translation module below to get started.</p>
        </div>

        <div className="bg-[#FAF8F5] w-full rounded-[3.5rem] shadow-[0_20px_40px_rgba(168,162,158,0.2)] border-8 border-white flex flex-col items-center justify-center p-12 gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            
            <Link to="/translate" className="bg-white border-4 border-white p-10 w-full rounded-[2.5rem] shadow-[0_10px_25px_rgba(168,162,158,0.15)] hover:-translate-y-2 hover:shadow-[0_20px_35px_rgba(168,162,158,0.25)] transition-all duration-300 group cursor-pointer flex flex-col items-center text-center">
              <div className="text-emerald-700 mb-6 bg-emerald-100 w-20 h-20 flex items-center justify-center rounded-full group-hover:rotate-12 transition-transform shadow-inner">
                <Video size={36} strokeWidth={2.5} />
              </div>
              <h3 className="text-stone-800 font-black text-2xl mb-3 tracking-tight">Handsign to Text</h3>
              <p className="text-stone-500 text-sm mb-8 font-medium leading-relaxed">Use your camera to translate FSL to text in real-time.</p>
              <div className="mt-auto bg-emerald-200 text-emerald-900 text-sm font-black tracking-wide px-8 py-4 rounded-full group-hover:bg-emerald-300 transition-colors w-full shadow-sm">
                Open Module
              </div>
            </Link>

            <Link to="/speech" className="bg-white border-4 border-white p-10 w-full rounded-[2.5rem] shadow-[0_10px_25px_rgba(168,162,158,0.15)] hover:-translate-y-2 hover:shadow-[0_20px_35px_rgba(168,162,158,0.25)] transition-all duration-300 group cursor-pointer flex flex-col items-center text-center">
              <div className="text-amber-700 mb-6 bg-amber-100 w-20 h-20 flex items-center justify-center rounded-full group-hover:-rotate-12 transition-transform shadow-inner">
                <Mic size={36} strokeWidth={2.5} />
              </div>
              <h3 className="text-stone-800 font-black text-2xl mb-3 tracking-tight">Speech to Handsign</h3>
              <p className="text-stone-500 text-sm mb-8 font-medium leading-relaxed">Convert spoken words into animated sign language.</p>
              <div className="mt-auto bg-amber-200 text-amber-900 text-sm font-black tracking-wide px-8 py-4 rounded-full group-hover:bg-amber-300 transition-colors w-full shadow-sm">
                Open Module
              </div>
            </Link>

          </div>
        </div>
      </div>
    </div>
  );
}