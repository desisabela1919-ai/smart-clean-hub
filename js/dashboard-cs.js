// js/dashboard-cs.js

import { auth, db, storage } from "./firebase-config.js";
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
import { 
    ref, 
    uploadString, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

let userUID = "";
let userNama = "";
let userNIK = "";
let streamKamera = null;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const cameraArea = document.getElementById("camera-area");
const btnAbsenMasuk = document.getElementById("btn-absen-masuk");
const btnAbsenPulang = document.getElementById("btn-absen-pulang");
const btnCapture = document.getElementById("btn-capture");
const statusText = document.getElementById("absen-status");

// ==========================================
// 1. PROTEKSI AKURAT & AMBIL DATA PROFIL CS
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userUID = user.uid;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Validasi Hak Akses Karyawan
            if (userData.role !== "karyawan") {
                alert("⚠️ Akses khusus halaman akun Karyawan!");
                window.location.href = "index.html";
                return;
            }

            userNama = userData.nama;
            userNIK = userData.nik;

            document.getElementById("csNama").innerText = userNama;
            document.getElementById("csNIK").innerText = `ID: ${userNIK}`;

            // Panggil fungsi pendukung dashboard
            hitungTotalAbsensiBulanan();
            cekStatusAbsenHariIni();
        }
    } else {
        window.location.href = "index.html";
    }
});

// LOGOUT
document.getElementById("btnLogout").addEventListener("click", () => {
    signOut(auth).then(() => {
        alert("✅ Berhasil keluar dari aplikasi.");
        window.location.href = "index.html";
    });
});

// ==========================================
// 2. HITUNG STATISTIK TOTAL HARI MASUK
// ==========================================
async function hitungTotalAbsensiBulanan() {
    try {
        const q = query(collection(db, "attendance"), where("uid", "==", userUID));
        const snapshot = await getDocs(q);
        document.getElementById("total-absen").innerText = `${snapshot.size} Hari`;
    } catch (error) {
        console.error("Gagal memuat statistik absen:", error);
    }
}

// ==========================================
// 3. AKTIVASI KAMERA DAN STRATEGI KOORDINAT GPS
// ==========================================
let tipeAbsenAktif = ""; // Pengunci tipe: "Masuk" atau "Pulang"

btnAbsenMasuk.addEventListener("click", () => {
    tipeAbsenAktif = "Masuk";
    bukaKameraHP();
});

btnAbsenPulang.addEventListener("click", () => {
    tipeAbsenAktif = "Pulang";
    bukaKameraHP();
});

function bukaKameraHP() {
    cameraArea.style.display = "flex";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then((stream) => {
            streamKamera = stream;
            video.srcObject = stream;
        })
        .catch((err) => {
            console.error("Kamera diblokir atau eror:", err);
            alert("⚠️ Aplikasi memerlukan izin akses kamera untuk bukti selfie absen!");
        });
}

// PROSES JEPRET FOTO & PENGIRIMAN DATA
btnCapture.addEventListener("click", () => {
    if (!streamKamera) return;

    // Ambil Gambar dari Video Streaming
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    // Efek mirror agar hasil selfie normal tidak terbalik
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Ubah hasil jepretan menjadi string Base64 Gambar
    const dataFotoBase64 = canvas.toDataURL("image/jpeg");

    // Matikan Kamera Kembali demi menghemat baterai HP karyawan
    streamKamera.getTracks().forEach(track => track.stop());
    cameraArea.style.display = "none";

    // Minta deteksi lokasi GPS asli HP
    if (navigator.geolocation) {
        statusText.innerText = "⏳ Mendeteksi lokasi GPS Anda...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Eksekusi kirim data lengkap ke Firebase
                simpanAbsensiKeFirebase(tipeAbsenAktif, dataFotoBase64, lat, lon);
            },
            (error) => {
                console.error("GPS Error:", error);
                alert("⚠️ Gagal mendeteksi lokasi! Pastikan GPS / Layanan Lokasi di HP Anda sudah aktif.");
                statusText.innerText = "Status: Gagal Absen (GPS Mati)";
            }
        );
    } else {
        alert("⚠️ HP Anda tidak mendukung deteksi lokasi otomatis.");
    }
});

// ==========================================
// 4. SIMPAN BUKTI FOTO & DATA ABSEN KE FIREBASE
// ==========================================
async function simpanAbsensiKeFirebase(tipe, fotoBase64, latitude, longitude) {
    statusText.innerText = "⏳ Mengunggah data absensi digital...";
    const timestampNamaFile = new Date().getTime();
    
    // A. Upload Foto Selfie ke Gudang Firebase Storage
    const storageRef = ref(storage, `selfie_absen/${userNIK}_${tipe}_${timestampNamaFile}.jpg`);
    
    try {
        const uploadSnapshot = await uploadString(storageRef, fotoBase64, 'data_url');
        const urlFotoResmi = await getDownloadURL(uploadSnapshot.ref);

        const waktuWIB = new Date();
        const stringTanggalHariIni = waktuWIB.toLocaleDateString('id-ID');

        // B. Simpan Log Catatan Absen ke Buku Firestore Database
        await addDoc(collection(db, "attendance"), {
            uid: userUID,
            nik: userNIK,
            nama: userNama,
            tipe: tipe, // "Masuk" atau "Pulang"
            tanggal: stringTanggalHariIni,
            jam: waktuWIB.toLocaleTimeString('id-ID'),
            fotoUrl: urlFotoResmi,
            koordinat: {
                lat: latitude,
                lon: longitude
            },
            waktuServer: waktuWIB.toISOString()
        });

        alert(`✅ Absen ${tipe} Berhasil!\nJam: ${waktuWIB.toLocaleTimeString('id-ID')}\nLokasi Anda Terkunci.`);
        location.reload(); // Refresh halaman agar data terbaru ter-update

    } catch (error) {
        console.error("Gagal simpan absensi:", error);
        alert("⚠️ Sistem gagal menyimpan data absensi: " + error.message);
        statusText.innerText = "Status: Eror Pengiriman Data";
    }
}

// Cek status kehadiran harian biar tombol berganti dinamis
async function cekStatusAbsenHariIni() {
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
        statusText.innerText = "Status: Sudah Absen Masuk. Jangan lupa absen pulang saat shift selesai.";
    } else if (sudahAbsenMasuk && sudahAbsenPulang) {
        btnAbsenMasuk.style.display = "none";
        btnAbsenPulang.style.display = "none";
        statusText.innerText = "🎉 Status: Selesai Tugas! Anda sudah melakukan Absen Masuk & Pulang hari ini.";
    } else {
        btnAbsenMasuk.style.display = "block";
        btnAbsenPulang.style.display = "none";
    }
}
