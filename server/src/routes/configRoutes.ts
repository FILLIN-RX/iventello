import { Router } from 'express';
import { configController } from '../controllers/configController';

const router = Router();

router.get('/', (req, res) => configController.getConfig(req, res));
router.put('/', (req, res) => configController.updateConfig(req, res));

export default router;
