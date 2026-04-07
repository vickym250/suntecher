import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; // Apna config path check kar lena
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Clock, BookOpen, Calendar, Loader2, LayoutGrid } from 'lucide-react';

const TeacherSchedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. LocalStorage se login teacher ki ID nikalna
  const teacherData = JSON.parse(localStorage.getItem("teacher"));
  const loggedInTeacherId = teacherData?.id;

  const fetchMySchedule = async () => {
    try {
      setLoading(true);
      // 2. Timetable periods fetch karna
      const q = query(collection(db, "timetablePeriods"), orderBy("id", "asc"));
      const querySnapshot = await getDocs(q);
      
      const myPeriods = [];

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const assignments = data.teacherAssignments || {};

        // 3. Check karna ki kya is period mein login teacher ki assignment hai
        if (assignments[loggedInTeacherId]) {
          myPeriods.push({
            periodId: data.id,
            label: data.label, // P1, P2 etc.
            time: data.time,   // 8:00 AM etc.
            assignedClass: assignments[loggedInTeacherId], // Class 1, Class 3 etc.
            session: data.session
          });
        }
      });

      setSchedule(myPeriods);
    } catch (err) {
      console.error("Schedule loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedInTeacherId) fetchMySchedule();
  }, [loggedInTeacherId]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase italic">
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
                <Calendar size={24} />
              </div>
              My <span className="text-blue-600 font-light">Schedule</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">
              Today's Teaching Assignments
            </p>
          </div>
          <div className="text-right hidden md:block">
             <p className="text-[10px] font-black text-slate-400 uppercase">Session</p>
             <p className="font-bold text-blue-600">2025-26</p>
          </div>
        </div>

        {/* Schedule Table Container */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
              <tr>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4">Timing</th>
                <th className="px-6 py-4 text-center">Assigned Class</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {schedule.length > 0 ? schedule.map((item, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-5">
                    <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-xs shadow-sm">
                      {item.label}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-slate-600 font-bold text-sm">
                      <Clock size={14} className="text-blue-500" />
                      {item.time}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-2xl font-black text-sm border border-emerald-100">
                      <BookOpen size={14} />
                      {item.assignedClass}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="text-[9px] font-black text-slate-300 uppercase italic tracking-tighter">
                      Confirmed
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="py-20 text-center">
                    <LayoutGrid size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
                      Bhai, aaj koi class assigned nahi hai!
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="mt-6 bg-blue-600 p-4 rounded-2xl text-white flex items-center justify-between shadow-xl shadow-blue-100 italic">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Vivekanand School Management System</p>
          <p className="text-xs font-black uppercase tracking-tighter">{teacherData?.name || 'Teacher'}</p>
        </div>
      </div>
    </div>
  );
};

export default TeacherSchedule;