import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import { BookOpen, Send, ArrowLeft, Paperclip } from "lucide-react";

export default function AddHomework() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [teacher, setTeacher] = useState(null);

  // Screenshot ke matching fields
  const [formData, setFormData] = useState({
    className: "",
    subject: "",
    title: "",
    description: "",
    session: "2025-26", // Default session
    fileURL: "",
    visibleDays: 1, // Default visibility
  });

  useEffect(() => {
    const saved = localStorage.getItem("teacher");
    if (!saved) {
      navigate("/login");
    } else {
      setTeacher(JSON.parse(saved));
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.className || !formData.subject || !formData.title) {
      return toast.error("Bhai, Details bharna zaroori hai!");
    }

    setLoading(true);
    try {
      // Screenshot ke format mein data save ho raha hai
      await addDoc(collection(db, "homework"), {
        className: formData.className,
        subject: formData.subject,
        title: formData.title,
        description: formData.description,
        session: formData.session,
        fileURL: formData.fileURL,
        visibleDays: Number(formData.visibleDays),
        createdAt: serverTimestamp(),
        deletedAt: null,
        teacherId: teacher?.id || "unknown",
        teacherName: teacher?.name || "Teacher"
      });

      toast.success("Homework Upload ho gaya! 🚀");
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Database error! Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <Toaster position="top-center" />
      
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-slate-500 font-bold hover:text-indigo-600 transition-all">
          <ArrowLeft size={20} /> DASHBOARD
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center text-white">
            <h1 className="text-2xl font-black uppercase italic tracking-tight">Add New Homework</h1>
            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mt-1">Vivekanand School Database Sync</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Class Name</label>
                <input 
                  type="text"
                  placeholder="Class 4"
                  value={formData.className}
                  onChange={(e) => setFormData({...formData, className: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500 font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Subject</label>
                <input 
                  type="text"
                  placeholder="Maths"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500 font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Homework Title</label>
              <input 
                type="text"
                placeholder="Chapter 2: Fractions"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500 font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Description</label>
              <textarea 
                rows="3"
                placeholder="Describe the task..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500 font-bold resize-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Visible Days</label>
                <input 
                  type="number"
                  value={formData.visibleDays}
                  onChange={(e) => setFormData({...formData, visibleDays: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Session</label>
                <input 
                  type="text"
                  value={formData.session}
                  onChange={(e) => setFormData({...formData, session: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">File URL (Optional)</label>
              <div className="relative">
                <Paperclip className="absolute left-4 top-4 text-slate-400" size={20} />
                <input 
                  type="text"
                  placeholder="https://image-link.com"
                  value={formData.fileURL}
                  onChange={(e) => setFormData({...formData, fileURL: e.target.value})}
                  className="w-full p-4 pl-12 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500 font-bold"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:bg-slate-300 flex justify-center items-center gap-2 h-[64px]"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <> <Send size={20} /> SYNC WITH FIREBASE </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}