import multer from 'multer';
import { config } from '../config/env.js';
import { validateFileMetadata } from '../utils/fileValidation.js';
import { AppError } from '../utils/errorHandler.js';

// Memory storage so we have the buffer ready for Supabase or Gemini
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const validation = validateFileMetadata(file);
  if (!validation.valid) {
    return cb(new AppError(validation.error, 400), false);
  }
  cb(null, true);
};

export const uploadSingle = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSizeBytes,
  },
  fileFilter,
}).single('file');

export const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSizeBytes,
  },
  fileFilter,
}).array('files', 10);

