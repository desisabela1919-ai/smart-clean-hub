// js/dashboard-tl.js

import { auth, db } from "./firebase-config.js"; // Import tanpa storage
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let userUID = "";
let userNama = "";
let userNIK = "";
let streamKamera = null;

// Ambil elemen HTML (Pastikan ID ini ada di dashboard-tl.html Anda)
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const cameraArea = document.getElementById("camera-area");
const btnAbsenMasuk = document.getElementById("btn-absen-masuk");
const btnAbsenPulang = document.getElementById("btn-absen-pulang");
const btnCapture = document.getElementById("btn-capture");
const statusText = document.getElementById("absen-status");

// ==========================================
// 1. PROTEKSI HALAMAN KHUSUS TEAM LEADER
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userUID = user.uid;
        // Ambil profil user untuk validasi role
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Validasi Hak Akses Team Leader
            if (userData.role !== "tl") {
                alert("⚠️ Akses ditolak! Halaman ini khusus untuk Team Leader.");
                window.location.href = "index.html"; // Lempar ke halaman login
                return;
            }

            // Set data profil di dashboard TL
            userNama = userData.nama;
            userNIK = userData.nik;

            // Pastikan elemen ID ini ada di HTML TL Mas
            const tlNamaBadge = document.getElementById("tlNama");
            const tlNIKBadge = document.getElementById("tlNIK");
            if(tlNamaBadge) tlNamaBadge.innerText = userNama;
            if(tlNIKBadge) tlNIKBadge.innerText = `ID TL: ${userNIK}`;

            // Jalankan fungsi pendukung dashboard TL
            cekStatusAbsenHariIni();
            muatDaftarTimCS(); // <--- Fungsi baru untuk monitoring CS
        }
    } else {
        // Jika belum login, lempar ke halaman login
        window.location.href = "index.html";
    }
});

// LOGOUT TEAM LEADER
const btnLogout = document.getElementById("btnLogout");
if(btnLogout) {
    btnLogout.addEventListener("click", () => {
        signOut(auth).then(() => {
            alert("✅ Berhasil keluar dari aplikasi Team Leader.");
            window.location.href = "index.html";
        });
    });
}

// ==========================================
// 2. FITUR ABSENSI MANDIRI TL (Selfie + GPS Base64 Firestore)
// ==========================================
let tipeAbsenAktif = ""; // "Masuk" atau "Pulang"

if(btnAbsenMasuk) {
    btnAbsenMasuk.addEventListener("click", () => {
        tipeAbsenAktif = "Masuk";
        bukaKameraHP();
    });
}

if(btnAbsenPulang) {
    btnAbsenPulang.addEventListener("click", () => {
        tipeAbsenAktif = "Pulang";
        bukaKameraHP();
    });
}

function bukaKameraHP() {
    if(!cameraArea || !video) return;
    cameraArea.style.display = "flex";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then((stream) => {
            streamKamera = stream;
            video.srcObject = stream;
        })
        .catch((err) => {
            console.error("Kamera diblokir:", err);
            alert("⚠️ Izin kamera diperlukan untuk bukti selfie absen!");
        });
}

// PROSES JEPRET FOTO & PENGIRIMAN DATA
if(btnCapture) {
    btnCapture.addEventListener("click", () => {
        if (!streamKamera || !canvas || !video) return;

        // Ambil Gambar
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        
        // Efek mirror
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Ubah jadi Base64 (Kompres 0.5 agar ringan di Firestore)
        const dataFotoBase64 = canvas.toDataURL("image/jpeg", 0.5);

        // Matikan Kamera
        streamKamera.getTracks().forEach(track => track.stop());
        cameraArea.style.display = "none";

        // Minta deteksi lokasi GPS
        if (navigator.geolocation) {
            statusText.innerText = "⏳ Mendeteksi lokasi GPS Anda...";
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    // Simpan data lengkap ke Firestore (Koleksi 'attendance')
                    simpanAbsensiKeFirebase(tipeAbsenAktif, dataFotoBase64, lat, lon);
                },
                (error) => {
                    console.error("GPS Error:", error);
                    alert("⚠️ Gagal mendeteksi lokasi! Pastikan GPS HP aktif.");
                    if(statusText) statusText.innerText = "Status: Gagal Absen (GPS Mati)";
                }
            );
        } else {
            alert("⚠️ HP Anda tidak mendukung deteksi lokasi otomatis.");
        }
    });
}

// FUNGSI SIMPAN DATA ABSEN KE FIRESTORE (SOLUSI ANTI MACET)
async function simpanAbsensiKeFirebase(tipe, fotoBase64, latitude, longitude) {
    if(statusText) statusText.innerText = "⏳ Mengunggah data absensi digital...";
    
    try {
        const waktuWIB = new Date();
        const stringTanggalHariIni = waktuWIB.toLocaleDateString('id-ID');

        // Simpan Log ke koleksi 'attendance'
        await addDoc(collection(db, "attendance"), {
            uid: userUID,
            nik: userNIK,
            nama: userNama,
            role: "tl", // Tandai kalau ini absennya Team Leader
            tipe: tipe, // "Masuk" atau "Pulang"
            tanggal: stringTanggalHariIni,
            jam: waktuWIB.toLocaleTimeString('id-ID'),
            fotoUrl: fotoBase64, // <-- FOTO DISIMPAN SEBAGAI TEKS DI FIRESTORE
            koordinat: { latitude: latitude, longitude: longitude },
            waktuServer: waktuWIB.toISOString()
        });

        alert(`✅ Absen ${tipe} Berhasil!\nLokasi Anda Terkunci.`);
        location.reload(); 

    } catch (error) {
        console.error("Gagal simpan absensi:", error);
        alert("⚠️ Gagal menyimpan data absensi: " + error.message);
        if(statusText) statusText.innerText = "Status: Eror Pengiriman Data";
    }
}

// Cek status kehadiran harian biar tombol berganti dinamis
async function cekStatusAbsenHariIni() {
    if(!statusText || !btnAbsenMasuk || !btnAbsenPulang) return;
    
    const stringTanggalHariIni = new Date().toLocaleDateString('id-ID');
    const q = query(
        collection(db, "attendance"), 
        where("uid", "==", userUID), 
        where("tanggal", "==", stringTanggalHariIni)
    );

    const querySnapshot = await getDocs(q);
    let sudahAbsenMasuk = false;
    let sudahAbsenPulang = false;

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.tipe === "Masuk") sudahAbsenMasuk = true;
        if (data.tipe === "Pulang") sudahAbsenPulang = true;
    });

    if (sudahAbsenMasuk && !sudahAbsenPulang) {
        btnAbsenMasuk.style.display = "none";
        btnAbsenPulang.style.display = "block";
        statusText.innerText = "Status: Sudah Absen Masuk. Jangan lupa absen pulang.";
    } else if (sudahAbsenMasuk && sudahAbsenPulang) {
        btnAbsenMasuk.style.display = "none";
        btnAbsenPulang.style.display = "none";
        statusText.innerText = "🎉 Status: Selesai Tugas! Anda sudah melakukan Absen Masuk & Pulang hari ini.";
    } else {
        btnAbsenMasuk.style.display = "block";
        btnAbsenPulang.style.display = "none";
    }
}

// ==========================================
// 3. MONITORING TIM CLEANER (CS) OLEH TL
// ==========================================
async function muatDaftarTimCS() {
    const listCSContainer = document.getElementById("list-cs-tim"); // Pastikan ID ini ada di dashboard-tl.html Mas
    if(!listCSContainer) return;

    try {
        // Ambil user yang rolenya 'karyawan' dan sudah disetujui Owner
        const qCS = query(
            collection(db, "users"), 
            where("role", "==", "karyawan"), 
            where("status", "==", "approved")
        );
        const snapshot = await getDocs(qCS);
        
        listCSContainer.innerHTML = "";

        if(snapshot.empty) {
            listCSContainer.innerHTML = '<p class="empty-state">Belum ada tim Cleaner (CS) yang terdaftar/disetujui Owner.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const cs = docSnap.data();
            const csId = docSnap.id;

            const cardCS = document.createElement("div");
            cardCS.className = "cs-card"; // Sesuaikan class CSS Anda
            cardCS.style.borderLeft = "4px solid #28a745"; // Warna hijau
            cardCS.style.marginBottom = "8px";
            cardCS.style.padding = "8px";
            cardCS.style.backgroundColor = "#fff";
            cardCS.style.borderRadius = "6px";
            cardCS.style.display = "flex";
            cardCS.style.justifyContent = "space-between";
            cardCS.style.alignItems = "center";

            cardCS.innerHTML = `
                <div class="info">
                    <h5 style="margin:0; color:#333;">${cs.nama}</h5>
                    <p style="margin:3px 0 0 0; font-size:12px; color:#666;">ID: ${cs.nik}</p>
                </div>
                <button class="btn-assign-area" data-id="${csId}" data-nama="${cs.nama}" style="background-color: #ff9f43; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">
                    Tunjuk Area
                </button>
            `;
            listCSContainer.appendChild(cardCS);
        });

        // (Opsional) Daftarkan fungsi Klik Tombol Tunjuk Area
        // Fitur ini bisa kita kerjakan setelah HTML-nya siap
        const tombolAssign = document.querySelectorAll(".btn-assign-area");
        tombolAssign.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idCS = e.target.getAttribute("data-id");
                const namaCS = e.target.getAttribute("data-nama");
                alert(`Fitur penunjukan area untuk ${namaCS} sedang disiapkan!`);
            });
        });

    } catch (error) {
        console.error("Gagal memuat daftar CS:", error);
    }
}
