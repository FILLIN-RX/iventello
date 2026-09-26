import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

// Inscription SuperAdmin
router.post('/register-superadmin', (req, res) => authController.registerSuperAdmin(req, res));

// Connexion standard
router.post('/login', (req, res) => authController.login(req, res));

// Flux Récupération Mot de passe & Codes OTP
router.post('/forgot-password/send-code', (req, res) => authController.sendForgotCode(req, res));
router.post('/forgot-password/verify-code', (req, res) => authController.verifyForgotCode(req, res));
router.post('/forgot-password/reset', (req, res) => authController.resetPassword(req, res));

export default router;
