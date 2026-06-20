// js/auth.js

// Impor pipa koneksi Firebase yang sudah kita buat terpisah sebelumnya
import { auth, db } from "./firebase-config.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// LOGIKA 1: PENDAFTARAN KARYAWAN (REGISTER)
// ==========================================
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // Mencegah halaman reload saat tombol diklik

        const nama = document.getElementById("regNama").value.trim();
        const whatsapp = document.getElementById("regWhatsapp").value.trim();
        const password = document.getElementById("regPassword").value;
        const passwordConfirm = document.getElementById("regPasswordConfirm").value;

        // Validasi kesamaan password
        if (password !== passwordConfirm) {
            alert("⚠️ Konfirmasi password tidak cocok!");
            return;
        }

        // Karena Firebase Auth membutuhkan email, kita buat email virtual berbasis nomor WhatsApp
        // Contoh: 08123456789@smartcleanhub.com
        const emailVirtual = `${whatsapp}@smartcleanhub.com`;

        try {
            // 1. Daftarkan akun ke Firebase Authentication gembok keamanan
            const userCredential = await createUserWithEmailAndPassword(auth, emailVirtual, password);
            const user = userCredential.user;

            // 2. Simpan detail profil ke Firestore Database dengan status PENDING
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                nama: nama,
                whatsapp: whatsapp,
                role: "karyawan", // Standar pendaftaran awal sebagai karyawan
                status: "pending", // Menunggu approval dari Team Leader
                nik: "", // NIK masih kosong, nanti otomatis dibuat oleh TL saat diapprove
                tanggalDaftar: new Date().toISOString()
            });

            alert("✅ Pengajuan berhasil! Akun Anda berstatus PENDING. Silakan hubungi Team Leader Anda untuk aktivasi akun.");
            window.location.href = "index.html"; // Kembalikan ke halaman login

        } catch (error) {
            console.error("Error saat mendaftar:", error);
            if (error.code === "auth/email-already-in-use") {
                alert("⚠️ Nomor WhatsApp ini sudah pernah diajukan sebelumnya!");
            } else {
                alert("⚠️ Gagal mengajukan pendaftaran: " + error.message);
            }
        }
    });
}

// ==========================================
// LOGIKA 2: MASUK APLIKASI (LOGIN DENGAN NIK)
// ==========================================
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const inputNIK = document.getElementById("usernameNIK").value.trim().toUpperCase();
        const password = document.getElementById("password").value;

        try {
            // 1. Cari data di Firestore untuk mencocokkan NIK yang diinput
            const q = query(collection(db, "users"), where("nik", "==", inputNIK));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                alert("⚠️ ID / NIK tidak ditemukan!");
                return;
            }

            // Ambil data user yang ditemukan
            let userData = null;
            querySnapshot.forEach((doc) => {
                userData = doc.data();
            });

            // 2. Cek status akun, wajib APPROVED
            if (userData.status === "pending") {
                alert("🔒 Akun Anda masih berstatus PENDING. Mohon tunggu persetujuan dari Team Leader.");
                return;
            }

            // 3. Jika approved, lakukan login ke Firebase Auth menggunakan email virtualnya
            const emailVirtual = `${userData.whatsapp}@smartcleanhub.com`;
            await signInWithEmailAndPassword(auth, emailVirtual, password);

            // 4. Arahkan halaman sesuai Hak Akses (Role) masing-masing
            alert(`👋 Selamat datang kembali, ${userData.nama}!`);
            
            if (userData.role === "admin") {
                window.location.href = "dashboard-admin.html";
            } else if (userData.role === "team_leader") {
                window.location.href = "dashboard-tl.html";
            } else {
                window.location.href = "dashboard-cs.html";
            }

        } catch (error) {
            console.error("Error saat login:", error);
            alert("⚠️ Gagal masuk. Pastikan password yang Anda masukkan benar.");
        }
    });
}
