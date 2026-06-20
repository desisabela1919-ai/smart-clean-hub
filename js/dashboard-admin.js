// js/dashboard-admin.js

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    onSnapshot, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. PROTEKSI HALAMAN KHUSUS SUPER ADMIN (OWNER)
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Ambil data profil untuk memastikan role adalah admin
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role !== "admin") {
                alert("⚠️ Akses ditolak! Halaman ini khusus untuk Owner / Super Admin.");
                window.location.href = "index.html";
                return;
            }
            // Panggil fungsi monitoring jika validasi admin sukses
            muatStatistikAdmin();
            pantauLogAbsensiHariIni();
        }
    } else {
        window.location.href = "index.html";
    }
});

// LOGOUT ADMIN
document.getElementById("btnLogout").addEventListener("click", () => {
    signOut(auth).then(() => {
        alert("✅ Berhasil keluar dari Dashboard Admin.");
        window.location.href = "index.html";
    });
});

// ==========================================
// 2. HITUNG TOTAL KARYAWAN AKTIF DI DATABASE
// ==========================================
async function muatStatistikAdmin() {
    try {
        const qKaryawan = query(collection(db, "users"), where("role", "==", "karyawan"), where("status", "==", "approved"));
        const snapshot = await getDocs(qKaryawan);
        // Tampilkan jumlah karyawan aktif ke kotak summary
        document.getElementById("total-karyawan").innerText = snapshot.size;
    } catch (error) {
        console.error("Gagal memuat total tim:", error);
    }
}

// ==========================================
// 3. MONITORING LOG ABSENSI TIM SECARA REAL-TIME
// ==========================================
function pantauLogAbsensiHariIni() {
    const listLogContainer = document.getElementById("list-log-absen");
    const totalHadirBadge = document.getElementById("total-hadir");
    
    const stringTanggalHariIni = new Date().toLocaleDateString('id-ID');
    
    // Query untuk mencari siapa saja yang sudah absen masuk ("Masuk") hari ini
    const qAbsen = query(
        collection(db, "attendance"), 
        where("tanggal", "==", stringTanggalHariIni),
        where("tipe", "==", "Masuk")
    );

    // Menggunakan onSnapshot agar monitor layar Anda langsung terupdate otomatis 
    // di HP tanpa reload jika di lapangan ada CS yang baru klik absen masuk.
    onSnapshot(qAbsen, (querySnapshot) => {
        listLogContainer.innerHTML = "";
        totalHadirBadge.innerText = querySnapshot.size;

        if (querySnapshot.empty) {
            listLogContainer.innerHTML = '<p class="empty-state">Belum ada tim yang melakukan absensi hari ini.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const log = docSnap.data();
            
            const cardLog = document.createElement("div");
            cardLog.className = "approve-card"; // Menggunakan style class yang serasi
            cardLog.innerHTML = `
                <div class="info">
                    <h4>${log.nama} (${log.nik})</h4>
                    <p>Jam Masuk: <b>${log.jam} WIB</b></p>
                </div>
                <button class="btn-approve" style="background-color: var(--accent-blue);" data-foto="${log.fotoUrl}" data-lat="${log.koordinat.lat}" data-lon="${log.koordinat.lon}">
                    Cek Bukti
                </button>
            `;
            
            listLogContainer.appendChild(cardLog);
        });

        // Event listener untuk tombol cek bukti absensi lapangan
        const btnBukti = document.querySelectorAll(".btn-approve");
        btnBukti.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const urlFoto = e.target.getAttribute("data-foto");
                const lat = e.target.getAttribute("data-lat");
                const lon = e.target.getAttribute("data-lon");
                
                // Membuka tab baru untuk melihat foto selfie asli dan posisi koordinat map karyawan
                alert(`Buka Bukti Absen:\nKoordinat GPS: ${lat}, ${lon}\n\nKlik OK untuk melihat foto selfie tim.`);
                window.open(urlFoto, '_blank');
            });
        });
    });
}
