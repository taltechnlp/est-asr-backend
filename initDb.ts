import { createTable} from './migrations/initial.ts'
import { db } from './sqlite.ts'

db.prepare(createTable).run();

db.close();