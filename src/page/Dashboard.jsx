import React, { useEffect, useState } from "react";
import { 
  User, 
  CalendarCheck, 
  Users, 
  ClipboardList, 
  Trophy, 
  Newspaper, 
  Bell,
  LogOut,
  IndianRupee,
  FileText,
  ClipboardCheck,
  MapPin
} from "lucide-react";
import { doc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase"; 
import { useNavigate } from "react-router-dom";

/* ---------- TIME CHECKER HELPER ---------- */
// Ye function check karta hai ki notice 24 ghante ke andar ka hai ya nahi
const isWithinTime = (firebaseTimestamp, hours) => {
  if (!firebaseTimestamp) return false;
  const now = new Date().getTime();
  
  // Firebase timestamp ko JS date mein convert karna
  const itemDate = firebaseTimestamp.toDate 
    ? firebaseTimestamp.toDate().getTime() 
    : new Date(firebaseTimestamp).getTime();
    
  const diffInHours = (now - itemDate) / (1000 * 60 * 60);
  return diffInHours <= hours;
};

export default function DashboardWeb() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [latestNotice, setLatestNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check Login
    const saved = localStorage.getItem("teacher");
    if (!saved) {
      navigate("/login");
      return;
    }
    const t = JSON.parse(saved);
    
    // 2. Real-time Teacher Profile Subscription
    const unsubTeacher = onSnapshot(doc(db, "teachers", t.id), (snap) => {
      if (snap.exists()) {
        setTeacher({ id: snap.id, ...snap.data() });
        setLoading(false);
      }
    });

    // 3. Real-time Latest Notice (Latest 1 notice uthayega)
    const qNotice = query(collection(db, "notices"), orderBy("date", "desc"), limit(1));
    const unsubNotice = onSnapshot(qNotice, (snap) => {
      if (!snap.empty) {
        const noticeData = snap.docs[0].data();
        // 🔥 YAHAN CHECK HO RAHA HAI: Agar 24 ghante ke andar hai toh dikhao
        if (isWithinTime(noticeData.date, 24)) {
          setLatestNotice(noticeData);
        } else {
          setLatestNotice(null); // Purana notice hide ho jayega
        }
      } else {
        setLatestNotice(null);
      }
    });

    return () => {
      unsubTeacher();
      unsubNotice();
    };
  }, [navigate]);

  if (loading || !teacher) {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  const menuItems = [
    { title: "My Attendance", icon: <CalendarCheck size={28}/>, color: "text-blue-600", path: "/my-attendance" },
    { title: "Student Attendance", icon: <Users size={28}/>, color: "text-indigo-600", path: "/student-attendance" },
    { title: "Homework", icon: <ClipboardList size={28}/>, color: "text-emerald-600", path: "/addhomework" },
    { title: "Add Test", icon: <Newspaper size={28}/>, color: "text-cyan-600", path: "/add-test" },
    { title: "Test Results", icon: <ClipboardCheck size={28}/>, color: "text-rose-500", path: "/test-results" },
    { title: "Exam Papers", icon: <FileText size={28}/>, color: "text-orange-500", path: "/exam-papers" },
    { title: "Final Results", icon: <Trophy size={28}/>, color: "text-amber-500", path: "/final-result" },
    { title: "My Salary", icon: <IndianRupee size={28}/>, color: "text-green-600", path: "/my-salary" },
    { title: "Schedule", icon: <CalendarCheck size={28}/>, color: "text-purple-600", path: "/teacherschedule" },
    { title: "Profile", icon: <User size={28}/>, color: "text-slate-600", path: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* PROFILE SECTION */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6 mb-8">
          <img 
            src={teacher.photoURL || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
            alt="Profile" 
            className="w-24 h-24 rounded-full object-cover border-4 border-blue-100 shadow-sm"
          />
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-black text-slate-800 italic uppercase tracking-tight">{teacher.name}</h1>
            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{teacher.subject} Teacher • {teacher.role}</p>
            
            {/* Address & Contact Info */}
            <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-3 text-[11px] font-black uppercase">
               <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100 flex items-center gap-1">
                 📞 {teacher.phone}
               </span>
               <span className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1">
                 <MapPin size={12} /> {teacher.address || "No Address Set"}
               </span>
               {teacher.lastAttendanceDate && isWithinTime(teacher.lastAttendanceDate, 12) && (
                 <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-xl border border-green-100 italic">
                   ✓ PRESENT TODAY
                 </span>
               )}
            </div>
          </div>

          <button 
            onClick={() => { localStorage.clear(); navigate("/login"); }}
            className="bg-slate-50 p-4 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-100"
            title="Logout"
          >
            <LogOut size={24} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* MAIN MENU GRID */}
          <div className="lg:col-span-8">
            <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6 flex items-center gap-2">
              <ClipboardCheck size={24} className="text-blue-600" /> Teacher Portal
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {menuItems.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:scale-105 transition-all flex flex-col items-center gap-3 group border-b-4 hover:border-blue-500"
                >
                  <div className={`${item.color} group-hover:scale-110 transition-transform duration-300`}>
                    {item.icon}
                  </div>
                  <span className="font-black text-slate-700 uppercase italic text-[10px] tracking-widest text-center">{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* NOTICE SECTION (Visible for 24h only) */}
          <div className="lg:col-span-4">
             <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6 flex items-center gap-2">
               <Bell size={24} className="text-red-500" /> Recent Notice
             </h2>
             {latestNotice ? (
               <div className="bg-white p-6 rounded-[2.5rem] border-l-[12px] border-red-500 shadow-lg relative overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
                 <div className="absolute top-0 right-0 p-2 opacity-5">
                   <Bell size={80} />
                 </div>
                 <div className="flex items-center gap-2 mb-2">
                    <span className="bg-red-50 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-100">URGENT</span>
                 </div>
                 <h3 className="font-black text-slate-800 uppercase text-sm mb-2 relative z-10">{latestNotice.title}</h3>
                 <p className="text-slate-500 text-xs font-bold leading-relaxed mb-4 relative z-10">{latestNotice.description}</p>
                 
                 <div className="text-[10px] text-slate-400 font-black italic flex justify-between items-center border-t pt-4 relative z-10">
                   <span className="flex items-center gap-1 tracking-tighter uppercase">School Authority</span>
                   <span>
                     {latestNotice.date?.toDate 
                       ? latestNotice.date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                       : "NOW"}
                   </span>
                 </div>
               </div>
             ) : (
               <div className="bg-slate-100 p-10 rounded-[2.5rem] text-center border-2 border-dashed border-slate-200">
                 <div className="bg-slate-200 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell size={20} className="text-slate-400" />
                 </div>
                 <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest italic">No New Notices <br/> (Last 24 Hours)</p>
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}