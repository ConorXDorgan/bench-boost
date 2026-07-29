/**
 * Minimal OpenRouter REST client.
 *
 * OpenRouter exposes an OpenAI-compatible /chat/completions endpoint, so we
 * only need a thin wrapper around fetch. Auth + attribution headers are
 * applied from environment variables.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  responseFormat?: "json_object" | "text";
  maxTokens?: number;
}

export class OpenRouterError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "OpenRouterError";
  }
}

// Default to a widely-available, JSON-friendly model. Override via
// OPENROUTER_MODEL in .env (e.g. "openai/gpt-4o", "anthropic/claude-sonnet-4.5").
const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";

interface OpenRouterMessage {
  role?: string;
  content?: string | null;
  // Reasoning models (e.g. extended thinking) sometimes route visible output here.
  reasoning?: string | null;
}
interface OpenRouterChoice {
  message?: OpenRouterMessage;
  finish_reason?: string | null;
  native_finish_reason?: string | null;
  error?: { message?: string };
}
interface OpenRouterResponse {
  id?: string;
  model?: string;
  choices?: OpenRouterChoice[];
  error?: { message?: string; code?: number | string };
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not set. Add it to your .env file before using the AI assistant.",
    );
  }

  const model = opts.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const siteUrl = process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000";
  const siteName = process.env.OPENROUTER_SITE_NAME ?? "Bench Tool";

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
  };
  if (opts.maxTokens != null) body.max_tokens = opts.maxTokens;
  // NOTE: We deliberately do NOT send `response_format: json_object` here.
  // Not every model on OpenRouter honours it, and some return empty content
  // when it's set. We ask for JSON in the prompt and strip code fences when
  // parsing instead.

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": siteUrl,
        "X-Title": siteName,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new OpenRouterError(
      `Failed to reach OpenRouter: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const rawText = await res.text();
  if (!res.ok) {
    throw new OpenRouterError(
      `OpenRouter returned ${res.status}: ${rawText.slice(0, 500) || res.statusText}`,
      res.status,
    );
  }

  let data: OpenRouterResponse;
  try {
    data = JSON.parse(rawText) as OpenRouterResponse;
  } catch {
    throw new OpenRouterError(
      `OpenRouter returned non-JSON response: ${rawText.slice(0, 300)}`,
    );
  }

  // Some failure modes surface as 200 OK with a body-level error field.
  if (data.error?.message) {
    throw new OpenRouterError(`OpenRouter error: ${data.error.message}`, undefined);
  }

  const choice = data.choices?.[0];
  const message = choice?.message;
  const finishReason = choice?.finish_reason ?? choice?.native_finish_reason ?? null;
  const content =
    typeof message?.content === "string" && message.content.trim()
      ? message.content
      : typeof message?.reasoning === "string" && message.reasoning.trim()
        ? message.reasoning
        : null;

  if (!content) {
    // Surface enough context so the underlying problem (truncation, refusal,
    // model rejecting the prompt) is visible in the server logs.
    console.error("[openrouter] empty content", {
      model,
      finishReason,
      choiceError: choice?.error?.message,
      raw: rawText.slice(0, 600),
    });
    if (finishReason === "length") {
      throw new OpenRouterError(
        "The AI hit the response-length limit before producing any text. Try a shorter brief or lower the bench size.",
      );
    }
    if (finishReason === "content_filter") {
      throw new OpenRouterError(
        "The model's safety filter rejected the request. Rephrase the brief and try again.",
      );
    }
    if (choice?.error?.message) {
      throw new OpenRouterError(`OpenRouter error: ${choice.error.message}`);
    }
    throw new OpenRouterError(
      `OpenRouter returned an empty response from "${model}". Check that the model id is correct and supports chat completions; you can override OPENROUTER_MODEL in your .env file.`,
    );
  }
  return content;
}
