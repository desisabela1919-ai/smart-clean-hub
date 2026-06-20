// js/register.js
import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const btnRegister = document.getElementById("register-btn");

if (btnRegister) {
    btnRegister.addEventListener("click", async (e) => {
        e.preventDefault();

        const namaField = document.getElementById("regNama");
        const whatsappField = document.getElementById("regWhatsapp");
        const passwordField = document.getElementById("regPassword");
        const confirmPasswordField = document.getElementById("regPasswordConfirm");
        const roleField = document.getElementById("regRole"); // Ambil elemen dropdown role baru

        const nama = namaField.value.trim();
        let whatsapp = whatsappField.value.trim();
        const password = passwordField.value;
        const confirmPassword = confirmPasswordField.value;
        const roleTerpilih = roleField ? roleField.value : "karyawan"; // Default ke karyawan jika element tidak ditemukan

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

        // Bersihkan format nomor WhatsApp (ubah 08 menjadi format internasional 62 jika diperlukan)
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

            // Langkah 2: Simpan profil lengkap ke Cloud Firestore secara dinamis mengikuti roleTerpilih
            await setDoc(doc(db, "users", user.uid), {
                nama: nama,
                whatsapp: whatsapp,
                nik: whatsapp, // NIK diisi dengan nomor WhatsApp sebagai ID unik karyawan/TL
                role: roleTerpilih, // Menyimpan "karyawan" atau "tl" sesuai pilihan di form
                status: "pending" // Menunggu persetujuan admin Anda di dasbor Super Admin
            });

            // Berikan label teks yang rapi di alert pemberitahuan
            const teksJabatan = roleTerpilih === "tl" ? "Team Leader (TL)" : "Cleaner / CS";

            alert(`✅ Pendaftaran Berhasil!\nAkun Anda sebagai ${teksJabatan} atas nama ${nama} telah diajukan. Silakan hubungi Mas Adriansyah untuk persetujuan akun.`);
            
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
