import { JWTPayload } from '@/const/auth';

import { IBaseService, ServiceResult } from '../../types/api';
import { BaseService } from '../base.service';

/**
 * 用户服务接口
 */
export interface IUserService extends IBaseService {
  /**
   * 获取用户公开信息
   * @returns 用户公开信息
   */
  getUserInfo(): ServiceResult<any>;

  /**
   * 获取用户资料信息
   * @param jwtPayload JWT载荷
   * @returns 用户资料数据
   */
  getUserProfile(jwtPayload: JWTPayload): ServiceResult<any>;

  /**
   * 获取用户状态
   * @returns 用户状态信息
   */
  getUserStatus(): ServiceResult<any>;
}

/**
 * 用户服务实现类
 */
export class UserService extends BaseService implements IUserService {
  /**
   * 获取用户资料信息
   * @param jwtPayload JWT载荷
   * @returns 用户资料数据
   */
  async getUserProfile(jwtPayload: JWTPayload): ServiceResult<any> {
    return this.safeExecute(async () => {
      this.requireAuth();

      this.log('info', '获取用户资料', { userId: this.userId });

      // 处理用户资料逻辑
      const profileData = {
        // 返回JWT中的基本信息（不包含敏感数据）
        accessCode: jwtPayload.accessCode ? '已设置' : '未设置',
        apiKey: jwtPayload.apiKey ? '已设置' : '未设置',
        userId: this.userId,
      };

      return profileData;
    }, '获取用户资料失败');
  }

  /**
   * 获取用户公开信息
   * @returns 用户公开信息
   */
  async getUserInfo(): ServiceResult<any> {
    return this.safeExecute(async () => {
      this.log('info', '获取用户公开信息', { userId: this.userId });

      const userInfo = {
        authenticated: !!this.userId,
        service: 'lobe-chat',
        userId: this.userId || null,
      };

      return userInfo;
    }, '获取用户信息失败');
  }

  /**
   * 获取用户状态
   * @returns 用户状态信息
   */
  async getUserStatus(): ServiceResult<any> {
    return this.safeExecute(async () => {
      this.log('info', '获取用户状态');

      const statusData = {
        service: 'user-api',
        status: 'operational' as const,
        version: 'v1',
      };

      return statusData;
    }, '获取用户状态失败');
  }
}
