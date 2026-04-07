import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { db } from "./firebase"; // Apna firebase config import karein
import { doc, getDoc } from "firebase/firestore";

// Components Import
import LoginScreen from "./page/Login";
import DashboardWeb from "./page/Dashboard";
import AttendanceWeb from "./page/AttendanceScreen";
import FinalResultWeb from "./page/FinalResultPage";
import TeacherSchedule from "./page/TeacherSchedule";
import AddHomework from "./page/AddHomework";

// --- Verifying Protected Route ---
const ProtectedRoute = ({ children }) => {
  const [isValid, setIsValid] = useState(null); // null = loading, true = valid, false = invalid
  const teacherData = localStorage.getItem("teacher");
  const teacher = teacherData ? JSON.parse(teacherData) : null;

  useEffect(() => {
    const verifyTeacher = async () => {
      if (!teacher || !teacher.id) {
        setIsValid(false);
        return;
      }

      try {
        // Firebase mein check karein ki ye teacher ID exit karti hai ya nahi
        const docRef = doc(db, "teachers", teacher.id); // 'teachers' aapke collection ka naam
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setIsValid(true);
        } else {
          // Agar database mein ID nahi mili toh logout kardo
          console.log("Teacher ID mismatch or deleted!");
          localStorage.removeItem("teacher");
          setIsValid(false);
        }
      } catch (error) {
        console.error("Verification failed:", error);
        setIsValid(false);
      }
    };

    verifyTeacher();
  }, [teacher]);

  // Loading state jab tak Firebase check kar raha hai
  if (isValid === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return isValid ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginScreen />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><DashboardWeb /></ProtectedRoute>} />
        <Route path="/student-attendance" element={<ProtectedRoute><AttendanceWeb /></ProtectedRoute>} />
        <Route path="/final-result" element={<ProtectedRoute><FinalResultWeb /></ProtectedRoute>} />
        <Route path="/teacherschedule" element={<ProtectedRoute><TeacherSchedule /></ProtectedRoute>} />
        <Route path="/addhomework" element={<ProtectedRoute><AddHomework /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;