// Fix mojibake by reinterpreting text as Latin-1 then decoding as UTF-8
// Usage: node scripts/fix-encoding.mjs <file1> [file2 ...]

import fs from 'node:fs';
import path from 'node:path';

function decodeLatin1Utf8Once(s) {
  try {
    return decodeURIComponent(escape(s));
  } catch {
    return s;
  }
}

function decodeLatin1Utf8(s) {
  // Run up to 3 passes while the string changes (handles double-encoded cases)
  let prev = s;
  for (let i = 0; i < 3; i++) {
    const next = decodeLatin1Utf8Once(prev);
    if (next === prev) return next;
    prev = next;
  }
  return prev;
}

function processFile(file) {
  const abs = path.resolve(file);
  const orig = fs.readFileSync(abs, 'utf8');
  // Strategy 1: iterative escape/decode
  let fixed = decodeLatin1Utf8(orig);
  // Strategy 2: latin1->utf8 roundtrip (handles double-saved mojibake)
  if (fixed === orig) {
    try {
      const latin1AsBytes = Buffer.from(orig, 'latin1');
      const utf8 = latin1AsBytes.toString('utf8');
      if (utf8 && utf8 !== orig) fixed = utf8;
    } catch {}
  }
  if (fixed !== orig) {
    fs.writeFileSync(abs, fixed, 'utf8');
    console.log(`fixed: ${file}`);
  } else {
    console.log(`unchanged: ${file}`);
  }
}

if (process.argv.length <= 2) {
  console.error('Usage: node scripts/fix-encoding.mjs <file1> [file2 ...]');
  process.exit(1);
}

for (const f of process.argv.slice(2)) {
  processFile(f);
}
