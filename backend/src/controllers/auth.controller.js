import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../storage/db.js';
import { config } from '../config/env.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.schema.js';
import { AppError } from '../utils/errorHandler.js';

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

export const authController = {
  async register(req, res, next) {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existing = await db.users.findByEmail(validatedData.email);
      if (existing) {
        throw new AppError('An account with this email address already exists.', 400);
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(validatedData.password, salt);

      // Create user
      const user = await db.users.create({
        full_name: validatedData.full_name,
        email: validatedData.email,
        password_hash,
      });

      const tokens = generateTokens(user);

      // Save refresh token
      await db.refreshTokens.create({
        user_id: user.id,
        token_hash: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return successResponse(res, {
        user: { id: user.id, full_name: user.full_name, email: user.email },
        tokens,
      }, 'Registration successful! Welcome to LedgerLens AI.', 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const validatedData = loginSchema.parse(req.body);

      const user = await db.users.findByEmail(validatedData.email);
      if (!user) {
        throw new AppError('Invalid email or password.', 401);
      }

      const isValidPassword = await bcrypt.compare(validatedData.password, user.password_hash);
      if (!isValidPassword) {
        throw new AppError('Invalid email or password.', 401);
      }

      const tokens = generateTokens(user);

      await db.refreshTokens.create({
        user_id: user.id,
        token_hash: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return successResponse(res, {
        user: { id: user.id, full_name: user.full_name, email: user.email },
        tokens,
      }, 'Login successful.');
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new AppError('Refresh token required.', 400);
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      } catch (e) {
        throw new AppError('Invalid or expired refresh token.', 401);
      }

      const storedToken = await db.refreshTokens.findByTokenHash(refreshToken);
      if (!storedToken) {
        throw new AppError('Refresh token revoked or not recognized.', 401);
      }

      const user = await db.users.findById(decoded.userId);
      if (!user) {
        throw new AppError('User not found.', 401);
      }

      // Issue new access token
      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpiresIn }
      );

      return successResponse(res, { accessToken: newAccessToken }, 'Token refreshed.');
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await db.refreshTokens.revoke(refreshToken);
      }
      return successResponse(res, null, 'Logged out successfully.');
    } catch (err) {
      next(err);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const user = await db.users.findByEmail(email);

      // In production, send email; in demo/hackathon, return recovery reset token directly
      if (user) {
        const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, config.jwt.secret, { expiresIn: '15m' });
        return successResponse(res, { resetToken }, 'Password reset instructions sent. For demonstration, use the provided reset token.');
      }

      return successResponse(res, null, 'If that email address exists in our system, a password reset link has been dispatched.');
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      let decoded;
      try {
        decoded = jwt.verify(token, config.jwt.secret);
      } catch (e) {
        throw new AppError('Reset link has expired or is invalid.', 400);
      }

      const user = await db.users.findById(decoded.userId);
      if (!user) {
        throw new AppError('User not found.', 404);
      }

      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);
      await db.users.update(user.id, { password_hash });

      return successResponse(res, null, 'Your password has been successfully reset. Please log in with your new credentials.');
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res, next) {
    try {
      const user = await db.users.findById(req.user.id);
      if (!user) throw new AppError('User not found', 404);

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
};
