import bcrypt from 'bcryptjs';
import { db } from '../storage/db.js';
import { successResponse } from '../utils/response.js';
import { AppError } from '../utils/errorHandler.js';
import { updateProfileSchema } from '../validators/auth.schema.js';

export const settingsController = {
  async getProfile(req, res, next) {
    try {
      const user = await db.users.findById(req.user.id);
      if (!user) throw new AppError('User not found.', 404);

      return successResponse(res, {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        created_at: user.created_at,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateProfile(req, res, next) {
    try {
      const { full_name } = req.body;
      if (!full_name || full_name.trim().length < 2) {
        throw new AppError('Full name must be at least 2 characters.', 400);
      }

      const updated = await db.users.update(req.user.id, { full_name: full_name.trim() });
      return successResponse(res, {
        id: updated.id,
        full_name: updated.full_name,
        email: updated.email,
      }, 'Profile updated successfully.');
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password are required.', 400);
      }

      if (newPassword.length < 6) {
        throw new AppError('New password must be at least 6 characters.', 400);
      }

      const user = await db.users.findById(req.user.id);
      if (!user) throw new AppError('User not found.', 404);

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        throw new AppError('Current password does not match.', 400);
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);
      await db.users.update(user.id, { password_hash });

      return successResponse(res, null, 'Password changed successfully.');
    } catch (err) {
      next(err);
    }
  },
};
