import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { otpService } from '../services/otpService';

export class AuthController {
  /**
   * Inscription du SuperAdmin
   * POST /api/auth/register-superadmin
   */
  public async registerSuperAdmin(req: Request, res: Response): Promise<Response> {
    try {
      const { firstName, lastName, email, password, pin } = req.body;
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Les champs firstName, lastName, email et password sont obligatoires.',
        });
      }

      const result = await authService.registerSuperAdmin({
        firstName,
        lastName,
        email,
        password,
        pin,
      });

      return res.status(201).json({
        success: true,
        message: 'Compte SuperAdmin créé avec succès.',
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la création du compte.',
      });
    }
  }

  /**
   * Connexion par email & mot de passe
   * POST /api/auth/login
   */
  public async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email et mot de passe requis.',
        });
      }

      const result = await authService.login(email, password);
      return res.status(200).json({
        success: true,
        message: 'Connexion réussie.',
        data: result,
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Échec de l\'authentification.',
      });
    }
  }

  /**
   * Envoi du code de sécurité par email/SMS
   * POST /api/auth/forgot-password/send-code
   */
  public async sendForgotCode(req: Request, res: Response): Promise<Response> {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Une adresse email valide est requide.',
        });
      }

      const result = await otpService.sendOtp(email);
      if (!result.success) {
        return res.status(429).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de l\'envoi du code.',
      });
    }
  }

  /**
   * Vérification du code de sécurité
   * POST /api/auth/forgot-password/verify-code
   */
  public async verifyForgotCode(req: Request, res: Response): Promise<Response> {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: 'Email et code de sécurité requis.',
        });
      }

      const result = await otpService.verifyOtp(email, code);
      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la vérification du code.',
      });
    }
  }

  /**
   * Réinitialisation de mot de passe après validation de code
   * POST /api/auth/forgot-password/reset
   */
  public async resetPassword(req: Request, res: Response): Promise<Response> {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email, code de vérification et nouveau mot de passe sont requis.',
        });
      }

      const verifyResult = await otpService.verifyOtp(email, code);
      if (!verifyResult.success) {
        return res.status(400).json(verifyResult);
      }

      await authService.resetPassword(email, newPassword);
      return res.status(200).json({
        success: true,
        message: 'Mot de passe mis à jour avec succès.',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Erreur lors de la réinitialisation.',
      });
    }
  }
}

export const authController = new AuthController();
