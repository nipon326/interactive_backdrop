import { db } from "../shared/firebase-init.js";
import {
  collection, doc, setDoc, updateDoc, deleteDoc, writeBatch,
  onSnapshot, query, where, orderBy, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { requirePin } from "../shared/pin-gate.js";
import { fetchOrderedImages, driveImageUrlCandidates } from "../shared/drive.js";
import { DRIVE_FOLDER_ID, DRIVE_API_KEY, COMMENT_BROADCAST_SLOTS } from "../shared/config.js";

requirePin();

// ---------- Backdrop image picker ----------
const imageGrid = document.getElementById("image-grid");
const driveStatus = document.getElementById("drive-status");
const previewImg = document.getElementById("current-preview-img");
const previewLabel = document.getElementById("current-preview-label");
let currentFileId = null;
let currentMode = "image";
let loadedFiles = [];

document.getElementById("btn-load-drive").addEventListener("click", loadDriveImages);

async function loadDriveImages() {
  driveStatus.textContent = "กำลังโหลด...";
  imageGrid.innerHTML = "";
  try {
    const files = await fetchOrderedImages(DRIVE_FOLDER_ID, DRIVE_API_KEY);
    loadedFiles = files;
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

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = "✓";

      const label = document.createElement("div");
      label.className = "label";
      label.textContent = f.name;

      thumb.appendChild(img);
      thumb.appendChild(badge);
      thumb.appendChild(label);
      thumb.addEventListener("click", () => selectImage(f.id));
      imageGrid.appendChild(thumb);
    });
    syncActiveThumb();
    updatePreview();
  } catch (err) {
    console.error(err);
    driveStatus.textContent = "โหลดไม่สำเร็จ: " + err.message;
  }
}

async function selectImage(fileId) {
  // ส่ง mode ปัจจุบันไปด้วยเสมอ (ไม่ใช้ merge บางส่วน) เพราะ rules บังคับให้ทุก write ต้องมีครบ 3 field
  // เอฟเฟกต์จริงคือ "เปลี่ยนแค่ภาพ ไม่เปลี่ยนโหมด" — เลือกภาพได้ทั้งตอนโหมดภาพปกติและโหมด wordcloud
  await setDoc(doc(db, "state", "backdrop"), {
    mode: currentMode,
    fileId,
    updatedAt: serverTimestamp(),
  });
  // ไม่ต้องอัปเดต currentFileId/preview เอง — state listener ด้านล่างจะรับค่ากลับมาสะท้อนให้ทุกจอ/ทุกคนที่เปิด control อยู่พร้อมกัน
}

function syncActiveThumb() {
  [...imageGrid.children].forEach((el) => {
    el.classList.toggle("active", el.dataset.fileId === currentFileId);
  });
}

function updatePreview() {
  if (!currentFileId) {
    previewImg.removeAttribute("src");
    previewLabel.textContent = "ยังไม่ได้เลือกภาพ";
    return;
  }
  const urls = driveImageUrlCandidates(currentFileId, 800);
  let i = 0;
  const tryNext = () => {
    if (i >= urls.length) return;
    previewImg.onerror = () => { i += 1; tryNext(); };
    previewImg.src = urls[i];
  };
  tryNext();
  const match = loadedFiles.find((f) => f.id === currentFileId);
  previewLabel.textContent = match ? `🟢 กำลังขึ้นจอ: ${match.name}` : "🟢 กำลังขึ้นจอ";
}

// state/backdrop เป็น shared state — ฟังตลอดเวลา เพื่อให้ทีมงานหลายคน/หลายเครื่องเห็นตรงกันเสมอ
// (คนคุมภาพกับคนตรวจคอมเมนต์เปิด /control คนละเครื่องพร้อมกันได้ ข้อมูลจะ sync กันเองผ่าน Firestore)
const modeWordcloudBtn = document.getElementById("btn-mode-wordcloud");
const modeImageBtn = document.getElementById("btn-mode-image");

function syncModeButtons() {
  modeWordcloudBtn.classList.toggle("btn-active", currentMode === "wordcloud");
  modeImageBtn.classList.toggle("btn-active", currentMode === "image");
}

onSnapshot(doc(db, "state", "backdrop"), (snap) => {
  if (!snap.exists()) return;
  const data = snap.data();
  currentFileId = data.fileId || null;
  currentMode = data.mode === "wordcloud" ? "wordcloud" : "image";
  syncActiveThumb();
  updatePreview();
  syncModeButtons();
});

// ---------- Mode switch (wordcloud overlay ซ้อนทับภาพ background เดิม) ----------
modeWordcloudBtn.addEventListener("click", async () => {
  await setDoc(doc(db, "state", "backdrop"), {
    mode: "wordcloud",
    fileId: currentFileId || "",
    updatedAt: serverTimestamp(),
  });
});

modeImageBtn.addEventListener("click", async () => {
  await setDoc(doc(db, "state", "backdrop"), {
    mode: "image",
    fileId: currentFileId || "",
    updatedAt: serverTimestamp(),
  });
});

// ---------- Pending comments moderation ----------
const pendingList = document.getElementById("pending-list");
const pendingQuery = query(
  collection(db, "questions"),
  where("status", "==", "pending"),
  orderBy("createdAt", "asc")
);

onSnapshot(
  pendingQuery,
  (snap) => {
    if (snap.empty) {
      pendingList.innerHTML = '<p class="empty-hint">ยังไม่มีคอมเมนต์เข้ามา</p>';
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
      approveBtn.addEventListener("click", () => setStatus(docSnap.id, "approved", q));

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
  },
  (err) => {
    console.error("pending comments listener failed", err);
    pendingList.innerHTML =
      '<p class="error-hint">โหลดคอมเมนต์ไม่สำเร็จ (มักเกิดจาก Firestore ยังไม่มี index สำหรับ query นี้) ' +
      "เปิด Console ของเบราว์เซอร์ (F12) หาข้อความ error ที่มีลิงก์ \"create it here\" แล้วกดลิงก์นั้นเพื่อสร้าง index ครั้งแรก " +
      "(รอสัก 1-2 นาทีแล้วรีเฟรชหน้านี้ใหม่)</p>";
  }
);

async function setStatus(id, status, questionData) {
  await updateDoc(doc(db, "questions", id), {
    status,
    approvedAt: serverTimestamp(),
  });
  // "questions" ยังเป็นบันทึกถาวรสำหรับ moderation/ประวัติเหมือนเดิม — ส่วนนี้แค่ยิง broadcast
  // แยกต่างหากไปช่องคงที่ (เหมือนสติกเกอร์) เพื่อให้ /backdrop ลอยคอมเมนต์ขึ้นจอได้ไวและไม่ต้องมี index
  if (status === "approved" && questionData) {
    const slot = Math.floor(Math.random() * COMMENT_BROADCAST_SLOTS);
    await setDoc(doc(db, "commentBroadcast", `slot_${slot}`), {
      name: questionData.name || "",
      text: questionData.text,
      nonce: Math.random().toString(36).slice(2),
      createdAt: serverTimestamp(),
    });
  }
}

// ---------- จัดการข้อความฝากถึงน้องๆ (Word Cloud source) ----------
const messagesList = document.getElementById("messages-list");
const messagesCount = document.getElementById("messages-count");
let currentMessageIds = [];

const messagesQuery = query(collection(db, "messages"), orderBy("createdAt", "desc"));
onSnapshot(
  messagesQuery,
  (snap) => {
    currentMessageIds = snap.docs.map((d) => d.id);
    messagesCount.textContent = `ทั้งหมด ${snap.size} ข้อความ`;
    if (snap.empty) {
      messagesList.innerHTML = '<p class="empty-hint">ยังไม่มีข้อความเข้ามา</p>';
      return;
    }
    messagesList.innerHTML = "";
    snap.forEach((docSnap) => {
      const m = docSnap.data();
      const item = document.createElement("div");
      item.className = "pending-item";

      const textEl = document.createElement("div");
      textEl.className = "q-text";
      textEl.textContent = m.text;

      const nameEl = document.createElement("div");
      nameEl.className = "q-name";
      nameEl.textContent = `- ${m.name || "ไม่ระบุชื่อ"}`;

      const actions = document.createElement("div");
      actions.className = "q-actions";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-reject";
      deleteBtn.textContent = "🗑️ ลบ";
      deleteBtn.addEventListener("click", () => deleteDoc(doc(db, "messages", docSnap.id)));

      actions.appendChild(deleteBtn);

      item.appendChild(textEl);
      item.appendChild(nameEl);
      item.appendChild(actions);
      messagesList.appendChild(item);
    });
  },
  (err) => {
    console.error("messages listener failed", err);
    messagesList.innerHTML = '<p class="error-hint">โหลดข้อความไม่สำเร็จ</p>';
  }
);

document.getElementById("btn-clear-messages").addEventListener("click", async () => {
  if (currentMessageIds.length === 0) return;
  if (!confirm(`ลบข้อความทั้งหมด ${currentMessageIds.length} รายการ? ย้อนกลับไม่ได้`)) return;
  const batch = writeBatch(db);
  currentMessageIds.forEach((id) => batch.delete(doc(db, "messages", id)));
  await batch.commit();
});

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
