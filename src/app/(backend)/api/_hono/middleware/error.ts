import { HTTPException } from 'hono/http-exception';

import { ChatCompletionErrorPayload } from '@/libs/model-runtime';
import { ChatErrorType, ErrorType } from '@/types/fetch';
import { createErrorResponse } from '@/utils/errorResponse';

/**
 * Hono错误处理中间件
 * 集成现有的createErrorResponse函数，保持错误格式一致性
 */
export const errorHandler = (error: Error) => {
  console.error('Hono API Error:', error);

  // 处理HTTP异常
  if (error instanceof HTTPException) {
    const statusCode = error.status;
    const errorMessage = error.message;

    // 根据状态码映射到ErrorType
    let errorType: ErrorType;
    switch (statusCode) {
      case 401: {
        errorType = ChatErrorType.Unauthorized;
        break;
      }
      case 403: {
        errorType = ChatErrorType.Forbidden;
        break;
      }
      case 404: {
        errorType = ChatErrorType.ContentNotFound;
        break;
      }
      case 429: {
        errorType = ChatErrorType.TooManyRequests;
        break;
      }
      default: {
        errorType = ChatErrorType.InternalServerError;
        break;
      }
    }

    // 使用现有的createErrorResponse函数创建统一的错误响应
    const errorResponse = createErrorResponse(errorType, {
      error: errorMessage,
      provider: 'hono-api',
    });

    return errorResponse;
  }

  // 处理ChatCompletionErrorPayload类型的错误
  if ((error as unknown as ChatCompletionErrorPayload)?.errorType) {
    const chatError = error as unknown as ChatCompletionErrorPayload;
    const {
      errorType = ChatErrorType.InternalServerError,
      error: errorContent,
      ...res
    } = chatError;

    const errorMessage = errorContent || error.message;

    return createErrorResponse(errorType, {
      error: errorMessage,
      ...res,
      provider: 'hono-api',
    });
  }

  // 处理其他类型的错误
  return createErrorResponse(ChatErrorType.InternalServerError, {
    error: error.message || 'Internal server error',
    provider: 'hono-api',
  });
};
