import multer from 'multer';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB file size limit (for videos, etc.)
  },
  fileFilter: (req, file, cb) => {
    // We can allow any file type for now, or be more specific
    // For example, to allow common media types:
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'), false);
    }
  },
});

// Middleware to upload a single file named 'file'
export const uploadFile = upload.single('file');