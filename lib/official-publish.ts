import { and, eq, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
import { accountAutomationSettings, projectImages, projects } from "../db/schema";

export type OfficialPublishEnv = {
  DB: D1Database;
  PROJECT_MEDIA?: R2Bucket;
  XHS_OFFICIAL_PUBLISH_ENDPOINT?: string;
  XHS_OFFICIAL_PUBLISH_TOKEN?: string;
  XHS_OFFICIAL_ACCOUNT_ID?: string;
  PRIMARY_OWNER_EMAIL?: string;
};

type Draft = {
  title?: string;
  body?: string;
  tags?: string[];
  coverStyle?: Record<string, unknown>;
};

function officialEndpoint(env: OfficialPublishEnv) {
  if (!env.XHS_OFFICIAL_PUBLISH_ENDPOINT || !env.XHS_OFFICIAL_PUBLISH_TOKEN) {
    throw new Error("小红书官方发布接口尚未完成授权配置");
  }
  const endpoint = new URL(env.XHS_OFFICIAL_PUBLISH_ENDPOINT);
  if (endpoint.protocol !== "https:" || !(endpoint.hostname === "xiaohongshu.com" || endpoint.hostname.endsWith(".xiaohongshu.com"))) {
    throw new Error("官方发布端点必须属于 xiaohongshu.com");
  }
  return endpoint.href;
}

function officialError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as Record<string, unknown>;
  return String(data.message || data.msg || data.error || fallback).slice(0, 300);
}

function publishedUrl(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;
  const nested = data.data && typeof data.data === "object" ? data.data as Record<string, unknown> : {};
  const value = String(data.note_url || data.url || nested.note_url || nested.url || "");
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "xiaohongshu.com" || url.hostname.endsWith(".xiaohongshu.com"))
      ? url.href.slice(0, 500)
      : "";
  } catch {
    return "";
  }
}

export async function publishProjectOfficial(env: OfficialPublishEnv, ownerEmail: string, projectId: number) {
  const endpoint = officialEndpoint(env);
  if (!env.PROJECT_MEDIA) throw new Error("项目图片存储暂不可用");
  const db = drizzle(env.DB, { schema });
  const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail))).limit(1);
  if (!project) throw new Error("项目不存在");
  if (!["approved", "scheduled"].includes(project.status)) throw new Error("项目必须先人工确认后才能提交");
  const draft = JSON.parse(project.draftJson || "{}") as Draft;
  if (!draft.title?.trim() || !draft.body?.trim()) throw new Error("笔记标题或正文为空");
  const images = await db.select().from(projectImages).where(eq(projectImages.projectId, projectId));
  if (!images.length) throw new Error("项目没有可发布的实景图");

  const form = new FormData();
  form.set("title", draft.title.trim().slice(0, 80));
  form.set("content", draft.body.trim().slice(0, 3000));
  form.set("topics", JSON.stringify((draft.tags || []).map((tag) => String(tag).replace(/^#/, "").trim()).filter(Boolean).slice(0, 12)));
  form.set("client_reference_id", `mj-project-${project.id}`);
  form.set("project_metadata", JSON.stringify({
    name: project.name,
    location: project.location,
    area: project.area,
    projectType: project.projectType,
    coverStyle: draft.coverStyle || {},
  }));
  if (env.XHS_OFFICIAL_ACCOUNT_ID) form.set("account_id", env.XHS_OFFICIAL_ACCOUNT_ID);

  const approvedCover = await env.PROJECT_MEDIA.get(`projects/${project.id}/approved-cover.jpg`);
  if (!approvedCover) throw new Error("成品封面尚未保存，请重新确认封面与文案");
  form.append("images", new File([await approvedCover.arrayBuffer()], "cover.jpg", { type: "image/jpeg" }));
  for (const image of images.sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 9)) {
    const object = await env.PROJECT_MEDIA.get(image.objectKey);
    if (!object) continue;
    form.append("images", new File([await object.arrayBuffer()], image.fileName, { type: image.contentType }));
  }

  const [locked] = await db.update(projects).set({ status: "publishing" })
    .where(and(eq(projects.id, project.id), eq(projects.ownerEmail, ownerEmail), inArray(projects.status, ["approved", "scheduled"])))
    .returning({ id: projects.id });
  if (!locked) throw new Error("项目正在提交或状态已发生变化，请刷新后查看");
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${env.XHS_OFFICIAL_PUBLISH_TOKEN}` },
      body: form,
    });
    const text = await response.text();
    let payload: unknown = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
    const code = payload && typeof payload === "object" ? (payload as Record<string, unknown>).code : undefined;
    const acceptedCode = code === undefined || ["0", "200", "success"].includes(String(code).toLowerCase());
    if (!response.ok || !acceptedCode) {
      throw new Error(officialError(payload, `小红书官方接口提交失败（${response.status}）`));
    }
    const now = new Date().toISOString();
    const url = publishedUrl(payload);
    await db.update(projects).set({
      status: "published",
      publishedAt: now,
      publishUrl: url,
    }).where(and(eq(projects.id, project.id), eq(projects.ownerEmail, ownerEmail)));
    return { projectId: project.id, publishedAt: now, publishUrl: url };
  } catch (error) {
    await db.update(projects).set({ status: project.status }).where(and(
      eq(projects.id, project.id),
      eq(projects.ownerEmail, ownerEmail),
      eq(projects.status, "publishing"),
    ));
    throw error;
  }
}

export async function publishDueProjects(env: OfficialPublishEnv, limit = 3) {
  if (!env.XHS_OFFICIAL_PUBLISH_ENDPOINT || !env.XHS_OFFICIAL_PUBLISH_TOKEN || !env.PROJECT_MEDIA) return [];
  const ownerEmail = env.PRIMARY_OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) return [];
  const db = drizzle(env.DB, { schema });
  const [settings] = await db.select().from(accountAutomationSettings).where(eq(accountAutomationSettings.ownerEmail, ownerEmail)).limit(1);
  if (settings?.publishMode !== "official_api") return [];
  const due = await db.select({ id: projects.id }).from(projects)
    .where(and(eq(projects.ownerEmail, ownerEmail), eq(projects.status, "scheduled"), lte(projects.scheduledAt, new Date().toISOString())))
    .limit(Math.min(5, Math.max(1, limit)));
  const results: Array<{ projectId: number; publishedAt?: string; publishUrl?: string; error?: string }> = [];
  for (const item of due) {
    try {
      results.push(await publishProjectOfficial(env, ownerEmail, item.id));
    } catch (error) {
      results.push({ projectId: item.id, error: error instanceof Error ? error.message : "自动提交失败" });
    }
  }
  return results;
}
