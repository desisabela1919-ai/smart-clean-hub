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

const loginForm = document.getElementById("login-form");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const inputNIK = document.getElementById("login-nik").value.trim().toUpperCase();
        const inputPassword = document.getElementById("login-password").value;
        const submitBtn = e.target.querySelector("button[type='submit']");

        submitBtn.innerText = "⏳ Memproses Masuk...";
        submitBtn.disabled = true;

        try {
            // STRATEGI BARU: Cari data di Firestore berdasarkan NIK terlebih dahulu
            const q = query(collection(db, "users"), where("nik", "==", inputNIK));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("⚠️ ID / NIK tidak ditemukan di database!");
                submitBtn.innerText = "Masuk";
                submitBtn.disabled = false;
                return;
            }

            // Jika NIK ditemukan, ambil data email virtualnya (atau pakai default jika admin)
            let userEmail = "";
            let userRole = "";
            let userStatus = "";

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                userRole = data.role;
                userStatus = data.status;
                
                // Jika Anda admin, pasangkan dengan email admin resmi Anda
                if (inputNIK === "OWNER01" || userRole === "admin") {
                    userEmail = "admin@smartcleanhub.com";
                } else {
                    // Untuk karyawan, kita buatkan email virtual berbasis NIK otomatis
                    userEmail = `${inputNIK.toLowerCase()}@smartcleanhub.com`;
                }
            });

            // Eksekusi verifikasi password ke Firebase Authentication
            await signInWithEmailAndPassword(auth, userEmail, inputPassword);
            
            // Pengalihan halaman otomatis sesuai Role setelah sukses login
            if (userRole === "admin") {
                window.location.href = "dashboard-admin.html";
            } else if (userRole === "tl") {
                window.location.href = "dashboard-tl.html";
            } else {
                if (userStatus === "approved") {
                    window.location.href = "dashboard-cs.html";
                } else {
                    alert("⏳ Akun Anda masih dalam antrean persetujuan (Pending) oleh Team Leader.");
                    submitBtn.innerText = "Masuk";
                    submitBtn.disabled = false;
                }
            }

        } catch (error) {
            console.error("Login Eror:", error);
            alert("⚠️ Kata sandi (Password) yang Anda masukkan salah!");
            submitBtn.innerText = "Masuk";
            submitBtn.disabled = false;
        }
    });
}

// Proteksi Halaman: Jika sudah login, dilarang kembali ke index.html sebelum logout
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
            console.log("Sesi cek aman.");
        }
    }
});
