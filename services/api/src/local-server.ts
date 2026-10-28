import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler as listingsHandler } from './handlers/listings';
import { handler as mediaHandler } from './handlers/media';
import { handler as leasesHandler } from './handlers/leases';
import { handler as healthHandler } from './handlers/health';
import { handler as authHandler } from './handlers/auth';
import { getLocalObject, putLocalObject } from './data';
import { loadDemoListings } from './data/seed';

process.env.DATA_STORE = process.env.DATA_STORE || 'memory';
if (process.env.API_LOCAL_MODE === undefined) {
  // Production must never trust caller-supplied identity headers by default,
  // even if the process was started without an explicit mode.
  process.env.API_LOCAL_MODE =
    process.env.NODE_ENV === 'production'
      ? 'false'
      : process.env.DATA_STORE === 'memory'
        ? 'true'
        : 'false';
}

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const CORS_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

loadDemoListings();

function setCors(req: IncomingMessage, res: ServerResponse): void {
  const requestOrigin = req.headers.origin;
  const allowAll = CORS_ORIGINS.includes('*');
  const allowedOrigin = allowAll
    ? '*'
    : requestOrigin && CORS_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : undefined;

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    if (allowedOrigin !== '*') {
      res.setHeader('Vary', 'Origin');
    }
  } else {
    res.removeHeader('Access-Control-Allow-Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-User-Id,x-user-id,X-User-Role,x-user-role'
  );
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function toEvent(
  req: IncomingMessage,
  url: URL,
  body: string | null
): APIGatewayProxyEvent {
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const pathParameters: Record<string, string> = {};
  const parts = url.pathname.replace(/^\/+|\/+$/g, '').split('/');
  if (parts[0] === 'api' && parts[1] === 'v1') {
    parts.splice(0, 2);
  }
  if (
    parts[0] === 'listings' &&
    parts[1] &&
    parts[1] !== 'search' &&
    parts[1] !== 'mine'
  ) {
    pathParameters.id = parts[1];
  }
  if (parts[0] === 'leases' && parts[1] && parts[1] !== 'upload-url') {
    pathParameters.id = parts[1];
  }

  return {
    body,
    headers: (req.headers as Record<string, string>) || {},
    httpMethod: req.method || 'GET',
    path: url.pathname,
    queryStringParameters: Object.keys(query).length ? query : null,
    pathParameters: Object.keys(pathParameters).length ? pathParameters : null,
    resource: url.pathname,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: 'local',
      apiId: 'local',
      protocol: 'HTTP/1.1',
      httpMethod: req.method || 'GET',
      path: url.pathname,
      stage: 'local',
      requestId: 'local',
      requestTimeEpoch: Date.now(),
      resourceId: 'local',
      resourcePath: url.pathname,
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'rentvision-local',
        userArn: null,
      },
      authorizer: undefined,
    },
  } as unknown as APIGatewayProxyEvent;
}

function routeHandler(pathname: string) {
  if (pathname === '/health' || pathname === '/api/v1/health') {
    return healthHandler;
  }
  if (pathname.includes('/auth')) {
    return authHandler;
  }
  if (pathname.includes('/listings')) {
    return listingsHandler;
  }
  if (pathname.includes('/media')) {
    return mediaHandler;
  }
  if (pathname.includes('/leases')) {
    return leasesHandler;
  }
  return undefined;
}

const server = createServer(async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  try {
    if (req.method === 'PUT' && url.pathname.startsWith('/local-upload/')) {
      const rest = url.pathname.replace('/local-upload/', '');
      const slash = rest.indexOf('/');
      const fileKey = decodeURIComponent(rest.slice(slash + 1));
      const body = await readBody(req);
      putLocalObject(fileKey, req.headers['content-type'] || 'application/octet-stream', body);
      res.statusCode = 200;
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/local-objects/')) {
      const fileKey = decodeURIComponent(url.pathname.replace('/local-objects/', ''));
      const object = getLocalObject(fileKey);
      if (!object) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', object.contentType);
      res.end(object.body);
      return;
    }

    const handler = routeHandler(url.pathname);
    if (!handler) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Unknown route' } }));
      return;
    }

    const rawBody = await readBody(req);
    const event = toEvent(req, url, rawBody.length ? rawBody.toString('utf8') : null);
    const result = await handler(event);

    res.statusCode = result.statusCode;
    for (const [key, value] of Object.entries(result.headers || {})) {
      res.setHeader(key, String(value));
    }
    // Re-apply CORS after handler headers so the configured origin list wins
    // over the wildcard headers used by the Lambda response helpers.
    setCors(req, res);
    res.end(result.body);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Local API failed' },
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(
    `RentVision API listening on port ${PORT} (store=${process.env.DATA_STORE}, localMode=${process.env.API_LOCAL_MODE})`
  );
});
