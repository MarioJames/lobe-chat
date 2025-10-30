import { KnowledgeBaseItem } from '@lobechat/types';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';

import {
  NewKnowledgeBase,
  knowledgeBaseFiles,
  knowledgeBaseGrants,
  knowledgeBases,
} from '../schemas';
import { userRoles } from '../schemas/rbac';
import { LobeChatDatabase } from '../type';

export class KnowledgeBaseModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  // create

  create = async (params: Omit<NewKnowledgeBase, 'userId'>) => {
    const [result] = await this.db
      .insert(knowledgeBases)
      .values({ ...params, userId: this.userId })
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

  findById = async (id: string) => {
    const kb = await this.db.query.knowledgeBases.findFirst({
      where: eq(knowledgeBases.id, id),
    });

    if (!kb || !kb.enabled) {
      return undefined;
    }

    if (kb.isPublic) {
      return kb;
    }

    if (kb.type === 'personal') {
      return kb.userId === this.userId ? kb : undefined;
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
