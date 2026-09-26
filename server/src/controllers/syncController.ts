import { Request, Response } from 'express';
import { syncService } from '../services/syncService';
import { syncRepository } from '../repositories/syncRepository';

export class SyncController {
  /**
   * Pousse un lot de changements générés localement hors-ligne
   * POST /api/sync/push
   */
  public async pushChanges(req: Request, res: Response): Promise<Response> {
    try {
      const { deviceId, shopId, lastSyncTimestamp, changes } = req.body;
      if (!changes || !Array.isArray(changes)) {
        return res.status(400).json({
          success: false,
          message: 'Le corps de la requête doit contenir un tableau changes.',
        });
      }

      const result = await syncService.handlePush({
        deviceId: deviceId || 'unknown-device',
        shopId,
        lastSyncTimestamp: lastSyncTimestamp || 0,
        changes,
      });

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la synchronisation push.',
      });
    }
  }

  /**
   * Récupère les modifications survenues depuis la dernière synchronisation
   * GET /api/sync/pull?since=123456789
   */
  public async pullChanges(req: Request, res: Response): Promise<Response> {
    try {
      const sinceTimestamp = parseInt(req.query.since as string, 10) || 0;
      const result = await syncService.handlePull(sinceTimestamp);
      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erreur lors de la synchronisation pull.',
      });
    }
  }

  /**
   * État du serveur de synchronisation
   * GET /api/sync/status
   */
  public async getStatus(_req: Request, res: Response): Promise<Response> {
    const totalChanges = await syncRepository.getTotalChangesCount();
    return res.status(200).json({
      success: true,
      status: 'active',
      totalChangelogEntries: totalChanges,
      serverTimestamp: Date.now(),
    });
  }
}

export const syncController = new SyncController();
