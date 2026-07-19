import { fixWranglerConfig } from "./fix-wrangler-config.mjs";
import { pruneUnusedAssets } from "./prune-unused-assets.mjs";
import { buildPagefind } from "./build-pagefind.mjs";

fixWranglerConfig();
pruneUnusedAssets();
buildPagefind();
