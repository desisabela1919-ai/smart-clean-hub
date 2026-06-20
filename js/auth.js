// js/auth.js

import { auth, db } from "./firebase-config.js";
import { 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Ambil elemen langsung berdasarkan ID Tombol yang ada di HTML Anda
const btnLogin = document.getElementById("btnLogin");

if (btnLogin) {
    // Gunakan event click langsung pada tombol agar anti-gagal
    btnLogin.addEventListener("click", async (e) => {
        e.preventDefault();

        const idNikField = document.getElementById("login-nik");
        const passwordField = document.getElementById("login-password");

        if (!idNikField || !passwordField) {
            alert("⚠️ Sistem mendeteksi komponen input NIK atau Password di HTML salah ID!");
            return;
        }

        const inputNIK = idNikField.value.trim().toUpperCase();
        const inputPassword = passwordField.value;

        if (inputNIK === "" || inputPassword === "") {
            alert("⚠️ Harap isi NIK dan Password Anda terlebih dahulu!");
            return;
        }

        btnLogin.innerText = "⏳ Memproses Masuk...";
        btnLogin.disabled = true;

        try {
            // Cari data di Firestore berdasarkan NIK
            const q = query(collection(db, "users"), where("nik", "==", inputNIK));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("⚠️ ID / NIK tidak ditemukan di database!");
                btnLogin.innerText = "Masuk";
                btnLogin.disabled = false;
                return;
            }

            let userEmail = "";
            let userRole = "";
            let userStatus = "";

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                userRole = data.role;
                userStatus = data.status;
                
                if (inputNIK === "OWNER01" || userRole === "admin") {
                    userEmail = "admin@smartcleanhub.com";
                } else {
                    userEmail = `${inputNIK.toLowerCase()}@smartcleanhub.com`;
                }
            });

            // Kirim data ke Firebase Auth
            await signInWithEmailAndPassword(auth, userEmail, inputPassword);
            
            // Arahkan halaman sesuai role
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
            alert("⚠️ Kata sandi (Password) yang Anda masukkan salah!");
            btnLogin.innerText = "Masuk";
            btnLogin.disabled = false;
        }
    });
}

// Cek Sesi Aktif
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
