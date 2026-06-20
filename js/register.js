// js/register.js
import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const btnRegister = document.getElementById("register-btn");

if (btnRegister) {
    btnRegister.addEventListener("click", async (e) => {
        e.preventDefault();

        const namaField = document.getElementById("regNama");
        const whatsappField = document.getElementById("regWhatsapp");
        const passwordField = document.getElementById("regPassword");
        const confirmPasswordField = document.getElementById("regPasswordConfirm");
        const roleField = document.getElementById("regRole");

        const nama = namaField.value.trim();
        let whatsapp = whatsappField.value.trim();
        const password = passwordField.value;
        const confirmPassword = confirmPasswordField.value;
        const roleTerpilih = roleField ? roleField.value : "karyawan";

        // Validasi input kosong
        if (!nama || !whatsapp || !password || !confirmPassword || !roleTerpilih) {
            alert("⚠️ Semua kolom wajib diisi!");
            return;
        }

        // Validasi kesamaan password
        if (password !== confirmPassword) {
            alert("⚠️ Password dan Konfirmasi Password tidak cocok!");
            return;
        }

        // Validasi panjang password
        if (password.length < 6) {
            alert("⚠️ Password minimal harus 6 karakter!");
            return;
        }

        // Bersihkan format nomor WhatsApp (ubah 08 menjadi format internasional 62)
        if (whatsapp.startsWith("0")) {
            whatsapp = "62" + whatsapp.slice(1);
        }

        btnRegister.innerText = "⏳ Memproses Pendaftaran...";
        btnRegister.disabled = true;

        // Membuat email virtual otomatis dari nomor WhatsApp untuk Firebase Auth
        const virtualEmail = `${whatsapp}@smartcleanhub.com`;

        try {
            // Langkah 1: Daftarkan akun ke Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, password);
            const user = userCredential.user;

            // Langkah 2: Simpan profil lengkap ke Cloud Firestore dengan status 'pending'
            await setDoc(doc(db, "users", user.uid), {
                nama: nama,
                whatsapp: whatsapp,
                nik: whatsapp,
                role: roleTerpilih,
                status: "pending" 
            });

            // Langkah 3: PROTEKSI UTAMA - Langsung paksa keluar agar tidak otomatis bypass login
            await signOut(auth);

            // Berikan label teks yang rapi di alert pemberitahuan
            const teksJabatan = roleTerpilih === "tl" ? "Team Leader (TL)" : "Cleaner / CS";

            alert(`✅ Pendaftaran Berhasil!\n\nAkun Anda sebagai ${teksJabatan} atas nama ${nama} telah diajukan.\n\nStatus: MENUNGGU PERSETUJUAN OWNER.\nSilakan hubungi Mas Adriansyah untuk aktivasi akun.`);
            
            // Kembalikan ke halaman login
            window.location.href = "index.html";

        } catch (error) {
            console.error("Registrasi Gagal:", error);
            if (error.code === "auth/email-already-in-use") {
                alert("⚠️ Nomor WhatsApp ini sudah terdaftar di sistem!");
            } else {
                alert("⚠️ Terjadi kesalahan: " + error.message);
            }
            btnRegister.innerText = "Ajukan Pendaftaran";
            btnRegister.disabled = false;
        }
    });
}
