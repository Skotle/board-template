const multer = require('multer');
const fs = require('fs');
const path = require('path');

function createStorage(folder = 'uploads') {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', 'public', folder);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext);
      cb(null, `${basename}-${Date.now()}${ext}`);
    }
  });
}

const upload = multer({
  storage: createStorage('uploads'),
  limits: { fileSize: 50 * 1024 * 1024 }
});

const audioUpload = multer({
  storage: createStorage('uploads'),
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = { upload, audioUpload };
