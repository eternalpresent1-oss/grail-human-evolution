import { createServer } from 'node:http';

import { createApp } from './app.ts';
import { appleCheck, googleCheck, verifyIdentityToken } from './identity.ts';
import { createAskOpenAi } from './openai.ts';
import { createPostgresStore } from './postgresStore.ts';

const port = Number(process.env.PORT ?? '8787');
const host = process.env.HOST ?? '0.0.0.0';
const databaseUrl = process.env.DATABASE_URL;
const appleClientId = process.env.APPLE_CLIENT_ID ?? '';
const googleClientIds = (process.env.GOOGLE_CLIENT_IDS ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter((item) => item.length > 0);
const sessionTtlMs = Number(process.env.SESSION_TTL_DAYS ?? '30') * 24 * 60 * 60 * 1000;
const openAiKey = (process.env.OPENAI_API_KEY ?? '').trim();

if (databaseUrl === undefined || databaseUrl.length === 0) {
  throw new Error('DATABASE_URL is required');
}

const store = await createPostgresStore(databaseUrl);
const apple = appleClientId.length > 0 ? appleCheck(appleClientId) : null;
const google = googleClientIds.length > 0 ? googleCheck(googleClientIds) : null;
const handle = createApp({
  store,
  now: () => new Date(),
  sessionTtlMs,
  appleConfigured: apple !== null,
  googleConfigured: google !== null,
  verify: async (provider, token) => {
    const check = provider === 'apple' ? apple : google;
    if (check === null) {
      throw new Error('not configured');
    }
    return verifyIdentityToken(token, check);
  },
  ...(openAiKey.length > 0 ? { askOpenAi: createAskOpenAi(openAiKey) } : {}),
});

const server = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    if (chunks.reduce((sum, item) => sum + item.length, 0) > 1_048_576) {
      res.writeHead(413, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid' }));
      return;
    }
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  let body: unknown = null;
  if (raw.length > 0) {
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid' }));
      return;
    }
  }
  const url = new URL(req.url ?? '/', 'http://localhost');
  const response = await handle({
    method: req.method ?? 'GET',
    path: url.pathname,
    authorization: req.headers.authorization,
    body,
  });
  res.writeHead(response.status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(response.body));
});

server.listen(port, host);
