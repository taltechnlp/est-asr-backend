import { dotEnvConfig } from './deps.ts';
dotEnvConfig({ export: true, safe: true });
import { createTable} from './migrations/initial.ts'

import { dbPool } from './database.ts'

const dbClient = await dbPool.connect();

await dbClient.queryArray(createTable);

await dbClient.release();