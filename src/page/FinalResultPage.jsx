import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../firebase'; 
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// 👇 Quarterly = "First Term", Half-Yearly = "Second Term" (jaisa AdmitCardGenerator.jsx mein hai)
const examDisplayNames = {
  "Quarterly": "First Term",
  "Half-Yearly": "Second Term",
  "Annual": "Annual",
  "Pre-Board": "Pre-Board"
};

// 👇 Grade criteria — image ke sample card wali table
const GRADE_CRITERIA = [
  { range: "91% to 100%", grade: "A+ Excellent" },
  { range: "81% to 90%", grade: "A Very Good" },
  { range: "71% to 80%", grade: "B+ Good" },
  { range: "61% to 70%", grade: "B Above Average" },
  { range: "51% to 60%", grade: "C Average" },
  { range: "40% to 50%", grade: "D Satisfactory" },
  { range: "0% to 39%", grade: "E Unsatisfactory" },
];

const getGrade = (pct) => {
  const p = Number(pct) || 0;
  if (p >= 91) return "A+";
  if (p >= 81) return "A";
  if (p >= 71) return "B+";
  if (p >= 61) return "B";
  if (p >= 51) return "C";
  if (p >= 40) return "D";
  return "E";
};

// 👇 2 students ke groups (pairs) banane ke liye — har group = 1 printed A4 landscape page
const chunkIntoPairs = (arr) => {
  const pairs = [];
  for (let i = 0; i < arr.length; i += 2) {
    pairs.push(arr.slice(i, i + 2));
  }
  return pairs;
};

export default function AllReport() {
  const { className, session } = useParams(); 
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const examType = searchParams.get("exam") || "Half-Yearly";

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [school, setSchool] = useState({
    name: "Sunshine English Medium School",
    address: "Mahanua Khas, Siddharthnagar",
    affiliation: "UP BOARD",
    contact: "234565467",
    logoUrl: ""
  });

  useEffect(() => {
    let isMounted = true;
    const fetchResults = async () => {
      if (!className || !session) return;
      
      try {
        setLoading(true);
        const schoolSnap = await getDoc(doc(db, "settings", "schoolDetails"));
        if (schoolSnap.exists() && isMounted) setSchool(schoolSnap.data());

        const paramValue = className.toLowerCase().trim();
        
        const isClassRequest = 
          paramValue.includes("class") || 
          ["lkg", "ukg", "nursery"].includes(paramValue);

        let q;
        const resultsRef = collection(db, "examResults");

        if (isClassRequest) {
          let dbClassName = className;
          if (className.startsWith("Class") && !className.includes(" ")) {
            dbClassName = className.replace("Class", "Class ");
          } else if (!className.startsWith("Class") && !["lkg", "ukg", "nursery"].includes(paramValue)) {
            dbClassName = `Class ${className}`;
          }

          q = query(
            resultsRef, 
            where("className", "==", dbClassName),
            where("session", "==", session),
            where("exam", "==", examType),
            where("delete_at", "==", null)
          );
        } else {
          q = query(
            resultsRef, 
            where("studentId", "==", className), 
            where("session", "==", session),
            where("exam", "==", examType),
            where("delete_at", "==", null)
          );
        }
        
        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });

        results.sort((a, b) => (parseInt(a.srNo) || 999) - (parseInt(b.srNo) || 999));
        
        if (isMounted) setData(results);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchResults();
    return () => { isMounted = false; };
  }, [className, session, examType]);

  const handlePrint = () => window.print();
  const onClose = () => navigate(-1);

  if (loading) return (
    <div className="fixed inset-0 bg-zinc-900 flex flex-col items-center justify-center text-white italic">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="tracking-widest font-bold uppercase">Preparing Reports...</p>
    </div>
  );

  const examLabel = examDisplayNames[examType] || examType;
  const pairs = chunkIntoPairs(data);

  // 👇 Ek single report card ka JSX — 2 side-by-side (A4 landscape) card ke hisaab se compact
  const renderCard = (student) => {
    const rows = student.rows || [];
    const grandTotalObt = rows.reduce((s, r) => s + (Number(r.marks) || 0), 0);
    const grandTotalMax = rows.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const percent = grandTotalMax ? ((grandTotalObt / grandTotalMax) * 100).toFixed(1) : "0.0";

    return (
      <div key={student.id} className="report-card bg-white flex flex-col text-black font-serif overflow-hidden">
        <div className="border-2 border-black h-full w-full flex flex-col overflow-hidden">

          {/* HEADER */}
          <div className="flex items-center border-b-2 border-black flex-shrink-0">
            <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center p-0.5">
              {school.logoUrl && <img src={school.logoUrl} alt="Logo" className="w-full h-full object-contain" />}
            </div>
            <div className="flex-1 text-center py-0.5 px-1 leading-tight">
              <h1 className="text-[13px] font-black uppercase leading-tight">{school.name}</h1>
              <h2 className="text-[8px] font-bold uppercase leading-tight">{school.address}</h2>
              <h3 className="text-[11px] font-black uppercase mt-0.5 border-t-2 border-black inline-block pt-0.5 px-3 leading-tight">
                {examLabel} EXAM REPORT
              </h3>
            </div>
            <div className="w-11 flex-shrink-0"></div>
          </div>

          {/* NAME + SESSION */}
          <div className="grid grid-cols-3 border-b-2 border-black text-[10px] font-bold flex-shrink-0">
            <div className="col-span-2 border-r-2 border-black px-1.5 py-1">
              Student's Name : <span className="uppercase">{student.name}</span>
            </div>
            <div className="px-1.5 py-1">Session : {student.session}</div>
          </div>

          {/* FATHER'S NAME */}
          <div className="border-b-2 border-black px-1.5 py-1 text-[10px] font-bold flex-shrink-0">
            Father's Name : <span className="uppercase">{student.fatherName || '---'}</span>
          </div>

          {/* CLASS + ROLL NO */}
          <div className="grid grid-cols-2 border-b-2 border-black text-[10px] font-bold flex-shrink-0">
            <div className="border-r-2 border-black px-1.5 py-1">Class : {student.className}</div>
            <div className="px-1.5 py-1">Roll No. : {student.examRollNo || '---'}</div>
          </div>

          {/* ACADEMIC PERFORMANCE TITLE */}
          <div className="text-center border-b-2 border-black py-1 font-black text-[11px] uppercase bg-slate-50 flex-shrink-0">
            Academic Performance
          </div>

          {/* MARKS TABLE */}
          <table className="w-full border-collapse text-[10px] flex-shrink-0">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left p-1 border-r-2 border-black">Subjects</th>
                <th className="p-1 border-r-2 border-black w-12">Max.</th>
                <th className="p-1 border-r-2 border-black w-12">Obt.</th>
                <th className="p-1 border-r-2 border-black w-14">%</th>
                <th className="p-1 w-12">Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const subPct = r.total ? ((Number(r.marks || 0) / Number(r.total)) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={i} className="border-b border-black">
                    <td className="p-1 border-r-2 border-black font-bold uppercase">{r.subject}</td>
                    <td className="p-1 border-r-2 border-black text-center">{r.total}</td>
                    <td className="p-1 border-r-2 border-black text-center font-black">{r.marks}</td>
                    <td className="p-1 border-r-2 border-black text-center">{subPct}%</td>
                    <td className="p-1 text-center font-black">{getGrade(subPct)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-black bg-slate-50">
                <td className="p-1 border-r-2 border-black">G.TOTAL</td>
                <td className="p-1 border-r-2 border-black text-center">{grandTotalMax}</td>
                <td className="p-1 border-r-2 border-black text-center">{grandTotalObt}</td>
                <td className="p-1 border-r-2 border-black text-center">{percent}%</td>
                <td className="p-1 text-center">{getGrade(percent)}</td>
              </tr>
            </tfoot>
          </table>

          {/* SUMMARY + REMARKS — flex-1 fills leftover height so Grade Criteria + Seal sit pinned at bottom */}
          <div className="grid grid-cols-2 border-t-2 border-black flex-1 min-h-0 text-[9px] font-bold">
            <div className="border-r-2 border-black flex flex-col">
              {[
                ["PERCENTAGE", `${percent}%`],
                ["GRADE", getGrade(percent)],
                ["P.T.", ""],
                ["RANK", ""],
                ["ATTENDANCE", ""],
              ].map(([label, val], i) => (
                <div key={i} className="grid grid-cols-2 border-b border-black flex-1 min-h-0">
                  <span className="px-1.5 flex items-center border-r border-black">{label}</span>
                  <span className="px-1.5 flex items-center">{val}</span>
                </div>
              ))}
              <div className="grid grid-cols-3 border-t border-black flex-shrink-0">
                <span className="px-1 py-1.5 border-r border-black text-center">Sig:Teacher</span>
                <span className="px-1 py-1.5 border-r border-black text-center">Sig:Principal</span>
                <span className="px-1 py-1.5 text-center">Sig:Parent</span>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-center font-black py-1 border-b border-black uppercase text-[10px]">Remarks</div>
              <div className="flex-1"></div>
            </div>
          </div>

          {/* GRADE CRITERIA + SCHOOL SEAL — pinned at the true bottom of the card */}
          <div className="grid grid-cols-2 border-t-2 border-black flex-shrink-0">
            <div className="border-r-2 border-black">
              <div className="text-center font-black border-b border-black py-0.5 uppercase text-[9px]">Grade Criteria</div>
              <table className="w-full text-[8px]">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="p-0.5 border-r border-black">Range</th>
                    <th className="p-0.5">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {GRADE_CRITERIA.map((g) => (
                    <tr key={g.range} className="border-b border-black last:border-b-0">
                      <td className="p-0.5 border-r border-black text-center">{g.range}</td>
                      <td className="p-0.5 text-center">{g.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center font-black text-[11px] uppercase min-h-[22mm]">
              School Seal
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-800 p-4 md:p-10 overflow-y-auto">
      
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          #printable-area, #printable-area * { visibility: visible !important; }
          #printable-area { 
            position: absolute !important; left: 0 !important; top: 0 !important; 
            width: 100% !important; padding: 0 !important; margin: 0 !important;
          }
          /* 👇 A4 LANDSCAPE — 1 paper me 2 report card side by side */
          @page { size: A4 landscape; margin: 0; }
          .print-sheet {
            width: 297mm !important;
            height: 210mm !important;
            padding: 4mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            background: white !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 4mm !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          .print-sheet:last-child { page-break-after: auto !important; }
          .report-card {
            width: 50% !important;
            height: 100% !important;
            overflow: hidden !important;
          }
        }
      `}} />

      <div className="fixed bottom-10 right-10 flex flex-col gap-4 z-[1000] no-print">
        <button onClick={handlePrint} className="px-8 py-3 bg-emerald-600 text-white font-black rounded-full shadow-2xl border-2 border-white/20 hover:scale-105 transition-all">
          🖨️ PRINT {data.length === 1 ? "REPORT" : `ALL (${data.length})`}
        </button>
        <button onClick={onClose} className="px-8 py-3 bg-white text-red-600 font-black rounded-full shadow-2xl border-2 border-red-100">
          CLOSE
        </button>
      </div>

      <div id="printable-area" className="w-full flex flex-col items-center gap-10">
        {data.length === 0 ? (
           <div className="text-white bg-zinc-900/50 p-10 rounded-xl text-center">
             <h2 className="text-2xl font-bold uppercase italic">No Result Found</h2>
             <p className="text-zinc-400">Please check the ID or Class name in the URL, or ensure {examType} data is not deleted.</p>
           </div>
        ) : (
          pairs.map((pair, pageIdx) => (
            <div
              key={pageIdx}
              className="print-sheet bg-zinc-100 shadow-2xl flex flex-row gap-4 p-4"
              style={{ width: '297mm', minHeight: '210mm' }}
            >
              {pair.map((student) => renderCard(student))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
