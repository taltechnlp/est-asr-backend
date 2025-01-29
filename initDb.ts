import { dotEnvConfig } from './deps.ts';
dotEnvConfig({ export: true, safe: true });
import { createTable} from './migrations/initial.ts'

import { db } from './sqlite.ts'

db.prepare(createTable).run();

db.close();