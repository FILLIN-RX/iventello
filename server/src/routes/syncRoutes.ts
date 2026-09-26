import { Router } from 'express';
import { syncController } from '../controllers/syncController';

const router = Router();

// Pousse des changements générés localement par la caisse
router.post('/push', (req, res) => syncController.pushChanges(req, res));

// Récupération des changements serveur
router.get('/pull', (req, res) => syncController.pullChanges(req, res));

// Statut de synchronisation
router.get('/status', (req, res) => syncController.getStatus(req, res));

export default router;
