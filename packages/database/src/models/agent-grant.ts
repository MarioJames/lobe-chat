import { and, eq, inArray } from 'drizzle-orm';

import type { NewAgentGrant } from '../schemas';
import { agents, agentsGrants, roles, users } from '../schemas';
import type { LobeChatDatabase } from '../type';

export interface AgentGrantCreateParams extends Omit<NewAgentGrant, 'userId'> {
  agentId: string;
  granteeRoleId?: string | null;
  granteeType: 'user' | 'role';
  granteeUserId?: string | null;
}

export interface AgentGrantWithDetails extends AgentGrantCreateParams {
  granteeRole?: { id: string; name: string; displayName: string } | null;
  granteeUser?: { id: string; name?: string | null; email?: string | null } | null;
}

export class AgentGrantModel {
  private userId: string;
  private db: LobeChatDatabase;

  constructor(db: LobeChatDatabase, userId: string) {
    this.userId = userId;
    this.db = db;
  }

  /**
   * Grant access to an agent for a user or role
   */
  grant = async (params: AgentGrantCreateParams) => {
    const { agentId, granteeType, granteeUserId, granteeRoleId } = params;

    // Verify the agent belongs to the current user
    const agent = await this.db.query.agents.findFirst({
      columns: { id: true },
      where: and(eq(agents.id, agentId), eq(agents.userId, this.userId)),
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Validate grantee parameters based on type
    if (granteeType === 'user' && !granteeUserId) {
      throw new Error('granteeUserId is required when granteeType is user');
    }

    if (granteeType === 'role' && !granteeRoleId) {
      throw new Error('granteeRoleId is required when granteeType is role');
    }

    const [result] = await this.db
      .insert(agentsGrants)
      .values({
        agentId,
        granteeRoleId: granteeType === 'role' ? granteeRoleId : null,
        granteeType,
        granteeUserId: granteeType === 'user' ? granteeUserId : null,
      })
      .returning();

    return result;
  };

  /**
   * Revoke access from a user or role
   */
  revoke = async (agentId: string, granteeType: 'user' | 'role', granteeId?: string) => {
    if (granteeType === 'user' && !granteeId) {
      throw new Error('granteeId is required when revoking user access');
    }

    if (granteeType === 'role' && !granteeId) {
      throw new Error('granteeId is required when revoking role access');
    }

    // Verify the agent belongs to the current user
    const agent = await this.db.query.agents.findFirst({
      columns: { id: true },
      where: and(eq(agents.id, agentId), eq(agents.userId, this.userId)),
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const condition =
      granteeType === 'user'
        ? and(
            eq(agentsGrants.agentId, agentId),
            eq(agentsGrants.granteeType, 'user'),
            eq(agentsGrants.granteeUserId, granteeId!),
          )
        : and(
            eq(agentsGrants.agentId, agentId),
            eq(agentsGrants.granteeType, 'role'),
            eq(agentsGrants.granteeRoleId, granteeId!),
          );

    return this.db.delete(agentsGrants).where(condition);
  };

  /**
   * Get all grants for an agent
   */
  getGrantsByAgentId = async (agentId: string): Promise<AgentGrantWithDetails[]> => {
    // Verify the agent belongs to the current user
    const agent = await this.db.query.agents.findFirst({
      columns: { id: true },
      where: and(eq(agents.id, agentId), eq(agents.userId, this.userId)),
    });

    if (!agent) {
      return [];
    }

    const grants = await this.db
      .select({
        agentId: agentsGrants.agentId,
        granteeRoleId: agentsGrants.granteeRoleId,
        granteeType: agentsGrants.granteeType,
        granteeUserId: agentsGrants.granteeUserId,
        granteeUser: users,
        granteeRole: roles,
      })
      .from(agentsGrants)
      .leftJoin(users, eq(agentsGrants.granteeUserId, users.id))
      .leftJoin(roles, eq(agentsGrants.granteeRoleId, roles.id))
      .where(eq(agentsGrants.agentId, agentId));

    return grants.map((grant) => ({
      agentId: grant.agentId,
      granteeRoleId: grant.granteeRoleId,
      granteeType: grant.granteeType,
      granteeUserId: grant.granteeUserId,
      granteeUser: grant.granteeUser
        ? {
            email: grant.granteeUser.email,
            id: grant.granteeUser.id,
            name: grant.granteeUser.username,
          }
        : null,
      granteeRole: grant.granteeRole
        ? {
            displayName: grant.granteeRole.displayName,
            id: grant.granteeRole.id,
            name: grant.granteeRole.name,
          }
        : null,
    }));
  };

  /**
   * Check if a user has access to an agent
   */
  hasUserAccess = async (agentId: string, targetUserId: string): Promise<boolean> => {
    const grant = await this.db.query.agentsGrants.findFirst({
      where: and(
        eq(agentsGrants.agentId, agentId),
        eq(agentsGrants.granteeType, 'user'),
        eq(agentsGrants.granteeUserId, targetUserId),
      ),
    });

    return !!grant;
  };

  /**
   * Check if a role has access to an agent
   */
  hasRoleAccess = async (agentId: string, roleId: string): Promise<boolean> => {
    const grant = await this.db.query.agentsGrants.findFirst({
      where: and(
        eq(agentsGrants.agentId, agentId),
        eq(agentsGrants.granteeType, 'role'),
        eq(agentsGrants.granteeRoleId, roleId),
      ),
    });

    return !!grant;
  };

  /**
   * Batch grant access to multiple users
   */
  batchGrantUsers = async (agentId: string, userIds: string[]) => {
    // Verify the agent belongs to the current user
    const agent = await this.db.query.agents.findFirst({
      columns: { id: true },
      where: and(eq(agents.id, agentId), eq(agents.userId, this.userId)),
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const values = userIds.map((userId) => ({
      agentId,
      granteeType: 'user' as const,
      granteeUserId: userId,
    }));

    return this.db.insert(agentsGrants).values(values).onConflictDoNothing();
  };

  /**
   * Batch revoke access from multiple users
   */
  batchRevokeUsers = async (agentId: string, userIds: string[]) => {
    // Verify the agent belongs to the current user
    const agent = await this.db.query.agents.findFirst({
      columns: { id: true },
      where: and(eq(agents.id, agentId), eq(agents.userId, this.userId)),
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    return this.db
      .delete(agentsGrants)
      .where(
        and(
          eq(agentsGrants.agentId, agentId),
          eq(agentsGrants.granteeType, 'user'),
          inArray(agentsGrants.granteeUserId, userIds),
        ),
      );
  };

  /**
   * Get all agents that a user has access to
   */
  getAgentsByUserId = async (targetUserId: string) => {
    const grants = await this.db
      .select({
        agent: agents,
      })
      .from(agentsGrants)
      .leftJoin(agents, eq(agentsGrants.agentId, agents.id))
      .where(
        and(eq(agentsGrants.granteeType, 'user'), eq(agentsGrants.granteeUserId, targetUserId)),
      );

    return grants.map((g) => g.agent);
  };

  /**
   * Get all agents that a role has access to
   */
  getAgentsByRoleId = async (roleId: string) => {
    const grants = await this.db
      .select({
        agent: agents,
      })
      .from(agentsGrants)
      .leftJoin(agents, eq(agentsGrants.agentId, agents.id))
      .where(and(eq(agentsGrants.granteeType, 'role'), eq(agentsGrants.granteeRoleId, roleId)));

    return grants.map((g) => g.agent);
  };
}
