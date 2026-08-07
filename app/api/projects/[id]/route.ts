import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { projectImages, projects } from "../../../../db/schema";
import { apiError, requireAccountEmail } from "../../../../lib/account";

type Draft = {
  title: string;
  titleOptions?: string[];
  coverEyebrow?: string;
  coverTitle: string;
  coverSubtitle: string;
  coverStyle?: {
    fontFamily?: string;
    eyebrowLogoStyle?: string;
    eyebrowPosition?: string;
    customFontName?: string;
    customFontUrl?: string;
    titleColor?: string;
    subtitleColor?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    pattern?: string;
    patternColor?: string;
    titleSize?: number;
    titleOffsetX?: number;
    titleOffsetY?: number;
    titleDirection?: string;
    align?: string;
    position?: string;
    patternOffsetX?: number;
    patternOffsetY?: number;
    patternScale?: number;
    eyebrowX?: number;
    eyebrowY?: number;
    eyebrowSize?: number;
    eyebrowOpacity?: number;
    showEyebrowLine?: boolean;
    subtitleSize?: number;
    subtitleOffsetX?: number;
    subtitleOffsetY?: number;
  };
  body: string;
  tags: string[];
  highlights: string[];
  riskNotes: string[];
  coverIndex: number;
  mode?: string;
};

const validStatuses = new Set(["drafted", "approved", "scheduled", "published"]);

function cleanDraft(value: unknown): Draft {
  if (!value || typeof value !== "object") throw new Error("文案内容无效");
  const input = value as Partial<Draft>;
  const cleanText = (text: unknown, max: number) => String(text || "").trim().slice(0, max);
  const cleanList = (list: unknown, maxItems: number, maxLength: number) => (
    Array.isArray(list) ? list.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems) : []
  );
  const style = input.coverStyle && typeof input.coverStyle === "object" ? input.coverStyle : {};
  const color = (value: unknown, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
  const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T) => (
    options.includes(String(value) as T) ? String(value) as T : fallback
  );
  const draft = {
    title: cleanText(input.title, 80),
    titleOptions: cleanList(input.titleOptions, 5, 80),
    coverEyebrow: cleanText(input.coverEyebrow, 44).toUpperCase(),
    coverTitle: cleanText(input.coverTitle, 30),
    coverSubtitle: cleanText(input.coverSubtitle, 60),
    coverStyle: {
      fontFamily: oneOf(style.fontFamily, ["serif", "sans", "kai", "inter", "noto", "custom"] as const, "serif"),
      eyebrowLogoStyle: oneOf(style.eyebrowLogoStyle, ["plain", "wordmark", "monogram", "editorial"] as const, "plain"),
      eyebrowPosition: oneOf(style.eyebrowPosition, ["top", "middle", "bottom", "custom"] as const, "top"),
      customFontName: cleanText(style.customFontName, 120),
      customFontUrl: typeof style.customFontUrl === "string" && /^\/api\/fonts\/[a-f0-9-]+$/i.test(style.customFontUrl) ? style.customFontUrl : "",
      titleColor: color(style.titleColor, "#ffffff"),
      subtitleColor: color(style.subtitleColor, "#eee9df"),
      overlayColor: color(style.overlayColor, "#121713"),
      overlayOpacity: Math.min(90, Math.max(0, Number(style.overlayOpacity ?? 58))),
      pattern: oneOf(style.pattern, ["none", "frame", "grid", "dots", "corners", "polka", "textile", "gradient", "blue-white-dots", "ad-badge", "ad-ribbon", "editorial-bars", "spotlight"] as const, "frame"),
      patternColor: color(style.patternColor, "#ffffff"),
      titleSize: Math.min(120, Math.max(52, Number(style.titleSize ?? 88))),
      titleOffsetX: Math.min(35, Math.max(-35, Number(style.titleOffsetX ?? 0))),
      titleOffsetY: Math.min(30, Math.max(-30, Number(style.titleOffsetY ?? 0))),
      titleDirection: oneOf(style.titleDirection, ["horizontal", "vertical"] as const, "horizontal"),
      align: oneOf(style.align, ["left", "center"] as const, "left"),
      position: oneOf(style.position, ["top", "middle", "bottom"] as const, "bottom"),
      patternOffsetX: Math.min(25, Math.max(-25, Number(style.patternOffsetX ?? 0))),
      patternOffsetY: Math.min(25, Math.max(-25, Number(style.patternOffsetY ?? 0))),
      patternScale: Math.min(160, Math.max(50, Number(style.patternScale ?? 100))),
      eyebrowX: Math.min(50, Math.max(2, Number(style.eyebrowX ?? 7.6))),
      eyebrowY: Math.min(92, Math.max(2, Number(style.eyebrowY ?? 5.8))),
      eyebrowSize: Math.min(48, Math.max(16, Number(style.eyebrowSize ?? 26))),
      eyebrowOpacity: Math.min(100, Math.max(10, Number(style.eyebrowOpacity ?? 100))),
      showEyebrowLine: typeof style.showEyebrowLine === "boolean" ? style.showEyebrowLine : true,
      subtitleSize: Math.min(54, Math.max(18, Number(style.subtitleSize ?? 28))),
      subtitleOffsetX: Math.min(30, Math.max(-30, Number(style.subtitleOffsetX ?? 0))),
      subtitleOffsetY: Math.min(25, Math.max(-20, Number(style.subtitleOffsetY ?? 0))),
    },
    body: cleanText(input.body, 3000),
    tags: cleanList(input.tags, 12, 24),
    highlights: cleanList(input.highlights, 12, 120),
    riskNotes: cleanList(input.riskNotes, 12, 120),
    coverIndex: Math.max(0, Math.min(11, Number(input.coverIndex) || 0)),
    mode: cleanText(input.mode, 30) || "人工编辑",
  };
  if (!draft.titleOptions.includes(draft.title)) draft.titleOptions = [draft.title, ...draft.titleOptions].filter(Boolean).slice(0, 5);
  while (draft.titleOptions.length < 5) draft.titleOptions.push(`${draft.title}｜备选${draft.titleOptions.length + 1}`);
  if (!draft.title || !draft.coverTitle || !draft.body) throw new Error("标题、封面标题和正文不能为空");
  return draft;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ownerEmail = await requireAccountEmail();
    const { id } = await context.params;
    const projectId = Number(id);
    if (!Number.isInteger(projectId) || projectId < 1) return Response.json({ error: "项目编号无效" }, { status: 400 });
    const payload = await request.json() as { draft?: unknown; status?: string; publishUrl?: string; meta?: { name?: string; location?: string; area?: string; projectType?: string; category?: string; audience?: string; brief?: string } };
    if (payload.status && !validStatuses.has(payload.status)) return Response.json({ error: "项目状态无效" }, { status: 400 });
    if (!payload.status && !payload.draft && !payload.meta) return Response.json({ error: "没有需要更新的项目内容" }, { status: 400 });

    const db = getDb();
    const [existing] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail))).limit(1);
    if (!existing) return Response.json({ error: "项目不存在" }, { status: 404 });

    const draft = payload.draft ? cleanDraft(payload.draft) : JSON.parse(existing.draftJson || "{}");
    const now = new Date().toISOString();
    const status = payload.status || existing.status;
    const cleanMeta = (value: unknown, fallback: string, max: number) => String(value ?? fallback).trim().slice(0, max);
    const allowedCategories = new Set(["商业项目", "住宅项目", "办公项目", "酒店项目", "展厅陈列项目", "其他项目"]);
    const meta = payload.meta;
    const [updated] = await db.update(projects).set({
      name: cleanMeta(meta?.name, existing.name, 80) || existing.name,
      location: cleanMeta(meta?.location, existing.location, 100),
      area: cleanMeta(meta?.area, existing.area, 40),
      projectType: cleanMeta(meta?.projectType, existing.projectType, 80),
      category: meta?.category && allowedCategories.has(meta.category) ? meta.category : existing.category,
      audience: cleanMeta(meta?.audience, existing.audience, 300),
      brief: cleanMeta(meta?.brief, existing.brief, 1500),
      draftJson: JSON.stringify(draft),
      status,
      approvedAt: status === "approved" || status === "scheduled" || status === "published"
        ? existing.approvedAt || now
        : null,
      publishedAt: status === "published" ? now : existing.publishedAt,
      publishUrl: status === "published" ? String(payload.publishUrl || existing.publishUrl || "").trim().slice(0, 500) : existing.publishUrl,
    }).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail))).returning();
    return Response.json({ project: { ...updated, draft } });
  } catch (error) {
    return apiError(error, "项目更新失败");
  }
}

type RuntimeEnv = { PROJECT_MEDIA?: R2Bucket };

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ownerEmail = await requireAccountEmail();
    const { id } = await context.params;
    const projectId = Number(id);
    if (!Number.isInteger(projectId) || projectId < 1) return Response.json({ error: "项目编号无效" }, { status: 400 });

    const db = getDb();
    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail))).limit(1);
    if (!project) return Response.json({ error: "项目不存在或无权删除" }, { status: 404 });

    const images = await db.select().from(projectImages).where(eq(projectImages.projectId, projectId));
    const media = (env as unknown as RuntimeEnv).PROJECT_MEDIA;
    await db.delete(projectImages).where(eq(projectImages.projectId, projectId));
    await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail)));
    if (media) {
      await Promise.allSettled([
        ...images.map((image) => media.delete(image.objectKey)),
        media.delete(`projects/${projectId}/approved-cover.jpg`),
      ]);
    }
    return Response.json({ deleted: true, projectId });
  } catch (error) {
    return apiError(error, "项目删除失败");
  }
}
