import React, { useState, useEffect } from "react";
import { db } from "../firebase"; // Aapka firebase config file path
import { 
  collection, addDoc, serverTimestamp, query, where, 
  onSnapshot, doc, deleteDoc 
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import { BookOpen, Trash2, Calendar, Clock } from "lucide-react";

const classes = [
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
  "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12",
];

export default function HomeworkWeb() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [className, setClassName] = useState("Class 10");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [visibleDays, setVisibleDays] = useState("2");
  const [loading, setLoading] = useState(false);
  const [homeworks, setHomeworks] = useState([]);
  const [teacher, setTeacher] = useState(null);

  // 1. Load Teacher Data & Real-time Listener
  useEffect(() => {
    const saved = localStorage.getItem("teacher");
    if (saved) {
      const teacherData = JSON.parse(saved);
      setTeacher(teacherData);

      const q = query(
        collection(db, "homework"),
        where("teacherId", "==", teacherData.id)
      );

      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHomeworks(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      });

      return () => unsub();
    }
  }, []);

  // 2. Save Homework Logic
  const saveHomework = async (e) => {
    e.preventDefault();
    if (!title || !description || !teacher) return toast.error("Sab kuch bharna zaroori hai bhai!");

    setLoading(true);
    try {
      await addDoc(collection(db, "homework"), {
        title,
        description,
        className,
        date,
        visibleDays: parseInt(visibleDays),
        teacherId: teacher.id,
        teacherName: teacher.name,
        createdAt: serverTimestamp(),
        session: "2025-26",
      });
      toast.success("Homework add ho gaya! ✅");
      setTitle("");
      setDescription("");
    } catch (err) {
      toast.error("Database error!");
    }
    setLoading(false);
  };

  // 3. Delete Homework
  const deleteHw = async (id) => {
    if (window.confirm("Kya aap mita dena chahte hain?")) {
      await deleteDoc(doc(db, "homework", id));
      toast.success("Mita diya gaya!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <Toaster />
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black text-slate-800 uppercase italic mb-2 flex items-center gap-3">
          <BookOpen className="text-blue-600" size={32} /> Homework Manager
        </h1>
        <p className="text-slate-400 font-bold text-sm mb-8 uppercase tracking-widest">
          Teacher: {teacher?.name || "Loading..."}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* FORM SECTION */}
          <div className="lg:col-span-5">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-sm font-black mb-6 text-slate-400 uppercase tracking-widest">New Assignment</h3>
              
              <form onSubmit={saveHomework} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">Class</label>
                  <select 
                    value={className} 
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none focus:ring-2 ring-blue-500"
                  >
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 text-center">Date</label>
                    <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none text-center" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 text-center">Visible Days</label>
                    <input type="number" value={visibleDays} onChange={(e)=>setVisibleDays(e.target.value)} className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none text-center" />
                  </div>
                </div>

                <input 
                  type="text" 
                  placeholder="Subject Name" 
                  value={title} 
                  onChange={(e)=>setTitle(e.target.value)} 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none focus:ring-2 ring-blue-500" 
                />

                <textarea 
                  placeholder="Homework Details..." 
                  value={description} 
                  onChange={(e)=>setDescription(e.target.value)} 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold outline-none h-32 focus:ring-2 ring-blue-500" 
                />

                <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:bg-slate-200">
                  {loading ? "Saving..." : "Add Homework"}
                </button>
              </form>
            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="lg:col-span-7">
            <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6">Recent Uploads</h2>
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    <th className="p-6">Class/Subject</th>
                    <th className="p-6">Details</th>
                    <th className="p-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  {homeworks.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-6">
                        <div className="font-black text-blue-600 text-xs italic">{item.className}</div>
                        <div className="font-bold text-sm uppercase">{item.title}</div>
                      </td>
                      <td className="p-6 max-w-xs">
                        <p className="text-xs text-slate-500 leading-relaxed truncate">{item.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-[9px] font-black text-slate-300 uppercase">
                          <span className="flex items-center gap-1"><Calendar size={10}/> {item.date}</span>
                          <span className="flex items-center gap-1"><Clock size={10}/> {item.visibleDays} Days</span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <button onClick={() => deleteHw(item.id)} className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {homeworks.length === 0 && (
                <div className="p-20 text-center text-slate-300 font-bold uppercase italic tracking-widest">
                  No homework records found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}