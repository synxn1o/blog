import { execSync } from "node:child_process";

export function buildPagefind(site = "dist/client") {
  execSync(`npx pagefind --site ${site} --force-language en`, { stdio: "inherit" });
}
