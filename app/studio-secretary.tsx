"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Draft = {
  title: string;
  titleOptions: string[];
  coverTitle: string;
  coverSubtitle: string;
  body: string;
  tags: string[];
  highlights: string[];
  riskNotes: string[];
  coverIndex?: number;
  mode?: string;
};
type ProjectMeta = {
  name: string;
  location: string;
  area: string;
  projectType: string;
  category: string;
  audience: string;
  brief: string;
};
type ProjectRecord = ProjectMeta & {
  id: number;
  status: string;
  scheduledAt?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  publishUrl?: string;
  createdAt: string;
  draft?: Partial<Draft>;
  images?: Array<{ id: number; url: string; fileName: string }>;
};
type AutomationSettings = {
  publishTime: string;
  publishCadenceDays: number;
  researchTime: string;
  dailyResearchEnabled: boolean;
  requireApproval: boolean;
  timezone: string;
};
type ResearchReference = {
  id: number;
  researchDate: string;
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
type CustomerMessage = {
  id: number;
  senderName: string;
  message: string;
  sourceUrl: string;
  suggestedReply: string;
  status: "pending" | "replied";
  createdAt: string;
  repliedAt?: string | null;
};
type Tab = "creator" | "assets" | "calendar" | "research" | "service";

const seededImages = Array.from({ length: 7 }, (_, i) => `/projects/warm-wood-home/0${i + 1}.jpg`);
const seededDraft: Draft = {
  title: "温州150m²，把自然搬进日常的家",
  titleOptions: [
    "温州150m²，把自然搬进日常的家",
    "原木与光，住进松弛的四季",
    "150m²自然系住宅的生活秩序",
  ],
  coverTitle: "住进自然里",
  coverSubtitle: "浙江温州 · 150m² 木质住宅",
  body: "比起堆叠风格，我们更想让这个家拥有接近自然的呼吸感。\n\n从玄关开始，温润木色一路延伸到客餐厅、厨房与卧室。克制的材质关系让光影成为空间里真正的主角；绿植、框景与大面积留白，则把四季变化悄悄带进日常。\n\n开放的客餐厅让家人自然聚拢，厨房岛台承接备餐与交流，洗衣房和衣帽间把功能收进秩序里。设计没有刻意制造视觉喧哗，而是在每一次行走、停留与收纳中，留下松弛。\n\n好的住宅不急着表达，它会在住进去之后，慢慢回应生活。",
  tags: ["温州室内设计", "原木风", "自然系住宅", "住宅设计", "全案设计", "实景案例"],
  highlights: ["木质天花延续空间秩序", "客餐厅一体化社交动线", "自然框景与柔和照明", "完整家政与收纳系统"],
  riskNotes: ["项目名称、客户需求和具体材料品牌待确认"],
  coverIndex: 1,
  mode: "案例预览",
};
const initialMeta: ProjectMeta = {
  name: "栖光木境",
  location: "浙江 · 温州",
  area: "150m²",
  projectType: "住宅空间",
  category: "住宅项目",
  audience: "重视自然、松弛感与收纳秩序的改善型家庭",
  brief: "温润木质、自然光与绿意贯穿全屋；客餐厅一体，包含厨房、家政、卧室、衣帽间与卫浴。",
};
const defaultSettings: AutomationSettings = {
  publishTime: "12:00",
  publishCadenceDays: 3,
  researchTime: "09:00",
  dailyResearchEnabled: true,
  requireApproval: true,
  timezone: "Asia/Shanghai",
};
const navItems: Array<{ id: Tab; number: string; label: string }> = [
  { id: "creator", number: "01", label: "创作工作台" },
  { id: "assets", number: "02", label: "项目资产库" },
  { id: "calendar", number: "03", label: "发布日历" },
  { id: "research", number: "04", label: "流量参考" },
  { id: "service", number: "05", label: "小红书客服" },
];
const projectCategories = ["全部项目", "商业项目", "住宅项目", "办公项目", "酒店项目", "展厅陈列项目", "其他项目"];
const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});
const localDate = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const dateTimeInput = (date: Date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};
const nextSlot = (settings: AutomationSettings) => {
  const next = new Date();
  next.setDate(next.getDate() + settings.publishCadenceDays);
  const [hours, minutes] = settings.publishTime.split(":").map(Number);
  next.setHours(hours, minutes, 0, 0);
  return dateTimeInput(next);
};
const statusLabels: Record<string, string> = {
  uploaded: "已入库",
  drafted: "文案已生成",
  approved: "已人工确认",
  scheduled: "已排期",
  published: "已发布",
};
const XHS_PUBLISH_URL = "https://creator.xiaohongshu.com/publish/publish?source=official&from=tab_switch";

function localFallback(meta: ProjectMeta): Draft {
  const location = meta.location || "项目所在地待确认";
  const area = meta.area || "面积待确认";
  return {
    title: `${location}${area}，让自然成为家的底色`,
    titleOptions: [
      `${location}${area}，让自然成为家的底色`,
      "从光线与材质开始设计一个家",
      "克制留白，让居住回到松弛日常",
    ],
    coverTitle: "让家自然生长",
    coverSubtitle: `${location} · ${area} ${meta.projectType || "空间设计"}`,
    body: `这个项目从真实的居住感受出发，而不是先定义一种风格。\n\n${meta.brief || "我们从光线、材质、动线与收纳重新梳理空间。"}\n\n画面里的材质、自然光和克制留白共同构成温和的空间秩序。功能被收进日常动线里，人在其中可以更松弛地停留、交流和生活。\n\n如果你也在寻找适合自己的居住方式，欢迎带着户型与需求来聊聊。`,
    tags: ["室内设计", "住宅设计", "实景案例", "全案设计", "自然系住宅", "设计工作室"],
    highlights: ["从上传图片提取视觉基调", "依据画面选择竖版封面", "正文避免虚构未知项目事实"],
    riskNotes: ["当前为本地视觉预览；连接 AI 后可完成多图语义分析"],
    coverIndex: 0,
    mode: "本地视觉预览",
  };
}

export function StudioSecretary() {
  const [activeTab, setActiveTab] = useState<Tab>("creator");
  const [meta, setMeta] = useState(initialMeta);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState(seededImages);
  const [draft, setDraft] = useState<Draft>(seededDraft);
  const [phase, setPhase] = useState<"ready" | "uploading" | "analyzing" | "done">("ready");
  const [notice, setNotice] = useState("示例已就绪，可替换图片重新生成");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [settings, setSettings] = useState<AutomationSettings>(defaultSettings);
  const [references, setReferences] = useState<ResearchReference[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<number, string>>({});
  const [settingsNotice, setSettingsNotice] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchNotice, setResearchNotice] = useState("");
  const [assetCategory, setAssetCategory] = useState("全部项目");
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [messageForm, setMessageForm] = useState({ senderName: "", message: "", sourceUrl: "" });
  const [serviceNotice, setServiceNotice] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");

  const coverImage = previews[draft.coverIndex ?? 0] || seededImages[0];
  const phaseLabel = {
    ready: "等待项目",
    uploading: "整理项目资产",
    analyzing: "分析空间与生成内容",
    done: "封面与文案已完成",
  }[phase];
  const facts = useMemo(
    () => [meta.location || "地点待确认", meta.area || "面积待确认", meta.projectType || "空间类型待确认"],
    [meta],
  );
  const scheduledProjects = projects.filter((project) => project.scheduledAt)
    .sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt)));
  const visibleProjects = assetCategory === "全部项目"
    ? projects
    : projects.filter((project) => project.category === assetCategory);

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const [projectResponse, settingsResponse, researchResponse, serviceResponse] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/settings"),
          fetch("/api/research"),
          fetch("/api/customer-service"),
        ]);
        const projectPayload = projectResponse.ok ? await projectResponse.json() as { projects: ProjectRecord[] } : { projects: [] };
        const settingsPayload = settingsResponse.ok ? await settingsResponse.json() as { settings: AutomationSettings } : { settings: defaultSettings };
        const researchPayload = researchResponse.ok ? await researchResponse.json() as { references: ResearchReference[] } : { references: [] };
        const servicePayload = serviceResponse.ok ? await serviceResponse.json() as { messages: CustomerMessage[] } : { messages: [] };
        setProjects(projectPayload.projects);
        setSettings(settingsPayload.settings);
        setReferences(researchPayload.references);
        setMessages(servicePayload.messages);
        setScheduleDrafts(Object.fromEntries(projectPayload.projects.map((project) => [
          project.id,
          project.scheduledAt ? dateTimeInput(new Date(project.scheduledAt)) : nextSlot(settingsPayload.settings),
        ])));
        const nowTime = new Date().toLocaleTimeString("zh-CN", {
          timeZone: "Asia/Shanghai",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const missingToday = !researchPayload.references.some((reference) => reference.researchDate === localDate());
        if (settingsPayload.settings.dailyResearchEnabled && missingToday && nowTime >= settingsPayload.settings.researchTime) {
          void runResearch(false);
        }
      } catch {
        setSettingsNotice("云端资料暂未加载，仍可使用当前创作预览");
      }
    }
    void loadWorkspace();
    // Initial workspace hydration runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateMeta = (key: keyof ProjectMeta, value: string) => setMeta((current) => ({ ...current, [key]: value }));
  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(event.target.files || []);
    if (!next.length) return;
    setFiles(next);
    setPreviews(next.map((file) => URL.createObjectURL(file)));
    setNotice(`已接收 ${next.length} 张项目实景图，将保存到资产库`);
    setPhase("ready");
  };

  async function refreshProjects() {
    const response = await fetch("/api/projects");
    if (!response.ok) return;
    const payload = await response.json() as { projects: ProjectRecord[] };
    setProjects(payload.projects);
    setScheduleDrafts((current) => Object.fromEntries(payload.projects.map((project) => [
      project.id,
      current[project.id] || (project.scheduledAt ? dateTimeInput(new Date(project.scheduledAt)) : nextSlot(settings)),
    ])));
  }

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    setPhase(files.length ? "uploading" : "analyzing");
    setNotice(files.length ? "正在上传并建立项目资产档案…" : "正在重新分析示例项目…");
    if (!files.length) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setDraft(seededDraft);
      setPhase("done");
      setNotice("已依据 7 张实景图生成封面与原创文案");
      return;
    }
    try {
      const images = await Promise.all(files.map(async (file) => ({
        name: file.name,
        type: file.type || "image/jpeg",
        data: await toDataUrl(file),
      })));
      const saved = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...meta, images }),
      });
      if (!saved.ok) throw new Error("项目资产暂时无法保存");
      const project = await saved.json() as { id: number };
      setCurrentProjectId(project.id);
      setScheduleDrafts((current) => ({ ...current, [project.id]: nextSlot(settings) }));
      setPhase("analyzing");
      setNotice("秘书正在识别空间、材质、灯光与画面重点…");
      const generated = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (!generated.ok) {
        const error = await generated.json() as { error?: string };
        throw new Error(error.error || "AI 生成暂不可用");
      }
      const result = await generated.json() as { draft: Draft };
      setDraft(result.draft);
      setPhase("done");
      setNotice("已完成封面与原创文案，并归档到项目资产库");
      await refreshProjects();
    } catch (error) {
      setDraft(localFallback(meta));
      setPhase("done");
      setNotice(`${error instanceof Error ? error.message : "AI 暂不可用"}，已生成本地预览`);
    }
  }

  async function saveSettings() {
    setSettingsNotice("正在保存自动工作节奏…");
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      const error = await response.json() as { error?: string };
      setSettingsNotice(error.error || "设置保存失败");
      return;
    }
    setSettingsNotice(`已保存：每 ${settings.publishCadenceDays} 天 ${settings.publishTime} 排期，每日 ${settings.researchTime} 收集参考`);
  }

  async function scheduleProject(projectId: number) {
    const scheduledAt = scheduleDrafts[projectId] || nextSlot(settings);
    const response = await fetch(`/api/projects/${projectId}/schedule`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() }),
    });
    if (!response.ok) {
      const error = await response.json() as { error?: string };
      setNotice(error.error || "排期保存失败");
      return;
    }
    setNotice("项目已加入发布日历，发布前会保留人工确认");
    await refreshProjects();
  }

  function loadProject(project: ProjectRecord) {
    setCurrentProjectId(project.id);
    setMeta({
      name: project.name,
      location: project.location,
      area: project.area,
      projectType: project.projectType,
      category: project.category || "住宅项目",
      audience: project.audience,
      brief: project.brief,
    });
    setDraft({ ...seededDraft, ...project.draft, titleOptions: project.draft?.titleOptions?.length === 3 ? project.draft.titleOptions : [project.draft?.title || seededDraft.title, ...seededDraft.titleOptions.filter((title) => title !== project.draft?.title)].slice(0, 3), tags: project.draft?.tags || [], highlights: project.draft?.highlights || [], riskNotes: project.draft?.riskNotes || [] });
    setPreviews(project.images?.map((image) => image.url) || []);
    setFiles([]);
    setPhase("done");
    setNotice(`已打开「${project.name}」，可继续编辑封面与文案`);
    setActiveTab("creator");
  }

  async function saveProject(status: "drafted" | "approved" | "published", publishUrl = "") {
    if (!currentProjectId) {
      setNotice("示例项目不会写入资产库，请先上传实景图并生成正式项目");
      return false;
    }
    const response = await fetch(`/api/projects/${currentProjectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draft: { ...draft, mode: "人工编辑" }, status, publishUrl }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setNotice(payload.error || "保存失败");
      return false;
    }
    setNotice(status === "approved" ? "封面与文案已人工确认，可随时发布或加入三天队列" : status === "published" ? "已记录为发布完成" : "编辑内容已保存到项目资产库");
    setLastSyncedAt(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
    await refreshProjects();
    return true;
  }

  async function publishNow() {
    if (!currentProjectId) {
      setNotice("请先上传图片并生成正式项目，再进入发布流程");
      return;
    }
    const publishWindow = window.open(XHS_PUBLISH_URL, "_blank", "noopener,noreferrer");
    const approved = await saveProject("approved");
    if (!approved) {
      publishWindow?.close();
      return;
    }
    const copy = `${draft.title}\n\n${draft.body}\n\n${draft.tags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}`;
    try {
      await navigator.clipboard.writeText(copy);
      setNotice("已确认并复制完整文案；官方小红书发布页已打开，请上传所选项目图片后发布");
    } catch {
      setNotice("已确认内容并打开官方小红书发布页；请从编辑区复制文案后发布");
    }
  }

  async function approveAndSchedule() {
    if (!currentProjectId) {
      setNotice("请先上传图片并生成正式项目");
      return;
    }
    if (await saveProject("approved")) await scheduleProject(currentProjectId);
  }

  async function markPublished(project: ProjectRecord) {
    const publishUrl = window.prompt("可选：粘贴已发布的小红书笔记链接，便于后续复盘", "") || "";
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draft: project.draft, status: "published", publishUrl }),
    });
    if (!response.ok) {
      const payload = await response.json() as { error?: string };
      setNotice(payload.error || "发布记录保存失败");
      return;
    }
    setNotice(`「${project.name}」已记录为发布完成`);
    await refreshProjects();
  }

  async function runResearch(force: boolean) {
    if (researching) return;
    setResearching(true);
    setResearchNotice("正在检索公开高热室内设计内容并解析…");
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const payload = await response.json() as { references?: ResearchReference[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "每日研究失败");
      const latest = payload.references || [];
      setReferences((current) => [...latest, ...current.filter((item) => item.researchDate !== localDate())]);
      setResearchNotice(`今日 3 条参考已完成：只提炼结构与视觉规律，不复制原文`);
    } catch (error) {
      setResearchNotice(error instanceof Error ? error.message : "每日研究失败");
    } finally {
      setResearching(false);
    }
  }

  async function saveCustomerMessage() {
    setServiceNotice("正在保存留言并生成合规回复…");
    const response = await fetch("/api/customer-service", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(messageForm),
    });
    const payload = await response.json() as { message?: CustomerMessage; error?: string };
    if (!response.ok || !payload.message) {
      setServiceNotice(payload.error || "留言保存失败");
      return;
    }
    setMessages((current) => [payload.message!, ...current]);
    setMessageForm({ senderName: "", message: "", sourceUrl: "" });
    setServiceNotice("留言已归档，已生成站内合规回复建议");
  }

  async function copyServiceReply(item: CustomerMessage) {
    try {
      await navigator.clipboard.writeText(item.suggestedReply);
      setServiceNotice(`已复制给「${item.senderName}」的回复，请在小红书站内人工确认发送`);
    } catch {
      setServiceNotice("无法自动复制，请手动选中回复内容");
    }
  }

  async function markMessageReplied(item: CustomerMessage) {
    const response = await fetch("/api/customer-service", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, status: "replied" }),
    });
    if (!response.ok) {
      setServiceNotice("客服状态更新失败");
      return;
    }
    setMessages((current) => current.map((message) => message.id === item.id ? { ...message, status: "replied" } : message));
    setServiceNotice(`「${item.senderName}」已标记为已回复`);
  }

  const creatorView = <div className="content-grid">
    <section className="creator-card">
      <div className="section-heading"><div><span>PROJECT INTAKE</span><h2>交给秘书一个新项目</h2></div><span className="counter">{files.length || 7} 张实景图</span></div>
      <form onSubmit={handleGenerate}>
        <label className="upload-zone"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFiles}/><div className="upload-icon">＋</div><strong>上传项目实景图</strong><span>图片将存入项目资产库，可安排未来任意时间发布</span></label>
        <div className="thumb-strip">{previews.slice(0, 7).map((image, index) => <button type="button" className={index === (draft.coverIndex ?? 0) ? "thumb selected" : "thumb"} key={`${image}-${index}`} onClick={() => setDraft((current) => ({ ...current, coverIndex: index }))} aria-label={`选择第 ${index + 1} 张作为封面`}><img src={image} alt=""/></button>)}</div>
        <div className="form-grid">
          <label className="wide"><span>项目名称</span><input value={meta.name} onChange={(event) => updateMeta("name", event.target.value)}/></label>
          <label><span>所在地</span><input value={meta.location} onChange={(event) => updateMeta("location", event.target.value)}/></label>
          <label><span>项目面积</span><input value={meta.area} onChange={(event) => updateMeta("area", event.target.value)}/></label>
          <label><span>资产库分区</span><select value={meta.category} onChange={(event) => updateMeta("category", event.target.value)}>{projectCategories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><span>空间类型</span><input value={meta.projectType} onChange={(event) => updateMeta("projectType", event.target.value)}/></label>
          <label><span>目标客户</span><input value={meta.audience} onChange={(event) => updateMeta("audience", event.target.value)}/></label>
          <label className="wide"><span>已知设计信息</span><textarea value={meta.brief} onChange={(event) => updateMeta("brief", event.target.value)}/></label>
        </div>
        <button className="primary-action" disabled={phase === "uploading" || phase === "analyzing"}><span>{phase === "analyzing" ? "正在分析…" : "保存项目并生成封面与文案"}</span><span>→</span></button>
        <p className="notice">{notice}</p>
      </form>
    </section>
    <section className="preview-panel">
      <div className="section-heading compact"><div><span>LIVE PREVIEW</span><h2>发布预览</h2></div><span className="mode-label">{draft.mode || "AI 分析"}</span></div>
      <div className="phone-frame"><div className="cover-preview"><img src={coverImage} alt="项目封面预览"/><div className="cover-shade"/><span className="cover-eyebrow">ORIGINAL DESIGN · RESIDENCE</span><div className="cover-copy"><h3>{draft.coverTitle}</h3><p>{draft.coverSubtitle}</p></div><span className="page-count">01 / {previews.length}</span></div></div>
      <div className="publish-actions">
        <button className="secondary-action" onClick={() => void publishNow()}>确认并打开小红书发布页</button>
        <button className="queue-action" onClick={() => void approveAndSchedule()}>确认并加入三天队列</button>
        <button className="icon-action" onClick={() => void saveProject("drafted")} aria-label="保存到项目资产库">保存到资产库</button>
      </div>
    </section>
    <section className="editorial-card editor-mode">
      <div className="editorial-title"><span>EDITABLE COPY</span><label><small>已选择的笔记标题</small><textarea value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}/></label><div className="fact-row">{facts.map((fact) => <span key={fact}>{fact}</span>)}</div></div>
      <div className="copy-column">
        <div className="title-options"><small>3 个标题方案 · 点击选择</small>{draft.titleOptions.map((title, index) => <button className={draft.title === title ? "active" : ""} key={`${title}-${index}`} onClick={() => setDraft((current) => ({ ...current, title }))}><span>0{index + 1}</span>{title}<em>{draft.title === title ? "已选择" : "选择"}</em></button>)}</div>
        <label><small>封面主标题</small><input value={draft.coverTitle} onChange={(event) => setDraft((current) => ({ ...current, coverTitle: event.target.value }))}/></label>
        <label><small>封面副标题</small><input value={draft.coverSubtitle} onChange={(event) => setDraft((current) => ({ ...current, coverSubtitle: event.target.value }))}/></label>
        <label><small>正文</small><textarea className="body-editor" value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}/></label>
        <label><small>话题标签（用逗号或空格分隔）</small><input value={draft.tags.join("，")} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value.split(/[，,\s#]+/).filter(Boolean).slice(0, 12) }))}/></label>
        <div className="editor-actions"><button onClick={() => void saveProject("drafted")}>保存到资产库</button><button className="approve-action" onClick={() => void saveProject("approved")}>确认并同步保存</button><button onClick={() => void approveAndSchedule()}>确认并加入三天队列</button></div>
        <p className="sync-state">{lastSyncedAt ? `✓ 已于 ${lastSyncedAt} 同步更新到项目资产库` : "确认后会同步更新封面、标题、正文与标签，并保存到项目资产库"}</p>
      </div>
      <div className="analysis-column"><div><span className="mini-heading">图片分析要点</span><ul>{draft.highlights.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="risk-box"><span>发布前确认</span>{draft.riskNotes.map((note) => <p key={note}>{note}</p>)}</div></div>
    </section>
  </div>;

  const assetView = <section className="dashboard-card">
    <div className="section-heading"><div><span>PROJECT ASSET LIBRARY</span><h2>项目资产库</h2><p>所有实景图、项目信息、生成文案与排期都按项目长期保存。</p></div><button className="small-action" onClick={() => setActiveTab("creator")}>＋ 新建项目</button></div>
    <div className="category-tabs">{projectCategories.map((category) => <button className={assetCategory === category ? "active" : ""} key={category} onClick={() => setAssetCategory(category)}>{category}<span>{category === "全部项目" ? projects.length : projects.filter((project) => project.category === category).length}</span></button>)}</div>
    <div className="asset-grid">
      <article className="asset-card featured"><img src={seededImages[1]} alt="温州150平方米住宅"/><div><span className="state-pill">示例项目</span><h3>栖光木境</h3><p>浙江 · 温州　150m²　住宅空间</p><small>7 张实景图 · 已生成封面与文案</small></div></article>
      {visibleProjects.map((project) => <article className="asset-card" key={project.id}>
        {project.images?.[0] ? <img src={project.images[0].url} alt={project.name}/> : <div className="asset-placeholder">栖</div>}
        <div><span className={`state-pill ${project.status}`}>{statusLabels[project.status] || project.status}</span><h3>{project.name}</h3><p>{project.location || "地点待补充"}　{project.area || "面积待补充"}</p><small>{project.images?.length || 0} 张实景图 · {project.scheduledAt ? new Date(project.scheduledAt).toLocaleString("zh-CN") : "尚未排期"}</small><div className="asset-actions"><button onClick={() => loadProject(project)}>打开编辑</button>{["approved", "scheduled"].includes(project.status) && <button onClick={() => void markPublished(project)}>标记已发布</button>}</div></div>
      </article>)}
      {!visibleProjects.length && <div className="empty-state"><strong>{assetCategory}暂无项目</strong><p>在创作工作台上传图片并选择对应分区，项目会自动归档到这里。</p></div>}
    </div>
  </section>;

  const calendarView = <div className="calendar-layout">
    <section className="dashboard-card settings-card">
      <div className="section-heading"><div><span>AUTOMATION SETTINGS</span><h2>自动工作节奏</h2><p>所有时间均按北京时间执行，可随时修改。</p></div><span className="counter">Asia / Shanghai</span></div>
      <div className="settings-grid">
        <label><span>默认发布时间</span><input type="time" value={settings.publishTime} onChange={(event) => setSettings((current) => ({ ...current, publishTime: event.target.value }))}/></label>
        <label><span>发布间隔</span><div className="number-control"><input type="number" min="1" max="30" value={settings.publishCadenceDays} onChange={(event) => setSettings((current) => ({ ...current, publishCadenceDays: Number(event.target.value) }))}/><em>天</em></div></label>
        <label><span>每日参考收集时间</span><input type="time" value={settings.researchTime} onChange={(event) => setSettings((current) => ({ ...current, researchTime: event.target.value }))}/></label>
        <label className="toggle-row"><span>每日自动研究</span><input type="checkbox" checked={settings.dailyResearchEnabled} onChange={(event) => setSettings((current) => ({ ...current, dailyResearchEnabled: event.target.checked }))}/></label>
        <label className="toggle-row wide"><span>发布前保留人工确认</span><input type="checkbox" checked={settings.requireApproval} onChange={(event) => setSettings((current) => ({ ...current, requireApproval: event.target.checked }))}/></label>
      </div>
      <button className="primary-action settings-save" onClick={() => void saveSettings()}><span>保存自动配置</span><span>→</span></button>
      <p className="notice">{settingsNotice || "系统每三天准备一条已确认内容并提醒发布；正式发布通过小红书官方创作服务平台完成。"}</p>
    </section>
    <section className="dashboard-card queue-card">
      <div className="section-heading"><div><span>PUBLISH QUEUE</span><h2>项目发布日历</h2><p>仅人工确认后的内容可排期；到期后进入官方发布交接流程。</p></div><span className="counter">{scheduledProjects.length} 个已排期</span></div>
      <div className="queue-list">
        {projects.map((project) => <div className="queue-item" key={project.id}>
          <div className="queue-project">{project.images?.[0] ? <img src={project.images[0].url} alt=""/> : <span>{project.name.slice(0, 1)}</span>}<div><strong>{project.name}</strong><small>{project.location} · {project.area}</small></div></div>
          <input type="datetime-local" value={scheduleDrafts[project.id] || nextSlot(settings)} onChange={(event) => setScheduleDrafts((current) => ({ ...current, [project.id]: event.target.value }))}/>
          <button onClick={() => void scheduleProject(project.id)}>{project.scheduledAt ? "更新排期" : project.status === "approved" ? "加入日历" : "先确认"}</button>
        </div>)}
        {!projects.length && <div className="empty-state"><strong>还没有可排期项目</strong><p>先在创作工作台上传项目实景图，项目会自动进入这里。</p></div>}
      </div>
    </section>
  </div>;

  const researchView = <section className="dashboard-card">
    <div className="section-heading"><div><span>DAILY CONTENT INTELLIGENCE</span><h2>每日 3 篇小红书高热参考解析</h2><p>来源严格限定为小红书笔记详情页，只研究选题、封面和叙事规律，为未来项目生成原创内容。</p></div><button className="small-action" disabled={researching} onClick={() => void runResearch(true)}>{researching ? "正在研究…" : "刷新今日 3 篇"}</button></div>
    <div className="research-summary"><div><strong>{settings.researchTime}</strong><span>每日自动收集</span></div><div><strong>3 篇</strong><span>室内设计高热参考</span></div><div><strong>原创</strong><span>只提炼规律，不复制原文</span></div></div>
    <p className="research-notice">{researchNotice || `最近研究日：${references[0]?.researchDate || "等待首次收集"}`}</p>
    <div className="research-grid">
      {references.map((reference, index) => <article className="research-card" key={reference.id}>
        <div className={`research-cover tone-${index % 3}`}><span>REFERENCE {String((index % 3) + 1).padStart(2, "0")}</span><strong>{reference.title}</strong><small>{reference.author || "公开来源"}</small></div>
        <div className="metric-row"><span>赞 {reference.likes || "待核实"}</span><span>藏 {reference.saves || "待核实"}</span><span>评 {reference.comments || "待核实"}</span><em>{reference.metricConfidence === "verified" ? "已核实" : "估算信号"}</em></div>
        <div className="research-analysis"><h3>文案结构</h3><p>{reference.copyAnalysis}</p><h3>封面规律</h3><p>{reference.coverAnalysis}</p><h3>可复用方法</h3><p>{reference.reusablePattern}</p></div>
        <div className="source-row"><span>{reference.metricsNote}</span><a href={reference.sourceUrl} target="_blank" rel="noreferrer">查看原始来源 ↗</a></div>
      </article>)}
      {!references.length && <div className="empty-state research-empty"><strong>今日研究尚未生成</strong><p>点击“刷新今日 3 篇”，秘书会检索公开高热室内设计内容并建立分析档案。</p><button onClick={() => void runResearch(false)}>开始今日研究</button></div>}
    </div>
  </section>;

  const serviceView = <div className="service-layout">
    <section className="dashboard-card service-intake">
      <div className="section-heading"><div><span>CUSTOMER SERVICE</span><h2>小红书客服助手</h2><p>集中整理客户留言，生成站内合规回复，人工确认后发送。</p></div><a className="small-action service-link" href="https://creator.xiaohongshu.com/" target="_blank" rel="noreferrer">打开小红书后台 ↗</a></div>
      <div className="integration-warning"><strong>当前为人工交接模式</strong><p>尚未连接小红书官方消息 API，平台不会伪造或自动抓取私信。请从官方后台查看留言并粘贴到这里。</p></div>
      <div className="service-form">
        <label><span>客户昵称</span><input value={messageForm.senderName} onChange={(event) => setMessageForm((current) => ({ ...current, senderName: event.target.value }))} placeholder="例如：温州小林"/></label>
        <label><span>小红书留言或私信</span><textarea value={messageForm.message} onChange={(event) => setMessageForm((current) => ({ ...current, message: event.target.value }))} placeholder="粘贴客户原始留言"/></label>
        <label><span>来源链接（可选）</span><input value={messageForm.sourceUrl} onChange={(event) => setMessageForm((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="小红书笔记或用户页面链接"/></label>
        <button className="primary-action" onClick={() => void saveCustomerMessage()}><span>归档留言并生成回复</span><span>→</span></button>
      </div>
      <div className="blocked-template"><span>高风险站外导流模板 · 已禁用自动发送</span><code>✨vx：LIKE-MJ0666666</code><p>小红书官方规则将直接展示微信号等联系方式列为联系方式导流，可能影响账号流量或权限。</p></div>
      <p className="notice">{serviceNotice}</p>
    </section>
    <section className="dashboard-card service-inbox">
      <div className="section-heading"><div><span>MESSAGE INBOX</span><h2>客户留言箱</h2><p>先理解客户需求，再发送有帮助的站内回复。</p></div><span className="counter">{messages.filter((item) => item.status === "pending").length} 条待回复</span></div>
      <div className="message-list">
        {messages.map((item) => <article className={`message-card ${item.status}`} key={item.id}>
          <div className="message-meta"><div><strong>{item.senderName}</strong><small>{new Date(item.createdAt).toLocaleString("zh-CN")}</small></div><span>{item.status === "replied" ? "已回复" : "待回复"}</span></div>
          <blockquote>{item.message}</blockquote>
          <div className="reply-suggestion"><small>建议回复</small><p>{item.suggestedReply}</p></div>
          <div className="message-actions"><button onClick={() => void copyServiceReply(item)}>复制合规回复</button><button onClick={() => void markMessageReplied(item)} disabled={item.status === "replied"}>{item.status === "replied" ? "已完成" : "标记已回复"}</button>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">查看来源 ↗</a>}</div>
        </article>)}
        {!messages.length && <div className="empty-state"><strong>还没有客服留言</strong><p>从小红书官方后台复制客户留言到左侧，平台会自动建立待回复记录。</p></div>}
      </div>
    </section>
  </div>;

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">栖</span><div><strong>栖作</strong><small>STUDIO SECRETARY</small></div></div>
      <nav>{navItems.map((item) => <button className={activeTab === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => setActiveTab(item.id)}><span>{item.number}</span>{item.label}</button>)}</nav>
      <div className="cadence-card copyright-card"><small>©2026</small><strong>由 MJ 制作</strong><p>网站平台</p></div>
      <p className="sidebar-note">图片、事实、排期与参考均按项目归档。正式发布前保留人工确认。</p>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><p className="kicker">XIAOHONGSHU CREATIVE SERVICE</p><h1>小红书创作服务平台</h1></div><div className="topbar-actions"><span className={`status-chip ${phase}`}>{phaseLabel}</span><a className="avatar" href="https://www.xiaohongshu.com/user/profile/60f6318b0000000001015907" target="_blank" rel="noreferrer" aria-label="打开小红书账户">ZS</a></div></header>
      {activeTab === "creator" && creatorView}
      {activeTab === "assets" && assetView}
      {activeTab === "calendar" && calendarView}
      {activeTab === "research" && researchView}
      {activeTab === "service" && serviceView}
    </section>
  </main>;
}
