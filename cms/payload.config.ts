import 'dotenv/config';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import type { CollectionConfig } from 'payload';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { Landings } from './collections/Landings.js';
import { Users } from './collections/Users.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const isProduction = process.env.NODE_ENV === 'production';

const LOCAL_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const MIN_SECRET_LENGTH = 32;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[payload config] ${name} is required`);
  }
  return value;
}

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  throw new Error(`[payload config] ${name} must be true or false`);
}

function normalizeOrigin(value: string, sourceName: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`[payload config] ${sourceName} must be an absolute URL origin`);
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`[payload config] ${sourceName} must use http or https`);
  }
  if (isProduction && url.protocol !== 'https:') {
    throw new Error(`[payload config] ${sourceName} must use https in production`);
  }
  if (url.username || url.password) {
    throw new Error(`[payload config] ${sourceName} must not include credentials`);
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`[payload config] ${sourceName} must be an origin with no path, query, or hash`);
  }

  return url.origin;
}

function readOptionalOrigin(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? normalizeOrigin(value, name) : undefined;
}

function readOriginList(name: string): string[] {
  const value = process.env[name]?.trim();
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeOrigin(origin, name));
}

const payloadSecret = requireEnv('PAYLOAD_SECRET');
if (payloadSecret.length < MIN_SECRET_LENGTH) {
  throw new Error(`[payload config] PAYLOAD_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
}

const databaseUrl = requireEnv('DATABASE_URL');
const serverURL = readOptionalOrigin('PAYLOAD_SERVER_URL') ?? (isProduction ? undefined : LOCAL_ORIGINS[0]);

if (!serverURL) {
  throw new Error('[payload config] PAYLOAD_SERVER_URL is required in production');
}

const allowedOrigins = Array.from(
  new Set([
    serverURL,
    ...readOriginList('PAYLOAD_ALLOWED_ORIGINS'),
    ...(isProduction ? [] : LOCAL_ORIGINS),
  ]),
);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: dirname,
    },
    components: {
      graphics: {
        Icon: '/components/TimeMissionIcon.tsx',
        Logo: '/components/TimeMissionLogo.tsx',
      },
    },
    meta: {
      defaultOGImageType: 'off',
      titleSuffix: ' - Time Mission CMS',
    },
  },
  collections: [Users as CollectionConfig, Landings as CollectionConfig],
  cors: allowedOrigins,
  csrf: allowedOrigins,
  defaultDepth: 0,
  editor: lexicalEditor(),
  graphQL: {
    disable: !readBooleanEnv('PAYLOAD_ENABLE_GRAPHQL', false),
    disableIntrospectionInProduction: true,
    disablePlaygroundInProduction: true,
    maxComplexity: 500,
  },
  maxDepth: 2,
  secret: payloadSecret,
  serverURL,
  telemetry: false,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl,
    },
    push: readBooleanEnv('PAYLOAD_DB_PUSH', !isProduction),
  }),
  sharp,
  plugins: [],
});
