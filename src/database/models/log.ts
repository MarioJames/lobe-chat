import debug from 'debug';
import { LobeChatDatabase } from '@/database/type';
import { NewLogItem, logs } from '@/database/schemas/log';

const log = debug('lobe:log-model');

export class LogModel {
  private readonly db: LobeChatDatabase;

  constructor(db: LobeChatDatabase) {
    this.db = db;
  }

  async create(item: NewLogItem): Promise<void> {
    try {
      await this.db.insert(logs).values(item);
    } catch (error) {
      // 不影响主流程，记录调试信息
      log('failed to insert log: %O', error);
    }
  }
} 