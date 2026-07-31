import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { projects } from "../../../../../db/schema";

type RuntimeEnv = { PROJECT_MEDIA?: R2Bucket };

function decodeCover(value: string) {
  const match = value.match(/^data:image\/jpeg;base64,(.+)$/);
  if (!match) throw new Error("封面必须是 JPG 成品图");
  const binary = atob(match[1]);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.byteLength > 12 * 1024 * 1024) throw new Error("封面不能超过 12MB");
  return bytes;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const projectId = Number(id);
    if (!Number.isInteger(projectId) || projectId < 1) {
      return Response.json({ error: "项目编号无效" }, { status: 400 });
    }
    const runtime = env as unknown as RuntimeEnv;
    if (!runtime.PROJECT_MEDIA) throw new Error("项目图片存储暂不可用");
    const payload = await request.json() as { data?: string };
    const bytes = decodeCover(String(payload.data || ""));
    const db = getDb();
    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project) return Response.json({ error: "项目不存在" }, { status: 404 });
    const objectKey = `projects/${projectId}/approved-cover.jpg`;
    await runtime.PROJECT_MEDIA.put(objectKey, bytes, { httpMetadata: { contentType: "image/jpeg" } });
    return Response.json({ saved: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "封面保存失败" }, { status: 500 });
  }
}
