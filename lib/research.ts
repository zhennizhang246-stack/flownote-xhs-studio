import { drizzle } from "drizzle-orm/d1";
import { and, desc, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { researchReferences } from "../db/schema";

export type ResearchRuntimeEnv = {
  DB: D1Database;
  DASHSCOPE_API_KEY?: string;
  QWEN_MODEL?: string;
  QWEN_BASE_URL?: string;
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
  tags?: string[];
  commentsText?: string;
  savesText?: string;
  keywordUsed?: string;
};

type ResearchAnalysis = Pick<ResearchItem, "sourceUrl" | "copyAnalysis" | "coverAnalysis" | "audienceInsight" | "reusablePattern">;

type QwenResponse = { choices?: Array<{ message?: { content?: string } }> };

function qwenEndpoint(value?: string) {
  const base = value?.trim().replace(/\/$/, "") || "https://dashscope.aliyuncs.com/compatible-mode/v1";
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
}

function parseJsonObject(text: string) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("invalid JSON response");
  return JSON.parse(cleaned.slice(start, end + 1)) as { items?: ResearchAnalysis[] };
}

async function analyzeCollectedNotes(env: ResearchRuntimeEnv, candidates: BrowserResearchCandidate[]) {
  const analyses = new Map<string, ResearchAnalysis>();
  if (!env.DASHSCOPE_API_KEY?.trim() || !candidates.length) return analyses;
  const visibleNotes = candidates.map((candidate) => ({
    sourceUrl: candidate.sourceUrl,
    title: candidate.title,
    visibleBody: candidate.cardText || "",
    tags: candidate.tags || [],
    likesText: candidate.likesText || "",
    keywordUsed: candidate.keywordUsed || "",
  }));
  const prompt = `你是室内设计工作室的小红书内容研究秘书。以下内容来自用户在当前登录浏览器中主动收藏的小红书公开室内设计笔记。请逐篇分析，不复述或改写原文，不虚构热度数据。
每篇返回 sourceUrl（必须原样返回）、copyAnalysis（正文的开场钩子、设计细节展开顺序和结尾互动）、coverAnalysis（标题关键词、情绪触发和点击结构）、audienceInsight（客户需求）、reusablePattern（未来原创项目可复用的方法，不得复制原句）。
只返回 JSON：{"items":[...]}。待分析笔记：${JSON.stringify(visibleNotes)}`;
  try {
    const response = await fetch(qwenEndpoint(env.QWEN_BASE_URL), {
      method: "POST",
      headers: { authorization: `Bearer ${env.DASHSCOPE_API_KEY.trim()}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.QWEN_MODEL?.trim() || "qwen3-vl-plus",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.35,
        max_tokens: 3_000,
      }),
    });
    if (!response.ok) return analyses;
    const payload = await response.json() as QwenResponse;
    const parsed = parseJsonObject(payload.choices?.[0]?.message?.content || "");
    for (const item of Array.isArray(parsed.items) ? parsed.items : []) {
      const identity = noteIdentity(String(item.sourceUrl || ""));
      if (!identity || !visibleNotes.some((note) => noteIdentity(note.sourceUrl) === identity)) continue;
      analyses.set(identity, item);
    }
  } catch {
    // Rule-based analysis below keeps collection usable during temporary model failures.
  }
  return analyses;
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
  return url.href.slice(0, 2000);
}

function noteIdentity(value: string) {
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

export async function collectBrowserResearch(env: ResearchRuntimeEnv, ownerEmail: string, candidates: BrowserResearchCandidate[], force = false) {
  const date = chinaDate();
  const existing = await listResearch(env, ownerEmail, date);
  if (existing.length >= 3 && !force) return existing;
  const unique = new Map<string, BrowserResearchCandidate>();
  for (const candidate of candidates.slice(0, 20)) {
    const sourceUrl = canonicalXiaohongshuNoteUrl(String(candidate.sourceUrl || "").trim());
    const identity = noteIdentity(sourceUrl);
    const title = String(candidate.title || "").replace(/\s+/g, " ").trim().slice(0, 120);
    if (!identity || title.length < 3 || unique.has(identity)) continue;
    unique.set(identity, {
      sourceUrl,
      title,
      author: String(candidate.author || "").replace(/\s+/g, " ").trim().slice(0, 80),
      likesText: String(candidate.likesText || "").trim().slice(0, 30),
      coverUrl: String(candidate.coverUrl || "").slice(0, 2000),
      coverAlt: String(candidate.coverAlt || "").replace(/\s+/g, " ").trim().slice(0, 180),
      cardText: String(candidate.cardText || "").replace(/\s+/g, " ").trim().slice(0, 1800),
      tags: Array.isArray(candidate.tags) ? candidate.tags.map(String).map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean).slice(0, 20) : [],
      commentsText: String(candidate.commentsText || "").trim().slice(0, 30),
      savesText: String(candidate.savesText || "").trim().slice(0, 30),
      keywordUsed: String(candidate.keywordUsed || "").replace(/\s+/g, " ").trim().slice(0, 60),
    });
  }
  const selected = [...unique.values()]
    .sort((a, b) => parseVisibleMetric(b.likesText || "") - parseVisibleMetric(a.likesText || ""))
    .slice(0, 10);
  if (!selected.length) throw new Error("还没有可同步的右键收藏笔记，请先在小红书原笔记页面完成收藏");

  const qwenAnalyses = await analyzeCollectedNotes(env, selected);

  const db = drizzle(env.DB, { schema });
  if (force) {
    await db.delete(researchReferences).where(and(
      eq(researchReferences.ownerEmail, ownerEmail),
      eq(researchReferences.researchDate, date),
    ));
  }
  for (const candidate of selected) {
    const analysis = qwenAnalyses.get(noteIdentity(candidate.sourceUrl));
    const likes = parseVisibleMetric(candidate.likesText || "");
    const saves = parseVisibleMetric(candidate.savesText || "");
    const comments = parseVisibleMetric(candidate.commentsText || "");
    const titleStructure = /\d|㎡|m²/i.test(candidate.title)
      ? "数字或面积事实前置，再连接空间体验收益"
      : /[?？]|怎么|如何|为什么|避坑/.test(candidate.title)
        ? "用真实问题或痛点建立点击动机，再给出设计判断"
        : "先交代空间情绪或视觉记忆点，再以设计细节支撑";
    const tagSummary = candidate.tags?.length ? `；高频标签线索：${candidate.tags.slice(0, 6).join("、")}` : "";
    const item: ResearchItem = {
      sourceUrl: candidate.sourceUrl,
      title: candidate.title,
      author: candidate.author || "小红书公开作者",
      likes,
      saves,
      comments,
      metricsNote: likes
        ? `小红书搜索页采集时可见点赞约 ${candidate.likesText}；收藏与评论未在卡片中公开显示`
        : "已核验为小红书公开笔记；搜索卡片未稳定显示可解析的互动数",
      metricConfidence: "estimated",
      copyAnalysis: analysis?.copyAnalysis || `${abstractCopyPattern(candidate.title)}正文以项目照片可验证的空间、材质、光线、动线或使用体验为依据，结尾用自然的问题邀请读者交流需求。`,
      coverAnalysis: analysis?.coverAnalysis || `${titleStructure}${candidate.keywordUsed ? `；搜索关键词：${candidate.keywordUsed}` : ""}${tagSummary}。新项目只复用结构，不复制词句。`,
      audienceInsight: analysis?.audienceInsight || "面向正在寻找设计灵感、比较设计公司专业度，或准备启动住宅、商业、办公、酒店及展陈空间项目的人群。",
      reusablePattern: analysis?.reusablePattern || `${abstractReusablePattern(candidate.title)}正文依次写照片钩子、3项可验证设计细节、使用价值与低压力互动语；结尾围绕当前空间提出具体问题，不虚构优惠、客户评价与项目成果。`,
    };
    const values = { ownerEmail, researchDate: date, ...item };
    await db.insert(researchReferences).values(values).onConflictDoUpdate({
      target: researchReferences.sourceUrl,
      set: values,
    });
  }
  return listResearch(env, ownerEmail, date);
}

export async function listResearch(env: ResearchRuntimeEnv, ownerEmail: string, date?: string) {
  const db = drizzle(env.DB, { schema });
  return date
    ? db.select().from(researchReferences).where(and(eq(researchReferences.ownerEmail, ownerEmail), eq(researchReferences.researchDate, date))).orderBy(desc(researchReferences.likes)).limit(3)
    : db.select().from(researchReferences).where(eq(researchReferences.ownerEmail, ownerEmail)).orderBy(desc(researchReferences.researchDate), desc(researchReferences.likes)).limit(30);
}

export async function collectDailyResearch(env: ResearchRuntimeEnv, ownerEmail: string, force = false) {
  const date = chinaDate();
  const existing = await listResearch(env, ownerEmail, date);
  if (existing.length >= 3 && !force) return existing;
  throw new Error("请先用 MJ 发布桥在小红书搜索页采集热门室内设计笔记，或在原笔记页面右键收藏；平台只解析真实链接，不生成虚构来源");
}
