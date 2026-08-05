import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectImages, projects, researchReferences } from "../../../db/schema";
import { apiError, requireAccountEmail } from "../../../lib/account";
import { generateWithModelFallback, hasConfiguredAI } from "../../../lib/ai-model-router";
import { createFallbackDraft } from "../../../lib/fallback-copy";

type RuntimeEnv = {
  PROJECT_MEDIA?: R2Bucket;
  DASHSCOPE_API_KEY?: string;
  QWEN_MODEL?: string;
  QWEN_BASE_URL?: string;
  XHS_AI_API_KEY?: string;
  XHS_AI_BASE_URL?: string;
  XHS_AI_MODELS?: string;
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

function normalizeDraft(draft: GeneratedDraft, imageCount: number, mode?: string) {
  const validIds = new Set(["lifestyle", "professional", "minimal"]);
  const variants = (Array.isArray(draft.styleVariants) ? draft.styleVariants : [])
    .filter((item) => item && validIds.has(item.id))
    .slice(0, 5);

  const options = (Array.isArray(draft.titleOptions) && draft.titleOptions.length
      ? draft.titleOptions
      : variants.length === 3 ? variants.map((item) => item.title) : [draft.title])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  while (options.length < 5) options.push(`${options[0] || "空间设计灵感"}｜方案${options.length + 1}`);
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
  draft.mode = mode || draft.mode || "免 API 额度 · 实景图项目规则引擎";
  return draft;
}

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireAccountEmail();
    const { projectId } = (await request.json()) as { projectId?: number };
    if (!projectId) return Response.json({ error: "缺少项目编号" }, { status: 400 });

    const runtime = env as unknown as RuntimeEnv;
    if (!runtime.PROJECT_MEDIA) throw new Error("项目图片存储暂不可用");

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
    const fallback = (reason?: string) => normalizeDraft(createFallbackDraft(project, selectedImages.length, reason), selectedImages.length);

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

正文采用“情绪钩子→1-2句核心亮点→2句场景梗→互动收尾”，控制在 150 个汉字以内。titleOptions 必须生成 5 个不重复标题，分别使用情绪口语、风格封神、颜值惊叹、场景发现、建议收藏结构。标签固定为 2 个大流量词、3 个精准风格词、2 个垂类词和 1 个可选地域词。

只返回一个 JSON 对象，不要 Markdown。顶层字段必须为 title、titleOptions、coverTitle、coverSubtitle、coverStyle、body、tags、highlights、riskNotes、coverIndex、styleVariants。coverIndex 是最适合做封面的图片序号，从 0 开始。顶层文案使用 lifestyle 方案；titleOptions 必须有 5 项。

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

    if (!hasConfiguredAI(runtime)) {
      const draft = fallback("尚未配置视觉 API");
      await db.update(projects).set({ status: "drafted", draftJson: JSON.stringify(draft) }).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail)));
      return Response.json({ draft, fallback: true });
    }

    const generated = await generateWithModelFallback(runtime, content);
    if (!generated.text) {
      const reason = generated.attempts.some((item) => item.includes("429"))
        ? "视觉模型额度或频率已达上限，已自动切换免额度生成"
        : "所有视觉模型暂不可用，已自动切换免额度生成";
      const draft = fallback(reason);
      await db.update(projects).set({ status: "drafted", draftJson: JSON.stringify(draft) }).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail)));
      return Response.json({ draft, fallback: true, modelAttempts: generated.attempts.length });
    }

    let draft: GeneratedDraft;
    try {
      draft = normalizeDraft(parseDraft(generated.text), selectedImages.length, `${generated.mode} · 实景识别`);
    } catch {
      draft = fallback("视觉 API 返回内容无法解析");
    }

    await db
      .update(projects)
      .set({ status: "drafted", draftJson: JSON.stringify(draft) })
      .where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail)));

    return Response.json({ draft, fallback: draft.mode.includes("免 API 额度") });
  } catch (error) {
    return apiError(error, "生成失败");
  }
}
