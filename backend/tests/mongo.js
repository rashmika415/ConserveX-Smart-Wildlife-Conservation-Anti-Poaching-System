import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
export function createTestDatabase() {
  const localBinary = fileURLToPath(
    new URL('../../.local/mongod.exe', import.meta.url),
  );
  const systemBinary =
    process.env.MONGOMS_SYSTEM_BINARY ||
    (existsSync(localBinary) ? localBinary : undefined);
  return MongoMemoryServer.create({
    binary: systemBinary ? { systemBinary } : {},
  });
}
