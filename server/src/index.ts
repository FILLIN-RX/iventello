import express from 'express';
import cors from 'cors';
import { config } from './config';
import apiRouter from './routes';

const app = express();

// Middlewares fondamentaux
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Journalisation des requêtes
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Enregistrement des routes d'API
app.use('/api', apiRouter);

// Endpoint Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    system: 'Iventello 2.0 Auth & Sync Server',
    architecture: 'Layered MVP (Models, Repositories, Services, Controllers, Routes)',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Démarrage de l'écoute HTTP
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`🚀 SERVEUR BACKEND IVENTELLO (Node.js + Express + TypeScript)`);
  console.log(`📡 Port d'écoute  : http://localhost:${PORT}`);
  console.log(`🩺 Health Check   : http://localhost:${PORT}/api/health`);
  console.log(`🔐 Module Auth    : http://localhost:${PORT}/api/auth`);
  console.log(`🔄 Module Sync    : http://localhost:${PORT}/api/sync`);
  console.log(`⚙️  Module Config  : http://localhost:${PORT}/api/config`);
  console.log(`================================================================\n`);
});

export default app;
