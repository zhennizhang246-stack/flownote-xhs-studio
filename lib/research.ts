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

export type BrowserResearchCandidate = {
  sourceUrl: string;
  title: string;
  author?: string;
  likesText?: string;
  coverUrl?: string;
  coverAlt?: string;
  cardText?: string;
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

function isXiaohongshuNoteUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:"
      && (host === "xiaohongshu.com" || host.endsWith(".xiaohongshu.com"))
      && (url.pathname.includes("/discovery/item/") || url.pathname.includes("/explore/"));
  } catch {
    return false;
  }
}

function canonicalXiaohongshuNoteUrl(value: string) {
  if (!isXiaohongshuNoteUrl(value)) return "";
  const url = new URL(value);
  return `${url.origin}${url.pathname}`;
}

function parseVisibleMetric(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*([万wk]?)/i);
  if (!match) return 0;
  const multiplier = match[2] === "万" || match[2].toLowerCase() === "w"
    ? 10_000
    : match[2].toLowerCase() === "k" ? 1_000 : 1;
  return Math.max(0, Math.round(Number(match[1]) * multiplier));
}

function abstractCopyPattern(title: string) {
  if (/\d|㎡|m²|平米/.test(title)) return "标题将面积、数量或项目事实前置，再补充空间价值，形成快速可读的“事实＋收益”结构。";
  if (/[？?]|怎么|如何|为什么/.test(title)) return "标题以真实设计问题建立阅读动机，正文适合按问题、设计判断、落地结果三段展开。";
  return "标题先传达空间情绪或核心体验，正文再用材质、光线、动线和功能细节建立可信度。";
}

function abstractReusablePattern(title: string) {
  if (/\d|㎡|m²|平米/.test(title)) return "封面保留一个明确项目事实，标题避免堆叠形容词；正文用三个可验证设计细节支撑结论。";
  return "封面只突出一个空间情绪，标题提出单一价值，正文按视觉印象、设计方法、生活收益逐层推进。";
}

export async function collectBrowserResearch(env: ResearchRuntimeEnv, candidates: BrowserResearchCandidate[], force = false) {
  const date = chinaDate();
  const existing = await listResearch(env, date);
  if (existing.length >= 3 && !force) return existing;
  const unique = new Map<string, BrowserResearchCandidate>();
  for (const candidate of candidates.slice(0, 20)) {
    const sourceUrl = canonicalXiaohongshuNoteUrl(String(candidate.sourceUrl || "").trim());
    const title = String(candidate.title || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!isXiaohongshuNoteUrl(sourceUrl) || title.length < 3 || unique.has(sourceUrl)) continue;
    unique.set(sourceUrl, {
      sourceUrl,
      title,
      author: String(candidate.author || "").replace(/\s+/g, " ").trim().slice(0, 80),
      likesText: String(candidate.likesText || "").trim().slice(0, 30),
      coverUrl: String(candidate.coverUrl || "").slice(0, 2000),
      coverAlt: String(candidate.coverAlt || "").replace(/\s+/g, " ").trim().slice(0, 180),
      cardText: String(candidate.cardText || "").replace(/\s+/g, " ").trim().slice(0, 800),
    });
  }
  const selected = [...unique.values()]
    .sort((a, b) => parseVisibleMetric(b.likesText || "") - parseVisibleMetric(a.likesText || ""))
    .slice(0, 3);
  if (selected.length !== 3) throw new Error("未从小红书公开搜索页读取到 3 篇可核验笔记，请确认已登录后重试");

  const db = drizzle(env.DB, { schema });
  for (const candidate of selected) {
    const likes = parseVisibleMetric(candidate.likesText || "");
    const item: ResearchItem = {
      sourceUrl: candidate.sourceUrl,
      title: candidate.title,
      author: candidate.author || "小红书公开作者",
      likes,
      saves: 0,
      comments: 0,
      metricsNote: likes
        ? `小红书搜索页采集时可见点赞约 ${candidate.likesText}；收藏与评论未在卡片中公开显示`
        : "已核验为小红书公开笔记；搜索卡片未稳定显示可解析的互动数",
      metricConfidence: "estimated",
      copyAnalysis: abstractCopyPattern(candidate.title),
      coverAnalysis: candidate.coverAlt
        ? "封面以室内实景为主体，并通过画面主体、留白和文字层级建立首屏识别；生成时应结合项目原图重新构图。"
        : "公开卡片以项目空间实景建立视觉信任；生成时保持单一视觉中心、克制文字和清晰项目事实。",
      audienceInsight: "面向正在寻找设计灵感、比较设计公司专业度，或准备启动住宅与商业空间项目的人群。",
      reusablePattern: abstractReusablePattern(candidate.title),
    };
    const values = { researchDate: date, ...item };
    await db.insert(researchReferences).values(values).onConflictDoUpdate({
      target: researchReferences.sourceUrl,
      set: values,
    });
  }
  return listResearch(env, date);
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
  sourceUrl 必须是实际可访问的小红书笔记详情页（xiaohongshu.com/discovery/item 或 /explore），
  不得使用搜索页、聚合页、其他网站或虚构链接。
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
  const items = parsed.items.filter((item) => isXiaohongshuNoteUrl(item.sourceUrl)).slice(0, 3);
  if (items.length !== 3) throw new Error("未找到 3 篇可核验的小红书室内设计笔记，请稍后重试");

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
