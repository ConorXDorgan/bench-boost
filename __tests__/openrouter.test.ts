import { afterEach, describe, expect, it, vi } from "vitest";
import { chatCompletion } from "@/lib/ai/openrouter";

const reply = { choices: [{ message: { content: "ok" }, finish_reason: "stop" }] };

function mockFetch() {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(reply), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function sent(fetchMock: ReturnType<typeof mockFetch>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return { url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("chatCompletion", () => {
  it("uses Azure OpenAI when AZURE_OPENAI_ENDPOINT is set", async () => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://res.openai.azure.com");
    vi.stubEnv("AZURE_OPENAI_API_KEY", "azure-key");
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", "gpt-5.4-mini");
    const fetchMock = mockFetch();

    await expect(
      chatCompletion([{ role: "user", content: "hi" }], { temperature: 0.2, maxTokens: 4000 }),
    ).resolves.toBe("ok");

    const { url, headers, body } = sent(fetchMock);
    expect(url).toBe("https://res.openai.azure.com/openai/v1/chat/completions");
    expect(headers["api-key"]).toBe("azure-key");
    expect(headers.Authorization).toBeUndefined();
    expect(body).toMatchObject({ model: "gpt-5.4-mini", max_completion_tokens: 4000 });
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("max_tokens");
  });

  it("requires a deployment name for Azure OpenAI", async () => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "https://res.openai.azure.com/");
    vi.stubEnv("AZURE_OPENAI_API_KEY", "azure-key");
    vi.stubEnv("AZURE_OPENAI_DEPLOYMENT", "");
    mockFetch();

    await expect(chatCompletion([{ role: "user", content: "hi" }])).rejects.toThrow(/AZURE_OPENAI_DEPLOYMENT/);
  });

  it("falls back to OpenRouter", async () => {
    vi.stubEnv("AZURE_OPENAI_ENDPOINT", "");
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    vi.stubEnv("OPENROUTER_MODEL", "openai/gpt-oss-120b:free");
    const fetchMock = mockFetch();

    await chatCompletion([{ role: "user", content: "hi" }], { maxTokens: 100 });

    const { url, headers, body } = sent(fetchMock);
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(headers.Authorization).toBe("Bearer or-key");
    expect(body).toMatchObject({ model: "openai/gpt-oss-120b:free", temperature: 0.2, max_tokens: 100 });
  });
});
