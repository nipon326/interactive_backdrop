import { db } from "../shared/firebase-init.js";
import {
  collection, addDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ---------- Tabs ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---------- ชื่อที่จำไว้ (กรอกครั้งเดียว ใช้ได้ทั้งฝากข้อความและคอมเมนต์) ----------
const NAME_KEY = "ib_guest_name";
function getStoredName() {
  try { return localStorage.getItem(NAME_KEY) || ""; } catch { return ""; }
}
function setStoredName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch { /* ไม่มี localStorage ก็ปล่อยผ่าน ไม่ใช่ฟีเจอร์จำเป็น */ }
}

const messageNameInput = document.getElementById("message-name");
const questionNameInput = document.getElementById("question-name");

const storedName = getStoredName();
if (storedName) {
  messageNameInput.value = storedName;
  questionNameInput.value = storedName;
}

function rememberName(name) {
  setStoredName(name);
  messageNameInput.value = name;
  questionNameInput.value = name;
}

// ---------- Stickers (เฉพาะความหมายเชิงบวก) ----------
const STICKERS = [
  "❤️", "👏", "🎉", "😂", "👍", "🙏", "🌊", "💐",
  "🥰", "✨", "🎊", "🥳", "💖", "🌟", "🙌", "🌈", "💙", "🎈",
];
const stickerGrid = document.getElementById("sticker-grid");
const throttledEls = [];

STICKERS.forEach((emoji) => {
  const btn = document.createElement("button");
  btn.className = "sticker-btn";
  btn.textContent = emoji;
  btn.addEventListener("click", () => sendSticker(emoji));
  stickerGrid.appendChild(btn);
  throttledEls.push(btn);
});

// ---------- สติกเกอร์ที่พิมพ์เอง ----------
const customInput = document.getElementById("custom-sticker-input");
const customSendBtn = document.getElementById("custom-sticker-send");
throttledEls.push(customSendBtn);

customSendBtn.addEventListener("click", () => {
  const val = customInput.value.trim().slice(0, 4);
  if (!val) return;
  sendSticker(val);
  customInput.value = "";
});
customInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    customSendBtn.click();
  }
});

// throttle ระดับคนทั้งหน้า (ไม่ใช่แค่ปุ่มเดียว) กัน "ไล่กดคนละอันรัวๆ" หนีคูลดาวน์
const STICKER_COOLDOWN_MS = 1000;
let stickerLocked = false;

function setThrottledDisabled(disabled) {
  throttledEls.forEach((b) => { b.disabled = disabled; });
}

async function sendSticker(emoji) {
  if (stickerLocked || !emoji) return;
  stickerLocked = true;
  setThrottledDisabled(true);
  setTimeout(() => {
    stickerLocked = false;
    setThrottledDisabled(false);
  }, STICKER_COOLDOWN_MS);

  try {
    await addDoc(collection(db, "stickers"), {
      emoji,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("sticker send failed", err);
  }
}

// ---------- แสดงผลว่าส่งสำเร็จแบบเห็นชัดๆ ----------
function showStatus(el, text, kind) {
  el.textContent = text;
  el.classList.remove("success", "error");
  if (kind) el.classList.add(kind);
}

// ---------- Message (ฝากถึงน้องๆ) ----------
const messageForm = document.getElementById("message-form");
const messageText = document.getElementById("message-text");
const messageStatus = document.getElementById("message-status");

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = messageNameInput.value.trim();
  const text = messageText.value.trim();
  if (!name || !text) return;

  const submitBtn = messageForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  showStatus(messageStatus, "กำลังส่ง...");
  try {
    await addDoc(collection(db, "messages"), {
      name: name.slice(0, 60),
      text: text.slice(0, 280),
      createdAt: serverTimestamp(),
    });
    showStatus(messageStatus, "✅ ส่งสำเร็จแล้ว ขอบคุณมากนะคะ/ครับ", "success");
    messageText.value = "";
    rememberName(name);
  } catch (err) {
    console.error(err);
    showStatus(messageStatus, "ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Comment (คอมเมนต์) ----------
const questionForm = document.getElementById("question-form");
const questionText = document.getElementById("question-text");
const questionStatus = document.getElementById("question-status");

questionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = questionNameInput.value.trim();
  const text = questionText.value.trim();
  if (!name || !text) return;

  const submitBtn = questionForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  showStatus(questionStatus, "กำลังส่ง...");
  try {
    await addDoc(collection(db, "questions"), {
      name: name.slice(0, 60),
      text: text.slice(0, 280),
      status: "pending",
      createdAt: serverTimestamp(),
    });
    showStatus(questionStatus, "✅ ส่งสำเร็จแล้ว ทีมงานกำลังตรวจสอบให้อยู่นะ 🙏", "success");
    questionText.value = "";
    rememberName(name);
  } catch (err) {
    console.error(err);
    showStatus(questionStatus, "ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะ", "error");
  } finally {
    submitBtn.disabled = false;
  }
});
