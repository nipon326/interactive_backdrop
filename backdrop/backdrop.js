import { db } from "../shared/firebase-init.js";
import {
  collection, doc, onSnapshot, query, orderBy, limit, where,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { driveImageUrlCandidates } from "../shared/drive.js";
import { THAI_STOPWORDS } from "../shared/thai-stopwords.js";

const MAX_STICKERS = 22;
const MAX_COMMENTS = 4;
let stickerCount = 0;
let commentCount = 0;

const stickerLayer = document.getElementById("sticker-layer");
const commentLayer = document.getElementById("comment-layer");
const bgImage = document.getElementById("bg-image");
const wordcloudCanvas = document.getElementById("wordcloud-canvas");

// ---------- Backdrop image / mode state ----------
function setBackdropImage(fileId) {
  if (!fileId) return;
  const urls = driveImageUrlCandidates(fileId);
  let i = 0;
  const tryNext = () => {
    if (i >= urls.length) return;
    bgImage.onerror = () => { i += 1; tryNext(); };
    bgImage.src = urls[i];
  };
  tryNext();
}

let currentMode = "image";

onSnapshot(doc(db, "state", "backdrop"), (snap) => {
  if (!snap.exists()) return;
  const data = snap.data();
  currentMode = data.mode === "wordcloud" ? "wordcloud" : "image";
  document.body.classList.toggle("mode-wordcloud", currentMode === "wordcloud");
  // พื้นหลังภาพยังคงอยู่เสมอ ไม่ว่าจะโหมดไหน — โหมด wordcloud แค่ซ้อนคำขึ้นด้านบนเป็น overlay
  setBackdropImage(data.fileId);
  if (currentMode === "wordcloud") {
    renderWordCloud();
  }
});

// ---------- Stickers ----------
let stickersLoaded = false;
const stickerQuery = query(collection(db, "stickers"), orderBy("createdAt", "desc"), limit(30));
onSnapshot(stickerQuery, (snap) => {
  if (stickersLoaded) {
    snap.docChanges().forEach((c) => {
      if (c.type === "added") spawnSticker(c.doc.data());
    });
  }
  stickersLoaded = true;
});

// สติกเกอร์ลอยฝั่งขวาของจอ (ไม่กระจายเต็มขอบล่าง) กันไปบังกลางภาพ backdrop
// รองรับทั้งสติกเกอร์ emoji และสติกเกอร์รูปภาพจาก Drive (ดู join.js/shared/config.js)
function spawnSticker(data) {
  if (!data || stickerCount >= MAX_STICKERS) return;
  // เอกสารเก่าก่อนอัปเดตนี้มีแค่ field `emoji` เฉยๆ — รองรับไว้กันของเก่าพัง
  const kind = data.kind || (data.emoji ? "emoji" : null);
  const value = data.value || data.emoji;
  if (!kind || !value) return;

  stickerCount += 1;
  const el = document.createElement("div");
  el.className = "floating-sticker";
  el.style.setProperty("--x", `${55 + Math.random() * 35}vw`);
  el.style.setProperty("--drift", `${Math.random() * 14 - 7}vw`);
  // ขนาดใหญ่ขึ้นเยอะ — ห้องใหญ่ + ผู้ชมส่วนใหญ่เป็นผู้สูงวัย ต้องมองเห็นชัดจากที่นั่งไกลๆ
  el.style.setProperty("--size", `${4 + Math.random() * 3.5}rem`);
  el.style.setProperty("--dur", `${3 + Math.random() * 2}s`);

  if (kind === "image") {
    const img = document.createElement("img");
    img.className = "sticker-img";
    const urls = driveImageUrlCandidates(value, 200);
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) return;
      img.onerror = () => { i += 1; tryNext(); };
      img.src = urls[i];
    };
    tryNext();
    el.appendChild(img);
  } else {
    el.textContent = value;
  }

  el.addEventListener("animationend", () => { el.remove(); stickerCount -= 1; });
  stickerLayer.appendChild(el);
}

// ---------- Approved question comments ----------
let commentsLoaded = false;
const commentQuery = query(
  collection(db, "questions"),
  where("status", "==", "approved"),
  orderBy("createdAt", "desc"),
  limit(20)
);
onSnapshot(
  commentQuery,
  (snap) => {
    if (commentsLoaded) {
      snap.docChanges().forEach((c) => {
        if (c.type === "added") spawnComment(c.doc.data());
      });
    }
    commentsLoaded = true;
  },
  (err) => {
    // มักเกิดจาก Firestore ยังไม่มี composite index สำหรับ query นี้ (ต้องสร้างครั้งแรกผ่าน Firebase Console)
    console.error("approved comments listener failed", err);
  }
);

function spawnComment({ name, text }) {
  if (commentCount >= MAX_COMMENTS || !text) return;
  commentCount += 1;
  const el = document.createElement("div");
  el.className = "floating-comment";

  const textEl = document.createElement("span");
  textEl.className = "comment-text";
  textEl.textContent = text;

  const nameEl = document.createElement("span");
  nameEl.className = "comment-name";
  nameEl.textContent = `- ${name || "ไม่ระบุชื่อ"}`;

  el.appendChild(textEl);
  el.appendChild(nameEl);

  el.style.setProperty("--x", `${Math.random() * 4}vw`);
  el.style.setProperty("--drift", `${1 + Math.random() * 4}vw`);
  // อยู่บนจอนานขึ้นด้วย เพราะตัวใหญ่ขึ้น ต้องมีเวลาให้อ่านทัน
  el.style.setProperty("--dur", `${7 + Math.random() * 2}s`);
  el.addEventListener("animationend", () => { el.remove(); commentCount -= 1; });
  commentLayer.appendChild(el);
}

// ---------- Word cloud ----------
// ฟังข้อความ "ฝากถึงน้องๆ" แบบ live ตลอดเวลา (ไม่ใช่ดึงครั้งเดียว) เพื่อให้ข้อความใหม่ที่ส่งเข้ามา
// ระหว่างที่จออยู่ในโหมด wordcloud อัปเดตขึ้นจอเองทันที ไม่ต้องกด refresh/รีโหลดหน้า
let messagesCache = [];
let wordCloudRenderTimer = null;

onSnapshot(
  collection(db, "messages"),
  (snap) => {
    messagesCache = snap.docs.map((d) => d.data());
    scheduleWordCloudRender();
  },
  (err) => console.error("messages listener failed", err)
);

function scheduleWordCloudRender() {
  if (currentMode !== "wordcloud") return;
  clearTimeout(wordCloudRenderTimer);
  // debounce กันข้อความเข้ามาถี่ๆ ทำให้ canvas re-layout รัวจนกระตุก
  wordCloudRenderTimer = setTimeout(renderWordCloud, 500);
}

function renderWordCloud() {
  try {
    const counts = new Map();
    messagesCache.forEach((d) => {
      const text = (d.text || "").trim();
      if (!text) return;
      const chunks = text
        .split(/[\s,.!?๐-๙()\-–—"'“”:;\n\r]+/u)
        .map((c) => c.trim())
        .filter(Boolean);
      chunks.forEach((chunk) => {
        if (chunk.length < 2) return;
        if (THAI_STOPWORDS.has(chunk)) return;
        counts.set(chunk, (counts.get(chunk) || 0) + 1);
      });
    });

    const list = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 90);

    if (list.length === 0) {
      list.push(["ขอบคุณค่ะ/ครับ", 1]);
    }

    wordcloudCanvas.width = window.innerWidth;
    wordcloudCanvas.height = window.innerHeight;

    // eslint-disable-next-line no-undef
    WordCloud(wordcloudCanvas, {
      list,
      gridSize: Math.round((16 * window.innerWidth) / 1024),
      weightFactor: (size) => Math.pow(size, 0.85) * (window.innerWidth / 1024) * 10,
      fontFamily: "'Noto Sans Thai', sans-serif",
      color: () => {
        const palette = ["#ffffff", "#bfe0f5", "#f2c6d3", "#ffe9a8", "#eaf6ff"];
        return palette[Math.floor(Math.random() * palette.length)];
      },
      shadowColor: "rgba(0,0,0,0.55)",
      shadowBlur: 6,
      backgroundColor: "transparent",
      rotateRatio: 0.15,
      minSize: 10,
    });
  } catch (err) {
    console.error("word cloud render failed", err);
  }
}
