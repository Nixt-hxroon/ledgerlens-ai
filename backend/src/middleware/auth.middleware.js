import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { db } from '../storage/db.js';
import { AppError } from '../utils/errorHandler.js';

export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    // 2. Check query parameter (for direct file downloads, iframes, and export streams)
    else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      throw new AppError('Authentication required. Please log in to continue.', 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AppError('Your session has expired. Please log in again.', 401);
      }
      throw new AppError('Invalid authentication token.', 401);
    }

    const userId = decoded.userId || decoded.id;
    const user = await db.users.findById(userId);
    if (!user) {
      throw new AppError('User account associated with this token no longer exists.', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    };

    next();
  } catch (error) {
    next(error);
  }
};
