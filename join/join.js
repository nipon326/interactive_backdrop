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

// ---------- Stickers ----------
const STICKERS = ["❤️", "👏", "🎉", "😂", "👍", "🙏", "🌊", "💐", "🥰", "😢", "✨", "🎊"];
const stickerGrid = document.getElementById("sticker-grid");

STICKERS.forEach((emoji) => {
  const btn = document.createElement("button");
  btn.className = "sticker-btn";
  btn.textContent = emoji;
  btn.addEventListener("click", () => sendSticker(btn, emoji));
  stickerGrid.appendChild(btn);
});

// throttle ระดับคนทั้งหน้า (ไม่ใช่แค่ปุ่มเดียว) กัน "ไล่กดคนละอันรัวๆ" หนีคูลดาวน์
const STICKER_COOLDOWN_MS = 1000;
let stickerLocked = false;

function setStickerGridDisabled(disabled) {
  stickerGrid.querySelectorAll(".sticker-btn").forEach((b) => { b.disabled = disabled; });
}

async function sendSticker(btn, emoji) {
  if (stickerLocked) return;
  stickerLocked = true;
  setStickerGridDisabled(true);
  setTimeout(() => {
    stickerLocked = false;
    setStickerGridDisabled(false);
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

// ---------- Message (ฝากถึงน้องๆ) ----------
const messageForm = document.getElementById("message-form");
const messageStatus = document.getElementById("message-status");

messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("message-name").value.trim();
  const text = document.getElementById("message-text").value.trim();
  if (!name || !text) return;

  const submitBtn = messageForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  messageStatus.textContent = "กำลังส่ง...";
  messageStatus.classList.remove("error");
  try {
    await addDoc(collection(db, "messages"), {
      name: name.slice(0, 60),
      text: text.slice(0, 280),
      createdAt: serverTimestamp(),
    });
    messageStatus.textContent = "ส่งแล้ว ขอบคุณค่ะ/ครับ 🙏";
    messageForm.reset();
  } catch (err) {
    console.error(err);
    messageStatus.textContent = "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง";
    messageStatus.classList.add("error");
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Question (ฝากคำถาม) ----------
const questionForm = document.getElementById("question-form");
const questionStatus = document.getElementById("question-status");

questionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("question-name").value.trim();
  const text = document.getElementById("question-text").value.trim();
  if (!name || !text) return;

  const submitBtn = questionForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  questionStatus.textContent = "กำลังส่ง...";
  questionStatus.classList.remove("error");
  try {
    await addDoc(collection(db, "questions"), {
      name: name.slice(0, 60),
      text: text.slice(0, 280),
      status: "pending",
      createdAt: serverTimestamp(),
    });
    questionStatus.textContent = "ส่งแล้ว รอทีมงานตรวจสอบก่อนขึ้นจอนะครับ/คะ 🙏";
    questionForm.reset();
  } catch (err) {
    console.error(err);
    questionStatus.textContent = "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง";
    questionStatus.classList.add("error");
  } finally {
    submitBtn.disabled = false;
  }
});
