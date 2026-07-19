import { readFileSync, writeFileSync } from "node:fs";

export function fixWranglerConfig(path = "dist/client/wrangler.json") {
  const config = JSON.parse(readFileSync(path, "utf8"));
  delete config.legacy_env;
  config.assets ??= {};
  config.assets.not_found_handling = "404-page";
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
}
