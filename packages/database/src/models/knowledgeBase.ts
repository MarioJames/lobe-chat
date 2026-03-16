import type { KnowledgeBaseItem } from '@lobechat/types';
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { getScopePermissions } from '@/utils/rbac';

import type { NewKnowledgeBase } from '../schemas';
import { documents, knowledgeBaseFiles, knowledgeBaseGrants, knowledgeBases } from '../schemas';
import { userRoles } from '../schemas/rbac';
import type { LobeChatDatabase } from '../type';
import { RbacModel } from './rbac';

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
    // Separate document IDs from file IDs
    const documentIds = fileIds.filter((id) => id.startsWith('docs_'));
    const directFileIds = fileIds.filter((id) => !id.startsWith('docs_'));

    // Resolve document IDs to their mirror file IDs via documents.fileId
    let resolvedFileIds = [...directFileIds];
    if (documentIds.length > 0) {
      const docsWithFiles = await this.db
        .select({ fileId: documents.fileId })
        .from(documents)
        .where(and(inArray(documents.id, documentIds), eq(documents.userId, this.userId)));

      const mirrorFileIds = docsWithFiles
        .map((doc) => doc.fileId)
        .filter((id): id is string => id !== null);
      resolvedFileIds = [...resolvedFileIds, ...mirrorFileIds];

      // Update documents.knowledgeBaseId for pages
      await this.db
        .update(documents)
        .set({ knowledgeBaseId: id })
        .where(and(inArray(documents.id, documentIds), eq(documents.userId, this.userId)));
    }

    // Insert using resolved file IDs
    if (resolvedFileIds.length === 0) {
      return [];
    }

    return this.db
      .insert(knowledgeBaseFiles)
      .values(
        resolvedFileIds.map((fileId) => ({ fileId, knowledgeBaseId: id, userId: this.userId })),
      )
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
    // Separate document IDs from file IDs
    const documentIds = ids.filter((id) => id.startsWith('docs_'));
    const directFileIds = ids.filter((id) => !id.startsWith('docs_'));

    // Resolve document IDs to their mirror file IDs via documents.fileId
    let resolvedFileIds = [...directFileIds];
    if (documentIds.length > 0) {
      const docsWithFiles = await this.db
        .select({ fileId: documents.fileId })
        .from(documents)
        .where(and(inArray(documents.id, documentIds), eq(documents.userId, this.userId)));

      const mirrorFileIds = docsWithFiles
        .map((doc) => doc.fileId)
        .filter((id): id is string => id !== null);
      resolvedFileIds = [...resolvedFileIds, ...mirrorFileIds];

      // Clear documents.knowledgeBaseId for pages
      await this.db
        .update(documents)
        .set({ knowledgeBaseId: null })
        .where(
          and(
            inArray(documents.id, documentIds),
            eq(documents.userId, this.userId),
            eq(documents.knowledgeBaseId, knowledgeBaseId),
          ),
        );
    }

    // Delete using resolved file IDs
    if (resolvedFileIds.length === 0) {
      return;
    }

    return this.db
      .delete(knowledgeBaseFiles)
      .where(
        and(
          eq(knowledgeBaseFiles.userId, this.userId),
          eq(knowledgeBaseFiles.knowledgeBaseId, knowledgeBaseId),
          inArray(knowledgeBaseFiles.fileId, resolvedFileIds),
        ),
      );
  };

  // query
  query = async () => {
    // Define subquery: knowledge bases granted to user directly
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

    // Define subquery: knowledge bases granted through roles
    // Include role expiration check: expiresAt IS NULL or expiresAt > now()
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

    // Main query: return all "visible and enabled" knowledge bases
    // Visibility rules (any of the following):
    // 1. Owner: userId = this.userId
    // 2. Public: isPublic = true
    // 3. User grant: exists in userGrant subquery
    // 4. Role grant: exists in roleGrant subquery
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
        userId: knowledgeBases.userId, // Frontend needs this to determine ownership
      })
      .from(knowledgeBases)
      .leftJoin(userGrant, eq(knowledgeBases.id, userGrant.knowledgeBaseId))
      .leftJoin(roleGrant, eq(knowledgeBases.id, roleGrant.knowledgeBaseId))
      .where(
        and(
          // Must be enabled
          eq(knowledgeBases.enabled, true),
          // Visibility conditions (OR)
          or(
            eq(knowledgeBases.userId, this.userId), // Owner
            eq(knowledgeBases.isPublic, true), // Public
            sql`${userGrant.knowledgeBaseId} IS NOT NULL`, // User grant
            sql`${roleGrant.knowledgeBaseId} IS NOT NULL`, // Role grant
          ),
        ),
      )
      .orderBy(desc(knowledgeBases.updatedAt));

    return data as KnowledgeBaseItem[];
  };

  /**
   * Query knowledge bases visible to current user (with pagination and filtering)
   * Visibility rules:
   * 1. Owner: userId = this.userId
   * 2. Public: isPublic = true
   * 3. User grant: exists in knowledge_base_grants (granteeType = 'user')
   * 4. Role grant: exists in knowledge_base_grants + userRoles (granteeType = 'role', role not expired)
   */
  queryForList = async (params: {
    enabled?: boolean;
    keyword?: string;
    limit?: number;
    offset?: number;
    type?: 'personal' | 'shared';
  }): Promise<{ items: KnowledgeBaseItem[]; total: number }> => {
    const { enabled, keyword, limit, offset, type } = params;

    // Define subquery: knowledge bases granted to user directly
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

    // Define subquery: knowledge bases granted through roles
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

    const whereConditions = [
      // Visibility conditions: owner | public | user grant | role grant
      or(
        eq(knowledgeBases.userId, this.userId),
        eq(knowledgeBases.isPublic, true),
        sql`${userGrant.knowledgeBaseId} IS NOT NULL`,
        sql`${roleGrant.knowledgeBaseId} IS NOT NULL`,
      ),
    ];

    // Enable status filter (skip if not provided)
    if (enabled !== undefined) {
      whereConditions.push(eq(knowledgeBases.enabled, enabled));
    }

    // Type filter
    if (type) {
      whereConditions.push(eq(knowledgeBases.type, type));
    }

    // Keyword filter (fuzzy match on name or description)
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
