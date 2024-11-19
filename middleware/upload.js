const multer = require('multer');
const path = require('path');
const fs = require('fs')

// Define the destination folder
const uploadFolder = path.join(__dirname, '../public/uploads/products');

// Ensure the destination folder exists
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set the destination folder for uploaded files
    cb(null, uploadFolder); // Save images in the 'products' folder
  },
  filename: (req, file, cb) => {
    // Generate a unique file name with a timestamp to avoid overwriting files
    cb(null, Date.now() + '-' + file.originalname);
  },
});

// Multer upload configuration without fileFilter or validation
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5MB
});

module.exports = upload;
