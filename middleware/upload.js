const multer = require('multer');
const path = require('path');
const fs = require('fs')

const uploadFolder = path.join(__dirname, '../public/uploads/products');

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    
    cb(null, uploadFolder); 
  },
  filename: (req, file, cb) => {
   
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
});

module.exports = upload;
