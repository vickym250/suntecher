import React, { useEffect, useState } from "react";
import { 
  collection, doc, onSnapshot, query, updateDoc 
} from "firebase/firestore";
import { db } from "../firebase";
import { toast, Toaster } from "react-hot-toast";
import { Calendar, ShieldAlert, ArrowLeft } from "lucide-react"; // ArrowLeft icon add kiya
import { useNavigate } from "react-router-dom"; // Navigation ke liye

/* ================= CONSTANTS ================= */
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const classes = ["LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

export default function AttendanceWeb() {
  const navigate = useNavigate(); // Hook initialize kiya
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getCurrentSession = () => {
    const year = today.getFullYear();
    return today.getMonth() >= 3 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
  };
  const currentAppSession = getCurrentSession();

  /* ================= STATES ================= */
  const [selectedMonth, setSelectedMonth] = useState(months[today.getMonth()]);
  const [day, setDay] = useState(today.getDate());
  const [selectedClass, setSelectedClass] = useState("Class 10");
  const [students, setStudents] = useState([]);
  const [holidays, setHolidays] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [tempAttendance, setTempAttendance] = useState({});
  const [saving, setSaving] = useState(false);

  /* ================= HELPERS & VALIDATION ================= */
  const selectedDateObject = new Date(today.getFullYear(), months.indexOf(selectedMonth), day);
  const isFutureDate = selectedDateObject > today; 

  const dayKey = `day_${day}`; 
  const attendanceDayKey = `${selectedMonth}_day_${day}`; 
  const isSunday = selectedDateObject.getDay() === 0;
  const isH = holidays[dayKey]; 
  const holidayReason = isSunday ? "SUNDAY" : (holidays[`${dayKey}_reason`] || "OFFICIAL HOLIDAY");
  const isRestDay = isSunday || isH;

  /* ================= LOAD & SORT DATA ================= */
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "students"));
    
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(s => !s.deletedAt && s.session === currentAppSession);

      const sortedList = list.sort((a, b) => {
        return Number(a.rollNumber) - Number(b.rollNumber);
      });

      setStudents(sortedList);
      setLoading(false);
    });

    const holidayDocRef = doc(db, "metadata", `holidays_${currentAppSession}_${selectedMonth}`);
    const unsubH = onSnapshot(holidayDocRef, (docSnap) => {
      setHolidays(docSnap.exists() ? docSnap.data() : {});
    });

    return () => { unsub(); unsubH(); };
  }, [currentAppSession, selectedMonth]);

  /* ================= ACTIONS ================= */
  const selectAttendance = (studentId, status) => {
    if (isFutureDate) return toast.error("Bhai, aage ki date locked hai!");
    if (isRestDay) return toast.error(`Aaj ${holidayReason} ki chutti hai!`);
    
    const student = students.find(s => s.id === studentId);
    if (student.attendance?.[selectedMonth]?.[attendanceDayKey]) {
      return toast.error("Pehle se saved hai, change nahi hoga.");
    }
    setTempAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const promises = Object.entries(tempAttendance).map(async ([studentId, status]) => {
        const student = students.find(s => s.id === studentId);
        const monthData = student.attendance?.[selectedMonth] || {};
        let present = monthData.present || 0;
        let absent = monthData.absent || 0;
        if (status === "P") present++; else absent++;
        
        return updateDoc(doc(db, "students", studentId), {
          [`attendance.${selectedMonth}.${attendanceDayKey}`]: status,
          [`attendance.${selectedMonth}.present`]: present,
          [`attendance.${selectedMonth}.absent`]: absent,
        });
      });
      await Promise.all(promises);
      setTempAttendance({});
      toast.success("Attendance Saved! 🎉");
    } catch (error) { toast.error("Kucch gadbad ho gayi!"); }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
    </div>
  );

  const filteredData = students.filter((s) => s.className === selectedClass);
  const pendingCount = filteredData.filter(s => !s.attendance?.[selectedMonth]?.[attendanceDayKey] && !tempAttendance[s.id]).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans pb-40">
      <Toaster />
      <div className="max-w-5xl mx-auto">
        
        {/* --- BACK BUTTON --- */}
        <button 
          onClick={() => navigate(-1)} 
          className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors group"
        >
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 group-hover:bg-indigo-50">
            <ArrowLeft size={20} />
          </div>
          <span className="uppercase text-xs tracking-widest">Back to Dashboard</span>
        </button>

        {/* HEADER */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase italic">Attendance Center</h1>
            <p className="text-slate-400 font-bold text-xs">SESSION {currentAppSession} • {selectedClass}</p>
          </div>
          <div className={`px-6 py-2 rounded-2xl font-black text-xs uppercase ${isFutureDate ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
            {isFutureDate ? "LOCKED" : `${pendingCount} Students Remaining`}
          </div>
        </div>

        {/* SELECTORS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-[2rem] shadow-sm border">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Class</label>
            <select value={selectedClass} onChange={(e)=>setSelectedClass(e.target.value)} className="w-full bg-transparent font-bold outline-none p-1 cursor-pointer text-indigo-600 uppercase">
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="bg-white p-4 rounded-[2rem] shadow-sm border">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Month</label>
            <select value={selectedMonth} onChange={(e)=>setSelectedMonth(e.target.value)} className="w-full bg-transparent font-bold outline-none p-1 cursor-pointer text-indigo-600 uppercase">
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="bg-white p-4 rounded-[2rem] shadow-sm border">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Select Day</label>
            <select value={day} onChange={(e)=>setDay(parseInt(e.target.value))} className="w-full bg-transparent font-bold outline-none p-1 cursor-pointer text-indigo-600 uppercase">
              {[...Array(31)].map((_, i) => {
                const d = i + 1;
                const dObj = new Date(today.getFullYear(), months.indexOf(selectedMonth), d);
                return dObj.getMonth() === months.indexOf(selectedMonth) ? <option key={d} value={d}>{d}</option> : null;
              })}
            </select>
          </div>
        </div>

        {/* STATUS BANNER */}
        {isFutureDate ? (
          <div className="bg-slate-800 text-white p-4 rounded-2xl flex items-center gap-3 mb-6 shadow-lg">
            <ShieldAlert size={20}/> <span className="font-black uppercase italic text-sm">Future date is locked</span>
          </div>
        ) : isRestDay ? (
          <div className="bg-rose-600 text-white p-4 rounded-2xl flex items-center gap-3 mb-6 shadow-lg">
            <Calendar size={20}/> <span className="font-black uppercase italic text-sm">{holidayReason} (Attendance Locked)</span>
          </div>
        ) : null}

        {/* STUDENT LIST */}
        {!isFutureDate ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mb-10">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                  <th className="p-6">Roll / Student</th>
                  <th className="p-6 text-right">Attendance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                {filteredData.map((item) => {
                  const savedStatus = item.attendance?.[selectedMonth]?.[attendanceDayKey];
                  const currentStatus = tempAttendance[item.id] || savedStatus;
                  const isMarked = !!savedStatus;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${isMarked ? 'opacity-40' : ''}`}>
                      <td className="p-6">
                        <div className="font-black text-indigo-600 italic text-sm">#{item.rollNumber}</div>
                        <div className="font-bold uppercase text-slate-800">{item.name}</div>
                        {isMarked && <span className="text-[9px] font-black text-green-500 uppercase tracking-tighter italic">✓ Already Saved</span>}
                      </td>
                      <td className="p-6">
                        <div className="flex justify-end gap-3">
                          {isMarked ? (
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${savedStatus === 'P' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                              {savedStatus}
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => selectAttendance(item.id, "P")}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-all ${currentStatus === 'P' ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                              >P</button>
                              <button 
                                onClick={() => selectAttendance(item.id, "A")}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-all ${currentStatus === 'A' ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                              >A</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div className="p-20 text-center text-slate-300 font-bold uppercase italic tracking-widest">No students found</div>
            )}
          </div>
        ) : (
          <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
            <p className="text-slate-300 font-black uppercase italic tracking-widest">Attendance for future dates is disabled</p>
          </div>
        )}

        {/* FIXED SAVE BUTTON */}
        {Object.keys(tempAttendance).length > 0 && !isFutureDate && (
          <div className="fixed bottom-8 left-0 right-0 px-4 flex justify-center z-[999]">
            <button 
              onClick={saveAttendance}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-center gap-3 transition-all active:scale-95"
            >
              {saving ? "Saving..." : `Confirm & Save (${Object.keys(tempAttendance).length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}