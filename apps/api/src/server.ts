import { serve } from "@hono/node-server";

import { apiConfig } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();

console.log(`[api] listening on http://localhost:${apiConfig.port}`);

serve({
  fetch: app.fetch,
  port: apiConfig.port,
});
