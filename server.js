import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import farmerRouter from './routes/farmer.js';
import traderRouter from './routes/trader.js';
import logisticsRouter from './routes/logistics.js';
import roasterRouter from './routes/roaster.js';
import educatorRouter from './routes/educator.js';
import marketplaceRouter from './routes/marketplace.js';
import contactRouter from './routes/contact.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// --- Global middleware ---
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static frontend (keeps your current design) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- API routes ---
app.use('/api/auth', authRouter);
app.use('/api/farmer', farmerRouter);
app.use('/api/trader', traderRouter);
app.use('/api/logistics', logisticsRouter);
app.use('/api/roaster', roasterRouter);
app.use('/api/educator', educatorRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/contact', contactRouter);

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Equity Coffee API',
    time: new Date().toISOString()
  });
});

// --- SPA fallback – serve index.html for non-API routes ---
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Equity Coffee server running on http://localhost:${PORT}`);
});