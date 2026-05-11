"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memberPhotoUpload = exports.reportUpload = exports.resourceUpload = exports.broadcastUpload = exports.announcementUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function ensureDir(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
function safeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
function createStorage(folderName) {
    const uploadRoot = path_1.default.resolve(process.cwd(), "../uploads", folderName);
    ensureDir(uploadRoot);
    return multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, uploadRoot);
        },
        filename: (_req, file, cb) => {
            cb(null, `${Date.now()}-${safeFilename(file.originalname)}`);
        },
    });
}
function createUpload(folderName) {
    return (0, multer_1.default)({
        limits: {
            fileSize: 250 * 1024 * 1024,
        },
        storage: createStorage(folderName),
    });
}
exports.announcementUpload = createUpload("announcements");
exports.broadcastUpload = createUpload("broadcasts");
exports.resourceUpload = createUpload("resources");
exports.reportUpload = createUpload("reports");
exports.memberPhotoUpload = createUpload("profiles");
