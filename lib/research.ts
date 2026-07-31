import { drizzle } from "drizzle-orm/d1";
import { desc, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { researchReferences } from "../db/schema";

export type ResearchRuntimeEnv = {
  DB: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

type ResearchItem = {
  sourceUrl: string;
  title: string;
  author: string;
  likes: number;
  saves: number;
  comments: number;
  metricsNote: string;
  metricConfidence: "verified" | "estimated";
  copyAnalysis: string;
  coverAnalysis: string;
  audienceInsight: string;
  reusablePattern: string;
};

function outputText(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap((item) => {
    const content = item && typeof item === "object" && Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: Array<{ text?: string }> }).content
      : [];
    return content.map((part) => part.text || "");
  }).join("\n");
}

function chinaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const researchSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "sourceUrl", "title", "author", "likes", "saves", "comments",
          "metricsNote", "metricConfidence", "copyAnalysis", "coverAnalysis",
          "audienceInsight", "reusablePattern",
        ],
        properties: {
          sourceUrl: { type: "string" },
          title: { type: "string" },
          author: { type: "string" },
          likes: { type: "integer", minimum: 0 },
          saves: { type: "integer", minimum: 0 },
          comments: { type: "integer", minimum: 0 },
          metricsNote: { type: "string" },
          metricConfidence: { type: "string", enum: ["verified", "estimated"] },
          copyAnalysis: { type: "string" },
          coverAnalysis: { type: "string" },
          audienceInsight: { type: "string" },
          reusablePattern: { type: "string" },
        },
      },
    },
  },
};

export async function listResearch(env: ResearchRuntimeEnv, date?: string) {
  const db = drizzle(env.DB, { schema });
  return date
    ? db.select().from(researchReferences).where(eq(researchReferences.researchDate, date)).orderBy(desc(researchReferences.likes)).limit(3)
    : db.select().from(researchReferences).orderBy(desc(researchReferences.researchDate), desc(researchReferences.likes)).limit(30);
}

export async function collectDailyResearch(env: ResearchRuntimeEnv, force = false) {
  if (!env.OPENAI_API_KEY?.startsWith("sk-")) throw new Error("OpenAI API 密钥尚未连接");
  const date = chinaDate();
  const existing = await listResearch(env, date);
  if (existing.length >= 3 && !force) return existing;

  const prompt = `今天是 ${date}。你是室内设计工作室的内容研究员。
使用联网搜索寻找小红书（xiaohongshu.com）公开可访问的室内设计、住宅实景、空间改造内容。
筛选 3 篇具有高点赞或高收藏信号的内容，优先最近 90 天；若无法核实确切互动量，不得编造，
将数值写为 0，并在 metricsNote 说明可见的热度信号与限制，metricConfidence 写 estimated。
只分析选题、叙事结构、首屏信息层级、封面构图、字体位置、色彩和受众需求。
不得大段摘录或改写原文，不得建议复制原句或照搬封面。
sourceUrl 必须是实际来源页面，优先 xiaohongshu.com 的笔记链接。
reusablePattern 必须是可用于未来原创项目的抽象方法。`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5.6-luna",
      tools: [{
        type: "web_search",
        search_context_size: "high",
        user_location: {
          type: "approximate",
          country: "CN",
          city: "Wenzhou",
          region: "Zhejiang",
          timezone: "Asia/Shanghai",
        },
      }],
      input: prompt,
      text: { format: { type: "json_schema", name: "xhs_daily_research", strict: true, schema: researchSchema } },
      max_output_tokens: 3600,
    }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("OpenAI API 密钥无效或已失效");
    throw new Error(`每日研究暂不可用（${response.status}）`);
  }

  const payload = await response.json() as Record<string, unknown>;
  const parsed = JSON.parse(outputText(payload)) as { items: ResearchItem[] };
  const items = parsed.items.filter((item) => /^https?:\/\//.test(item.sourceUrl)).slice(0, 3);
  if (items.length !== 3) throw new Error("联网研究未返回 3 条有效来源");

  const db = drizzle(env.DB, { schema });
  for (const item of items) {
    const values = { researchDate: date, ...item };
    await db.insert(researchReferences).values(values).onConflictDoUpdate({
      target: researchReferences.sourceUrl,
      set: values,
    });
  }
  return listResearch(env, date);
}
