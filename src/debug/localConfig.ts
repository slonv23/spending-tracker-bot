import { config } from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

config({ path: path.join(process.cwd(), '.env.local') });
process.env.GSERVICEACCOUNT = fs
  .readFileSync(path.join(process.cwd(), 'secrets', 'gserviceaccount.json'))
  .toString();
