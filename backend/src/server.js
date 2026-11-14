import app from './app.js';
import { config, validateEnvironment } from './config/env.js';

try {
  validateEnvironment();
} catch (err) {
  console.error('Environment validation failed:', err.message);
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`
======================================================
  🚀 LEDGERLENS AI BACKEND ENGINE RUNNING
  📡 Port: http://localhost:${config.port}
  🌍 Environment: ${config.nodeEnv}
  ⚡ Supabase: ${config.supabase.isConfigured ? 'Connected (PostgreSQL & Storage)' : 'Local Persistent Storage Mode'}
  🤖 Gemini AI: ${config.gemini.isConfigured ? `Active (${config.gemini.model})` : 'Intelligent Heuristic Mode'}
======================================================
  `);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
  });
});

export default server;
