import { KnowledgeBaseItem } from '@lobechat/types';
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import {
  NewKnowledgeBase,
  knowledgeBaseFiles,
  knowledgeBaseGrants,
  knowledgeBases,
} from '../schemas';
import { userRoles } from '../schemas/rbac';
import { LobeChatDatabase } from '../type';
import { RbacModel } from './rbac';
import { getScopePermissions } from '@/utils/rbac';

export class KnowledgeBaseModel {
  private userId: string;
  private db: LobeChatDatabase;
  private rbacModel: RbacModel;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
    this.rbacModel = new RbacModel(db, userId);
  }

  // create

  create = async (params: Omit<NewKnowledgeBase, 'userId'>) => {
    const [result] = await this.db
      .insert(knowledgeBases)
      .values({ userId: this.userId, ...params })
      .returning();

    return result;
  };

  addFilesToKnowledgeBase = async (id: string, fileIds: string[]) => {
    return this.db
      .insert(knowledgeBaseFiles)
      .values(fileIds.map((fileId) => ({ fileId, knowledgeBaseId: id, userId: this.userId })))
      .returning();
  };

  // delete
  delete = async (id: string) => {
    return this.db
      .delete(knowledgeBases)
      .where(and(eq(knowledgeBases.id, id), eq(knowledgeBases.userId, this.userId)));
  };

  deleteAll = async () => {
    return this.db.delete(knowledgeBases).where(eq(knowledgeBases.userId, this.userId));
  };

  removeFilesFromKnowledgeBase = async (knowledgeBaseId: string, ids: string[]) => {
    return this.db.delete(knowledgeBaseFiles).where(
      and(
        eq(knowledgeBaseFiles.knowledgeBaseId, knowledgeBaseId),
        inArray(knowledgeBaseFiles.fileId, ids),
        // eq(knowledgeBaseFiles.userId, this.userId),
      ),
    );
  };
  // query
  query = async () => {
    // 定义子查询：用户直接授权的知识库
    // 注意：.as() 只是定义别名，不会立即执行查询，会被合并到最终的 SQL 中
    const userGrant = this.db
      .select({ knowledgeBaseId: knowledgeBaseGrants.knowledgeBaseId })
      .from(knowledgeBaseGrants)
      .where(
        and(
          eq(knowledgeBaseGrants.granteeType, 'user'),
          eq(knowledgeBaseGrants.granteeUserId, this.userId),
        ),
      )
      .as('user_grant');

    // 定义子查询：通过角色授权的知识库
    // 包含角色有效期校验：expiresAt IS NULL 或 expiresAt > now()
    const roleGrant = this.db
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
      .where(eq(knowledgeBaseGrants.granteeType, 'role'))
      .as('role_grant');

    // 主查询：返回所有"可见且启用"的知识库
    // 可见性规则（满足任一条件即可）：
    // 1. 所有者：userId = this.userId
    // 2. 公开：isPublic = true
    // 3. 用户授权：存在于 userGrant 子查询结果中
    // 4. 角色授权：存在于 roleGrant 子查询结果中
    const data = await this.db
      .select({
        avatar: knowledgeBases.avatar,
        createdAt: knowledgeBases.createdAt,
        description: knowledgeBases.description,
        id: knowledgeBases.id,
        isPublic: knowledgeBases.isPublic,
        name: knowledgeBases.name,
        settings: knowledgeBases.settings,
        type: knowledgeBases.type,
        updatedAt: knowledgeBases.updatedAt,
        userId: knowledgeBases.userId, // 前端需要用于判断是否为所有者
      })
      .from(knowledgeBases)
      .leftJoin(userGrant, eq(knowledgeBases.id, userGrant.knowledgeBaseId))
      .leftJoin(roleGrant, eq(knowledgeBases.id, roleGrant.knowledgeBaseId))
      .where(
        and(
          // 必须启用
          eq(knowledgeBases.enabled, true),
          // 可见性条件（OR）
          or(
            eq(knowledgeBases.userId, this.userId), // 所有者
            eq(knowledgeBases.isPublic, true), // 公开
            sql`${userGrant.knowledgeBaseId} IS NOT NULL`, // 用户授权
            sql`${roleGrant.knowledgeBaseId} IS NOT NULL`, // 角色授权
          ),
        ),
      )
      .orderBy(desc(knowledgeBases.updatedAt));

    return data as KnowledgeBaseItem[];
  };

  /**
   * 查询当前用户可见的知识库列表（支持分页和筛选）
   * 可见性规则：
   * 1. 所有者：userId = this.userId
   * 2. 公开：isPublic = true
   * 3. 用户授权：存在于 knowledge_base_grants 中（granteeType = 'user'）
   * 4. 角色授权：存在于 knowledge_base_grants + userRoles 中（granteeType = 'role'，且角色未过期）
   */
  queryForList = async (params: {
    enabled?: boolean;
    keyword?: string;
    limit?: number;
    offset?: number;
    type?: 'personal' | 'shared';
  }): Promise<{ items: KnowledgeBaseItem[]; total: number }> => {
    const { enabled, keyword, limit, offset, type } = params;

    // 定义子查询：用户直接授权的知识库
    const userGrant = this.db
      .selectDistinct({ knowledgeBaseId: knowledgeBaseGrants.knowledgeBaseId })
      .from(knowledgeBaseGrants)
      .where(
        and(
          eq(knowledgeBaseGrants.granteeType, 'user'),
          eq(knowledgeBaseGrants.granteeUserId, this.userId),
        ),
      )
      .as('user_grant');

    // 定义子查询：通过角色授权的知识库
    const roleGrant = this.db
      .selectDistinct({ knowledgeBaseId: knowledgeBaseGrants.knowledgeBaseId })
      .from(knowledgeBaseGrants)
      .innerJoin(
        userRoles,
        and(
          eq(knowledgeBaseGrants.granteeRoleId, userRoles.roleId),
          eq(userRoles.userId, this.userId),
          or(sql`${userRoles.expiresAt} IS NULL`, sql`${userRoles.expiresAt} > now()`),
        ),
      )
      .where(eq(knowledgeBaseGrants.granteeType, 'role'))
      .as('role_grant');

    const whereConditions = [];

    // 可见性条件：所有者 | 公开 | 用户授权 | 角色授权
    whereConditions.push(
      or(
        eq(knowledgeBases.userId, this.userId),
        eq(knowledgeBases.isPublic, true),
        sql`${userGrant.knowledgeBaseId} IS NOT NULL`,
        sql`${roleGrant.knowledgeBaseId} IS NOT NULL`,
      ),
    );

    // 启用状态过滤（不传则不过滤）
    if (enabled !== undefined) {
      whereConditions.push(eq(knowledgeBases.enabled, enabled));
    }

    // 类型过滤
    if (type) {
      whereConditions.push(eq(knowledgeBases.type, type));
    }

    // 关键词过滤（名称或描述模糊匹配）
    if (keyword) {
      whereConditions.push(
        or(
          ilike(knowledgeBases.name, `%${keyword}%`),
          ilike(knowledgeBases.description, `%${keyword}%`),
        ),
      );
    }

    const whereClause = and(...whereConditions);

    let listQuery: any = this.db
      .select({
        avatar: knowledgeBases.avatar,
        createdAt: knowledgeBases.createdAt,
        description: knowledgeBases.description,
        id: knowledgeBases.id,
        isPublic: knowledgeBases.isPublic,
        name: knowledgeBases.name,
        settings: knowledgeBases.settings,
        type: knowledgeBases.type,
        updatedAt: knowledgeBases.updatedAt,
        userId: knowledgeBases.userId,
      })
      .from(knowledgeBases)
      .leftJoin(userGrant, eq(knowledgeBases.id, userGrant.knowledgeBaseId))
      .leftJoin(roleGrant, eq(knowledgeBases.id, roleGrant.knowledgeBaseId))
      .where(whereClause)
      .orderBy(desc(knowledgeBases.updatedAt));

    if (limit) {
      listQuery = listQuery.limit(limit);
    }

    if (offset) {
      listQuery = listQuery.offset(offset);
    }

    const totalQuery = this.db
      .select({ count: count() })
      .from(knowledgeBases)
      .leftJoin(userGrant, eq(knowledgeBases.id, userGrant.knowledgeBaseId))
      .leftJoin(roleGrant, eq(knowledgeBases.id, roleGrant.knowledgeBaseId))
      .where(whereClause);

    const [items, totalResult] = await Promise.all([listQuery, totalQuery]);

    return {
      items: items as KnowledgeBaseItem[],
      total: totalResult[0]?.count || 0,
    };
  };

  findById = async (id: string, options?: { skipRbacCheck?: boolean }) => {
    const kb = await this.db.query.knowledgeBases.findFirst({
      where: eq(knowledgeBases.id, id),
    });

    if (!kb || !kb.enabled) {
      return undefined;
    }

    if (kb.isPublic || kb.userId === this.userId) {
      return kb;
    }

    if (!options?.skipRbacCheck) {
      const hasGlobalPermission = await this.rbacModel.hasAnyPermission(
        getScopePermissions('KNOWLEDGE_BASE_READ', ['ALL']),
        this.userId,
      );

      if (hasGlobalPermission) {
        return kb;
      }
    }

    if (kb.type === 'shared') {
      const userGrant = await this.db.query.knowledgeBaseGrants.findFirst({
        where: and(
          eq(knowledgeBaseGrants.knowledgeBaseId, id),
          eq(knowledgeBaseGrants.granteeType, 'user'),
          eq(knowledgeBaseGrants.granteeUserId, this.userId),
        ),
      });

      if (userGrant) {
        return kb;
      }

      const roleGrant = await this.db
        .select()
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
            eq(knowledgeBaseGrants.knowledgeBaseId, id),
            eq(knowledgeBaseGrants.granteeType, 'role'),
          ),
        )
        .limit(1);

      if (roleGrant.length > 0) {
        return kb;
      }
    }

    return undefined;
  };

  // update
  update = async (id: string, value: Partial<NewKnowledgeBase>) =>
    this.db
      .update(knowledgeBases)
      .set({ ...value, updatedAt: new Date() })
      .where(and(eq(knowledgeBases.id, id), eq(knowledgeBases.userId, this.userId)));

  static findById = async (db: LobeChatDatabase, id: string) =>
    db.query.knowledgeBases.findFirst({
      where: eq(knowledgeBases.id, id),
    });
}
