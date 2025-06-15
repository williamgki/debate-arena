// Storage manager - provides a unified interface to different storage backends

import { StorageBackend } from './base';
import { FileStorage } from './file-storage';
import { PostgresStorage } from './postgres-storage';

export class StorageManager {
  private static instance: StorageManager;
  private backend: StorageBackend;
  
  private constructor() {
    // Use PostgreSQL in production (when DATABASE_URL is set), file storage in development
    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      console.log('Using PostgreSQL storage backend');
      this.backend = new PostgresStorage();
    } else {
      console.log('Using file storage backend');
      this.backend = new FileStorage(process.env.DEBATE_STORAGE_PATH || './data/debates');
    }
  }
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }
  
  getBackend(): StorageBackend {
    return this.backend;
  }
  
  // Allow switching backends (useful for testing)
  setBackend(backend: StorageBackend): void {
    this.backend = backend;
  }
}

// Export singleton instance
export const storage = StorageManager.getInstance().getBackend();