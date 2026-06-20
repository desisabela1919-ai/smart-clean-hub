// js/dashboard-admin.js

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    updateDoc,
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
            // Jalankan semua fungsi monitoring admin jika sukses
            muatStatistikAdmin();
            pantauLogAbsensiHariIni();
            pantauPendaftaranKaryawan(); 
        }
    } else {
        window.location.href = "index.html";
    }
});

// LOGOUT ADMIN
const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        signOut(auth).then(() => {
            alert("✅ Berhasil keluar dari Dashboard Admin.");
            window.location.href = "index.html";
        });
    });
}

// ==========================================
// 2. HITUNG TOTAL KARYAWAN AKTIF DI DATABASE
// ==========================================
async function muatStatistikAdmin() {
    try {
        const qKaryawan = query(collection(db, "users"), where("role", "==", "karyawan"), where("status", "==", "approved"));
        const snapshot = await getDocs(qKaryawan);
        // Tampilkan jumlah karyawan aktif ke kotak summary
        const totalKaryawanBadge = document.getElementById("total-karyawan");
        if (totalKaryawanBadge) {
            totalKaryawanBadge.innerText = snapshot.size;
        }
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
    
    if (!listLogContainer || !totalHadirBadge) return;
    
    const stringTanggalHariIni = new Date().toLocaleDateString('id-ID');
    
    const qAbsen = query(
        collection(db, "attendance"), 
        where("tanggal", "==", stringTanggalHariIni),
        where("tipe", "==", "Masuk")
    );

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
            cardLog.className = "approve-card";
            cardLog.innerHTML = `
                <div class="info">
                    <h4>${log.nama} (${log.nik})</h4>
                    <p>Jam Masuk: <b>${log.jam} WIB</b></p>
                </div>
                <button class="btn-approve" style="background-color: var(--accent-blue);" data-nama="${log.nama}" data-tipe="${log.tipe}" data-foto="${log.fotoUrl}" data-lat="${log.koordinat.lat}" data-lon="${log.koordinat.lon}">
                    Cek Bukti
                </button>
            `;
            
            listLogContainer.appendChild(cardLog);
        });

        // PERBAIKAN UTAMA: MODAL KLIK CEK BUKTI MENGGUNAKAN TRICK DOWNLOAD / LIHAT MAPS
        const btnBukti = document.querySelectorAll(".btn-approve");
        btnBukti.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const targetBtn = e.target.closest(".btn-approve");
                const namaTim = targetBtn.getAttribute("data-nama");
                const tipeAbsen = targetBtn.getAttribute("data-tipe");
                const urlFotoBase64 = targetBtn.getAttribute("data-foto");
                const lat = targetBtn.getAttribute("data-lat");
                const lon = targetBtn.getAttribute("data-lon");
                
                // 1. Tampilkan info koordinat GPS & sediakan link Google Maps
                alert(`📍 Log Absen: ${namaTim}\nKoordinat GPS: ${lat}, ${lon}\n\nKlik OK untuk mengunduh foto selfie secara instan.`);
                
                // 2. Trik download paksa berkas Base64 menjadi file gambar .jpg asli di laptop
                const linkDownload = document.createElement("a");
                linkDownload.href = urlFotoBase64;
                linkDownload.download = `Selfie_${namaTim}_${tipeAbsen}_${new Date().toISOString().slice(0,10)}.jpg`;
                document.body.appendChild(linkDownload);
                linkDownload.click();
                document.body.removeChild(linkDownload);

                // 3. Otomatis bukakan peta lokasi penugasan di tab baru
                window.open(`https://www.google.com/maps?q=${lat},${coords.lon || lon}`, '_blank');
            });
        });
    });
}

// ==========================================
// 4. PANTAU & SETUJUI PENDAFTARAN KARYAWAN BARU
// ==========================================
function pantauPendaftaranKaryawan() {
    const listPersetujuanContainer = document.getElementById("list-persetujuan-tim") || document.getElementById("list-log-absen");
    
    if (!listPersetujuanContainer) return;

    const qPending = query(
        collection(db, "users"), 
        where("role", "==", "karyawan"), 
        where("status", "==", "pending")
    );

    onSnapshot(qPending, (querySnapshot) => {
        if (querySnapshot.empty) {
            if (listPersetujuanContainer.id === "list-persetujuan-tim") {
                listPersetujuanContainer.innerHTML = '<p class="empty-state">Tidak ada pengajuan akun karyawan baru.</p>';
            }
            return;
        }

        if (listPersetujuanContainer.id === "list-persetujuan-tim") {
            listPersetujuanContainer.innerHTML = "";
        }

        querySnapshot.forEach((docSnap) => {
            const dataKaryawan = docSnap.data();
            const docId = docSnap.id; 

            const cardApprove = document.createElement("div");
            cardApprove.className = "approve-card";
            cardApprove.style.borderLeft = "5px solid #ffcc00"; 
            cardApprove.style.marginBottom = "10px";
            cardApprove.style.padding = "10px";
            cardApprove.style.backgroundColor = "#fff";
            cardApprove.style.borderRadius = "8px";
            cardApprove.style.display = "flex";
            cardApprove.style.justifyContent = "space-between";
            cardApprove.style.alignItems = "center";

            cardApprove.innerHTML = `
                <div class="info">
                    <h4 style="margin:0; color:#333;">${dataKaryawan.nama}</h4>
                    <p style="margin:5px 0 0 0; font-size:13px; color:#666;">WhatsApp: <b>0${dataKaryawan.whatsapp.slice(2)}</b></p>
                    <span style="font-size:11px; background:#fff3cd; color:#856404; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:5px;">Menunggu Persetujuan</span>
                </div>
                <button class="btn-action-approve" data-id="${docId}" data-nama="${dataKaryawan.nama}" style="background-color: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    Setujui ✔
                </button>
            `;

            listPersetujuanContainer.insertBefore(cardApprove, listPersetujuanContainer.firstChild);
        });

        const tombolApprove = document.querySelectorAll(".btn-action-approve");
        tombolApprove.forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const uidKaryawan = e.target.getAttribute("data-id");
                const namaKaryawan = e.target.getAttribute("data-nama");

                const konfirmasi = confirm(`Apakah Anda yakin ingin menyetujui akun atas nama: ${namaKaryawan}?`);
                if (konfirmasi) {
                    try {
                        const userRef = doc(db, "users", uidKaryawan);
                        await updateDoc(userRef, {
                            status: "approved"
                        });

                        alert(`✅ Akun ${namaKaryawan} berhasil disetujui! Karyawan sekarang sudah bisa login.`);
                        muatStatistikAdmin(); 
                    } catch (err) {
                        console.error("Gagal menyetujui karyawan:", err);
                        alert("⚠️ Terjadi kesalahan saat menyetujui akun.");
                    }
                }
            });
        });
    });
}
