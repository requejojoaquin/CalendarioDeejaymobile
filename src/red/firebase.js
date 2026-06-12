import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQAyv2xdvXeJy3xjtuzFDEfJdW9e_O1VM",
  authDomain: "mi-calendario-3971c.firebaseapp.com",
  projectId: "mi-calendario-3971c",
  storageBucket: "mi-calendario-3971c.firebasestorage.app",
  messagingSenderId: "295171983709",
  appId: "1:295171983709:web:677d4f437368b0617100b4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);