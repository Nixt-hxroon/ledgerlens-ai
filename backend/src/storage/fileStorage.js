import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import { supabase } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const fileStorage = {
  /**
   * Store uploaded file buffer or stream
   */
  async uploadFile({ buffer, filename, mimeType, userId }) {
    const timestamp = Date.now();
    const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${timestamp}_${cleanName}`;

    // Try Supabase Storage first if configured
    if (config.supabase.isConfigured && supabase) {
      try {
        const { error } = await supabase.storage
          .from(config.supabase.storageBucket)
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (!error) {
          return {
            storagePath,
            provider: 'supabase',
          };
        }
        console.warn('Supabase storage upload failed, falling back to local:', error.message);
      } catch (err) {
        console.warn('Supabase storage exception, falling back to local:', err.message);
      }
    }

    // Local file storage fallback
    const userDir = path.join(UPLOADS_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const localFilePath = path.join(userDir, `${timestamp}_${cleanName}`);
    fs.writeFileSync(localFilePath, buffer);

    return {
      storagePath,
      localFilePath,
      provider: 'local',
    };
  },

  /**
   * Get secure temporary signed URL or streaming access path
   */
  async getSecureUrl(storagePath, expiresInSeconds = 3600) {
    if (config.supabase.isConfigured && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(config.supabase.storageBucket)
          .createSignedUrl(storagePath, expiresInSeconds);

        if (!error && data?.signedUrl) {
          return data.signedUrl;
        }
      } catch (err) {
        console.warn('Error creating Supabase signed URL:', err.message);
      }
    }

    // Return backend proxy URL
    return null;
  },

  /**
   * Read raw file buffer from storage (for AI processing and direct preview)
   */
  async getFileBuffer(storagePath) {
    // If Supabase
    if (config.supabase.isConfigured && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(config.supabase.storageBucket)
          .download(storagePath);
        if (!error && data) {
          const arrayBuffer = await data.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch (err) {
        console.warn('Error reading from Supabase storage:', err.message);
      }
    }

    // Local file fallback
    const localFilePath = path.join(UPLOADS_DIR, storagePath);
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath);
    }

    // Check with alternative path separator
    const altPath = path.resolve(UPLOADS_DIR, ...storagePath.split('/'));
    if (fs.existsSync(altPath)) {
      return fs.readFileSync(altPath);
    }

    return null;
  },

  /**
   * Safely delete file from storage
   */
  async deleteFile(storagePath) {
    if (config.supabase.isConfigured && supabase) {
      try {
        await supabase.storage
          .from(config.supabase.storageBucket)
          .remove([storagePath]);
      } catch (err) {
        console.warn('Error deleting from Supabase storage:', err.message);
      }
    }

    const localFilePath = path.join(UPLOADS_DIR, storagePath);
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (err) {
        console.warn('Error deleting local file:', err.message);
      }
    }
  },
};

