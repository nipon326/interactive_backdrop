// ===== ตั้งค่าทั้งหมดของระบบไว้ที่ไฟล์เดียว แก้ตรงนี้ที่เดียวพอ =====

// 1) Firebase project config
//    ไปเอาได้จาก Firebase Console > Project settings > General > Your apps > Web app > SDK setup and configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBuYdJE03lIIX4zgFtb9xPtMFiztc1TNP4",
  authDomain: "interactive-backdrop.firebaseapp.com",
  projectId: "interactive-backdrop",
  storageBucket: "interactive-backdrop.firebasestorage.app",
  messagingSenderId: "947468517353",
  appId: "1:947468517353:web:bd5adcd2ec500b36b91578",
};

// 2) Google Drive (สำหรับดึงรายการภาพ backdrop) — ใช้เฉพาะในหน้า /control
//    DRIVE_FOLDER_ID: เอาจาก URL ของโฟลเดอร์ เช่น
//    https://drive.google.com/drive/folders/<FOLDER_ID_ตรงนี้>
//    DRIVE_API_KEY: สร้างจาก Google Cloud Console > APIs & Services > Credentials
//    (ต้องเปิด Google Drive API ก่อน และตั้ง restriction: API = Drive API, HTTP referrer = โดเมนเว็บนี้)
export const DRIVE_FOLDER_ID = "19053_a9yvGCzIq0SQy9-E-Qdp5H9njQ-";
export const DRIVE_API_KEY = "AIzaSyBuYdJE03lIIX4zgFtb9xPtMFiztc1TNP4"; // ใช้ตัวเดียวกับ Firebase browser key ที่เพิ่ม Drive API เข้าไปแล้ว

// โฟลเดอร์ Google Drive แยกต่างหากสำหรับ "สติกเกอร์รูปภาพ" ที่อยากเพิ่มเอง (ไม่บังคับ)
// วิธีใช้เหมือนโฟลเดอร์ภาพ backdrop: สร้างโฟลเดอร์ แชร์ "Anyone with the link", ใส่ไฟล์ภาพ (PNG/GIF พื้นหลังโปร่งใสจะสวยสุด)
// ปล่อยเป็นค่าเริ่มต้นนี้ไว้ได้ถ้ายังไม่มีสติกเกอร์เพิ่ม ระบบจะข้ามไปใช้แค่ชุด emoji ที่มีอยู่แล้ว
export const STICKER_FOLDER_ID = "1gpeQROw-H1Z2_20a1kyfYVk7ux8eQDeS";

// 3) PIN สำหรับล็อกหน้า /control กันคนเดินผ่านเผลอกด (ไม่ใช่ระบบความปลอดภัยจริงจัง)
export const CONTROL_PIN = "1234";
