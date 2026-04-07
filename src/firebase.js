// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // 👈 Ye missing tha


const firebaseConfig = {
  apiKey: "AIzaSyCG7phIwUkJPnu_-lAERQlLibpIZ-Yki1U",
  authDomain: "sunshineschool.firebaseapp.com",
  projectId: "sunshineschool",
  storageBucket: "sunshineschool.firebasestorage.app",
  messagingSenderId: "1005205949392",
  appId: "1:1005205949392:web:3705dad14ac7847891c7d5",
  measurementId: "G-LYBEQ54VKF"
};


const app = initializeApp(firebaseConfig);

// 👇 Teeno cheezein export karni zaroori hain
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app); // 👈 Isko add kiya