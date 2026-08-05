export type CompatibleAIEnv = {
  DASHSCOPE_API_KEY?: string;
  QWEN_MODEL?: string;
  QWEN_BASE_URL?: string;
  XHS_AI_API_KEY?: string;
  XHS_AI_BASE_URL?: string;
  XHS_AI_MODELS?: string;
};

type Provider = { name: string; apiKey: string; endpoint: string; models: string[] };
type CompatibleResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
  message?: string;
};

const DEFAULT_QWEN_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1";

function endpoint(base: string) {
  const clean = base.trim().replace(/\/$/, "");
  return clean.endsWith("/chat/completions") ? clean : `${clean}/chat/completions`;
}

function modelList(value: string | undefined, fallback: string) {
  return (value || fallback).split(",").map((item) => item.trim()).filter(Boolean);
}

function providers(env: CompatibleAIEnv): Provider[] {
  const result: Provider[] = [];
  if (env.DASHSCOPE_API_KEY?.trim()) result.push({
    name: "千问视觉",
    apiKey: env.DASHSCOPE_API_KEY.trim(),
    endpoint: endpoint(env.QWEN_BASE_URL || DEFAULT_QWEN_BASE),
    models: modelList(env.QWEN_MODEL, "qwen3-vl-plus"),
  });
  if (env.XHS_AI_API_KEY?.trim() && env.XHS_AI_BASE_URL?.trim()) result.push({
    name: "备用视觉模型",
    apiKey: env.XHS_AI_API_KEY.trim(),
    endpoint: endpoint(env.XHS_AI_BASE_URL),
    models: modelList(env.XHS_AI_MODELS, "gpt-4.1-mini"),
  });
  return result;
}

export async function generateWithModelFallback(
  env: CompatibleAIEnv,
  content: Array<Record<string, unknown>>,
) {
  const attempts: string[] = [];
  for (const provider of providers(env)) {
    for (const model of provider.models) {
      for (let retry = 0; retry < 2; retry += 1) {
        try {
          const response = await fetch(provider.endpoint, {
            method: "POST",
            headers: { authorization: `Bearer ${provider.apiKey}`, "content-type": "application/json" },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content }],
              response_format: { type: "json_object" },
              temperature: 0.75,
              max_tokens: 4_000,
              stream: false,
            }),
          });
          const payload = await response.json().catch(() => ({})) as CompatibleResponse;
          const text = payload.choices?.[0]?.message?.content?.trim();
          if (response.ok && text) return { text, mode: `${provider.name} · ${model}`, attempts };
          attempts.push(`${provider.name}/${model}: ${payload.error?.message || payload.message || `HTTP ${response.status}`}`);
          if (![408, 429, 500, 502, 503, 504].includes(response.status)) break;
        } catch (error) {
          attempts.push(`${provider.name}/${model}: ${error instanceof Error ? error.message : "网络错误"}`);
        }
        if (retry === 0) await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }
  return { text: "", mode: "", attempts };
}

export function hasConfiguredAI(env: CompatibleAIEnv) {
  return providers(env).length > 0;
}
