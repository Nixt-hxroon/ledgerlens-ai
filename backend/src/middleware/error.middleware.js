import { ZodError } from 'zod';
import { AppError } from '../utils/errorHandler.js';
import { errorResponse } from '../utils/response.js';

export const errorHandler = (err, req, res, next) => {
  console.error(`❌ [Error ${req.method} ${req.url}]:`, err.message || err);

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, 'File size too large. Maximum allowed size is 15 MB.', 400);
    }
    return errorResponse(res, `File upload error: ${err.message}`, 400);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return errorResponse(res, 'Validation failed for submitted data.', 400, formattedErrors);
  }

  // Handle AppError (operational errors)
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.errors);
  }

  // Default internal server error
  const message = process.env.NODE_ENV === 'production' 
    ? 'An unexpected error occurred. Please try again later.' 
    : (err.message || 'Internal Server Error');

  return errorResponse(res, message, 500);
};

