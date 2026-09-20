// เรียก Drive API v3 เพื่อดึงรายชื่อภาพในโฟลเดอร์ backdrop (ใช้เฉพาะในหน้า /control)
// ต้องแชร์โฟลเดอร์เป็น "Anyone with the link – Viewer" และตั้งชื่อไฟล์เป็นตัวเลข 1, 2, 3, ... ตามลำดับที่จะแสดง

export async function fetchOrderedImages(folderId, apiKey) {
  const q = encodeURIComponent(
    `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1000&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Drive API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  const files = data.files || [];
  files.sort((a, b) => {
    const na = parseInt(a.name, 10);
    const nb = parseInt(b.name, 10);
    if (Number.isNaN(na) || Number.isNaN(nb)) return a.name.localeCompare(b.name);
    return na - nb;
  });
  return files;
}

// สร้างรายการ URL ภาพแบบ fallback chain (บาง Drive account เปิดลิงก์ตรงไม่ได้ทุกแบบ)
export function driveImageUrlCandidates(fileId, size = 1920) {
  return [
    `https://lh3.googleusercontent.com/d/${fileId}=s${size}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`,
    `https://drive.google.com/uc?export=view&id=${fileId}`,
  ];
}
