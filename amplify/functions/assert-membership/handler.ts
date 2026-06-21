import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient();
const ddb = DynamoDBDocumentClient.from(ddbClient);

export const ROLE_RANK = {
  VIEWER: 0,
  CLINICIAN: 1,
  CAREGIVER: 2,
  FAMILY: 3,
  OWNER: 4,
} as const;

export type Role = keyof typeof ROLE_RANK;

export class UnauthorizedError extends Error {}

/**
 * Single source of truth for "can this caller touch this circle." Every
 * multi-party query/mutation in circleResolver calls this first against the
 * Membership table — never trust a role/userId passed in GraphQL arguments,
 * always re-derive from event.identity.sub.
 */
export async function assertMembership(
  membershipTableName: string,
  userSub: string,
  circleId: string,
  minRole: Role = 'VIEWER',
): Promise<Role> {
  const result = await ddb.send(
    new GetCommand({
      TableName: membershipTableName,
      Key: { circleId, userId: userSub },
    }),
  );

  const membership = result.Item;
  if (!membership || membership.status !== 'ACTIVE') {
    throw new UnauthorizedError('Not an active member of this circle');
  }

  const role = membership.role as Role;
  if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw new UnauthorizedError(`Requires at least ${minRole}`);
  }

  return role;
}
