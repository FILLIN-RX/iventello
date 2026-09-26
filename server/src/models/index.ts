export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  globalRole: 'SUPER_ADMIN' | 'GERANT_BOUTIQUE' | 'CAISSIER' | 'MAGASINIER';
  phone?: string;
  avatarUrl?: string;
  pinCodeHash?: string;
  mustChangePassword?: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DeliveryChannel = 'email' | 'sms' | 'localSimulated';

export interface OtpRecord {
  identifier: string; // Email ou Téléphone
  code: string;
  createdAt: Date;
  expiresAt: Date;
  attemptsLeft: number;
}

export interface SyncEntityChange {
  entityType: 'USER' | 'SHOP' | 'PRODUCT' | 'STOCK' | 'SALE' | 'CLIENT' | 'SUPPLIER';
  entityId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, any>;
  clientTimestamp: number; // millisecondes epoch
}

export interface SyncPushRequest {
  deviceId: string;
  shopId?: string;
  lastSyncTimestamp: number;
  changes: SyncEntityChange[];
}

export interface SyncPushResponse {
  success: boolean;
  syncedCount: number;
  serverTimestamp: number;
  conflicts?: Array<{ entityId: string; reason: string }>;
}

export interface SyncPullResponse {
  success: boolean;
  serverTimestamp: number;
  changes: SyncEntityChange[];
}

export interface AuthServerConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
  };
  sms: {
    apiUrl: string;
    apiKey: string;
    senderId: string;
  };
  otp: {
    length: number;
    expiryMinutes: number;
    resendCooldownSeconds: number;
    maxAttempts: number;
  };
}
