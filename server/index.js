import app from './src/app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[PalmChain Server] Listening on port ${PORT} (http://localhost:${PORT})`);
  console.log(`[PalmChain Server] Health check endpoint: http://localhost:${PORT}/api/health`);
});
