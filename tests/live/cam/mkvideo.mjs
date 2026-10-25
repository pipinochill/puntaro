import { qrMatrix } from '../../../src/qr.js';
import fs from 'fs';
fs.writeFileSync(process.argv[3], JSON.stringify(qrMatrix(process.argv[2]).map(r => r.map(c => c ? 1 : 0))));
