const multer = require('multer');
const fs = require('fs');
const path = require('path');

function createStorage(folderName) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '..', 'public', folderName);
      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, basename + '-' + uniqueSuffix + ext);
    }
  });
}

const imageUpload = multer({
  storage: createStorage('uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mkv|webm/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    cb(allowed.test(ext) ? null : new Error('허용되지 않는 파일 형식'), allowed.test(ext));
  }
});

const audioUpload = multer({
  storage: createStorage('uploads'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /webm|wav|mp3|ogg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    cb(allowed.test(ext) ? null : new Error('허용되지 않는 오디오 형식'), allowed.test(ext));
  }
});

module.exports = { imageUpload, audioUpload };
