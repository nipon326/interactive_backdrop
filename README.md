# Interactive Backdrop

ระบบ engagement สด สำหรับงานถ่ายทอดองค์ความรู้เนื่องในโอกาสพนักงานเกษียณอายุ กปน. ประจำปี 2569
(The Flow of Legacy) — 3 หน้า: `/backdrop` (จอเวที), `/control` (ทีมงาน), `/join` (ผู้ร่วมงาน สแกน QR)

## Setup ก่อนใช้งานจริง (ทำครั้งเดียว)

1. **Firebase**
   - ไปที่ [console.firebase.google.com](https://console.firebase.google.com) → สร้าง project ใหม่
   - เปิด **Firestore Database** → Create database (production mode, region `asia-southeast1` ถ้าเลือกได้)
   - แท็บ **Rules** → คัดลอกเนื้อหาจากไฟล์ [`firestore.rules`](./firestore.rules) ในนี้ไปวางแล้วกด Publish
   - **Project settings → General → Your apps → Add app (Web)** → คัดลอกค่า `firebaseConfig`
   - แนะนำ: อัปเกรดเป็น Blaze plan (pay-as-you-go) + ตั้ง budget alert เล็กๆ กันเคส quota เต็มกลางงาน (ค่าใช้จ่ายจริงของงานนี้ใกล้ 0 บาท)

2. **Google Drive (ภาพ backdrop)**
   - เปิด [console.cloud.google.com](https://console.cloud.google.com) เลือก **project เดียวกับ Firebase**
   - APIs & Services → Library → เปิดใช้งาน **Google Drive API**
   - APIs & Services → Credentials → Create API key → กด Restrict key:
     - Application restriction: HTTP referrers → ใส่โดเมนเว็บนี้ (เช่น `https://<user>.github.io/*`)
     - API restriction: Google Drive API เท่านั้น
   - สร้างโฟลเดอร์ใน Google Drive สำหรับเก็บภาพ backdrop → แชร์เป็น **"Anyone with the link – Viewer"**
   - อัปโหลดภาพ ตั้งชื่อไฟล์เป็นตัวเลข `1`, `2`, `3`, ... ตามลำดับที่จะให้ขึ้นจอ (เพิ่ม/ลบภาพภายหลังได้ กดปุ่ม "โหลดรายการภาพจาก Drive" ใหม่ในหน้า control)
   - (ไม่บังคับ) สร้างอีกโฟลเดอร์แยกต่างหากสำหรับ **สติกเกอร์รูปภาพที่อยากเพิ่มเอง** แชร์แบบเดียวกัน ใส่ไฟล์ภาพ PNG/GIF (พื้นหลังโปร่งใสจะสวยสุด) — ชื่อไฟล์อะไรก็ได้ ไม่บังคับตัวเลข

3. **แก้ไฟล์ [`shared/config.js`](./shared/config.js)** ใส่ค่าทั้งหมดที่ได้จากข้อ 1–2 (รวมถึง `STICKER_FOLDER_ID` ถ้าทำสติกเกอร์รูปภาพเพิ่ม) และตั้ง `CONTROL_PIN` เป็นรหัสที่ทีมงานจำง่าย

4. **Deploy ขึ้น GitHub Pages**
   ```bash
   git add -A && git commit -m "Interactive backdrop app"
   gh repo create interactive_backdrop --source=. --public --push   # ครั้งแรกเท่านั้น
   git push
   gh api -X POST repos/<owner>/interactive_backdrop/pages -f "source[branch]=main" -f "source[path]=/"
   ```
   เว็บจะขึ้นที่ `https://<owner>.github.io/interactive_backdrop/` (ใช้เวลาสร้างสักครู่) แต่ละหน้า:
   - `.../backdrop/` — เปิดเต็มจอบนเครื่องที่ต่อโปรเจคเตอร์
   - `.../control/` — เปิดบนเครื่อง/มือถือของทีมงาน (ใส่ PIN)
   - `.../join/` — สร้าง QR อัตโนมัติในหน้า control ให้ print/แปะโต๊ะ

   > GitHub Pages มี cache ของ CDN บางครั้งไฟล์ใหม่ขึ้นช้าไม่กี่นาที ถ้าทดสอบแล้วยังเห็นโค้ดเก่า ให้ hard refresh

## ทดสอบก่อนวันงาน (สำคัญมาก)

- เปิดทั้ง 3 URL จริงจากมือถือผ่านเน็ตมือถือ (ไม่ใช่แค่ wifi office)
- ยิงสติกเกอร์จากหลายเครื่องพร้อมกัน ดูจอ backdrop ไม่ค้าง
- ทดสอบ flow เต็ม: ฝากคำถามจาก `/join` → เห็นใน `/control` แท็บคำถามรอ approve → กด Approve → คำถามลอยขึ้นจอ backdrop จากมุมล่างซ้ายพร้อมชื่อ
- ครั้งแรกที่ query คำถาม (pending/approved) รันบน Firestore อาจมี error "the query requires an index" พร้อมลิงก์ — ต้องกดสร้าง index ให้เสร็จตอนทดสอบนี้ ไม่ใช่เจอสดในงาน
- เปิดภาพจาก Drive ทุกไฟล์ในหน้าต่าง incognito (ไม่ login) ดูว่าขึ้นภาพจริงไม่ใช่หน้า permission
- ลองสลับโหมดภาพ ↔ Word Cloud จากหน้า control ดูว่าสติกเกอร์ยังลอยทับได้ปกติ

## หมายเหตุ

- ไม่มีระบบ login จริงจัง หน้า `/control` ป้องกันด้วย PIN ฝั่ง client เท่านั้น — อย่าเผยแพร่ลิงก์ `/control` ให้คนทั่วไป
- ข้อความ "ฝากถึงน้องๆ" ไม่มีการ moderation ตอนส่งเข้ามา (เหมือนปีที่แล้ว) แต่ลบทิ้งได้ทีหลังจากหน้า `/control` (ส่วน "จัดการข้อความฝากถึงน้องๆ") ทั้งลบทีละอันและลบทั้งหมด
- คำถาม (คอมเมนต์) ที่ reject แล้วยังเก็บถาวรใน Firestore ไม่มีการลบอัตโนมัติ ย้อนดูภายหลังได้ผ่าน Firebase Console
- เพิ่มสติกเกอร์ emoji ใหม่ได้โดยแก้ array `STICKERS` ใน [`join/join.js`](./join/join.js) หรือเพิ่มสติกเกอร์รูปภาพผ่านโฟลเดอร์ Drive (`STICKER_FOLDER_ID`) โดยไม่ต้องแก้โค้ด
- โหมด Word Cloud ซ้อนทับบนภาพ backdrop ที่เลือกไว้ (ไม่ได้แทนที่ภาพ) และอัปเดตอัตโนมัติทุกครั้งที่มีข้อความใหม่เข้ามา ไม่ต้อง refresh
