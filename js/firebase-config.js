import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Isi tanda kutip di bawah ini dengan data asli dari konsol Firebase Anda nanti.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "smart-clean-hub.firebaseapp.com",
    projectId: "smart-clean-hub",
    storageBucket: "smart-clean-hub.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID_HERE",
    appId: "YOUR_APP_ID_HERE"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor fungsi agar siap dipakai di file JavaScript halaman lainnya secara terpisah
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
