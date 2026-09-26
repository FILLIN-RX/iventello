import { SyncEntityChange } from '../models';

export class SyncRepository {
  private changeLog: Array<SyncEntityChange & { serverReceivedAt: number }> = [];

  /**
   * Enregistre un lot de changements provenant d'un client local offline
   */
  public async saveChanges(changes: SyncEntityChange[]): Promise<number> {
    const now = Date.now();
    for (const change of changes) {
      this.changeLog.push({
        ...change,
        serverReceivedAt: now,
      });
    }
    return changes.length;
  }

  /**
   * Récupère les modifications survenues sur le serveur depuis un timestamp donné
   */
  public async getChangesSince(sinceTimestamp: number): Promise<SyncEntityChange[]> {
    return this.changeLog
      .filter((c) => c.serverReceivedAt > sinceTimestamp)
      .map(({ serverReceivedAt, ...rest }) => rest);
  }

  public async getTotalChangesCount(): Promise<number> {
    return this.changeLog.length;
  }
}

export const syncRepository = new SyncRepository();
