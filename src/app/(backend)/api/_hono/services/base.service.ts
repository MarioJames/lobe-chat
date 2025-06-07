/**
 * 基础服务类
 * 提供统一的服务层基础功能，与项目现有服务层模式保持一致
 */
export abstract class BaseService {
  protected userId?: string;

  constructor(userId?: string) {
    this.userId = userId;
  }

  /**
   * 业务错误类
   */
  protected createBusinessError(message: string): Error {
    const error = new Error(message);
    error.name = 'BusinessError';
    return error;
  }

  /**
   * 认证错误类
   */
  protected createAuthError(message: string): Error {
    const error = new Error(message);
    error.name = 'AuthenticationError';
    return error;
  }

  /**
   * 权限错误类
   */
  protected createAuthorizationError(message: string): Error {
    const error = new Error(message);
    error.name = 'AuthorizationError';
    return error;
  }

  /**
   * 未找到错误类
   */
  protected createNotFoundError(message: string): Error {
    const error = new Error(message);
    error.name = 'NotFoundError';
    return error;
  }

  /**
   * 验证用户是否已认证
   * @throws AuthenticationError 如果用户未认证
   */
  protected requireAuth(): void {
    if (!this.userId) {
      throw this.createAuthError('用户未认证');
    }
  }

  /**
   * 验证参数是否存在
   * @param value 参数值
   * @param name 参数名称
   * @throws BusinessError 如果参数不存在
   */
  protected validateRequired(value: any, name: string): void {
    if (value === undefined || value === null || value === '') {
      throw this.createBusinessError(`参数 ${name} 不能为空`);
    }
  }

  /**
   * 验证数组参数
   * @param value 数组值
   * @param name 参数名称
   * @param minLength 最小长度
   * @throws BusinessError 如果验证失败
   */
  protected validateArray(value: any, name: string, minLength: number = 1): void {
    if (!Array.isArray(value)) {
      throw this.createBusinessError(`参数 ${name} 必须是数组`);
    }

    if (value.length < minLength) {
      throw this.createBusinessError(`参数 ${name} 长度不能少于 ${minLength}`);
    }
  }

  /**
   * 验证ID格式
   * @param id ID值
   * @param name 参数名称
   * @throws BusinessError 如果ID格式无效
   */
  protected validateId(id: string, name: string = 'ID'): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw this.createBusinessError(`${name} 格式无效`);
    }
  }

  /**
   * 安全执行异步操作
   * @param operation 异步操作
   * @param errorMessage 错误消息
   * @returns 操作结果
   */
  protected async safeExecute<T>(
    operation: () => Promise<T>,
    errorMessage: string = '操作执行失败',
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(`Service Error: ${errorMessage}`, error);

      // 如果是已知的业务错误，直接抛出
      if (
        error instanceof Error &&
        ['BusinessError', 'AuthenticationError', 'AuthorizationError', 'NotFoundError'].includes(
          error.name,
        )
      ) {
        throw error;
      }

      // 其他错误包装为业务错误
      throw this.createBusinessError(errorMessage);
    }
  }

  /**
   * 日志记录工具
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logMessage = `[${this.constructor.name}] ${message}`;

    switch (level) {
      case 'info': {
        console.info(logMessage, data);
        break;
      }
      case 'warn': {
        console.warn(logMessage, data);
        break;
      }
      case 'error': {
        console.error(logMessage, data);
        break;
      }
    }
  }
}
