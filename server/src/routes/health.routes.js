import express from 'express';
import { generateSHA256Hash } from '../utils/hash.js';

const router = express.Router();

router.get('/health', (req, res) => {
  const sampleTestHash = generateSHA256Hash({ test: 'palmchain-integrity-check', timestamp: 1700000000 });

  res.status(200).json({
    status: 'healthy',
    service: 'PalmChain Backend API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    cryptoEngine: {
      algorithm: 'SHA-256',
      sampleHashValidation: sampleTestHash.length === 64,
    },
    version: '1.0.0',
  });
});

export default router;
