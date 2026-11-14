import path from 'path';
import { config } from '../config/env.js';

export const validateFileMetadata = (file) => {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  // Check file size
  if (file.size > config.upload.maxFileSizeBytes) {
    const maxMB = config.upload.maxFileSizeBytes / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds the maximum limit of ${maxMB} MB.`,
    };
  }

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.csv', '.xlsx', '.xlsm'];
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: 'Invalid file extension. Allowed extensions are .pdf, .jpg, .jpeg, .png, .csv, .xlsx, .xlsm',
    };
  }

  // Check MIME type - if extension is valid spreadsheet/csv, allow lenient MIME matching
  const isSpreadsheet = ['.csv', '.xlsx', '.xlsm'].includes(ext);
  if (!isSpreadsheet && !config.upload.allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a PDF, PNG, JPG, JPEG, CSV, XLSX, or XLSM file.',
    };
  }

  return { valid: true };
};

