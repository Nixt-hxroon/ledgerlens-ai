import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import { errorHandler } from './middleware/error.middleware.js';
import { errorResponse } from './utils/response.js';

import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import validationRoutes from './routes/validation.routes.js';
import comparisonRoutes from './routes/comparison.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import insightsRoutes from './routes/insights.routes.js';
import settingsRoutes from './routes/settings.routes.js';

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Dev-friendly fallback
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logger
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check endpoint (for Render / Vercel deployment monitoring)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'LedgerLens AI Engine',
    version: '1.0.0',
    gemini_configured: config.gemini.isConfigured,
    gemini_model: config.gemini.model,
    supabase_configured: config.supabase.isConfigured,
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/comparisons', comparisonRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler for unknown routes
app.use('*', (req, res) => {
  return errorResponse(res, `Endpoint ${req.originalUrl} not found on this server.`, 404);
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;

