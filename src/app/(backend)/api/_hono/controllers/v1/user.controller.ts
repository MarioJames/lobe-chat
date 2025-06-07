import { Context } from 'hono';

import { IUserService, UserService } from '../../services/v1/user.service';
import { BaseController } from '../base.controller';

/**
 * 用户控制器类
 * 处理用户相关的HTTP请求和响应
 */
export class UserController extends BaseController {
  private userService: IUserService;

  constructor(userId?: string) {
    super();
    this.userService = new UserService(userId);
  }

  /**
   * 获取当前用户资料信息
   * @param c Hono Context
   * @returns 用户资料响应
   */
  async getProfile(c: Context): Promise<Response> {
    try {
      // 获取JWT载荷
      const jwtPayload = this.getJwtPayload(c);
      if (!jwtPayload) {
        return this.error(c, '未找到用户认证信息', 401);
      }

      // 调用服务层
      const profileData = await this.userService.getUserProfile(jwtPayload);

      return this.success(c, profileData);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * 获取用户公开信息
   * @param c Hono Context
   * @returns 用户公开信息响应
   */
  async getInfo(c: Context): Promise<Response> {
    try {
      // 获取用户ID（可能为空，用于可选认证）
      const userId = this.getUserId(c);

      // 创建带用户信息的服务实例
      const userService = new UserService(userId || undefined);
      const userInfo = await userService.getUserInfo();

      return this.success(c, userInfo);
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * 获取用户状态信息
   * @param c Hono Context
   * @returns 用户状态响应
   */
  async getStatus(c: Context): Promise<Response> {
    try {
      const statusData = await this.userService.getUserStatus();
      return this.success(c, statusData);
    } catch (error) {
      return this.handleError(c, error);
    }
  }
}
