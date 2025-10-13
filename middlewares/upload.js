import multer from 'multer';

// Use memory storage to pass the file as a buffer to the controller
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  // Optional: You can add file size limits here if needed
  // limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export default upload;