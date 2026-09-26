import { OtpRecord } from '../models';

export class OtpRepository {
  private otps: Map<string, OtpRecord> = new Map();
  private lastSentMap: Map<string, Date> = new Map();

  public async get(identifier: string): Promise<OtpRecord | null> {
    const cleanId = identifier.trim().toLowerCase();
    return this.otps.get(cleanId) || null;
  }

  public async save(otp: OtpRecord): Promise<void> {
    const cleanId = otp.identifier.trim().toLowerCase();
    this.otps.set(cleanId, otp);
    this.lastSentMap.set(cleanId, otp.createdAt);
  }

  public async delete(identifier: string): Promise<void> {
    const cleanId = identifier.trim().toLowerCase();
    this.otps.delete(cleanId);
  }

  public async getLastSentTime(identifier: string): Promise<Date | null> {
    const cleanId = identifier.trim().toLowerCase();
    return this.lastSentMap.get(cleanId) || null;
  }

  public async decrementAttempts(identifier: string): Promise<number> {
    const cleanId = identifier.trim().toLowerCase();
    const record = this.otps.get(cleanId);
    if (!record) return 0;
    record.attemptsLeft -= 1;
    if (record.attemptsLeft <= 0) {
      this.otps.delete(cleanId);
      return 0;
    }
    return record.attemptsLeft;
  }
}

export const otpRepository = new OtpRepository();
