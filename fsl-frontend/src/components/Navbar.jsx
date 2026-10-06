import { Link, useLocation } from 'react-router-dom';
import { Settings, Hand } from 'lucide-react';

// ============================================================================
// TOP NAVIGATION BAR (Navbar.jsx)
// This is the header bar at the very top of your website.
// ============================================================================
export default function Navbar() {
  // Checks which page the user is currently looking at (e.g., '/admin', '/translate')
  const location = useLocation();

  // --------------------------------------------------------------------------
  // 👉 EDIT HERE: Default Status Text & Colors (when on the Home Menu '/')
  // --------------------------------------------------------------------------
  let statusText = "Workspace Idle";      // Change text inside quotes to rename status
  let statusColor = "text-stone-500";     // Text color (Tailwind CSS class)
  let dotColor = "bg-stone-300";          // Little circle dot color

  // --------------------------------------------------------------------------
  // 👉 EDIT HERE: Status Text & Colors when inside the Admin Page ('/admin')
  // --------------------------------------------------------------------------
  if (location.pathname === '/admin') {
    statusText = "Secure Portal";         // Text shown when in Admin page
    statusColor = "text-amber-600";       // Orange/Amber text color
    dotColor = "bg-amber-400";            // Orange/Amber dot color
  } 
  // --------------------------------------------------------------------------
  // 👉 EDIT HERE: Status Text & Colors when using Camera or Mic ('/translate' or '/speech')
  // --------------------------------------------------------------------------
  else if (location.pathname === '/translate' || location.pathname === '/speech') {
    statusText = "Translating Live";      // Text shown when translating
    statusColor = "text-emerald-600";     // Green text color
    dotColor = "bg-emerald-400";          // Green dot color
  }

  return (
    // 👉 EDIT HERE: Change bg-[#FAF8F5] to change the background color of the whole top bar
    <nav className="w-full bg-[#FAF8F5] h-[80px] flex items-center justify-between px-8 border-b-4 border-white shadow-sm z-10 relative">
      
      {/* ================= LEFT SIDE: LOGO & WEBSITE TITLE ================= */}
      <div className="flex items-center gap-4">
        
        {/* 👉 EDIT HERE: Green Hand Icon Box. Change 'bg-emerald-600' to change the icon box color */}
        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md rotate-3">
          <Hand size={28} strokeWidth={2.5} />
        </div>

        {/* 👉 EDIT HERE: Website Main Title & Small Subtitle */}
        <div>
          <h1 className="text-stone-800 font-black text-2xl tracking-tight leading-tight">
            FSL Translator
          </h1>
          <p className="text-stone-500 text-[10px] font-black tracking-[0.2em] uppercase">
            Sign Language Digitized
          </p>
        </div>
      </div>

      {/* ================= RIGHT SIDE: STATUS PILL & ADMIN BUTTON ================= */}
      <div className="flex items-center gap-6">
        
        {/* Status Box (Shows "Workspace Idle", "Translating Live", etc.) */}
        <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-full shadow-sm border-2 border-stone-100">
          <div className="text-right hidden md:block">
            {/* 👉 EDIT HERE: Small label above the status text */}
            <p className="text-stone-400 text-[10px] font-black tracking-widest uppercase">
              System Status
            </p>
            <p className={`${statusColor} font-black text-sm tracking-wide`}>
              {statusText}
            </p>
          </div>

          {/* Blinking circle dot (Only blinks when NOT on the home page '/') */}
          <div className="relative flex h-3 w-3">
            {location.pathname !== '/' && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`}></span>
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${dotColor}`}></span>
          </div>
        </div>

        {/* 👉 EDIT HERE: "ADMIN" Button. 
            - Change to="/admin" if you rename the admin URL route.
            - Change 'bg-emerald-200' to change the button background color.
            - Change <span>ADMIN</span> to rename the button text. */}
        <Link to="/admin" className="text-emerald-900 font-black text-sm flex items-center gap-2 bg-emerald-200 px-6 py-3 rounded-full hover:bg-emerald-300 transition-colors shadow-sm">
          <Settings size={18} strokeWidth={2.5} />
          <span>ADMIN</span>
        </Link>

      </div>
    </nav>
  );
}