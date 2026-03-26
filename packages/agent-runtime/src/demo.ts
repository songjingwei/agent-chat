import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import {
  AgentRuntimeEngine,
  PromptManager,
  createRuntimeModelClient,
  createStaticRuntimeModelClient,
  type BuildPromptInput,
  type RuntimeModelClient,
  type RuntimeModelClientFactoryEnv,
} from "./index.js";

type DemoMode = "static-ok" | "fallback" | "live";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../../../");
const envLocalPath = resolve(repoRoot, ".env.local");
const envPath = resolve(repoRoot, ".env");

if (existsSync(envLocalPath)) {
  loadEnvFile(envLocalPath);
}

if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const cliArgs = process.argv.slice(2);
const parsed = parseArgs({
  args: cliArgs[0] === "--" ? cliArgs.slice(1) : cliArgs,
  options: {
    mode: {
      type: "string",
      default: "static-ok",
    },
    provider: {
      type: "string",
    },
    prompt: {
      type: "boolean",
      default: false,
    },
  },
});

const mode = toDemoMode(parsed.values.mode);
const promptOnly = parsed.values.prompt;
const providerOverride = parsed.values.provider;

const input: BuildPromptInput & { sessionId: string } = {
  sessionId: "ses_demo_runtime",
  speakerPersona: {
    id: "prs_demo_jeevsong",
    name: "jeevsong",
    bio: "真诚、好奇，喜欢把技术和生活经验聊得自然一点。",
    traits: ["真诚", "好奇", "温和"],
    systemPrompt: "表达要自然，不要油腻，优先延续对话节奏。",
  },
  counterpartPersona: {
    id: "prs_demo_yihan",
    name: "易涵",
    bio: "偏安静，喜欢音乐、展览和散步，也愿意慢慢建立熟悉感。",
    traits: ["安静", "细腻", "有边界感"],
    systemPrompt: "先建立舒适感，再逐步展开话题。",
  },
  recentMessages: [
    {
      role: "agent",
      authorName: "易涵",
      content: "如果周末能完全按自己的节奏来，你最想怎么度过？",
    },
  ],
  memoryItems: [
    {
      category: "preference",
      content: "对方更喜欢具体、生活化的话题，不喜欢过度热情的开场。",
      weight: 0.92,
      source: "system",
    },
    {
      category: "fact",
      content: "说话节奏偏慢时，互动质量会更稳定。",
      weight: 0.68,
      source: "agent_inferred",
    },
  ],
  sessionGoal: "自然了解彼此的生活节奏与兴趣，不急着推进关系。",
};

const promptManager = new PromptManager();
const promptBuild = promptManager.buildTurnPrompt(input);

if (promptOnly) {
  console.log(promptBuild.prompt);
  process.exit(0);
}

const env: RuntimeModelClientFactoryEnv = {
  ...process.env,
  ...(providerOverride ? { RUNTIME_MODEL_PROVIDER: providerOverride } : {}),
};

const modelClient = createModelClient(mode, env);
const runtime = new AgentRuntimeEngine({
  modelClient,
  maxAttempts: mode === "fallback" ? 2 : 2,
});

console.log(
  JSON.stringify(
    {
      mode,
      provider:
        mode === "live"
          ? env.RUNTIME_MODEL_PROVIDER ?? "openai"
          : "demo-static",
      promptMeta: promptBuild.meta,
      speaker: input.speakerPersona.name,
      counterpart: input.counterpartPersona.name,
    },
    null,
    2,
  ),
);

try {
  const result = await runtime.runTurn(input);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      {
        mode,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}

function toDemoMode(raw: string): DemoMode {
  if (raw === "static-ok" || raw === "fallback" || raw === "live") {
    return raw;
  }

  throw new Error(
    `Unsupported --mode value: ${raw}. Use static-ok, fallback, or live.`,
  );
}

function createModelClient(
  selectedMode: DemoMode,
  env: RuntimeModelClientFactoryEnv,
): RuntimeModelClient {
  if (selectedMode === "static-ok") {
    return createStaticRuntimeModelClient(
      JSON.stringify({
        thought: {
          intent: "ask_question",
          tone: "warm",
          rationale: "继续围绕生活节奏提问，能自然推进关系。",
        },
        response: {
          content: "我大概会先找家安静的咖啡店坐一会儿，然后傍晚出去散步。你更偏向宅着放松，还是想出门走走？",
          shouldEndSession: false,
          extractMemories: true,
          memoryCandidates: [
            {
              category: "preference",
              content: "jeevsong 偏好安静、生活化的周末安排。",
              weight: 0.71,
              source: "agent_inferred",
            },
          ],
        },
      }),
    );
  }

  if (selectedMode === "fallback") {
    return {
      async generate() {
        return {
          text: "This is intentionally not valid JSON.",
          finishReason: "stop",
          model: "demo-invalid-json",
        };
      },
    };
  }

  return createRuntimeModelClient(env);
}
