// js/dashboard-tl.js

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    onSnapshot, 
    updateDoc, 
    getDocs, 
    orderBy, 
    limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. PROTEKSI HALAMAN & AMBIL DATA TL YANG LOGIN
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Ambil profil user dari Firestore untuk memastikan dia adalah Team Leader
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role !== "team_leader" && userData.role !== "admin") {
                alert("⚠️ Akses ditolak! Halaman ini khusus Team Leader / Admin.");
                window.location.href = "index.html";
                return;
            }
            // Tampilkan nama dan ID TL di komponen header
            document.getElementById("tlNama").innerText = userData.nama;
            document.getElementById("tlNIK").innerText = `ID: ${userData.nik || 'TL / Admin'}`;
        }
    } else {
        // Jika tidak ada user login, tendang kembali ke halaman login utama
        window.location.href = "index.html";
    }
});

// 2. LOGIKA TOMBOL KELUAR (LOGOUT)
const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        signOut(auth).then(() => {
            alert("✅ Berhasil keluar akun.");
            window.location.href = "index.html";
        });
    });
}

// 3. MENAMPILKAN DAFTAR KARYAWAN PENDING SECARA REAL-TIME
const listContainer = document.getElementById("list-pending-karyawan");
const countBadge = document.getElementById("count-pending");

if (listContainer) {
    const q = query(collection(db, "users"), where("status", "==", "pending"));
    
    // Menggunakan onSnapshot agar daftar langsung update otomatis tanpa reload jika ada yang daftar baru
    onSnapshot(q, (querySnapshot) => {
        listContainer.innerHTML = "";
        let totalPending = querySnapshot.size;
        countBadge.innerText = totalPending;

        if (querySnapshot.empty) {
            listContainer.innerHTML = '<p class="empty-state">Tidak ada pendaftaran baru.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const karyawan = docSnap.data();
            
            const card = document.createElement("div");
            card.className = "approve-card";
            card.innerHTML = `
                <div class="info">
                    <h4>${karyawan.nama}</h4>
                    <p>WA: ${karyawan.whatsapp}</p>
                </div>
                <button class="btn-approve" data-id="${karyawan.uid}">Approve</button>
            `;
            
            listContainer.appendChild(card);
        });

        // Pasang event listener klik untuk semua tombol approve yang muncul
        const approveButtons = document.querySelectorAll(".btn-approve");
        approveButtons.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const uidKaryawan = e.target.getAttribute("data-id");
                prosesApprovalKaryawan(uidKaryawan);
            });
        });
    });
}

// =======================================================
// 4. OTOMATISASI PENOMORAN NIK DAN PROSES APPROVAL
// =======================================================
async function prosesApprovalKaryawan(uid) {
    const konfirmasi = confirm("Apakah Anda yakin ingin menyetujui karyawan ini?");
    if (!konfirmasi) return;

    try {
        // A. Cari tahu nomor urut terakhir karyawan (CS) yang sudah aktif di database
        const qTerakhir = query(
            collection(db, "users"), 
            where("role", "==", "karyawan"),
            where("nik", "!=", ""), // Pastikan NIK nya ada isi
            orderBy("nik", "desc"), 
            limit(1)
        );
        
        const snapshotTerakhir = await getDocs(qTerakhir);
        let nomorUrutBaru = 1; // Default jika ini adalah karyawan pertama kali

        if (!snapshotTerakhir.empty) {
            snapshotTerakhir.forEach((docUrut) => {
                const nikTerakhir = docUrut.data().nik; // Contoh hasil: "CS002"
                // Potong teks "CS" dan ambil angkanya saja ("002"), lalu ubah ke integer (2)
                const angkaTerakhir = parseInt(nikTerakhir.substring(2));
                nomorUrutBaru = angkaTerakhir + 1; // Naikkan 1 angka menjadi 3
            });
        }

        // B. Ubah angka urut menjadi format 3 digit (contoh: 3 jadi "003", 12 jadi "012")
        const stringAngkaUrut = String(nomorUrutBaru).padStart(3, '0');
        const NIK_Otomatis = `CS${stringAngkaUrut}`; // Hasil akhir: "CS003"

        // C. Update data karyawan tersebut ke Firestore Database
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            status: "approved",
            nik: NIK_Otomatis
        });

        alert(`✅ Akun berhasil di-Approve!\nResmi terdaftar dengan NIK: ${NIK_Otomatis}`);

    } catch (error) {
        console.error("Gagal melakukan approval:", error);
        alert("⚠️ Terjadi kesalahan saat memproses approval: " + error.message);
    }
}
