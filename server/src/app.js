import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import healthRoutes from './routes/health.routes.js';
import profilesRoutes from './routes/profiles.routes.js';
import batchesRoutes from './routes/batches.routes.js';
import productsRoutes from './routes/products.routes.js';
import farmsRoutes from './routes/farms.routes.js';
import verifyRoutes from './routes/verify.routes.js';
import operationsRoutes from './routes/operations.routes.js';

dotenv.config();

const app = express();

// ─── Security & Utility Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', healthRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/farms', farmsRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/operations', operationsRoutes);

// ─── 404 Fallback ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[PalmChain Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;

