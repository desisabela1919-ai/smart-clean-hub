// js/auth.js

import { auth, db } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc,
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const btnLogin = document.getElementById("btnLogin");

if (btnLogin) {
    btnLogin.addEventListener("click", async (e) => {
        e.preventDefault();

        const idNikField = document.getElementById("login-nik");
        const passwordField = document.getElementById("login-password");

        const inputNIK = idNikField.value.trim().toUpperCase();
        const inputPassword = passwordField.value;

        if (inputNIK === "" || inputPassword === "") {
            alert("⚠️ Harap isi NIK dan Password Anda terlebih dahulu!");
            return;
        }

        btnLogin.innerText = "⏳ Memproses Masuk...";
        btnLogin.disabled = true;

        // Tentukan email berdasarkan NIK inputan
        let userEmail = "";
        if (inputNIK === "OWNER01") {
            userEmail = "admin@smartcleanhub.com";
        } else {
            userEmail = `${inputNIK.toLowerCase()}@smartcleanhub.com`;
        }

        try {
            // Langkah 1: Langsung verifikasi Email & Password ke Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, userEmail, inputPassword);
            const user = userCredential.user;

            // Langkah 2: Ambil data profil di Firestore langsung menggunakan User UID (Pasti Ketemu)
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("⚠️ Akun Auth ada, tetapi data profil Anda di Firestore tidak ditemukan!");
                btnLogin.innerText = "Masuk";
                btnLogin.disabled = false;
                return;
            }

            const userData = docSnap.data();
            const userRole = userData.role;
            const userStatus = userData.status;

            // Langkah 3: Pengalihan Halaman sesuai Hak Akses (Role)
            if (userRole === "admin") {
                window.location.href = "dashboard-admin.html";
            } else if (userRole === "tl") {
                window.location.href = "dashboard-tl.html";
            } else {
                if (userStatus === "approved") {
                    window.location.href = "dashboard-cs.html";
                } else {
                    alert("⏳ Akun Anda masih dalam antrean persetujuan (Pending) oleh Team Leader.");
                    btnLogin.innerText = "Masuk";
                    btnLogin.disabled = false;
                }
            }

        } catch (error) {
            console.error("Login Eror:", error);
            // Jika email/password salah atau user tidak terdaftar di Authentication
            alert("⚠️ Login Gagal! ID/NIK atau Password yang Anda masukkan keliru.");
            btnLogin.innerText = "Masuk";
            btnLogin.disabled = false;
        }
    });
}

// Cek Sesi Aktif saat halaman dimuat
onAuthStateChanged(auth, async (user) => {
    if (user && window.location.pathname.endsWith("index.html")) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === "admin") window.location.href = "dashboard-admin.html";
                if (userData.role === "tl") window.location.href = "dashboard-tl.html";
                if (userData.role === "karyawan" && userData.status === "approved") window.location.href = "dashboard-cs.html";
            }
        } catch (err) {
            console.log("Sesi aman.");
        }
    }
});
