const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const collections = {
  projects: "studio_projects",
  settings: "studio_settings",
  research: "studio_research",
};

const now = () => new Date().toISOString();
const owner = () => cloud.getWXContext().OPENID;
const owned = (openId, extra = {}) => ({ ownerOpenId: openId, ...extra });
const clean = (value, max = 500) => String(value || "").trim().slice(0, max);

const defaultSettings = {
  publishTime: "12:00",
  publishCadenceDays: 3,
  researchTime: "09:00",
  requireApproval: true,
  publishMode: "manual",
};

const draftFromProject = (project) => {
  const place = project.location || "项目所在地";
  const area = project.area || "空间";
  const material = project.brief || "自然光、材质与生活动线";
  const title = `${place}${area}，让设计回到真实生活`;
  return {
    title,
    titleOptions: [title, `${area}实景｜克制材质里的松弛感`, `这个空间，把日常需求藏进了细节`],
    coverTitle: "让空间回应生活",
    coverSubtitle: `${place} · ${area}`,
    body: `比起堆叠风格，我们更关注空间如何回应真实生活。\n\n这个项目以${material}为线索，在功能、光线与材质之间建立清晰秩序。每一次行走、停留与收纳，都被纳入整体设计。\n\n好的空间不急着表达，它会在使用之后，慢慢显现价值。`,
    tags: ["室内设计", project.category || "空间设计", "实景案例", "全案设计"],
    coverIndex: 0,
  };
};

async function ensureSettings(openId) {
  const existing = await db.collection(collections.settings).where(owned(openId)).limit(1).get();
  if (existing.data.length) return existing.data[0];
  const data = owned(openId, { ...defaultSettings, updatedAt: now() });
  const created = await db.collection(collections.settings).add({ data });
  return { _id: created._id, ...data };
}

exports.main = async (event) => {
  const openId = owner();
  if (!openId) return { ok: false, error: "无法识别当前微信账户" };
  const action = clean(event.action, 40);

  if (action === "bootstrap") {
    await ensureSettings(openId);
    return { ok: true, account: { id: openId.slice(-8), workspace: "微信独立工作区" } };
  }

  if (action === "listProjects") {
    const result = await db.collection(collections.projects).where(owned(openId)).orderBy("createdAt", "desc").limit(100).get();
    return { ok: true, projects: result.data };
  }

  if (action === "createProject") {
    const project = event.project || {};
    const data = owned(openId, {
      name: clean(project.name, 80) || "未命名项目",
      location: clean(project.location, 80),
      area: clean(project.area, 30),
      category: clean(project.category, 40) || "住宅项目",
      brief: clean(project.brief, 1000),
      images: Array.isArray(project.images) ? project.images.slice(0, 10) : [],
      status: "drafted",
      draft: draftFromProject(project),
      scheduledAt: null,
      approvedAt: null,
      createdAt: now(),
      updatedAt: now(),
    });
    const created = await db.collection(collections.projects).add({ data });
    return { ok: true, project: { _id: created._id, ...data } };
  }

  if (action === "approveProject" || action === "scheduleProject") {
    const projectId = clean(event.projectId, 80);
    const existing = await db.collection(collections.projects).where(owned(openId, { _id: projectId })).limit(1).get();
    if (!existing.data.length) return { ok: false, error: "项目不存在或无权访问" };
    const update = action === "approveProject"
      ? { status: "approved", approvedAt: now(), updatedAt: now() }
      : { status: "scheduled", scheduledAt: clean(event.scheduledAt, 40), updatedAt: now() };
    await db.collection(collections.projects).doc(projectId).update({ data: update });
    return { ok: true };
  }

  if (action === "getSettings") return { ok: true, settings: await ensureSettings(openId) };

  if (action === "saveSettings") {
    const current = await ensureSettings(openId);
    const input = event.settings || {};
    const values = {
      publishTime: /^\d{2}:\d{2}$/.test(input.publishTime) ? input.publishTime : "12:00",
      publishCadenceDays: Math.max(1, Math.min(30, Number(input.publishCadenceDays) || 3)),
      researchTime: /^\d{2}:\d{2}$/.test(input.researchTime) ? input.researchTime : "09:00",
      requireApproval: input.requireApproval !== false,
      publishMode: "manual",
      updatedAt: now(),
    };
    await db.collection(collections.settings).doc(current._id).update({ data: values });
    return { ok: true, settings: { ...current, ...values } };
  }

  if (action === "listResearch") {
    const result = await db.collection(collections.research).where(owned(openId)).orderBy("createdAt", "desc").limit(30).get();
    return { ok: true, references: result.data };
  }

  if (action === "addResearch") {
    const item = event.reference || {};
    const data = owned(openId, {
      title: clean(item.title, 120),
      sourceUrl: clean(item.sourceUrl, 1000),
      note: clean(item.note, 1000),
      createdAt: now(),
    });
    if (!data.title || !/^https:\/\/(www\.)?xiaohongshu\.com\//.test(data.sourceUrl)) {
      return { ok: false, error: "请填写有效的小红书笔记标题与链接" };
    }
    const created = await db.collection(collections.research).add({ data });
    return { ok: true, reference: { _id: created._id, ...data } };
  }

  return { ok: false, error: "不支持的操作" };
};
