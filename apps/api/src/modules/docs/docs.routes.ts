import { Hono } from "hono";

import {
  getOpenApiDocument,
  resolveOpenApiLocale,
  type OpenApiLocale,
} from "./openapi.js";

const buildSwaggerHtml = (openApiUrl: string, locale: OpenApiLocale) => {
  const safeOpenApiUrl = JSON.stringify(openApiUrl);
  const safeLocale = JSON.stringify(locale);
  const htmlLang = locale === "zh" ? "zh-CN" : "en";
  const switchLabel = locale === "zh" ? "语言" : "Language";
  const switchTitle = locale === "zh" ? "接口文档" : "API Docs";

  return `<!doctype html>
<html lang="${htmlLang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agent API Docs</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css"
    />
    <style>
      body {
        margin: 0;
        background: #faf8f4;
      }
      .topbar {
        display: none;
      }
      .docs-toolbar {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 16px;
        border-bottom: 1px solid #e7dcc8;
        background: #fff8ee;
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      }
      .docs-toolbar h1 {
        margin: 0;
        font-size: 16px;
        color: #2f2a22;
        letter-spacing: 0.02em;
      }
      .docs-lang {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #5a5144;
      }
      .docs-lang select {
        border: 1px solid #c9b89b;
        border-radius: 6px;
        background: #ffffff;
        color: #2f2a22;
        padding: 6px 10px;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <header class="docs-toolbar">
      <h1>${switchTitle}</h1>
      <label class="docs-lang" for="lang-switch">
        <span>${switchLabel}</span>
        <select id="lang-switch" name="lang">
          <option value="en">English</option>
          <option value="zh">中文</option>
        </select>
      </label>
    </header>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      const initialLocale = ${safeLocale};
      const preferredLocaleKey = "agent-api-docs-lang";
      const selected = document.getElementById("lang-switch");
      if (selected) {
        selected.value = initialLocale;
      }

      const currentUrl = new URL(window.location.href);
      const rememberedLocale = window.localStorage.getItem(preferredLocaleKey);
      if (!currentUrl.searchParams.has("lang") && rememberedLocale && rememberedLocale !== initialLocale) {
        currentUrl.searchParams.set("lang", rememberedLocale);
        window.location.replace(currentUrl.toString());
      } else {
        if (selected) {
          selected.addEventListener("change", (event) => {
            const nextLocale = event.target.value;
            window.localStorage.setItem(preferredLocaleKey, nextLocale);
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.set("lang", nextLocale);
            window.location.assign(nextUrl.toString());
          });
        }

        window.ui = SwaggerUIBundle({
          url: ${safeOpenApiUrl},
          dom_id: "#swagger-ui",
          deepLinking: true,
          tryItOutEnabled: true,
          persistAuthorization: true
        });
      }
    </script>
  </body>
</html>`;
};

export const createDocsRoutes = () => {
  const routes = new Hono();

  routes.get("/openapi.json", (c) => {
    const locale = resolveOpenApiLocale(c.req.query("lang"));
    return c.json(getOpenApiDocument(locale));
  });

  routes.get("/docs", (c) => {
    const locale = resolveOpenApiLocale(c.req.query("lang"));
    const openApiUrl = new URL("/openapi.json", c.req.url);
    openApiUrl.searchParams.set("lang", locale);
    return c.html(buildSwaggerHtml(openApiUrl.toString(), locale));
  });

  return routes;
};
