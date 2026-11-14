import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    storageBucket: process.env.STORAGE_BUCKET || 'documents',
    isConfigured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    isConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'ledgerlens_default_jwt_secret_32_characters_min',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'ledgerlens_default_refresh_secret_32_chars',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  upload: {
    maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10) * 1024 * 1024,
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ],
  },
};

export function validateEnvironment() {
  const missingCritical = [];
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    missingCritical.push('JWT_SECRET');
  }

  if (missingCritical.length > 0) {
    throw new Error(`CRITICAL: Missing required environment variables: ${missingCritical.join(', ')}`);
  }

  if (!config.gemini.isConfigured) {
    console.warn('⚠️  [Config Notice]: GEMINI_API_KEY is not set. Intelligent Fallback Heuristic Engine will be used for document processing until an API key is configured.');
  } else {
    console.log(`🤖 [Gemini AI]: Configured with model ${config.gemini.model}`);
  }

  if (!config.supabase.isConfigured) {
    console.warn('⚠️  [Config Notice]: Supabase credentials not set. Using local high-fidelity persistent database & file store. Set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY to connect to Supabase.');
  } else {
    console.log('⚡ [Supabase]: Configured with endpoint', config.supabase.url);
  }
}
