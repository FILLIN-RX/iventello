import { SyncPushRequest, SyncPushResponse, SyncPullResponse } from '../models';
import { syncRepository, SyncRepository } from '../repositories/syncRepository';

export class SyncService {
  private syncRepo: SyncRepository;

  constructor(syncRepo: SyncRepository = syncRepository) {
    this.syncRepo = syncRepo;
  }

  /**
   * Reçoit et fusionne les modifications locales créées hors-ligne par la caisse / point de vente
   */
  public async handlePush(payload: SyncPushRequest): Promise<SyncPushResponse> {
    if (!payload.changes || !Array.isArray(payload.changes)) {
      throw new Error('Le tableau de modifications changes est requis.');
    }

    const savedCount = await this.syncRepo.saveChanges(payload.changes);
    const serverTimestamp = Date.now();

    console.log(`🔄 [SYNC PUSH] ${savedCount} changement(s) synchronisé(s) depuis device: ${payload.deviceId}`);

    return {
      success: true,
      syncedCount: savedCount,
      serverTimestamp,
    };
  }

  /**
   * Retourne toutes les modifications serveur survenues depuis la dernière synchronisation
   */
  public async handlePull(sinceTimestamp: number): Promise<SyncPullResponse> {
    const changes = await this.syncRepo.getChangesSince(sinceTimestamp);
    const serverTimestamp = Date.now();

    console.log(`🔄 [SYNC PULL] ${changes.length} modification(s) expédiée(s) pour sinceTimestamp: ${sinceTimestamp}`);

    return {
      success: true,
      serverTimestamp,
      changes,
    };
  }
}

export const syncService = new SyncService();
