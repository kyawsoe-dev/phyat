import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(appDir, '../../.env');

if (existsSync(rootEnvPath)) {
  const rootEnv = readFileSync(rootEnvPath, 'utf8');
  for (const line of rootEnv.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
};

export default nextConfig;
