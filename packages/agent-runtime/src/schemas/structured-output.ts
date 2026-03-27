import { z } from "zod";

export const ThoughtIntentValues = [
  "ask_question",
  "share_experience",
  "empathize",
  "clarify",
  "close_session",
] as const;

export const ThoughtToneValues = [
  "warm",
  "curious",
  "calm",
  "playful",
  "serious",
] as const;

export const MemoryCategoryValues = [
  "fact",
  "preference",
  "experience",
  "instruction",
] as const;

export const MemorySourceValues = [
  "agent_inferred",
  "human_override",
  "system",
] as const;

export type ThoughtIntent = (typeof ThoughtIntentValues)[number];
export type ThoughtTone = (typeof ThoughtToneValues)[number];
export type MemoryCategory = (typeof MemoryCategoryValues)[number];
export type MemorySource = (typeof MemorySourceValues)[number];

export const ThoughtSchema = z.object({
  intent: z.enum(ThoughtIntentValues),
  tone: z.enum(ThoughtToneValues),
  rationale: z.string().min(1).max(600),
});

export const MemoryCandidateSchema = z.object({
  category: z.enum(MemoryCategoryValues),
  content: z.string().min(1).max(600),
  weight: z.number().min(0).max(1),
  source: z.enum(MemorySourceValues).default("agent_inferred"),
});

export const RuntimeStructuredOutputSchema = z.object({
  response: z.object({
    content: z.string().min(1).max(2000),
    shouldEndSession: z.boolean().default(false),
  }),
});

const stripUnsupportedOpenAIJsonSchemaKeywords = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stripUnsupportedOpenAIJsonSchemaKeywords);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === "$schema" || key === "default") {
      continue;
    }

    cleaned[key] = stripUnsupportedOpenAIJsonSchemaKeywords(nestedValue);
  }

  return cleaned;
};

export const RuntimeStructuredOutputJsonSchema =
  stripUnsupportedOpenAIJsonSchemaKeywords(
    RuntimeStructuredOutputSchema.toJSONSchema(),
  ) as Record<string, unknown>;

export type RuntimeStructuredOutput = z.infer<typeof RuntimeStructuredOutputSchema>;

export type RuntimeParseErrorCode =
  | "json_parse_error"
  | "schema_validation_error";

export interface RuntimeParseError {
  code: RuntimeParseErrorCode;
  message: string;
}

export type ParseRuntimeStructuredOutputResult =
  | { success: true; data: RuntimeStructuredOutput; rawJson: string }
  | { success: false; error: RuntimeParseError };

export const parseRuntimeStructuredOutput = (
  rawText: string,
): ParseRuntimeStructuredOutputResult => {
  const candidateJson = collectJsonCandidates(rawText);
  if (candidateJson.length === 0) {
    return {
      success: false,
      error: {
        code: "json_parse_error",
        message: "Unable to find a valid JSON object in model output.",
      },
    };
  }

  let lastSchemaErrorMessage = "Runtime schema validation failed.";
  for (const candidate of candidateJson) {
    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(candidate);
    } catch {
      continue;
    }

    const parsedResult = RuntimeStructuredOutputSchema.safeParse(parsedUnknown);
    if (parsedResult.success) {
      return { success: true, data: parsedResult.data, rawJson: candidate };
    }

    lastSchemaErrorMessage = formatSchemaIssues(parsedResult.error.issues);
  }

  return {
    success: false,
    error: {
      code: "schema_validation_error",
      message: lastSchemaErrorMessage,
    },
  };
};

function collectJsonCandidates(rawText: string): string[] {
  const result: string[] = [];
  const trimmed = rawText.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    result.push(trimmed);
  }

  const extracted = extractFirstJsonObject(trimmed);
  if (extracted && !result.includes(extracted)) {
    result.push(extracted);
  }

  return result;
}

function extractFirstJsonObject(input: string): string | null {
  const start = input.indexOf("{");
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, index + 1);
      }
    }
  }

  return null;
}

function formatSchemaIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
