import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectImages, projects, researchReferences } from "../../../db/schema";
import { apiError, requireAccountEmail } from "../../../lib/account";

type RuntimeEnv = {
  PROJECT_MEDIA?: R2Bucket;
  DASHSCOPE_API_KEY?: string;
  QWEN_MODEL?: string;
  QWEN_BASE_URL?: string;
};

type CoverStyle = Record<string, unknown>;

type StyleVariant = {
  id: "lifestyle" | "professional" | "minimal";
  name: string;
  description: string;
  title: string;
  coverTitle: string;
  coverSubtitle: string;
  coverStyle?: CoverStyle;
  body: string;
  tags: string[];
};

type GeneratedDraft = {
  title: string;
  titleOptions?: string[];
  coverTitle: string;
  coverSubtitle: string;
  coverStyle?: CoverStyle;
  body: string;
  tags: string[];
  highlights: string[];
  riskNotes: string[];
  coverIndex: number;
  mode: string;
  styleVariants?: StyleVariant[];
};

type QwenResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; code?: string };
  message?: string;
};

const DEFAULT_QWEN_ENDPOINT =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

function parseDraft(text: string): GeneratedDraft {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("千问未返回可解析的文案，请重新生成");
  return JSON.parse(cleaned.slice(start, end + 1)) as GeneratedDraft;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function normalizeEndpoint(value?: string) {
  const base = value?.trim().replace(/\/$/, "");
  if (!base) return DEFAULT_QWEN_ENDPOINT;
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
}

function normalizeDraft(draft: GeneratedDraft, imageCount: number) {
  const validIds = new Set(["lifestyle", "professional", "minimal"]);
  const variants = (Array.isArray(draft.styleVariants) ? draft.styleVariants : [])
    .filter((item) => item && validIds.has(item.id))
    .slice(0, 3);

  const options = (variants.length === 3
    ? variants.map((item) => item.title)
    : Array.isArray(draft.titleOptions)
      ? draft.titleOptions
      : [draft.title]
  )
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 3);

  while (options.length < 3) options.push(`${options[0] || "空间设计灵感"}｜方案${options.length + 1}`);
  draft.titleOptions = options;
  draft.styleVariants = variants;

  if (variants[0]) {
    draft.title = variants[0].title;
    draft.coverTitle = variants[0].coverTitle;
    draft.coverSubtitle = variants[0].coverSubtitle;
    draft.coverStyle = variants[0].coverStyle;
    draft.body = variants[0].body;
    draft.tags = variants[0].tags;
  } else {
    draft.title = options[0];
  }

  draft.tags = Array.isArray(draft.tags) ? draft.tags.map(String).filter(Boolean).slice(0, 15) : [];
  draft.highlights = Array.isArray(draft.highlights) ? draft.highlights.map(String).slice(0, 10) : [];
  draft.riskNotes = Array.isArray(draft.riskNotes) ? draft.riskNotes.map(String).slice(0, 10) : [];
  draft.coverIndex = Math.min(Math.max(0, Number(draft.coverIndex) || 0), Math.max(0, imageCount - 1));
  draft.mode = "千问视觉实景识别 · 3 种风格";
  return draft;
}

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireAccountEmail();
    const { projectId } = (await request.json()) as { projectId?: number };
    if (!projectId) return Response.json({ error: "缺少项目编号" }, { status: 400 });

    const runtime = env as unknown as RuntimeEnv;
    if (!runtime.PROJECT_MEDIA) throw new Error("项目图片存储暂不可用");
    if (!runtime.DASHSCOPE_API_KEY?.trim()) {
      return Response.json({ error: "尚未配置阿里云百炼 DASHSCOPE_API_KEY" }, { status: 503 });
    }

    const db = getDb();
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail)))
      .limit(1);
    if (!project) return Response.json({ error: "项目不存在" }, { status: 404 });

    const images = await db
      .select()
      .from(projectImages)
      .where(eq(projectImages.projectId, projectId));
    const selectedImages = images.sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 10);
    if (!selectedImages.length) return Response.json({ error: "请先上传项目实景图" }, { status: 400 });

    const research = await db
      .select({
        copyAnalysis: researchReferences.copyAnalysis,
        coverAnalysis: researchReferences.coverAnalysis,
        audienceInsight: researchReferences.audienceInsight,
        reusablePattern: researchReferences.reusablePattern,
      })
      .from(researchReferences)
      .where(eq(researchReferences.ownerEmail, ownerEmail))
      .orderBy(desc(researchReferences.researchDate), desc(researchReferences.likes))
      .limit(3);

    const prompt = `你是顶级室内设计互联网内容秘书。请逐张分析上传的项目实景图，只依据画面中可见事实和用户提供的可选项目信息，生成原创的小红书室内设计笔记。

分析要求：识别空间类型、材质、色彩、自然与人工采光、家具陈设、空间比例、功能关系、可见通道与动线、设计风格和空间情绪。没有平面图时，只描述画面可见的动线关系，不得虚构。项目名称、地点、面积、客户和设计信息缺失时直接省略，禁止猜测材料品牌、造价、完工时间和客户身份。

内容要求：围绕打开率、完读转发率和长尾搜索关键词生成，但不得照搬参考笔记。生成三套差异明显的方案：lifestyle（松弛生活，强调感受与共鸣）、professional（专业设计，强调空间逻辑与方法）、minimal（高级极简，强调审美与留白）。每套必须包含 description、title、coverTitle、coverSubtitle、coverStyle、body、tags。标题自然加入最多一个 Emoji，正文自然加入 3-6 个语义相关 Emoji；文案必须与本项目图片强关联。

coverStyle 规则：fontFamily 只能为 serif、sans、kai；颜色使用 6 位十六进制；overlayOpacity 为 0-90；pattern 只能为 none、frame、grid、dots、corners；titleSize 为 52-120；align 只能为 left、center；position 只能为 top、middle、bottom。

只返回一个 JSON 对象，不要 Markdown。顶层字段必须为 title、titleOptions、coverTitle、coverSubtitle、coverStyle、body、tags、highlights、riskNotes、coverIndex、styleVariants。coverIndex 是最适合做封面的图片序号，从 0 开始。顶层文案使用 lifestyle 方案；titleOptions 是三套方案各自的 title。

用户提供的可选项目信息：${JSON.stringify(project)}
近期引流笔记的抽象规律（只能借鉴规律，不得复制原句）：${JSON.stringify(research)}`;

    const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    for (const image of selectedImages) {
      const object = await runtime.PROJECT_MEDIA.get(image.objectKey);
      if (!object) continue;
      const bytes = new Uint8Array(await object.arrayBuffer());
      content.push({
        type: "image_url",
        image_url: { url: `data:${image.contentType};base64,${bytesToBase64(bytes)}` },
        min_pixels: 65_536,
        max_pixels: 1_048_576,
      });
    }

    if (content.length === 1) throw new Error("无法读取项目图片，请重新上传");

    const apiResponse = await fetch(normalizeEndpoint(runtime.QWEN_BASE_URL), {
      method: "POST",
      headers: {
        authorization: `Bearer ${runtime.DASHSCOPE_API_KEY.trim()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: runtime.QWEN_MODEL?.trim() || "qwen3-vl-plus",
        messages: [{ role: "user", content }],
        response_format: { type: "json_object" },
        temperature: 0.75,
        max_tokens: 4_000,
        stream: false,
      }),
    });

    const payload = (await apiResponse.json().catch(() => ({}))) as QwenResponse;
    if (!apiResponse.ok) {
      const detail = payload.error?.message || payload.message || `HTTP ${apiResponse.status}`;
      if (apiResponse.status === 401) throw new Error("百炼 API Key 无效、地域不匹配或已失效");
      if (apiResponse.status === 429) throw new Error("百炼调用频率或账户额度已达上限，请稍后重试或检查余额");
      throw new Error(`千问视觉服务暂不可用：${detail}`);
    }

    const text = payload.choices?.[0]?.message?.content;
    if (!text) throw new Error("千问没有返回文案内容，请重新生成");
    const draft = normalizeDraft(parseDraft(text), selectedImages.length);

    await db
      .update(projects)
      .set({ status: "drafted", draftJson: JSON.stringify(draft) })
      .where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail)));

    return Response.json({ draft });
  } catch (error) {
    return apiError(error, "生成失败");
  }
}
