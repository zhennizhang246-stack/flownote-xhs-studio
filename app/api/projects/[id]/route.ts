import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { projects } from "../../../../db/schema";

type Draft = {
  title: string;
  titleOptions?: string[];
  coverTitle: string;
  coverSubtitle: string;
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
  const draft = {
    title: cleanText(input.title, 80),
    titleOptions: cleanList(input.titleOptions, 3, 80),
    coverTitle: cleanText(input.coverTitle, 30),
    coverSubtitle: cleanText(input.coverSubtitle, 60),
    body: cleanText(input.body, 3000),
    tags: cleanList(input.tags, 12, 24),
    highlights: cleanList(input.highlights, 12, 120),
    riskNotes: cleanList(input.riskNotes, 12, 120),
    coverIndex: Math.max(0, Math.min(11, Number(input.coverIndex) || 0)),
    mode: cleanText(input.mode, 30) || "人工编辑",
  };
  if (!draft.titleOptions.includes(draft.title)) draft.titleOptions = [draft.title, ...draft.titleOptions].filter(Boolean).slice(0, 3);
  while (draft.titleOptions.length < 3) draft.titleOptions.push(`${draft.title}｜备选${draft.titleOptions.length + 1}`);
  if (!draft.title || !draft.coverTitle || !draft.body) throw new Error("标题、封面标题和正文不能为空");
  return draft;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const projectId = Number(id);
    if (!Number.isInteger(projectId) || projectId < 1) return Response.json({ error: "项目编号无效" }, { status: 400 });
    const payload = await request.json() as { draft?: unknown; status?: string; publishUrl?: string };
    if (!payload.status || !validStatuses.has(payload.status)) return Response.json({ error: "项目状态无效" }, { status: 400 });

    const db = getDb();
    const [existing] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!existing) return Response.json({ error: "项目不存在" }, { status: 404 });

    const draft = payload.draft ? cleanDraft(payload.draft) : cleanDraft(JSON.parse(existing.draftJson || "{}"));
    const now = new Date().toISOString();
    const status = payload.status;
    const [updated] = await db.update(projects).set({
      draftJson: JSON.stringify(draft),
      status,
      approvedAt: status === "approved" || status === "scheduled" || status === "published"
        ? existing.approvedAt || now
        : null,
      publishedAt: status === "published" ? now : existing.publishedAt,
      publishUrl: status === "published" ? String(payload.publishUrl || existing.publishUrl || "").trim().slice(0, 500) : existing.publishUrl,
    }).where(eq(projects.id, projectId)).returning();
    return Response.json({ project: { ...updated, draft } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "项目更新失败" }, { status: 500 });
  }
}
