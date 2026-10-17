import { conflictSnapshot, type AccountSession, type ArcheClient, type AuthProvider } from '@/api/archeClient';
import { payloadForServer, payloadFromServer, planSync } from '@/api/syncPlan';

export interface ConnectedAccount {
  session: AccountSession;
  nextState: Record<string, unknown> | null;
}

export async function connectAccount(
  client: ArcheClient,
  provider: AuthProvider,
  identityToken: string,
  localRevision: number,
  localState: Record<string, unknown>,
): Promise<ConnectedAccount> {
  const session = await client.signIn(provider, identityToken);
  const remote = await client.getSnapshot(session.token);
  return settle(client, session, localRevision, localState, remote.revision, remote.payload);
}

async function settle(
  client: ArcheClient,
  session: AccountSession,
  localRevision: number,
  localState: Record<string, unknown>,
  remoteRevision: number,
  remotePayload: Record<string, unknown> | null,
): Promise<ConnectedAccount> {
  const plan = planSync(localRevision, remoteRevision);
  if (plan.action === 'keep') {
    return { session: { ...session, revision: localRevision }, nextState: null };
  }
  if (plan.action === 'pull') {
    return {
      session: { ...session, revision: remoteRevision },
      nextState: payloadFromServer(localState, remotePayload),
    };
  }
  try {
    const saved = await client.putSnapshot(session.token, plan.revision, payloadForServer(localState));
    return { session: { ...session, revision: saved.revision }, nextState: null };
  } catch (error) {
    const server = conflictSnapshot(error);
    if (server === null) {
      throw error;
    }
    return {
      session: { ...session, revision: server.revision },
      nextState: payloadFromServer(localState, server.payload),
    };
  }
}
