import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "messages");
const utf8NoBom = Buffer.from([0xef, 0xbb, 0xbf]);

for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const file = join(dir, name);
  let buf = readFileSync(file);
  if (buf.length >= 3 && buf.subarray(0, 3).equals(utf8NoBom)) {
    buf = buf.subarray(3);
    writeFileSync(file, buf);
    console.log(`[locales] stripped BOM from ${name}`);
  }
}
