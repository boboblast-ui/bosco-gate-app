export enum UserRole {
  GUARD = 'GUARD',
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER'
}

export type TrustLevel = 'TRUSTED' | 'UNVERIFIED' | 'FLAGGED' | 'NEW';
export type VisitorType = 'Parent' | 'Vendor' | 'Guest' | 'Official' | 'Other';

export interface User {
  id: string;
  name: string;
  pin: string;
  role: UserRole;
  isSessionActive?: boolean;
}

export interface SecurityConfig {
  blockSameDigits: boolean; // 9999999999
  blockSequential: boolean; // 1234567890
  blockRepeatedBlocks: boolean; // 98989898
  otpLength: 4 | 6;
  maxRetries: number;
}

export interface DeveloperConfig {
  gateway: {
    provider: 'TWILIO' | 'AWS' | 'GUPSHUP' | 'MOCK';
    apiKey: string;
    senderId: string;
    failoverEnabled: boolean;
  };
  rules: {
    regexSameDigits: string;
    regexSequential: string;
    regexRepeated: string;
    allowedPrefixes: string; // e.g. "6,7,8,9"
  };
  features: {
    enableVoiceOtp: boolean;
    autoResend: boolean;
    debugMode: boolean;
  };
}

export interface PhoneRecord {
  number: string;
  trustLevel: TrustLevel;
  visitCount: number;
  lastVisitorName: string;
  firstSeen: number;
  lastSeen: number;
}

export interface Visitor {
  id: string;
  passId: string;
  name: string;
  mobile: string;
  visitorType: VisitorType;
  purpose: string;
  hostName: string;
  studentName?: string;
  studentClass?: string;
  studentSection?: string;
  checkInTime: number; // timestamp
  checkOutTime?: number; // timestamp
  photoBase64: string;
  synced: boolean;
  status: 'ACTIVE' | 'CHECKED_OUT';
}

export interface AuditLog {
  id: string;
  action: 'LOGIN' | 'CHECK_IN' | 'CHECK_OUT' | 'LOCKDOWN_TOGGLE' | 'SYNC' | 'EXPORT' | 'SETTINGS_UPDATE' | 'DEV_CONFIG_UPDATE';
  timestamp: number;
  details: string;
  userId: string;
  metadata?: {
    photo?: string;
    [key: string]: any;
  };
}

export interface BlacklistEntry {
  id: string;
  name: string;
  reason: string;
}

export interface AppState {
  currentUser: User | null;
  isOnline: boolean;
  isLockdown: boolean;
  pendingSync: number;
}