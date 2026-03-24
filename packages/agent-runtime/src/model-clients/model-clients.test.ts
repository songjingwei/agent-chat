import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeModelClient } from "./factory.js";

const withMockFetch = async (
  mock: typeof fetch,
  run: () => Promise<void>,
): Promise<void> => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

test("factory creates OpenAI Responses client and maps completed response", async () => {
  await withMockFetch(
    (async (input, init) => {
      assert.equal(String(input), "https://openai.test/v1/responses");
      assert.equal(init?.method, "POST");

      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "gpt-5.4");
      assert.equal(body.max_output_tokens, 128);

      return new Response(
        JSON.stringify({
          model: "gpt-5.4",
          status: "completed",
          output_text: "{\"ok\":true}",
          usage: {
            input_tokens: 11,
            output_tokens: 7,
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch,
    async () => {
      const client = createRuntimeModelClient({
        RUNTIME_MODEL_PROVIDER: "openai",
        OPENAI_API_KEY: "test-openai-key",
        OPENAI_BASE_URL: "https://openai.test/v1",
        OPENAI_MODEL_CHAT: "gpt-5.4",
      });

      const result = await client.generate({
        prompt: "hello",
        maxOutputTokens: 128,
      });

      assert.equal(result.text, "{\"ok\":true}");
      assert.equal(result.finishReason, "stop");
      assert.equal(result.promptTokens, 11);
      assert.equal(result.completionTokens, 7);
      assert.equal(result.model, "gpt-5.4");
    },
  );
});

test("OpenAI Responses maps max_output_tokens incomplete reason to length", async () => {
  await withMockFetch(
    (async () => {
      return new Response(
        JSON.stringify({
          model: "gpt-5.4",
          status: "incomplete",
          incomplete_details: {
            reason: "max_output_tokens",
          },
          output_text: "{\"ok\":true}",
        }),
        { status: 200 },
      );
    }) as typeof fetch,
    async () => {
      const client = createRuntimeModelClient({
        RUNTIME_MODEL_PROVIDER: "openai",
        OPENAI_API_KEY: "test-openai-key",
      });

      const result = await client.generate({
        prompt: "hello",
        maxOutputTokens: 32,
      });

      assert.equal(result.finishReason, "length");
    },
  );
});

test("OpenAI Responses streaming mode sends stream flag and parses SSE deltas", async () => {
  await withMockFetch(
    (async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.stream, true);

      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"type":"response.output_text.delta","delta":"{\\"ok\\":"}\n\n',
            ),
          );
          controller.enqueue(
            encoder.encode(
              'data: {"type":"response.output_text.delta","delta":"true}"}\n\n',
            ),
          );
          controller.enqueue(
            encoder.encode(
              'data: {"type":"response.completed","response":{"model":"gpt-5.4","status":"completed","usage":{"input_tokens":9,"output_tokens":4}}}\n\n',
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(stream, { status: 200 });
    }) as typeof fetch,
    async () => {
      const client = createRuntimeModelClient({
        RUNTIME_MODEL_PROVIDER: "openai",
        OPENAI_API_KEY: "test-openai-key",
        OPENAI_RESPONSES_STREAM: "true",
      });

      const result = await client.generate({
        prompt: "hello",
        maxOutputTokens: 64,
      });

      assert.equal(result.text, "{\"ok\":true}");
      assert.equal(result.finishReason, "stop");
      assert.equal(result.model, "gpt-5.4");
      assert.equal(result.promptTokens, 9);
      assert.equal(result.completionTokens, 4);
    },
  );
});

test("factory creates Anthropic client and maps max_tokens to length", async () => {
  await withMockFetch(
    (async (input, init) => {
      assert.equal(String(input), "https://anthropic.test/v1/messages");
      assert.equal(init?.method, "POST");

      return new Response(
        JSON.stringify({
          model: "claude-sonnet-4-5",
          stop_reason: "max_tokens",
          content: [{ type: "text", text: "{\"ok\":true}" }],
          usage: {
            input_tokens: 20,
            output_tokens: 30,
          },
        }),
        { status: 200 },
      );
    }) as typeof fetch,
    async () => {
      const client = createRuntimeModelClient({
        RUNTIME_MODEL_PROVIDER: "anthropic",
        ANTHROPIC_API_KEY: "test-anthropic-key",
        ANTHROPIC_BASE_URL: "https://anthropic.test/v1",
      });

      const result = await client.generate({
        prompt: "hello",
        maxOutputTokens: 99,
      });

      assert.equal(result.text, "{\"ok\":true}");
      assert.equal(result.finishReason, "length");
      assert.equal(result.promptTokens, 20);
      assert.equal(result.completionTokens, 30);
      assert.equal(result.model, "claude-sonnet-4-5");
    },
  );
});

test("factory creates Ollama client and maps stop done_reason", async () => {
  await withMockFetch(
    (async (input, init) => {
      assert.equal(String(input), "http://ollama.test/api/generate");
      assert.equal(init?.method, "POST");

      return new Response(
        JSON.stringify({
          model: "qwen2.5:14b",
          response: "{\"ok\":true}",
          done_reason: "stop",
          prompt_eval_count: 12,
          eval_count: 8,
        }),
        { status: 200 },
      );
    }) as typeof fetch,
    async () => {
      const client = createRuntimeModelClient({
        RUNTIME_MODEL_PROVIDER: "ollama",
        OLLAMA_BASE_URL: "http://ollama.test",
      });

      const result = await client.generate({
        prompt: "hello",
        maxOutputTokens: 64,
      });

      assert.equal(result.text, "{\"ok\":true}");
      assert.equal(result.finishReason, "stop");
      assert.equal(result.promptTokens, 12);
      assert.equal(result.completionTokens, 8);
      assert.equal(result.model, "qwen2.5:14b");
    },
  );
});

test("factory rejects unsupported provider", () => {
  assert.throws(() => {
    createRuntimeModelClient({
      RUNTIME_MODEL_PROVIDER: "unknown",
    });
  }, /Unsupported RUNTIME_MODEL_PROVIDER/);
});
