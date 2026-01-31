import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Visitor, AuditLog, BlacklistEntry, User, UserRole, PhoneRecord, TrustLevel, SecurityConfig, DeveloperConfig } from '../types';

interface PixelGateDB extends DBSchema {
  visitors: {
    key: string;
    value: Visitor;
    indexes: { 'by-status': string; 'by-synced': string };
  };
  phones: {
    key: string;
    value: PhoneRecord;
  };
  logs: {
    key: string;
    value: AuditLog;
    indexes: { 'by-timestamp': number };
  };
  blacklist: {
    key: string;
    value: BlacklistEntry;
  };
  users: {
    key: string;
    value: User;
    indexes: { 'by-pin': string };
  };
  settings: {
    key: string;
    value: { id: string; value: any };
  };
}

const DB_NAME = 'pixelgate-db';
const DB_VERSION = 9; // Incremented to force update of Admin name

export const initDB = async (): Promise<IDBPDatabase<PixelGateDB>> => {
  return openDB<PixelGateDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('visitors')) {
        const store = db.createObjectStore('visitors', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-synced', 'synced');
      }
      if (!db.objectStoreNames.contains('phones')) {
        db.createObjectStore('phones', { keyPath: 'number' });
      }
      if (!db.objectStoreNames.contains('logs')) {
        const store = db.createObjectStore('logs', { keyPath: 'id' });
        store.createIndex('by-timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('blacklist')) {
        db.createObjectStore('blacklist', { keyPath: 'id' });
      }
      
      // Handle Users Store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-pin', 'pin', { unique: true });
      } else if (oldVersion < 9) {
        // Force clear and re-seed to apply "School Admin." name change
        transaction.objectStore('users').clear();
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    },
  });
};

// Seed default users if empty
export const seedUsers = async () => {
  const db = await initDB();
  const count = await db.count('users');
  if (count === 0) {
    // 1. Security (Guard Role)
    await db.put('users', { id: '1', name: 'Gate Officer', pin: '1111', role: UserRole.GUARD, isSessionActive: false });
    // 2. Admin (Admin Role) - Updated Name
    await db.put('users', { id: '2', name: 'School Admin.', pin: '8888', role: UserRole.ADMIN, isSessionActive: false });
    // 3. Developer (Developer Role)
    await db.put('users', { id: '3', name: 'System Developer', pin: '1234', role: UserRole.DEVELOPER, isSessionActive: false });
    console.log('Seeded users with updated Admin name');
  }
};

// Data Access Object
export const dbService = {
  async authenticate(pin: string): Promise<User | undefined> {
    const db = await initDB();
    const users = await db.getAll('users');
    return users.find(u => u.pin === pin);
  },
  
  async getUsers(): Promise<User[]> {
    const db = await initDB();
    return await db.getAll('users');
  },

  async setUserSession(userId: string, isActive: boolean) {
    const db = await initDB();
    const user = await db.get('users', userId);
    if (user) {
        user.isSessionActive = isActive;
        await db.put('users', user);
    }
  },

  // Phone History Management
  async getPhoneRecord(number: string): Promise<PhoneRecord | undefined> {
    const db = await initDB();
    return await db.get('phones', number);
  },

  async updatePhoneHistory(number: string, visitorName: string) {
    const db = await initDB();
    const existing = await db.get('phones', number);
    
    let record: PhoneRecord;
    
    if (existing) {
        const newCount = existing.visitCount + 1;
        let newTrust: TrustLevel = existing.trustLevel;
        if (existing.trustLevel === 'NEW' || existing.trustLevel === 'UNVERIFIED') {
            if (newCount >= 3) newTrust = 'TRUSTED';
        }

        record = {
            ...existing,
            visitCount: newCount,
            lastSeen: Date.now(),
            lastVisitorName: visitorName,
            trustLevel: newTrust
        };
    } else {
        record = {
            number,
            visitCount: 1,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            lastVisitorName: visitorName,
            trustLevel: 'NEW'
        };
    }
    
    await db.put('phones', record);
  },

  async addVisitor(visitor: Visitor) {
    const db = await initDB();
    await db.put('visitors', visitor);
    await this.updatePhoneHistory(visitor.mobile, visitor.name);
  },

  async updateVisitor(visitor: Visitor) {
    const db = await initDB();
    await db.put('visitors', visitor);
  },

  async getVisitor(id: string): Promise<Visitor | undefined> {
    const db = await initDB();
    return await db.get('visitors', id);
  },

  async getActiveVisitors(): Promise<Visitor[]> {
    const db = await initDB();
    const all = await db.getAll('visitors');
    return all.filter(v => v.status === 'ACTIVE').sort((a, b) => b.checkInTime - a.checkInTime);
  },
  
  async getAllVisitors(): Promise<Visitor[]> {
    const db = await initDB();
    return await db.getAll('visitors');
  },

  async checkBlacklist(name: string): Promise<boolean> {
    const db = await initDB();
    const list = await db.getAll('blacklist');
    return list.some(entry => entry.name.toLowerCase() === name.toLowerCase());
  },

  async addToBlacklist(entry: BlacklistEntry) {
    const db = await initDB();
    await db.put('blacklist', entry);
  },
  
  async removeFromBlacklist(id: string) {
    const db = await initDB();
    await db.delete('blacklist', id);
  },
  
  async getBlacklist(): Promise<BlacklistEntry[]> {
    const db = await initDB();
    return await db.getAll('blacklist');
  },

  async addLog(log: AuditLog) {
    const db = await initDB();
    await db.put('logs', log);
  },

  async getLogs(): Promise<AuditLog[]> {
    const db = await initDB();
    const logs = await db.getAll('logs');
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  },
  
  async getUnsyncedCount(): Promise<number> {
    const db = await initDB();
    const visitors = await db.getAll('visitors');
    return visitors.filter(v => !v.synced).length;
  },

  async setLockdown(status: boolean) {
    const db = await initDB();
    await db.put('settings', { id: 'lockdown', value: status });
  },

  async getLockdown(): Promise<boolean> {
    const db = await initDB();
    const setting = await db.get('settings', 'lockdown');
    return setting ? setting.value : false;
  },

  // Security Config (Admin)
  async getSecurityConfig(): Promise<SecurityConfig> {
      const db = await initDB();
      const setting = await db.get('settings', 'securityConfig');
      if (setting) return setting.value;
      return {
          blockSameDigits: true,
          blockSequential: true,
          blockRepeatedBlocks: true,
          otpLength: 4,
          maxRetries: 3
      };
  },

  async setSecurityConfig(config: SecurityConfig) {
      const db = await initDB();
      await db.put('settings', { id: 'securityConfig', value: config });
  },

  // Developer Config
  async getDeveloperConfig(): Promise<DeveloperConfig> {
      const db = await initDB();
      const setting = await db.get('settings', 'devConfig');
      if (setting) return setting.value;
      return {
          gateway: { provider: 'MOCK', apiKey: 'sk_test_12345', senderId: 'BPS_EDU', failoverEnabled: false },
          rules: {
            regexSameDigits: '(\\d)\\1{4,}',
            regexSequential: '(?:0(?=1)|1(?=2)|2(?=3)|3(?=4)|4(?=5)|5(?=6)|6(?=7)|7(?=8)|8(?=9)|9(?=0)){4,}\\d',
            regexRepeated: '(\\d{2})\\1{2,}',
            allowedPrefixes: '6,7,8,9'
          },
          features: { enableVoiceOtp: false, autoResend: true, debugMode: false }
      };
  },

  async setDeveloperConfig(config: DeveloperConfig) {
      const db = await initDB();
      await db.put('settings', { id: 'devConfig', value: config });
  }
};