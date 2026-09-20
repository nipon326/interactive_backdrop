// ===== ตั้งค่าทั้งหมดของระบบไว้ที่ไฟล์เดียว แก้ตรงนี้ที่เดียวพอ =====

// 1) Firebase project config
//    ไปเอาได้จาก Firebase Console > Project settings > General > Your apps > Web app > SDK setup and configuration
export const firebaseConfig = {
  apiKey: "PASTE_FIREBASE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};

// 2) Google Drive (สำหรับดึงรายการภาพ backdrop) — ใช้เฉพาะในหน้า /control
//    DRIVE_FOLDER_ID: เอาจาก URL ของโฟลเดอร์ เช่น
//    https://drive.google.com/drive/folders/<FOLDER_ID_ตรงนี้>
//    DRIVE_API_KEY: สร้างจาก Google Cloud Console > APIs & Services > Credentials
//    (ต้องเปิด Google Drive API ก่อน และตั้ง restriction: API = Drive API, HTTP referrer = โดเมนเว็บนี้)
export const DRIVE_FOLDER_ID = "PASTE_DRIVE_FOLDER_ID";
export const DRIVE_API_KEY = "PASTE_DRIVE_API_KEY";

// 3) PIN สำหรับล็อกหน้า /control กันคนเดินผ่านเผลอกด (ไม่ใช่ระบบความปลอดภัยจริงจัง)
export const CONTROL_PIN = "1234";
