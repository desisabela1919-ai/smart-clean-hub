import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Konfigurasi asli Firebase Smart Clean Hub Anda
const firebaseConfig = {
  apiKey: "AIzaSyAvrdcUo1Z8iJYNAaYdgfSAGPBdEM9DJjw",
  authDomain: "smart-clean-hub-7315d.firebaseapp.com",
  projectId: "smart-clean-hub-7315d",
  storageBucket: "smart-clean-hub-7315d.firebasestorage.app",
  messagingSenderId: "211576643760",
  appId: "1:211576643760:web:797910c3404c4828215b75",
  measurementId: "G-XVR0ERJ93R"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Format ekspor disesuaikan agar cocok 100% dengan file js/auth.js
export { auth, db, storage };
