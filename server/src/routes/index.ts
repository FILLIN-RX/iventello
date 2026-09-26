import { Router } from 'express';
import authRoutes from './authRoutes';
import syncRoutes from './syncRoutes';
import configRoutes from './configRoutes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/sync', syncRoutes);
apiRouter.use('/config', configRoutes);

export default apiRouter;
