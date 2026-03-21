import { serve } from "@hono/node-server";

import { apiConfig } from "./config";
import { createApp } from "./app";

const app = createApp();

console.log(`[api] listening on http://localhost:${apiConfig.port}`);

serve({
  fetch: app.fetch,
  port: apiConfig.port,
});
