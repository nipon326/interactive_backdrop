import { db } from "../shared/firebase-init.js";
import {
  collection, doc, setDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { requirePin } from "../shared/pin-gate.js";
import { fetchOrderedImages, driveImageUrlCandidates } from "../shared/drive.js";
import { DRIVE_FOLDER_ID, DRIVE_API_KEY } from "../shared/config.js";

requirePin();

// ---------- Backdrop image picker ----------
const imageGrid = document.getElementById("image-grid");
const driveStatus = document.getElementById("drive-status");
let currentFileId = null;

document.getElementById("btn-load-drive").addEventListener("click", loadDriveImages);

async function loadDriveImages() {
  driveStatus.textContent = "กำลังโหลด...";
  imageGrid.innerHTML = "";
  try {
    const files = await fetchOrderedImages(DRIVE_FOLDER_ID, DRIVE_API_KEY);
    if (files.length === 0) {
      driveStatus.textContent = "ไม่พบภาพในโฟลเดอร์ (เช็คการแชร์และชื่อไฟล์)";
      return;
    }
    driveStatus.textContent = `พบ ${files.length} ภาพ`;
    files.forEach((f) => {
      const thumb = document.createElement("div");
      thumb.className = "image-thumb";
      thumb.dataset.fileId = f.id;

      const img = document.createElement("img");
      img.src = driveImageUrlCandidates(f.id, 400)[0];
      img.onerror = () => { img.src = driveImageUrlCandidates(f.id, 400)[1]; };

      const label = document.createElement("div");
      label.className = "label";
      label.textContent = f.name;

      thumb.appendChild(img);
      thumb.appendChild(label);
      thumb.addEventListener("click", () => selectImage(f.id, thumb));
      imageGrid.appendChild(thumb);
    });
    syncActiveThumb();
  } catch (err) {
    console.error(err);
    driveStatus.textContent = "โหลดไม่สำเร็จ: " + err.message;
  }
}

async function selectImage(fileId, thumbEl) {
  currentFileId = fileId;
  await setDoc(doc(db, "state", "backdrop"), {
    mode: "image",
    fileId,
    updatedAt: serverTimestamp(),
  });
  syncActiveThumb();
}

function syncActiveThumb() {
  [...imageGrid.children].forEach((el) => {
    el.classList.toggle("active", el.dataset.fileId === currentFileId);
  });
}

// ---------- Mode switch (wordcloud) ----------
document.getElementById("btn-mode-wordcloud").addEventListener("click", async () => {
  await setDoc(doc(db, "state", "backdrop"), {
    mode: "wordcloud",
    fileId: currentFileId || "",
    updatedAt: serverTimestamp(),
  });
});

document.getElementById("btn-refresh-wordcloud").addEventListener("click", async () => {
  // เขียน updatedAt ใหม่เพื่อสั่งให้ backdrop คำนวณ word cloud ใหม่ (ยังอยู่โหมด wordcloud อยู่แล้ว)
  await setDoc(doc(db, "state", "backdrop"), {
    mode: "wordcloud",
    fileId: currentFileId || "",
    updatedAt: serverTimestamp(),
  });
});

// กลับโหมดภาพง่ายๆ: คลิกภาพใดๆ ในกริดจะพากลับโหมด image โดยอัตโนมัติ (ผ่าน selectImage)

// ---------- Pending questions moderation ----------
const pendingList = document.getElementById("pending-list");
const pendingQuery = query(
  collection(db, "questions"),
  where("status", "==", "pending"),
  orderBy("createdAt", "asc")
);

onSnapshot(pendingQuery, (snap) => {
  if (snap.empty) {
    pendingList.innerHTML = '<p class="empty-hint">ยังไม่มีคำถามเข้ามา</p>';
    return;
  }
  pendingList.innerHTML = "";
  snap.forEach((docSnap) => {
    const q = docSnap.data();
    const item = document.createElement("div");
    item.className = "pending-item";

    const nameEl = document.createElement("div");
    nameEl.className = "q-name";
    nameEl.textContent = q.name || "ไม่ระบุชื่อ";

    const textEl = document.createElement("div");
    textEl.className = "q-text";
    textEl.textContent = q.text;

    const actions = document.createElement("div");
    actions.className = "q-actions";

    const approveBtn = document.createElement("button");
    approveBtn.className = "btn-approve";
    approveBtn.textContent = "✅ Approve";
    approveBtn.addEventListener("click", () => setStatus(docSnap.id, "approved"));

    const rejectBtn = document.createElement("button");
    rejectBtn.className = "btn-reject";
    rejectBtn.textContent = "❌ Reject";
    rejectBtn.addEventListener("click", () => setStatus(docSnap.id, "rejected"));

    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);

    item.appendChild(nameEl);
    item.appendChild(textEl);
    item.appendChild(actions);
    pendingList.appendChild(item);
  });
});

async function setStatus(id, status) {
  await updateDoc(doc(db, "questions", id), {
    status,
    approvedAt: serverTimestamp(),
  });
}

// ---------- QR / join link ----------
const joinUrl = new URL("../join/", window.location.href).toString();
document.getElementById("join-url").textContent = joinUrl;
document.getElementById("qr-image").src =
  `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(joinUrl)}`;
document.getElementById("btn-copy-link").addEventListener("click", async () => {
  await navigator.clipboard.writeText(joinUrl);
  const btn = document.getElementById("btn-copy-link");
  const old = btn.textContent;
  btn.textContent = "คัดลอกแล้ว ✓";
  setTimeout(() => { btn.textContent = old; }, 1500);
});
