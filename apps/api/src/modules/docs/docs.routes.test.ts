import assert from "node:assert/strict";
import test from "node:test";

import { Hono } from "hono";

import { createDocsRoutes } from "./docs.routes.js";

const createDocsApp = () => {
  const app = new Hono();
  app.route("/", createDocsRoutes());
  return app;
};

test("GET /openapi.json and GET /docs should support zh/en docs", async () => {
  const app = createDocsApp();

  const openApiResponse = await app.request("/openapi.json");
  assert.equal(openApiResponse.status, 200);
  const openApiBody = await openApiResponse.json();
  assert.equal(openApiBody.openapi, "3.0.3");
  assert.equal(openApiBody.info.title, "Agent API");
  assert.ok(openApiBody.paths["/health"]);
  assert.ok(openApiBody.paths["/sessions"]);

  const openApiZhResponse = await app.request("/openapi.json?lang=zh");
  assert.equal(openApiZhResponse.status, 200);
  const openApiZhBody = await openApiZhResponse.json();
  assert.equal(openApiZhBody.info.title, "Agent API 接口文档");
  assert.equal(openApiZhBody.paths["/health"].get.summary, "获取健康检查状态");

  const docsResponse = await app.request("/docs");
  assert.equal(docsResponse.status, 200);
  assert.match(docsResponse.headers.get("content-type") ?? "", /text\/html/);
  const docsHtml = await docsResponse.text();
  assert.match(docsHtml, /SwaggerUIBundle/);
  assert.match(docsHtml, /openapi\.json\?lang=en/);
  assert.match(docsHtml, /id="lang-switch"/);

  const docsZhResponse = await app.request("/docs?lang=zh");
  assert.equal(docsZhResponse.status, 200);
  const docsZhHtml = await docsZhResponse.text();
  assert.match(docsZhHtml, /openapi\.json\?lang=zh/);
  assert.match(docsZhHtml, /<html lang="zh-CN">/);
});
