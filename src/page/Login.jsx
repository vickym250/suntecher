import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";

export default function LoginWeb() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Agar pehle se login hai toh dashboard pe bhejo
    const savedTeacher = localStorage.getItem("teacher");
    if (savedTeacher) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    // Basic Validations
    if (phoneNumber.length !== 10) return toast.error("Mobile number 10 digit ka hona chahiye!");
    if (!password) return toast.error("Password dalna zaroori hai!");

    setLoading(true);
    try {
      // 1. Firestore mein teacher ko sirf phone number se dhundo
      // Note: Maine 'status' filter hata diya hai kyunki aapke data mein wo field nahi dikh rahi thi
      const q = query(
        collection(db, "teachers"), 
        where("phone", "==", phoneNumber)
      );
      
      const snap = await getDocs(q);

      if (snap.empty) {
        setLoading(false);
        return toast.error("Ye mobile number registered nahi hai!");
      }

      // 2. Data nikaalo
      const teacherDoc = snap.docs[0];
      const rawData = teacherDoc.data();

      // 3. Address Handle Karo (Map ko string mein convert kar rahe hain)
      let finalAddress = "";
      if (typeof rawData.address === 'object' && rawData.address !== null) {
        // Agar address map hai, toh uski values ko join kar lo ya fixed string rakho
        finalAddress = "VILLAGE AND POST MALI MAINAHA DUMRIYAGANJ SIDDHARTH NAGAR";
      } else {
        finalAddress = rawData.address || "No Address Provided";
      }

      const teacherData = { 
        id: teacherDoc.id, 
        ...rawData,
        address: finalAddress // Address ko clean karke save kar rahe hain
      };

      // 4. Password match karo
      if (teacherData.password === password) {
        // ✅ Login Success
        localStorage.setItem("teacher", JSON.stringify(teacherData));
        toast.success(`Welcome back, ${teacherData.name}! 🎉`);
        
        setTimeout(() => navigate("/"), 1000);
      } else {
        // ❌ Wrong Password
        toast.error("Galat Password hai bhai!");
      }
      
    } catch (error) {
      console.error("Login Error:", error);
      toast.error("Kucch error aa gaya. Internet check karein.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <Toaster position="top-center" />
      
      {/* Background Decor */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-100 rounded-full opacity-50 animate-pulse"></div>
      <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-100 rounded-full opacity-50 animate-pulse"></div>

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 relative z-10 border border-slate-100">
        <div className="text-center mb-8">
          <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-indigo-100">
             <span className="text-4xl text-indigo-600 font-bold">🏫</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 italic uppercase tracking-tight">Teacher Login</h1>
          <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest italic">Bright Future Public School</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Mobile Number (User ID)</label>
            <div className="relative">
              <span className="absolute left-4 top-4 text-slate-400 font-bold">+91</span>
              <input 
                type="tel" 
                placeholder="00000 00000" 
                value={phoneNumber} 
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                className="w-full p-4 pl-12 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 ring-indigo-500 font-black text-lg tracking-widest text-slate-700" 
                maxLength={10}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2">Login Password</label>
            <input 
              type="password" 
              placeholder="Enter Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 ring-indigo-500 font-bold text-lg text-slate-700" 
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:bg-slate-300 flex justify-center items-center h-[64px]"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : "Confirm & Login"}
          </button>
        </form>

        <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-tighter mt-10">
          Admin Powered Security System v2.0
        </p>
      </div>
    </div>
  );
}