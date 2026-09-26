import { Request, Response } from 'express';
import { config } from '../config';

export class ConfigController {
  /**
   * Consultation de la configuration
   * GET /api/config
   */
  public getConfig(_req: Request, res: Response): Response {
    return res.status(200).json({
      success: true,
      data: {
        smtpConfigured: !!(config.smtp.host && config.smtp.user),
        smtpHost: config.smtp.host || 'Mode local / simulation',
        smtpPort: config.smtp.port,
        smtpSecure: config.smtp.secure,
        smtpSenderName: config.smtp.fromName,
        smtpSenderEmail: config.smtp.fromEmail,
        smsConfigured: !!(config.sms.apiUrl && config.sms.apiKey),
        smsSenderId: config.sms.senderId,
        otpLength: config.otp.length,
        otpExpiryMinutes: config.otp.expiryMinutes,
        otpCooldownSeconds: config.otp.resendCooldownSeconds,
        otpMaxAttempts: config.otp.maxAttempts,
      },
    });
  }

  /**
   * Mise à jour de la configuration
   * PUT /api/config
   */
  public updateConfig(req: Request, res: Response): Response {
    try {
      const { smtp, sms, otp } = req.body;

      if (smtp) {
        if (smtp.host !== undefined) config.smtp.host = smtp.host;
        if (smtp.port !== undefined) config.smtp.port = parseInt(smtp.port, 10);
        if (smtp.secure !== undefined) config.smtp.secure = Boolean(smtp.secure);
        if (smtp.user !== undefined) config.smtp.user = smtp.user;
        if (smtp.pass !== undefined) config.smtp.pass = smtp.pass;
        if (smtp.fromName !== undefined) config.smtp.fromName = smtp.fromName;
        if (smtp.fromEmail !== undefined) config.smtp.fromEmail = smtp.fromEmail;
      }

      if (sms) {
        if (sms.apiUrl !== undefined) config.sms.apiUrl = sms.apiUrl;
        if (sms.apiKey !== undefined) config.sms.apiKey = sms.apiKey;
        if (sms.senderId !== undefined) config.sms.senderId = sms.senderId;
      }

      if (otp) {
        if (otp.length !== undefined) config.otp.length = parseInt(otp.length, 10);
        if (otp.expiryMinutes !== undefined) config.otp.expiryMinutes = parseInt(otp.expiryMinutes, 10);
        if (otp.resendCooldownSeconds !== undefined) config.otp.resendCooldownSeconds = parseInt(otp.resendCooldownSeconds, 10);
        if (otp.maxAttempts !== undefined) config.otp.maxAttempts = parseInt(otp.maxAttempts, 10);
      }

      return res.status(200).json({
        success: true,
        message: 'Configuration mise à jour avec succès.',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de la configuration.',
        error: error.message,
      });
    }
  }
}

export const configController = new ConfigController();
