import { readFileSync, writeFileSync } from "node:fs";

const path = "dist/client/wrangler.json";
const config = JSON.parse(readFileSync(path, "utf8"));
delete config.legacy_env;
writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
