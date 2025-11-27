import { getServerDB } from '@/database/core/db-adaptor';
import { CustomizationModel } from '@/database/models/customization';

/**
 * 定制化配置服务（服务端版本）
 * 可在服务端组件中直接使用，不依赖浏览器环境
 */
class CustomizationServerService {
  /**
   * 获取定制化配置
   */
  getConfig = async () => {
    const serverDB = await getServerDB();
    const model = new CustomizationModel(serverDB);
    const config = await model.getConfig();

    if (!config) {
      return {
        base: null,
        defaultAgent: null,
        welcome: null,
      };
    }

    return {
      base: config.base,
      defaultAgent: config.defaultAgent,
      welcome: config.welcome,
    };
  };

  /**
   * 获取当前生效的公告
   */
  getActiveAnnouncement = async () => {
    const serverDB = await getServerDB();
    const model = new CustomizationModel(serverDB);
    const announcement = await model.getActiveAnnouncement();

    if (!announcement) {
      return null;
    }

    return {
      content: announcement.content,
      createdAt: announcement.createdAt,
      effectiveEndAt: announcement.effectiveEndAt,
      effectiveStartAt: announcement.effectiveStartAt,
      id: announcement.id,
      title: announcement.title,
    };
  };
}

export const customizationServerService = new CustomizationServerService();
