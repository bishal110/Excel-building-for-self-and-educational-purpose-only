// Rename the single-file build output to AI_Office.html (cross-platform).
import { renameSync, statSync } from 'node:fs';

const src = 'dist-single/index.html';
const dest = 'dist-single/AI_Office.html';
renameSync(src, dest);
const kb = Math.round(statSync(dest).size / 1024);
console.log(`Created ${dest} (${kb} kB) — double-click to run offline.`);
