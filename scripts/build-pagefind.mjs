import { execSync } from "node:child_process";

execSync("npx pagefind --site dist", {
  stdio: "inherit",
});
