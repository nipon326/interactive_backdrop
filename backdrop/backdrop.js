import { db } from "../shared/firebase-init.js";
import {
  collection, doc, onSnapshot, query, orderBy, limit, where, getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { driveImageUrlCandidates } from "../shared/drive.js";
import { THAI_STOPWORDS } from "../shared/thai-stopwords.js";

const MAX_STICKERS = 36;
const MAX_COMMENTS = 6;
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

let wordCloudRenderedForVersion = null;

onSnapshot(doc(db, "state", "backdrop"), (snap) => {
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.mode === "wordcloud") {
    document.body.classList.add("mode-wordcloud");
    const version = data.updatedAt ? data.updatedAt.toMillis() : Date.now();
    if (wordCloudRenderedForVersion !== version) {
      wordCloudRenderedForVersion = version;
      renderWordCloud();
    }
  } else {
    document.body.classList.remove("mode-wordcloud");
    setBackdropImage(data.fileId);
  }
});

// ---------- Stickers ----------
let stickersLoaded = false;
const stickerQuery = query(collection(db, "stickers"), orderBy("createdAt", "desc"), limit(30));
onSnapshot(stickerQuery, (snap) => {
  if (stickersLoaded) {
    snap.docChanges().forEach((c) => {
      if (c.type === "added") spawnSticker(c.doc.data().emoji);
    });
  }
  stickersLoaded = true;
});

// สติกเกอร์ลอยฝั่งขวาของจอ (ไม่กระจายเต็มขอบล่าง) กันไปบังกลางภาพ backdrop
function spawnSticker(emoji) {
  if (stickerCount >= MAX_STICKERS || !emoji) return;
  stickerCount += 1;
  const el = document.createElement("div");
  el.className = "floating-sticker";
  el.textContent = emoji;
  el.style.setProperty("--x", `${58 + Math.random() * 37}vw`);
  el.style.setProperty("--drift", `${Math.random() * 14 - 7}vw`);
  el.style.setProperty("--size", `${1.8 + Math.random() * 1.6}rem`);
  el.style.setProperty("--dur", `${2.5 + Math.random() * 2}s`);
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

  const nameEl = document.createElement("span");
  nameEl.className = "comment-name";
  nameEl.textContent = name || "ไม่ระบุชื่อ";

  const textEl = document.createElement("span");
  textEl.className = "comment-text";
  textEl.textContent = text;

  el.appendChild(nameEl);
  el.appendChild(textEl);

  el.style.setProperty("--x", `${Math.random() * 6}vw`);
  el.style.setProperty("--drift", `${1 + Math.random() * 5}vw`);
  el.style.setProperty("--dur", `${5.5 + Math.random() * 1.5}s`);
  el.addEventListener("animationend", () => { el.remove(); commentCount -= 1; });
  commentLayer.appendChild(el);
}

// ---------- Word cloud ----------
async function renderWordCloud() {
  try {
    const snap = await getDocs(collection(db, "messages"));
    const counts = new Map();
    snap.forEach((d) => {
      const text = (d.data().text || "").trim();
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
        const palette = ["#16325c", "#2d5f9e", "#4a90d9", "#f2c6d3", "#8fb8dd"];
        return palette[Math.floor(Math.random() * palette.length)];
      },
      backgroundColor: "transparent",
      rotateRatio: 0.15,
      minSize: 10,
    });
  } catch (err) {
    console.error("word cloud render failed", err);
  }
}
