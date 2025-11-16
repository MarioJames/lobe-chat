import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { KnowledgeBaseModel } from '@/database/models/knowledgeBase';
import {
  KnowledgeBaseItem,
  NewKnowledgeBase,
  knowledgeBaseGrants,
  knowledgeBases,
  userRoles,
} from '@/database/schemas';
import { LobeChatDatabase } from '@/database/type';

import { BaseService } from '../common/base.service';
import { processPaginationConditions } from '../helpers/pagination';
import {
  CreateKnowledgeBaseRequest,
  CreateKnowledgeBaseResponse,
  DeleteKnowledgeBaseResponse,
  KnowledgeBaseDetailResponse,
  KnowledgeBaseListQuery,
  KnowledgeBaseListResponse,
  UpdateKnowledgeBaseRequest,
} from '../types/knowledgeBase.type';

/**
 * 知识库服务类
 * 处理知识库的增删改查功能
 */
export class KnowledgeBaseService extends BaseService {
  private knowledgeBaseModel: KnowledgeBaseModel;

  constructor(db: LobeChatDatabase, userId: string) {
    super(db, userId);
    this.knowledgeBaseModel = new KnowledgeBaseModel(db, userId);
  }

  /**
   * 获取知识库列表
   */
  async getKnowledgeBaseList(request: KnowledgeBaseListQuery): Promise<KnowledgeBaseListResponse> {
    try {
      // 权限校验
      const permissionResult = await this.resolveOperationPermission('KNOWLEDGE_BASE_READ');

      if (!permissionResult.isPermitted) {
        throw this.createAuthorizationError(permissionResult.message || '无权访问知识库列表');
      }

      this.log('info', 'Getting knowledge base list', request);

      // 计算分页参数
      const { limit, offset } = processPaginationConditions(request);

      // 构建查询条件
      const { keyword, type, enabled } = request;

      const whereConditions = [];

      // 添加权限相关的查询条件（如果需要过滤到特定用户）
      if (permissionResult?.condition?.userId) {
        whereConditions.push(eq(knowledgeBases.userId, permissionResult.condition.userId));
      }

      // 添加模糊查询条件
      if (keyword) {
        whereConditions.push(
          or(
            ilike(knowledgeBases.name, `%${keyword}%`),
            ilike(knowledgeBases.description, `%${keyword}%`),
          ),
        );
      }

      // 添加类型过滤
      if (type) {
        whereConditions.push(eq(knowledgeBases.type, type));
      }

      // 添加启用状态过滤
      if (enabled !== undefined) {
        whereConditions.push(eq(knowledgeBases.enabled, enabled));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [kbResult, totalResult] = await Promise.all([
        this.db.query.knowledgeBases.findMany({
          limit: limit,
          offset: offset,
          orderBy: desc(knowledgeBases.updatedAt),
          where: whereClause,
        }),
        this.db.select({ count: count() }).from(knowledgeBases).where(whereClause),
      ]);

      const knowledgeBaseIds = kbResult.map((item) => item.id);

      const authorizedKnowledgeBaseIdSet = new Set<string>();

      // 根据知识库的 id 查询被授权的情况（个人授权和角色授权）
      if (knowledgeBaseIds.length > 0) {
        const [userGrants, roleGrants] = await Promise.all([
          this.db
            .select({ knowledgeBaseId: knowledgeBaseGrants.knowledgeBaseId })
            .from(knowledgeBaseGrants)
            .where(
              and(
                eq(knowledgeBaseGrants.granteeType, 'user'),
                eq(knowledgeBaseGrants.granteeUserId, this.userId),
                inArray(knowledgeBaseGrants.knowledgeBaseId, knowledgeBaseIds),
              ),
            ),
          this.db
            .select({ knowledgeBaseId: knowledgeBaseGrants.knowledgeBaseId })
            .from(knowledgeBaseGrants)
            .innerJoin(
              userRoles,
              and(
                eq(knowledgeBaseGrants.granteeRoleId, userRoles.roleId),
                eq(userRoles.userId, this.userId),
                or(sql`${userRoles.expiresAt} IS NULL`, sql`${userRoles.expiresAt} > now()`),
              ),
            )
            .where(
              and(
                eq(knowledgeBaseGrants.granteeType, 'role'),
                inArray(knowledgeBaseGrants.knowledgeBaseId, knowledgeBaseIds),
              ),
            ),
        ]);

        for (const grant of userGrants) {
          authorizedKnowledgeBaseIdSet.add(grant.knowledgeBaseId);
        }

        for (const grant of roleGrants) {
          authorizedKnowledgeBaseIdSet.add(grant.knowledgeBaseId);
        }
      }

      const knowledgeBasesWithAuthorization = kbResult.map((item) => {
        const isPersonalOwned = item.type === 'personal' && item.userId === this.userId;
        const isPublic = item.isPublic === true;
        const isAuthorizedByGrant = authorizedKnowledgeBaseIdSet.has(item.id);

        return {
          ...item,
          isAuthorized: isPersonalOwned || isPublic || isAuthorizedByGrant,
        };
      });

      this.log('info', 'Knowledge base list retrieved successfully', {
        count: knowledgeBasesWithAuthorization.length,
        total: totalResult[0]?.count || 0,
      });

      return {
        knowledgeBases: knowledgeBasesWithAuthorization,
        total: totalResult[0]?.count || 0,
      };
    } catch (error) {
      this.handleServiceError(error, '获取知识库列表');
    }
  }

  /**
   * 获取知识库详情
   */
  async getKnowledgeBaseDetail(id: string): Promise<KnowledgeBaseDetailResponse> {
    try {
      // 权限校验
      const permissionResult = await this.resolveOperationPermission('KNOWLEDGE_BASE_READ');

      if (!permissionResult.isPermitted) {
        throw this.createAuthorizationError(permissionResult.message || '无权访问此知识库');
      }

      this.log('info', 'Getting knowledge base detail', { id });

      // 使用模型的 findById 方法，它包含了访问权限和启用状态的检查
      const knowledgeBase = await this.knowledgeBaseModel.findById(id);

      if (!knowledgeBase) {
        throw this.createNotFoundError('Knowledge base not found or access denied');
      }

      this.log('info', 'Knowledge base detail retrieved successfully', { id });

      return {
        knowledgeBase,
      };
    } catch (error) {
      this.handleServiceError(error, '获取知识库详情');
    }
  }

  /**
   * 创建知识库
   */
  async createKnowledgeBase(
    request: CreateKnowledgeBaseRequest,
  ): Promise<CreateKnowledgeBaseResponse> {
    try {
      // 权限校验
      const permissionResult = await this.resolveOperationPermission('KNOWLEDGE_BASE_CREATE');

      if (!permissionResult.isPermitted) {
        throw this.createAuthorizationError(permissionResult.message || '无权创建知识库');
      }

      this.log('info', 'Creating knowledge base', {
        name: request.name,
        type: request.type,
      });

      // 创建知识库，添加默认值
      const createData: NewKnowledgeBase = {
        enabled: true,
        isPublic: request.isPublic ?? false,
        name: request.name,
        type: request.type || 'personal',
        userId: this.userId,
      };

      if (request.avatar) createData.avatar = request.avatar;
      if (request.description) createData.description = request.description;
      if (request.settings) createData.settings = request.settings;

      const knowledgeBase = await this.knowledgeBaseModel.create(createData);

      this.log('info', 'Knowledge base created successfully', {
        id: knowledgeBase.id,
        name: knowledgeBase.name,
      });

      return {
        knowledgeBase,
      };
    } catch (error) {
      this.handleServiceError(error, '创建知识库');
    }
  }

  /**
   * 更新知识库
   */
  async updateKnowledgeBase(
    id: string,
    request: UpdateKnowledgeBaseRequest,
  ): Promise<KnowledgeBaseDetailResponse> {
    try {
      // 权限校验
      const permissionResult = await this.resolveOperationPermission('KNOWLEDGE_BASE_UPDATE');

      if (!permissionResult.isPermitted) {
        throw this.createAuthorizationError(permissionResult.message || '无权更新此知识库');
      }

      this.log('info', 'Updating knowledge base', { id, request });

      // 检查知识库是否存在且属于当前用户
      const existingKb = await this.db.query.knowledgeBases.findFirst({
        where: and(eq(knowledgeBases.id, id), eq(knowledgeBases.userId, this.userId)),
      });

      if (!existingKb) {
        throw this.createNotFoundError('Knowledge base not found or access denied');
      }

      // 更新知识库
      await this.knowledgeBaseModel.update(id, request);

      // 获取更新后的知识库信息
      const updatedKb = await this.db.query.knowledgeBases.findFirst({
        where: eq(knowledgeBases.id, id),
      });

      this.log('info', 'Knowledge base updated successfully', { id });

      return {
        knowledgeBase: updatedKb as KnowledgeBaseItem,
      };
    } catch (error) {
      this.handleServiceError(error, '更新知识库');
    }
  }

  /**
   * 删除知识库
   */
  async deleteKnowledgeBase(id: string): Promise<DeleteKnowledgeBaseResponse> {
    try {
      // 权限校验
      const permissionResult = await this.resolveOperationPermission('KNOWLEDGE_BASE_DELETE');

      if (!permissionResult.isPermitted) {
        throw this.createAuthorizationError(permissionResult.message || '无权删除此知识库');
      }

      this.log('info', 'Deleting knowledge base', { id });

      // 检查知识库是否存在且属于当前用户
      const existingKb = await this.db.query.knowledgeBases.findFirst({
        where: and(eq(knowledgeBases.id, id), eq(knowledgeBases.userId, this.userId)),
      });

      if (!existingKb) {
        throw this.createNotFoundError('Knowledge base not found or access denied');
      }

      // 删除知识库
      await this.knowledgeBaseModel.delete(id);

      this.log('info', 'Knowledge base deleted successfully', { id });

      return {
        message: 'Knowledge base deleted successfully',
        success: true,
      };
    } catch (error) {
      this.handleServiceError(error, '删除知识库');
    }
  }
}
