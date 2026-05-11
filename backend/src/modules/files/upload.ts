import multer from "multer";
import path from "path";
import fs from "fs";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function createStorage(folderName: string) {
  const uploadRoot = path.resolve(process.cwd(), "../uploads", folderName);
  ensureDir(uploadRoot);

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadRoot);
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${safeFilename(file.originalname)}`);
    },
  });
}

function createUpload(folderName: string) {
  return multer({
    limits: {
      fileSize: 250 * 1024 * 1024,
    },
    storage: createStorage(folderName),
  });
}

export const announcementUpload = createUpload("announcements");
export const broadcastUpload = createUpload("broadcasts");
export const resourceUpload = createUpload("resources");
export const reportUpload = createUpload("reports");
export const memberPhotoUpload = createUpload("profiles");
