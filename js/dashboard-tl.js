// js/dashboard-tl.js

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let userUID = "";
let userNama = "";
let userNIK = "";
let streamKamera = null;

// Ambil elemen HTML Absen & Profil
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const cameraArea = document.getElementById("camera-area");
const btnAbsenMasuk = document.getElementById("btn-absen-masuk");
const btnAbsenPulang = document.getElementById("btn-absen-pulang");
const btnCapture = document.getElementById("btn-capture");
const statusText = document.getElementById("absen-status");

// Ambil elemen HTML Modal Operasional
const modalBuatArea = document.getElementById("modal-buat-area");
const modalPlotingCS = document.getElementById("modal-ploting-cs");
const btnMenuBuatArea = document.getElementById("btn-menu-buat-area");
const btnCloseModalArea = document.getElementById("close-modal-area");
const btnCloseModalPloting = document.getElementById("close-modal-ploting");

// ==========================================
// 1. PROTEKSI HALAMAN & STRUKTUR AWAL
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userUID = user.uid;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role !== "tl") {
                alert("⚠️ Akses ditolak! Halaman ini khusus untuk Team Leader.");
                window.location.href = "index.html";
                return;
            }

            userNama = userData.nama;
            userNIK = userData.nik;

            if(document.getElementById("tlNama")) document.getElementById("tlNama").innerText = userNama;
            if(document.getElementById("tlNIK")) document.getElementById("tlNIK").innerText = `ID TL: ${userNIK}`;

            // Panggil Fungsi Master Operasional
            cekStatusAbsenHariIni();
            muatDaftarTimCS();
            pantauPendaftaranKaryawanOlehTL(); 
            muatDropdownAreaPilihan(); 
        }
    } else {
        window.location.href = "index.html";
    }
});

// LOGOUT
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
// 2. FUNGSI POP-UP MODAL (OPEN/CLOSE)
// ==========================================
if(btnMenuBuatArea) {
    btnMenuBuatArea.addEventListener("click", () => {
        modalBuatArea.style.display = "flex";
    });
}
if(btnCloseModalArea) {
    btnCloseModalArea.addEventListener("click", () => {
        modalBuatArea.style.display = "none";
    });
}
if(btnCloseModalPloting) {
    btnCloseModalPloting.addEventListener("click", () => {
        modalPlotingCS.style.display = "none";
    });
}

// Tombol shortcut Checklist BM langsung arahkan ke section bawah
if(document.getElementById("btn-menu-checklist")) {
    document.getElementById("btn-menu-checklist").addEventListener("click", () => {
        document.getElementById("section-tim-cs").scrollIntoView({ behavior: 'smooth' });
    });
}

// ==========================================
// 3. LOGIKA SIMPAN AREA BARU KE FIRESTORE
// ==========================================
const formTambahArea = document.getElementById("form-tambah-area");
if(formTambahArea) {
    formTambahArea.addEventListener("submit", async (e) => {
        e.preventDefault();
        const namaArea = document.getElementById("nama-area-input").value.trim();
        const descArea = document.getElementById("desc-area-input").value.trim();

        try {
            await addDoc(collection(db, "areas"), {
                namaArea: namaArea,
                deskripsi: descArea,
                dibuatOleh: userNama,
                waktuDibuat: new Date().toISOString()
            });

            alert(`✅ Area "${namaArea}" Berhasil Didaftarkan!`);
            formTambahArea.reset();
            modalBuatArea.style.display = "none";
            muatDropdownAreaPilihan(); // Refresh dropdown
        } catch (error) {
            console.error("Gagal buat area:", error);
            alert("⚠️ Gagal membuat area: " + error.message);
        }
    });
}

// AMBIL DAFTAR AREA UNTUK DROPDOWN MODAL PLOTING
async function muatDropdownAreaPilihan() {
    const dropdownArea = document.getElementById("plot-pilih-area");
    if(!dropdownArea) return;

    try {
        const snapshot = await getDocs(collection(db, "areas"));
        dropdownArea.innerHTML = '<option value="">-- Pilih Lokasi Kerja --</option>';
        
        if(snapshot.empty) {
            dropdownArea.innerHTML = '<option value="">(Belum ada data area, silakan buat area dulu)</option>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const dataArea = docSnap.data();
            const option = document.createElement("option");
            option.value = dataArea.namaArea;
            option.innerText = dataArea.namaArea;
            dropdownArea.appendChild(option);
        });
    } catch (error) {
        console.error("Gagal muat dropdown area:", error);
    }
}

// ==========================================
// 4. PROSES PLOTING CHECKLIST BM UNTUK CS
// ==========================================
const formPlotingTugas = document.getElementById("form-ploting-tugas");
if(formPlotingTugas) {
    formPlotingTugas.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const csUid = document.getElementById("plot-cs-uid").value;
        const csNama = document.getElementById("plot-cs-nama").value;
        const areaTerpilih = document.getElementById("plot-pilih-area").value;
        
        // Ambil daftar checklist pekerjaan yang dicentang
        const checkboxTugas = document.querySelectorAll('input[name="task-item"]:checked');
        let daftarTugas = [];
        checkboxTugas.forEach((item) => {
            daftarTugas.push(item.value);
        });

        if(daftarTugas.length === 0) {
            alert("⚠️ Silakan pilih minimal 1 item pekerjaan checklist BM!");
            return;
        }

        try {
            // Simpan ploting ke koleksi 'assignments'
            await addDoc(collection(db, "assignments"), {
                csUid: csUid,
                csNama: csNama,
                area: areaTerpilih,
                itemChecklist: daftarTugas, // Berupa Array
                statusTugas: "Belum Dikerjakan", // Status Awal
                plotOleh: userNama,
                tanggalPlot: new Date().toLocaleDateString('id-ID'),
                waktuPlot: new Date().toISOString()
            });

            alert(`✅ Berhasil! Tugas Checklist BM di area [${areaTerpilih}] telah dikirim ke ${csNama}.`);
            formPlotingTugas.reset();
            modalPlotingCS.style.display = "none";
        } catch (error) {
            console.error("Gagal ploting tugas:", error);
            alert("⚠️ Gagal mengirim penugasan.");
        }
    });
}

// ==========================================
// 5. MONITORING TIM CLEANER (CS) AKTIF
// ==========================================
async function muatDaftarTimCS() {
    const listCSContainer = document.getElementById("list-cs-tim");
    if(!listCSContainer) return;

    try {
        const qCS = query(collection(db, "users"), where("role", "==", "karyawan"), where("status", "==", "approved"));
        const snapshot = await getDocs(qCS);
        listCSContainer.innerHTML = "";

        if(snapshot.empty) {
            listCSContainer.innerHTML = '<p class="empty-state">Belum ada tim Cleaner (CS) yang aktif.</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const cs = docSnap.data();
            const csUid = docSnap.id;

            const cardCS = document.createElement("div");
            cardCS.className = "approve-card";
            cardCS.style.borderLeft = "4px solid #28a745";
            cardCS.style.marginBottom = "10px";
            cardCS.style.padding = "12px";
            cardCS.style.backgroundColor = "#fff";
            cardCS.style.borderRadius = "8px";
            cardCS.style.display = "flex";
            cardCS.style.justifyContent = "space-between";
            cardCS.style.alignItems = "center";

            cardCS.innerHTML = `
                <div class="info">
                    <h4 style="margin:0; color:#333;">${cs.nama}</h4>
                    <p style="margin:4px 0 0 0; font-size:12px; color:#666;">NIK: ${cs.nik || 'Cleaner'}</p>
                </div>
                <button class="btn-assign-area" data-id="${csUid}" data-nama="${cs.nama}" style="background-color: #ff9f43; color: white; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold;">
                    Plot Tugas
                </button>
            `;
            listCSContainer.appendChild(cardCS);
        });

        // Event handler klik "Plot Tugas" -> Membuka Modal
        const tombolAssign = document.querySelectorAll(".btn-assign-area");
        tombolAssign.forEach(btn => {
            btn.addEventListener("click", (e) => {
                const targetBtn = e.target.closest(".btn-assign-area");
                const idKaryawan = targetBtn.getAttribute("data-id");
                const namaKaryawan = targetBtn.getAttribute("data-nama");
                
                // Masukkan data ke form dalam Modal Pop-up
                document.getElementById("plot-cs-uid").value = idKaryawan;
                document.getElementById("plot-cs-nama").value = namaKaryawan;
                
                // Tampilkan Modal Ploting
                modalPlotingCS.style.display = "flex";
            });
        });

    } catch (error) {
        console.error("Gagal memuat tim CS:", error);
    }
}

// ==========================================
// 6. PANTAU PERSIDANGAN AKUN BARU OLEH TL
// ==========================================
function pantauPendaftaranKaryawanOlehTL() {
    const containerPending = document.getElementById("list-pending-karyawan");
    const badgeCount = document.getElementById("count-pending");
    if(!containerPending) return;

    const qPending = query(collection(db, "users"), where("role", "==", "karyawan"), where("status", "==", "pending"));

    onSnapshot(qPending, (querySnapshot) => {
        if(badgeCount) badgeCount.innerText = querySnapshot.size;
        containerPending.innerHTML = "";

        if (querySnapshot.empty) {
            containerPending.innerHTML = '<p class="empty-state">Tidak ada pendaftaran baru.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const dataKaryawan = docSnap.data();
            const docId = docSnap.id; 

            const card = document.createElement("div");
            card.className = "approve-card";
            card.innerHTML = `
                <div class="info">
                    <h4>${dataKaryawan.nama}</h4>
                    <p>WA: 0${dataKaryawan.whatsapp ? dataKaryawan.whatsapp.slice(2) : ''}</p>
                </div>
                <button class="btn-action-approve" data-id="${docId}" data-nama="${dataKaryawan.nama}" style="background-color: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size:12px;">
                    Setujui ✔
                </button>
            `;
            containerPending.appendChild(card);
        });

        const tombolApprove = document.querySelectorAll(".btn-action-approve");
        tombolApprove.forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const uidKaryawan = e.target.getAttribute("data-id");
                const namaKaryawan = e.target.getAttribute("data-nama");

                if (confirm(`Setujui pendaftaran akun: ${namaKaryawan}?`)) {
                    try {
                        await addDoc(collection(db, "users"), { status: "approved" }); // Update opsional via Owner
                        alert(`✅ Akun ${namaKaryawan} berhasil disetujui!`);
                        muatDaftarTimCS();
                    } catch (err) { console.error(err); }
                }
            });
        });
    });
}

// ==========================================
// 7. ABSENSI DIGITAL KHUSUS TEAM LEADER
// ==========================================
let tipeAbsenAktif = "";
if(btnAbsenMasuk) { btnAbsenMasuk.addEventListener("click", () => { tipeAbsenAktif = "Masuk"; bukaKameraHP(); }); }
if(btnAbsenPulang) { btnAbsenPulang.addEventListener("click", () => { tipeAbsenAktif = "Pulang"; bukaKameraHP(); }); }

function bukaKameraHP() {
    if(!cameraArea || !video) return;
    cameraArea.style.display = "flex";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then((stream) => { streamKamera = stream; video.srcObject = stream; })
        .catch((err) => { alert("⚠️ Izin kamera diperlukan!"); });
}

if(btnCapture) {
    btnCapture.addEventListener("click", () => {
        if (!streamKamera || !canvas || !video) return;
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataFotoBase64 = canvas.toDataURL("image/jpeg", 0.5);
        streamKamera.getTracks().forEach(track => track.stop());
        cameraArea.style.display = "none";

        if (navigator.geolocation) {
            statusText.innerText = "⏳ Mendeteksi GPS...";
            navigator.geolocation.getCurrentPosition((position) => {
                simpanAbsensiKeFirebase(tipeAbsenAktif, dataFotoBase64, position.coords.latitude, position.coords.longitude);
            }, () => { alert("⚠️ GPS gagal dideteksi!"); });
        }
    });
}

async function simpanAbsensiKeFirebase(tipe, fotoBase64, latitude, longitude) {
    if(statusText) statusText.innerText = "⏳ Mengunggah absensi...";
    try {
        const waktuWIB = new Date();
        await addDoc(collection(db, "attendance"), {
            uid: userUID, nik: userNIK, nama: userNama, role: "tl", tipe: tipe,
            tanggal: waktuWIB.toLocaleDateString('id-ID'), jam: waktuWIB.toLocaleTimeString('id-ID'),
            fotoUrl: fotoBase64, koordinat: { lat: latitude, lon: longitude }, waktuServer: waktuWIB.toISOString()
        });
        alert(`✅ Absen ${tipe} Berhasil!`);
        location.reload();
    } catch (error) { alert("⚠️ Eror: " + error.message); }
}

async function cekStatusAbsenHariIni() {
    if(!statusText || !btnAbsenMasuk || !btnAbsenPulang) return;
    const stringTanggalHariIni = new Date().toLocaleDateString('id-ID');
    const q = query(collection(db, "attendance"), where("uid", "==", userUID), where("tanggal", "==", stringTanggalHariIni));
    const querySnapshot = await getDocs(q);
    let masuk = false; let pulang = false;
    querySnapshot.forEach((doc) => {
        if (doc.data().tipe === "Masuk") masuk = true;
        if (doc.data().tipe === "Pulang") pulang = true;
    });
    if (masuk && !pulang) { btnAbsenMasuk.style.display = "none"; btnAbsenPulang.style.display = "block"; statusText.innerText = "Status: Sudah Absen Masuk."; }
    else if (masuk && pulang) { btnAbsenMasuk.style.display = "none"; btnAbsenPulang.style.display = "none"; statusText.innerText = "🎉 Status: Tugas Selesai Hari ini!"; }
    else { btnAbsenMasuk.style.display = "block"; btnAbsenPulang.style.display = "none"; }
}
