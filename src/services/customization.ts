import { lambdaClient } from '@/libs/trpc/client';

/**
 * 定制化配置服务
 * 提供前台查询定制化配置和公告的能力
 */
class CustomizationService {
  /**
   * 获取定制化配置
   */
  getConfig = async () => {
    return lambdaClient.customization.getConfig.query();
  };

  /**
   * 获取当前生效的公告
   */
  getActiveAnnouncement = async () => {
    return lambdaClient.customization.getActiveAnnouncement.query();
  };
}

export const customizationService = new CustomizationService();
