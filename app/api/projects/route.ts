import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectImages, projects } from "../../../db/schema";
type UploadedImage = { name?: string; type?: string; data?: string };
type RuntimeEnv = { PROJECT_MEDIA?: R2Bucket };
function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error("仅支持 JPG、PNG 或 WEBP 图片");
  const binary = atob(match[2]); const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (bytes.byteLength > 18 * 1024 * 1024) throw new Error("单张图片不能超过 18MB");
  return { contentType: match[1], bytes };
}
export async function GET() {
  try { const db = getDb(); const rows = await db.select().from(projects).orderBy(desc(projects.createdAt)).limit(30);
    const images = await db.select().from(projectImages);
    return Response.json({ projects: rows.map((row) => ({
      ...row,
      draft: JSON.parse(row.draftJson || "{}"),
      images: images.filter((image) => image.projectId === row.id).sort((a, b) => a.sortOrder - b.sortOrder)
        .map((image) => ({ ...image, url: `/api/media/${image.id}` })),
    })) });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "读取项目失败" }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    const payload = await request.json() as { name?: string; location?: string; area?: string; projectType?: string; category?: string; audience?: string; brief?: string; images?: UploadedImage[] };
    const images = payload.images || []; if (!images.length) return Response.json({ error: "请至少上传一张项目实景图" }, { status: 400 });
    if (images.length > 12) return Response.json({ error: "每个项目最多上传 12 张图片" }, { status: 400 });
    const runtime = env as unknown as RuntimeEnv; if (!runtime.PROJECT_MEDIA) throw new Error("项目图片存储暂不可用"); const db = getDb();
    const allowedCategories = new Set(["商业项目", "住宅项目", "办公项目", "酒店项目", "展厅陈列项目", "其他项目"]);
    const category = allowedCategories.has(payload.category || "") ? payload.category! : "住宅项目";
    const [project] = await db.insert(projects).values({ name: payload.name?.trim() || "未命名项目", location: payload.location?.trim() || "", area: payload.area?.trim() || "", projectType: payload.projectType?.trim() || "", category, audience: payload.audience?.trim() || "", brief: payload.brief?.trim() || "" }).returning();
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index]; const decoded = decodeDataUrl(image.data || ""); const safeName = (image.name || `image-${index + 1}.jpg`).replace(/[^0-9A-Za-z._-]/g, "-"); const objectKey = `projects/${project.id}/${crypto.randomUUID()}-${safeName}`;
      await runtime.PROJECT_MEDIA.put(objectKey, decoded.bytes, { httpMetadata: { contentType: decoded.contentType } });
      await db.insert(projectImages).values({ projectId: project.id, objectKey, fileName: safeName, contentType: decoded.contentType, sortOrder: index });
    }
    const savedImages = await db.select().from(projectImages).where(eq(projectImages.projectId, project.id)); return Response.json({ ...project, images: savedImages }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "项目保存失败" }, { status: 500 }); }
}
