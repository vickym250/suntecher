import React, { useState, useEffect } from "react";
import { db } from "../firebase"; 
import { 
  collection, getDocs, query, where, serverTimestamp,
  doc, onSnapshot, runTransaction 
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import { Trophy, Search, Plus, X, Edit3, Save, ArrowLeft, Zap, Calendar, Hash, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const examTypes = ["Quarterly", "Half-Yearly", "Annual"];
const sessionsList = ["2024-25", "2025-26", "2026-27", "2027-28"];

// 👇 FIXED CLASS LIST: Nursery, LKG, UKG, Class 1 se Class 8 tak
const FIXED_CLASSES = [
  "Nursery", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4",
  "Class 5", "Class 6", "Class 7", "Class 8"
];

// Subject naam match karne ke liye (marksheet jaisa normalize)
const normalize = (s = "") => String(s).toLowerCase().replace(/[^a-z]/g, "");

// 👇 SUBJECT ORDER (har class me yahi order): English, Hindi, Math, Science, S.St, Computer, Urdu/Sanskrit, GK, Art
// Ek array = ek slot. Urdu aur Sanskrit ek hi slot me hain.
const SUBJECT_ORDER = [
  ["english", "eng"],
  ["hindi"],
  ["math", "maths", "mathematics", "mathematic"],
  ["science", "sci", "generalscience", "gsci", "gs", "gsc", "gscience", "gensci", "gensc"],   // 👈 GS / G.S. / G.Sc. sab Science
  ["sst", "ssc", "ss", "socialscience", "socialstudies", "sosc", "socialsci", "sscience", "sstudies"],
  ["computer", "computers", "computerscience", "comp"],
  ["urdu", "sanskrit", "sanskriturdu", "urdusanskrit"],   // 👈 same slot
  ["gk", "generalknowledge", "genknowledge", "gknowledge"],
  ["art", "arts", "drawing", "artcraft", "artandcraft"]
];

const subjectRank = (name) => {
  const n = normalize(name);
  // 1) exact match
  const exact = SUBJECT_ORDER.findIndex((aliases) => aliases.includes(n));
  if (exact !== -1) return exact;
  // 2) fallback: naam ke andar alias mile (e.g. "englishgrammar", "hindivyakaran")
  //    sabse lamba alias jeetta hai (taaki "socialsciences" Science me na chala jaye)
  let bestIdx = -1;
  let bestLen = 0;
  SUBJECT_ORDER.forEach((aliases, i) => {
    aliases.forEach((a) => {
      if (a.length >= 4 && n.includes(a) && a.length > bestLen) {
        bestLen = a.length;
        bestIdx = i;
      }
    });
  });
  return bestIdx === -1 ? 999 : bestIdx; // list me nahi hai to sabse neeche
};

// Same slot ke andar order (Urdu, Sanskrit)
const subRank = (name) => {
  const n = normalize(name);
  const group = SUBJECT_ORDER.find((aliases) => aliases.includes(n));
  return group ? group.indexOf(n) : 0;
};

// Screen par "Urdu/Sanskrit" dikhane ke liye (database ka naam nahi badalta)
const displayName = (s) => {
  const n = normalize(s);
  return n === "sanskriturdu" || n === "urdusanskrit" ? "Urdu/Sanskrit" : s;
};

const compareSubjects = (a, b) => {
  const ra = subjectRank(a);
  const rb = subjectRank(b);
  if (ra !== rb) return ra - rb;
  const sa = subRank(a);
  const sb = subRank(b);
  if (sa !== sb) return sa - sb;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
};

// Same subject match (Urdu ya Sanskrit dono "Urdu/Sanskrit" slot me)
const sameSub = (a, b) =>
  normalize(a) === normalize(b) ||
  (subjectRank(a) !== 999 && subjectRank(a) === subjectRank(b));

// 👇 Subjects sirf TIMETABLE se aate hain, lekin order har class me same (SUBJECT_ORDER wala)
const getSubjectsFor = (master, className, examType) => {
  const tt = master[className]?.[examType] || [];
  const list = [];
  tt.forEach((s) => {
    if (!list.some((x) => sameSub(x, s))) list.push(s); // same slot ka duplicate hata do
  });
  return list.sort(compareSubjects);
};

// 👇 LocalStorage helpers: session / class / exam yaad rakhne ke liye
const LS_PREFIX = "mobileFinalResult_";
const getSaved = (key, fallback, allowed) => {
  try {
    const val = localStorage.getItem(LS_PREFIX + key);
    if (val && (!allowed || allowed.includes(val))) return val;
    return fallback;
  } catch {
    return fallback;
  }
};
const saveToLS = (key, value) => {
  try { localStorage.setItem(LS_PREFIX + key, value); } catch {}
};

export default function MobileFinalResult() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getSaved("session", "2025-26", sessionsList)); 
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classesList, setClassesList] = useState([]);

  // Shape: { className: { Annual: [subjects], "Half-Yearly": [subjects], Quarterly: [subjects] } }
  // Timetables/{className} doc se aata hai
  const [dynamicSubjectMaster, setDynamicSubjectMaster] = useState({});

  const [allStudents, setAllStudents] = useState([]); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [cls, setCls] = useState(() => getSaved("cls", "", FIXED_CLASSES)); 
  const [exam, setExam] = useState(() => getSaved("exam", "Annual", examTypes));
  const [rows, setRows] = useState([]);
  const [resultList, setResultList] = useState([]);

  // Jab bhi ye values badlein, localStorage me save
  useEffect(() => { saveToLS("session", session); }, [session]);
  useEffect(() => { if (cls) saveToLS("cls", cls); }, [cls]);
  useEffect(() => { saveToLS("exam", exam); }, [exam]);
  
  // Magic & Max Settings
  const [masterMax, setMasterMax] = useState("100");
  const [minRand, setMinRand] = useState(33);
  const [maxRand, setMaxRand] = useState(90);

  // =========================================================
  // 1. CLASS + EXAM WISE SUBJECTS (Timetable se, custom order me)
  // =========================================================
  useEffect(() => {
    const fetchTimetableSubjects = async () => {
      try {
        const snap = await getDocs(collection(db, "Timetables"));
        const mapping = {};

        snap.docs.forEach((classDoc) => {
          const className = classDoc.id;
          const data = classDoc.data() || {};
          const perExam = {};

          examTypes.forEach((examType) => {
            const periods = Array.isArray(data[examType]) ? data[examType] : [];
            const subjectsForExam = [];

            periods.forEach((p) => {
              if (!p || p.isHoliday) return; // holiday din skip
              [p.subject, p.subject2].forEach((rawSub) => {
                const sub = String(rawSub || "").trim();
                if (!sub || sub === "---") return; // "---" = us slot mein exam nahi
                if (!subjectsForExam.some((s) => s.toLowerCase() === sub.toLowerCase())) {
                  subjectsForExam.push(sub);
                }
              });
            });

            // ✅ English, Hindi, Math, Science, S.St, Computer, Urdu/Sanskrit, GK, Art
            subjectsForExam.sort(compareSubjects);
            perExam[examType] = subjectsForExam;
          });

          mapping[className] = perExam;
        });

        setDynamicSubjectMaster(mapping);
        setClassesList(FIXED_CLASSES);
        setCls((prev) => prev || FIXED_CLASSES[0]);
      } catch (err) {
        console.error("Timetable subjects fetch error:", err);
        toast.error("Timetable se subjects load nahi ho paaye.");
        setClassesList(FIXED_CLASSES);
        setCls((prev) => prev || FIXED_CLASSES[0]);
      }
    };

    fetchTimetableSubjects();
  }, []);

  // 2. Real-time Results Listener (Synced with Admin)
  useEffect(() => {
    if (!cls) return;
    const q = query(
      collection(db, "examResults"), 
      where("className", "==", cls), 
      where("exam", "==", exam),
      where("session", "==", session),
      where("delete_at", "==", null) 
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setResultList(list.sort((a, b) => (parseInt(a.examRollNo) || 0) - (parseInt(b.examRollNo) || 0)));
    });
    return () => unsub();
  }, [cls, exam, session]);

  // 3. Fetch Students + Timetable subjects rows
  useEffect(() => {
    if (!cls) return;
    const fetchStudents = async () => {
      const q = query(collection(db, "students"), where("className", "==", cls), where("session", "==", session));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => !s.deletedAt); 
      setAllStudents(list.sort((a, b) => (parseInt(a.examRollNo) || 0) - (parseInt(b.examRollNo) || 0)));
    };
    fetchStudents();

    if (!editingId) {
      const subsForExam = getSubjectsFor(dynamicSubjectMaster, cls, exam);
      setRows(subsForExam.map(sub => ({ subject: sub, total: masterMax, marks: "" })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls, exam, editingId, session, dynamicSubjectMaster]);

  // 4. MAGIC FILLER FUNCTION
  const autoFillRandomMarks = () => {
    if (!selectedStudent) return toast.error("Pehle Student Select Karein!");
    const min = parseInt(minRand);
    const max = parseInt(maxRand);
    if (isNaN(min) || isNaN(max) || min > max) return toast.error("Check Min/Max Range!");
    setRows(rows.map(r => ({
      ...r,
      marks: (Math.floor(Math.random() * (max - min + 1)) + min).toString()
    })));
    toast.success("Magic Fill Applied! ✨");
  };

  const handleMasterMaxChange = (val) => {
    setMasterMax(val);
    setRows(rows.map(r => ({ ...r, total: val })));
  };

  // ✅ Edit: student ki asli ID + timetable subjects ke saath saved marks merge
  const handleEdit = (item) => {
    const stu = allStudents.find(s => String(s.id) === String(item.studentId));
    setEditingId(item.id);
    setSelectedStudent(stu || { ...item, id: item.studentId }); // student ki ID, result ki nahi
    setStudentSearch(item.name || "");

    const tt = getSubjectsFor(dynamicSubjectMaster, cls, exam);
    const saved = item.rows || [];

    const merged = tt.map(sub => {
      const f = saved.find(r => sameSub(r.subject, sub));
      return {
        subject: sub,
        total: f ? f.total : masterMax,
        marks: f ? String(f.marks) : ""
      };
    });
    // Timetable me na hone wale saved subjects bhi rakho (marks na jayein)
    saved.forEach(r => {
      if (!merged.some(m => sameSub(m.subject, r.subject))) {
        merged.push({ subject: r.subject, total: r.total, marks: String(r.marks) });
      }
    });

    // ✅ Edit me bhi wahi custom order
    merged.sort((a, b) => compareSubjects(a.subject, b.subject));

    setRows(merged);
    setShowForm(true);
  };

  // 5. SAVE RESULT (Desktop jaisa logic)
  const saveResult = async () => {
    if (!selectedStudent) return toast.error("Student select karein!");
    if (!rows.length) return toast.error("Timetable me is class/exam ka subject nahi mila!");

    const studentId = String(selectedStudent.id);
    const isAlreadyDone = resultList.some(res => String(res.studentId) === studentId && !res.delete_at);
    if (!editingId && isAlreadyDone) return toast.error("Result already exists!");

    setLoading(true);
    try {
      // ✅ Result-only fields hata do, sirf student ka data rakho
      const {
        id: _id, rows: _r, srNo: _s, createdAt: _c, updatedAt: _u,
        delete_at: _d, studentId: _sid, exam: _e, ...studentData
      } = selectedStudent;

      // ✅ Saare subjects save (marks khali = 0), desktop jaisa
      const cleanRows = rows
        .filter(r => r.subject && r.subject.trim() !== "")
        .map(r => ({
          subject: r.subject.trim(),
          total: Number(r.total) || 0,
          marks: Number(r.marks) || 0
        }));

      await runTransaction(db, async (transaction) => {
        let finalSrNo;
        if (!editingId) {
          // ✅ Desktop jaisa srNo
          const qCount = query(
            collection(db, "examResults"),
            where("className", "==", cls),
            where("exam", "==", exam),
            where("session", "==", session),
            where("delete_at", "==", null)
          );
          const countSnap = await getDocs(qCount);
          finalSrNo = countSnap.size + 1;
        }

        const resDocRef = editingId
          ? doc(db, "examResults", editingId)
          : doc(collection(db, "examResults"));

        const payload = {
          ...studentData,
          session,
          studentId,
          name: selectedStudent.name || "",
          className: cls,
          exam,
          examRollNo: selectedStudent.examRollNo || "", // Admin sync
          roll: selectedStudent.examRollNo || "",       // Old sync
          rows: cleanRows,
          updatedAt: serverTimestamp(),
          delete_at: null
        };

        if (editingId) transaction.update(resDocRef, payload);
        else {
          payload.srNo = finalSrNo;
          payload.createdAt = serverTimestamp();
          transaction.set(resDocRef, payload);
        }
      });

      setShowForm(false);
      setEditingId(null);
      toast.success("Result Published! 🎉");
    } catch (error) {
      toast.error("Save failed!");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans italic">
      <Toaster position="top-center" />
      
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white px-4 py-4 flex flex-col border-b shadow-sm gap-3">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/")} className="p-2 bg-slate-50 rounded-full text-slate-600 active:scale-90"><ArrowLeft size={20}/></button>
          <div className="text-center">
            <h1 className="text-xs font-black uppercase tracking-widest text-slate-800">Result Pro</h1>
            <p className="text-[10px] font-bold text-indigo-600 uppercase italic leading-none">{session} • {cls}</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100"><Trophy size={18} className="text-amber-500"/></div>
        </div>
        
        {/* SESSION SELECTOR */}
        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl">
          <Calendar size={14} className="text-slate-400 ml-2"/>
          <select value={session} onChange={(e) => setSession(e.target.value)} className="bg-transparent border-none text-[11px] font-black uppercase outline-none flex-1">
            {sessionsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* CLASS TABS */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
          {classesList.map(c => (
            <button key={c} onClick={() => setCls(c)} className={`px-5 py-2 rounded-2xl text-xs font-black whitespace-nowrap border ${cls === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{c}</button>
          ))}
        </div>

        {/* EXAM TABS */}
        <div className="flex gap-1 bg-slate-200/50 p-1 rounded-2xl">
          {examTypes.map(e => (
            <button key={e} onClick={() => setExam(e)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${exam === e ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{e}</button>
          ))}
        </div>

        {/* RECORDS LIST */}
        <div className="space-y-3">
          {resultList.map((item, index) => (
            <div key={item.id} className="bg-white p-4 rounded-[2rem] border shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-300 text-xs">{index + 1}</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase">{item.name}</h3>
                  <p className="text-[9px] text-slate-400 font-black uppercase">Roll: {item.examRollNo} • {item.exam}</p>
                </div>
              </div>
              <button onClick={() => handleEdit(item)} className="p-3 bg-slate-50 text-indigo-400 rounded-2xl"><Edit3 size={18}/></button>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => { setEditingId(null); setSelectedStudent(null); setStudentSearch(""); setShowForm(true); }} className="fixed bottom-6 right-6 bg-indigo-600 text-white w-16 h-16 rounded-[2.2rem] shadow-2xl flex items-center justify-center z-40 border-4 border-white active:scale-90 transition-all"><Plus size={30} /></button>

      {/* ENTRY FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end italic">
          <div className="bg-[#F8FAFC] w-full h-[94vh] rounded-t-[3.5rem] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 relative">
            <div className="px-8 pt-4 pb-6 bg-white border-b">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black uppercase text-slate-800 tracking-tighter">Result Entry</h2>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase">{cls} • {exam} • {session}</p>
                </div>
                <button onClick={closeForm} className="p-3 bg-slate-100 text-slate-400 rounded-full"><X size={20}/></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
              
              {/* MAGIC FILL & MAX SETTINGS */}
              <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[9px] font-black opacity-50 uppercase flex items-center gap-1"><Zap size={10} fill="currentColor"/> Magic Fill Control</p>
                    <div className="bg-white/10 px-3 py-1 rounded-lg">
                        <span className="text-[8px] opacity-50 mr-2">BASE MAX:</span>
                        <input type="number" value={masterMax} onChange={(e) => handleMasterMaxChange(e.target.value)} className="w-8 bg-transparent text-xs font-black outline-none text-indigo-400 text-center" />
                    </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input type="number" value={minRand} onChange={(e)=>setMinRand(e.target.value)} className="w-12 bg-white/10 rounded-lg text-center font-bold text-xs py-1 border border-white/5 outline-none" />
                    <span className="opacity-30 text-[10px]">TO</span>
                    <input type="number" value={maxRand} onChange={(e)=>setMaxRand(e.target.value)} className="w-12 bg-white/10 rounded-lg text-center font-bold text-xs py-1 border border-white/5 outline-none" />
                  </div>
                  <button onClick={autoFillRandomMarks} className="bg-indigo-600 p-4 rounded-2xl active:scale-90 shadow-lg hover:bg-indigo-500 transition-colors">
                    <Zap size={20} fill="currentColor"/>
                  </button>
                </div>
              </div>

              {/* SEARCH STUDENT WITH DONE CHECK */}
              <div className="relative">
                <div className="flex items-center bg-white border rounded-3xl px-5 py-4 shadow-sm focus-within:ring-2 ring-indigo-500/20">
                  <Search size={18} className="text-slate-400" />
                  <input type="text" placeholder="Search Student..." className="bg-transparent flex-1 ml-3 font-bold text-sm outline-none" value={studentSearch} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} onChange={(e) => {setStudentSearch(e.target.value); setSelectedStudent(null);}} disabled={Boolean(editingId)} />
                </div>
                {isSearchFocused && !selectedStudent && !editingId && (
                  <div className="absolute top-full left-0 right-0 bg-white border rounded-3xl mt-2 shadow-2xl z-50 max-h-52 overflow-y-auto no-scrollbar p-2">
                    {allStudents
                      .filter(s =>
                        (s.name || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
                        (s.examRollNo && s.examRollNo.toString().includes(studentSearch)))
                      .map(s => {
                        // resultList pehle se cls + exam + session se filtered hai
                        const isDone = resultList.some(res => String(res.studentId) === String(s.id) && !res.delete_at);
                        return (
                          <button key={s.id} onClick={() => { if(isDone) return toast.error("Result Already Published!"); setSelectedStudent(s); setStudentSearch(s.name); }} className={`w-full p-4 text-left rounded-2xl border-b last:border-0 flex justify-between items-center ${isDone ? 'bg-green-50 opacity-60' : 'active:bg-indigo-50'}`}>
                            <div>
                              <span className={`font-black text-xs uppercase block ${isDone ? 'text-green-700' : 'text-slate-700'}`}>{s.name}</span>
                              <span className="text-[8px] font-bold text-slate-400">ROLL: {s.examRollNo}</span>
                            </div>
                            {isDone ? <CheckCircle2 size={18} className="text-green-600" /> : <Hash size={14} className="text-slate-200" />}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* SUBJECT ROWS */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Subject-wise Score</p>
                {rows.length === 0 && (
                  <div className="p-6 text-center text-red-400 text-[10px] font-black bg-white rounded-3xl border border-dashed">
                    IS CLASS/EXAM KA SUBJECT TIMETABLE ME NAHI MILA.
                  </div>
                )}
                {rows.map((r, i) => (
                  <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-300 text-[10px]">{i + 1}</div>
                    <div className="flex-1">
                      <span className="font-black text-slate-700 uppercase text-[11px] block italic leading-tight">{displayName(r.subject)}</span>
                      <span className="text-[8px] font-bold text-slate-300 uppercase italic">Out of {r.total}</span>
                    </div>
                    <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 focus-within:bg-white focus-within:border-indigo-400 transition-all">
                        <input
                          type="number"
                          value={r.marks}
                          onChange={(e) => setRows(rows.map((row, idx) => idx === i ? { ...row, marks: e.target.value } : row))}
                          className="w-10 text-center font-black text-indigo-600 bg-transparent outline-none text-sm"
                          placeholder="--"
                        />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SAVE BUTTON */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t">
              <button onClick={saveResult} disabled={loading || !selectedStudent} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl active:scale-95 disabled:bg-slate-200 flex items-center justify-center gap-3 transition-all">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={20}/> Publish Result</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
