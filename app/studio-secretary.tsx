"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type Draft = {
  title: string;
  titleOptions: string[];
  coverTitle: string;
  coverSubtitle: string;
  coverStyle?: CoverStyle;
  body: string;
  tags: string[];
  highlights: string[];
  riskNotes: string[];
  coverIndex?: number;
  mode?: string;
};
type CoverStyle = {
  fontFamily: "serif" | "sans" | "kai";
  titleColor: string;
  subtitleColor: string;
  overlayColor: string;
  overlayOpacity: number;
  pattern: "none" | "frame" | "grid" | "dots" | "corners";
  patternColor: string;
  titleSize: number;
  align: "left" | "center";
  position: "top" | "middle" | "bottom";
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
  publishMode: "manual" | "official_api";
  officialApiConnected: boolean;
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
  autoReplyEligible?: boolean;
};
type BrowserResearchCandidate = {
  sourceUrl: string;
  title: string;
  author?: string;
  likesText?: string;
  coverUrl?: string;
  coverAlt?: string;
  cardText?: string;
};
type XhsBridgeDraft = {
  version: 2;
  projectId: number;
  projectName: string;
  title: string;
  body: string;
  tags: string[];
  coverDataUrl: string;
  images: Array<{ url: string; fileName: string }>;
  publishAction: "prefill" | "auto_publish";
  authorization?: {
    confirmedAt: string;
    expiresAt: string;
    nonce: string;
  };
  createdAt: string;
};
type Tab = "creator" | "assets" | "calendar" | "research" | "service";

const seededImages = Array.from({ length: 7 }, (_, i) => `/projects/warm-wood-home/0${i + 1}.jpg`);
const defaultCoverStyle: CoverStyle = {
  fontFamily: "serif",
  titleColor: "#ffffff",
  subtitleColor: "#eee9df",
  overlayColor: "#121713",
  overlayOpacity: 58,
  pattern: "frame",
  patternColor: "#ffffff",
  titleSize: 88,
  align: "left",
  position: "bottom",
};
const seededDraft: Draft = {
  title: "温州150m²，把自然搬进日常的家",
  titleOptions: [
    "温州150m²，把自然搬进日常的家",
    "原木与光，住进松弛的四季",
    "150m²自然系住宅的生活秩序",
  ],
  coverTitle: "住进自然里",
  coverSubtitle: "浙江温州 · 150m² 木质住宅",
  coverStyle: defaultCoverStyle,
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
  publishMode: "manual",
  officialApiConnected: false,
  timezone: "Asia/Shanghai",
};
const navItems: Array<{ id: Tab; number: string; label: string }> = [
  { id: "creator", number: "01", label: "创作工作台" },
  { id: "assets", number: "02", label: "项目资产库" },
  { id: "calendar", number: "03", label: "发布日历" },
  { id: "research", number: "04", label: "流量参考" },
  { id: "service", number: "05", label: "笔记评论秘书" },
];
const projectCategories = ["全部项目", "商业项目", "住宅项目", "办公项目", "酒店项目", "展厅陈列项目", "其他项目"];
const MAX_PROJECT_IMAGES = 10;
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
const XHS_PUBLISH_URL = "https://creator.xiaohongshu.com/publish/publish?source=official&from=menu&target=image";
const XHS_BRIDGE_SOURCE = "mj-xhs-studio";
const XHS_BRIDGE_EXTENSION_URL = "/downloads/mj-xhs-draft-bridge.zip";
const coverFontStacks: Record<CoverStyle["fontFamily"], string> = {
  serif: 'Georgia, "Songti SC", serif',
  sans: 'system-ui, "Microsoft YaHei", sans-serif',
  kai: '"KaiTi", "STKaiti", serif',
};

function normalizedCoverStyle(value?: Partial<CoverStyle>): CoverStyle {
  const color = (candidate: unknown, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(candidate || "")) ? String(candidate) : fallback;
  const fontFamily = ["serif", "sans", "kai"].includes(String(value?.fontFamily)) ? value?.fontFamily as CoverStyle["fontFamily"] : defaultCoverStyle.fontFamily;
  const pattern = ["none", "frame", "grid", "dots", "corners"].includes(String(value?.pattern)) ? value?.pattern as CoverStyle["pattern"] : defaultCoverStyle.pattern;
  const align = ["left", "center"].includes(String(value?.align)) ? value?.align as CoverStyle["align"] : defaultCoverStyle.align;
  const position = ["top", "middle", "bottom"].includes(String(value?.position)) ? value?.position as CoverStyle["position"] : defaultCoverStyle.position;
  return {
    ...defaultCoverStyle,
    fontFamily,
    pattern,
    align,
    position,
    titleColor: color(value?.titleColor, defaultCoverStyle.titleColor),
    subtitleColor: color(value?.subtitleColor, defaultCoverStyle.subtitleColor),
    overlayColor: color(value?.overlayColor, defaultCoverStyle.overlayColor),
    patternColor: color(value?.patternColor, defaultCoverStyle.patternColor),
    overlayOpacity: Math.min(90, Math.max(0, Number(value?.overlayOpacity ?? defaultCoverStyle.overlayOpacity))),
    titleSize: Math.min(120, Math.max(52, Number(value?.titleSize ?? defaultCoverStyle.titleSize))),
  };
}

function collectResearchFromBridge(force: boolean) {
  return new Promise<BrowserResearchCandidate[]>((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", receiveResult);
      reject(new Error("等待小红书公开搜索结果超时，请确认搜索页已打开且账号已登录"));
    }, 35_000);
    function receiveResult(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data as {
        source?: string;
        type?: string;
        version?: number;
        requestId?: string;
        candidates?: BrowserResearchCandidate[];
        error?: string;
      };
      if (message.source !== "mj-xhs-bridge"
        || message.type !== "MJ_XHS_RESEARCH_RESULT"
        || message.version !== 4
        || message.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener("message", receiveResult);
      if (message.error) reject(new Error(message.error));
      else resolve(Array.isArray(message.candidates) ? message.candidates : []);
    }
    window.addEventListener("message", receiveResult);
    window.postMessage({
      source: XHS_BRIDGE_SOURCE,
      type: "MJ_XHS_RESEARCH_REQUEST",
      requestId,
      force,
    }, window.location.origin);
  });
}

function syncCommentsFromBridge(profileUrl: string) {
  return new Promise<Array<{ senderName: string; message: string; sourceUrl: string }>>((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", receiveResult);
      reject(new Error("等待笔记评论同步超时，请确认小红书主页和笔记页可以正常打开"));
    }, 55_000);
    function receiveResult(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data as {
        source?: string;
        type?: string;
        version?: number;
        requestId?: string;
        comments?: Array<{ senderName: string; message: string; sourceUrl: string }>;
        error?: string;
      };
      if (message.source !== "mj-xhs-bridge"
        || message.type !== "MJ_XHS_COMMENT_SYNC_RESULT"
        || message.version !== 4
        || message.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener("message", receiveResult);
      if (message.error) reject(new Error(message.error));
      else resolve(Array.isArray(message.comments) ? message.comments : []);
    }
    window.addEventListener("message", receiveResult);
    window.postMessage({
      source: XHS_BRIDGE_SOURCE,
      type: "MJ_XHS_COMMENT_SYNC_REQUEST",
      requestId,
      profileUrl,
    }, window.location.origin);
  });
}

function replyCommentsThroughBridge(actions: Array<{
  id: number;
  senderName: string;
  message: string;
  sourceUrl: string;
  reply: string;
}>) {
  return new Promise<Array<{ id: number; success: boolean; error?: string }>>((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const confirmedAt = new Date();
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", receiveResult);
      reject(new Error("自动回复等待超时，未完成的评论已保留为待处理"));
    }, 150_000);
    function receiveResult(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data as {
        source?: string;
        type?: string;
        version?: number;
        requestId?: string;
        results?: Array<{ id: number; success: boolean; error?: string }>;
        error?: string;
      };
      if (message.source !== "mj-xhs-bridge"
        || message.type !== "MJ_XHS_COMMENT_REPLY_RESULT"
        || message.version !== 4
        || message.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener("message", receiveResult);
      if (message.error) reject(new Error(message.error));
      else resolve(Array.isArray(message.results) ? message.results : []);
    }
    window.addEventListener("message", receiveResult);
    window.postMessage({
      source: XHS_BRIDGE_SOURCE,
      type: "MJ_XHS_COMMENT_REPLY_REQUEST",
      requestId,
      actions,
      authorization: {
        confirmedAt: confirmedAt.toISOString(),
        expiresAt: new Date(confirmedAt.getTime() + 5 * 60_000).toISOString(),
        nonce: crypto.randomUUID(),
      },
    }, window.location.origin);
  });
}

const loadImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("封面底图读取失败"));
  image.src = source;
});

function drawCoverPattern(context: CanvasRenderingContext2D, style: CoverStyle) {
  if (style.pattern === "none") return;
  context.save();
  context.strokeStyle = style.patternColor;
  context.fillStyle = style.patternColor;
  context.globalAlpha = 0.55;
  context.lineWidth = 3;
  if (style.pattern === "frame") {
    context.strokeRect(56, 56, 968, 1328);
  } else if (style.pattern === "grid") {
    context.globalAlpha = 0.22;
    for (let x = 80; x <= 1000; x += 115) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 1440); context.stroke();
    }
    for (let y = 95; y <= 1380; y += 115) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(1080, y); context.stroke();
    }
  } else if (style.pattern === "dots") {
    context.globalAlpha = 0.45;
    for (let x = 80; x <= 1000; x += 70) {
      for (let y = 82; y <= 360; y += 70) {
        context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill();
      }
    }
  } else if (style.pattern === "corners") {
    const length = 150;
    for (const [x, y, dx, dy] of [[62, 62, 1, 1], [1018, 62, -1, 1], [62, 1378, 1, -1], [1018, 1378, -1, -1]] as const) {
      context.beginPath();
      context.moveTo(x + dx * length, y); context.lineTo(x, y); context.lineTo(x, y + dy * length); context.stroke();
    }
  }
  context.restore();
}

async function renderCoverDataUrl(source: string, title: string, subtitle: string, inputStyle?: Partial<CoverStyle>) {
  const style = normalizedCoverStyle(inputStyle);
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器无法生成封面");
  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
  context.globalAlpha = style.overlayOpacity / 100;
  context.fillStyle = style.overlayColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = 1;
  drawCoverPattern(context, style);
  context.textAlign = style.align;
  const anchorX = style.align === "center" ? canvas.width / 2 : 82;
  context.fillStyle = style.titleColor;
  context.font = `${style.titleSize}px ${coverFontStacks[style.fontFamily]}`;
  const chars = [...title.trim()];
  const lines: string[] = [];
  let line = "";
  for (const char of chars) {
    const candidate = `${line}${char}`;
    if (context.measureText(candidate).width > (style.align === "center" ? 900 : 870) && line) {
      lines.push(line);
      line = char;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  const titleBase = style.position === "top" ? 270 : style.position === "middle" ? 720 : 1110;
  const lineHeight = style.titleSize * 1.15;
  lines.slice(0, 3).forEach((text, index) => context.fillText(text, anchorX, titleBase + index * lineHeight));
  context.font = '28px system-ui, "Microsoft YaHei", sans-serif';
  context.fillStyle = style.subtitleColor;
  context.fillText(subtitle.trim(), anchorX, Math.min(1380, titleBase + Math.min(lines.length, 3) * lineHeight + 42));
  return canvas.toDataURL("image/jpeg", 0.92);
}

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
    coverStyle: defaultCoverStyle,
    body: `这个项目从真实的居住感受出发，而不是先定义一种风格。\n\n${meta.brief || "我们从光线、材质、动线与收纳重新梳理空间。"}\n\n画面里的材质、自然光和克制留白共同构成温和的空间秩序。功能被收进日常动线里，人在其中可以更松弛地停留、交流和生活。\n\n如果你也在寻找适合自己的居住方式，欢迎带着户型与需求来聊聊。`,
    tags: ["室内设计", "住宅设计", "实景案例", "全案设计", "自然系住宅", "设计工作室"],
    highlights: ["从上传图片提取视觉基调", "依据画面选择竖版封面", "正文避免虚构未知项目事实"],
    riskNotes: ["当前为本地视觉预览；连接 AI 后可完成多图语义分析"],
    coverIndex: 0,
    mode: "本地视觉预览",
  };
}

export function StudioSecretary({ accountName }: { accountName: string }) {
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
  const [bridgeReady, setBridgeReady] = useState(false);
  const [profileUrl, setProfileUrl] = useState(() => (
    typeof window === "undefined" ? "" : window.localStorage.getItem("mj-xhs-profile-url") || ""
  ));

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
  const visibleResearchReferences = references.filter((reference) => {
    try {
      const url = new URL(reference.sourceUrl);
      return url.searchParams.has("xsec_token");
    } catch {
      return false;
    }
  }).slice(0, 3);

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

  useEffect(() => {
    function receiveBridgeStatus(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data as { source?: string; type?: string; version?: number };
      if (message?.source !== "mj-xhs-bridge") return;
      if (message.version === 4 && (message.type === "MJ_XHS_BRIDGE_READY" || message.type === "MJ_XHS_DRAFT_STORED")) {
        setBridgeReady(true);
      }
    }
    window.addEventListener("message", receiveBridgeStatus);
    window.postMessage({ source: XHS_BRIDGE_SOURCE, type: "MJ_XHS_BRIDGE_PING" }, window.location.origin);
    return () => window.removeEventListener("message", receiveBridgeStatus);
  }, []);

  useEffect(() => {
    if (!settings.officialApiConnected || settings.publishMode !== "official_api") return;
    const submitDue = async () => {
      const response = await fetch("/api/publish/official", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ due: true }),
      });
      if (response.ok) await refreshProjects();
    };
    void submitDue();
    const timer = window.setInterval(() => void submitDue(), 60_000);
    return () => window.clearInterval(timer);
    // refreshProjects is a stable function declaration for this client session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.officialApiConnected, settings.publishMode]);

  const updateMeta = (key: keyof ProjectMeta, value: string) => setMeta((current) => ({ ...current, [key]: value }));
  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";
    if (!incoming.length) return;
    const merged = [...files, ...incoming].filter((file, index, all) => (
      all.findIndex((item) => `${item.name}-${item.size}-${item.lastModified}` === `${file.name}-${file.size}-${file.lastModified}`) === index
    )).slice(0, MAX_PROJECT_IMAGES);
    setFiles(merged);
    setPreviews(merged.map((file) => URL.createObjectURL(file)));
    setDraft((current) => ({ ...current, coverIndex: Math.min(current.coverIndex ?? 0, Math.max(merged.length - 1, 0)) }));
    setNotice(incoming.length + files.length > MAX_PROJECT_IMAGES
      ? `最多添加 ${MAX_PROJECT_IMAGES} 张图片，超出的图片未加入`
      : `已添加 ${merged.length} / ${MAX_PROJECT_IMAGES} 张项目实景图，可继续分批添加`);
    setPhase("ready");
  };

  const removeFile = (index: number) => {
    if (!files.length) return;
    const nextFiles = files.filter((_, fileIndex) => fileIndex !== index);
    setFiles(nextFiles);
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)));
    setDraft((current) => ({ ...current, coverIndex: Math.min(current.coverIndex ?? 0, Math.max(nextFiles.length - 1, 0)) }));
    setNotice(`已保留 ${nextFiles.length} / ${MAX_PROJECT_IMAGES} 张图片`);
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
      setDraft({ ...result.draft, coverStyle: normalizedCoverStyle(result.draft.coverStyle) });
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
    const payload = await response.json() as { settings?: AutomationSettings };
    if (payload.settings) setSettings(payload.settings);
    setSettingsNotice(settings.publishMode === "official_api"
      ? `已启用官方 API 自动发布：每 ${settings.publishCadenceDays} 天 ${settings.publishTime} 执行`
      : `已保存人工发布模式：每 ${settings.publishCadenceDays} 天 ${settings.publishTime} 提醒发布`);
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

  async function submitOfficialProject(projectId: number) {
    if (!settings.officialApiConnected) {
      setSettingsNotice("尚未获得小红书官方发布接口权限，当前不能自动提交");
      return;
    }
    if (!window.confirm("确认通过已授权的小红书官方接口提交这篇笔记？")) return;
    setSettingsNotice("正在向小红书官方接口提交项目笔记…");
    const response = await fetch("/api/publish/official", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setSettingsNotice(payload.error || "官方接口提交失败");
      return;
    }
    setSettingsNotice("项目笔记已由小红书官方接口接收并记录为已发布");
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
    setDraft({ ...seededDraft, ...project.draft, coverStyle: normalizedCoverStyle(project.draft?.coverStyle), titleOptions: project.draft?.titleOptions?.length === 3 ? project.draft.titleOptions : [project.draft?.title || seededDraft.title, ...seededDraft.titleOptions.filter((title) => title !== project.draft?.title)].slice(0, 3), tags: project.draft?.tags || [], highlights: project.draft?.highlights || [], riskNotes: project.draft?.riskNotes || [] });
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
    let coverDataUrl = "";
    try {
      coverDataUrl = await renderCoverDataUrl(coverImage, draft.coverTitle, draft.coverSubtitle, draft.coverStyle);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "封面生成失败");
      return false;
    }
    const [response, coverResponse] = await Promise.all([
      fetch(`/api/projects/${currentProjectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draft: { ...draft, mode: "人工编辑" }, status, publishUrl }),
      }),
      fetch(`/api/projects/${currentProjectId}/cover`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: coverDataUrl }),
      }),
    ]);
    const payload = await response.json() as { error?: string };
    const coverPayload = await coverResponse.json() as { error?: string };
    if (!response.ok || !coverResponse.ok) {
      setNotice(payload.error || coverPayload.error || "保存失败");
      return false;
    }
    setNotice(status === "approved" ? "封面与文案已人工确认，可随时发布或加入三天队列" : status === "published" ? "已记录为发布完成" : "编辑内容已保存到项目资产库");
    setLastSyncedAt(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
    await refreshProjects();
    return true;
  }

  async function publishNow(autoPublish = false) {
    if (!currentProjectId) {
      setNotice("请先上传图片并生成正式项目，再进入发布流程");
      return;
    }
    if (autoPublish && !bridgeReady) {
      setNotice("自动发布需要先安装并连接 MJ 发布桥；你仍可使用人工预填发布");
      return;
    }
    if (autoPublish && !window.confirm(`确认自动发布「${draft.title.trim()}」？\n\n平台会同步封面、图片、标题、正文与标签，并在 5 分钟内授权扩展点击一次小红书官方“发布”按钮。`)) {
      setNotice("已取消本次自动发布，项目内容没有提交到小红书");
      return;
    }
    const publishWindow = window.open(XHS_PUBLISH_URL, "_blank", "noopener,noreferrer");
    const approved = await saveProject("approved");
    if (!approved) {
      publishWindow?.close();
      return;
    }
    let project = projects.find((item) => item.id === currentProjectId);
    if (!project?.images?.length) {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const payload = await response.json() as { projects: ProjectRecord[] };
        project = payload.projects.find((item) => item.id === currentProjectId);
      }
    }
    let coverDataUrl = "";
    try {
      coverDataUrl = await renderCoverDataUrl(coverImage, draft.coverTitle, draft.coverSubtitle, draft.coverStyle);
    } catch (error) {
      publishWindow?.close();
      setNotice(error instanceof Error ? error.message : "封面生成失败，请重试");
      return;
    }
    const coverIndex = Math.max(0, draft.coverIndex ?? 0);
    const images = (project?.images || [])
      .filter((_, index) => index !== coverIndex)
      .slice(0, 9)
      .map((image) => ({
        url: new URL(image.url, window.location.origin).href,
        fileName: image.fileName,
      }));
    const createdAt = new Date();
    const bridgeDraft: XhsBridgeDraft = {
      version: 2,
      projectId: currentProjectId,
      projectName: meta.name,
      title: draft.title.trim(),
      body: draft.body.trim(),
      tags: draft.tags.map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean),
      coverDataUrl,
      images,
      publishAction: autoPublish ? "auto_publish" : "prefill",
      authorization: autoPublish ? {
        confirmedAt: createdAt.toISOString(),
        expiresAt: new Date(createdAt.getTime() + 5 * 60_000).toISOString(),
        nonce: crypto.randomUUID(),
      } : undefined,
      createdAt: createdAt.toISOString(),
    };
    window.postMessage({
      source: XHS_BRIDGE_SOURCE,
      type: "MJ_XHS_DRAFT",
      payload: bridgeDraft,
    }, window.location.origin);
    const copy = `${draft.title}\n\n${draft.body}\n\n${draft.tags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}`;
    try {
      await navigator.clipboard.writeText(copy);
      setNotice(autoPublish
        ? "已同步成品封面、图片、标题与正文；MJ 发布桥将在页面准备完成后执行一次自动发布"
        : bridgeReady
        ? "已把图片、标题与正文交给 MJ 发布桥；小红书发布页将自动预填，请检查后人工点击发布"
        : "已复制完整文案并打开小红书发布页；安装 MJ 发布桥后可自动预填图片、标题与正文");
    } catch {
      setNotice(autoPublish
        ? "已把本次限时授权交给 MJ 发布桥，正在等待小红书页面完成预填并发布"
        : bridgeReady
        ? "已把确认内容交给 MJ 发布桥；请在小红书发布页检查后人工点击发布"
        : "已打开小红书发布页；当前未检测到 MJ 发布桥，请手动粘贴文案并上传图片");
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
    setResearchNotice("秘书正在打开小红书公开搜索页，筛选室内设计高热笔记…");
    try {
      if (!bridgeReady) throw new Error("请安装或更新 MJ 发布桥 1.3，刷新平台后再开始今日研究");
      const browserCandidates = await collectResearchFromBridge(force);
      setResearchNotice(`已从小红书读取 ${browserCandidates.length} 篇公开笔记，正在筛选并建立原创分析…`);
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force, browserCandidates }),
      });
      const payload = await response.json() as { references?: ResearchReference[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "每日研究失败");
      const latest = payload.references || [];
      setReferences((current) => [...latest, ...current.filter((item) => item.researchDate !== localDate())]);
      setResearchNotice("今日 3 篇参考已完成：来源为小红书公开笔记，只提炼结构与视觉规律，不复制原文");
    } catch (error) {
      setResearchNotice(error instanceof Error ? error.message : "每日研究失败");
    } finally {
      setResearching(false);
    }
  }

  async function refreshCustomerMessages() {
    const response = await fetch("/api/customer-service");
    if (!response.ok) return;
    const payload = await response.json() as { messages?: CustomerMessage[] };
    setMessages(payload.messages || []);
  }

  async function syncNoteComments() {
    if (!bridgeReady) {
      setServiceNotice("请安装或更新 MJ 发布桥 1.3，刷新平台后再同步笔记评论");
      return;
    }
    if (!profileUrl) {
      setServiceNotice("请先在页面顶部填写当前登录账号的小红书主页链接");
      return;
    }
    setServiceNotice("秘书正在打开你的主页与最近笔记，读取公开可见的待回复评论…");
    try {
      const comments = await syncCommentsFromBridge(profileUrl);
      const response = await fetch("/api/customer-service", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ comments }),
      });
      const payload = await response.json() as { messages?: CustomerMessage[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "评论归档失败");
      await refreshCustomerMessages();
      setServiceNotice(`已同步 ${comments.length} 条公开评论；安全评论可自动回复，高风险评论已转人工`);
    } catch (error) {
      setServiceNotice(error instanceof Error ? error.message : "笔记评论同步失败");
    }
  }

  async function autoReplyPendingComments() {
    if (!bridgeReady) {
      setServiceNotice("请先连接 MJ 发布桥 1.3");
      return;
    }
    const actions = messages
      .filter((item) => item.status === "pending" && item.autoReplyEligible && item.sourceUrl)
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        senderName: item.senderName,
        message: item.message,
        sourceUrl: item.sourceUrl,
        reply: item.suggestedReply,
      }));
    if (!actions.length) {
      setServiceNotice("当前没有符合自动回复规则的安全评论；高风险评论需人工处理");
      return;
    }
    if (!window.confirm(`确认自动回复 ${actions.length} 条笔记评论？\n\n秘书会逐条限速发送；联系方式、投诉和争议评论不会进入自动队列。`)) {
      setServiceNotice("已取消本次自动回复，没有发送任何评论");
      return;
    }
    setServiceNotice(`正在逐条回复 ${actions.length} 条安全评论，请保持小红书页面可用…`);
    try {
      const results = await replyCommentsThroughBridge(actions);
      const succeeded = results.filter((result) => result.success);
      for (const result of succeeded) {
        await fetch("/api/customer-service", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: result.id, status: "replied" }),
        });
      }
      await refreshCustomerMessages();
      const failed = results.filter((result) => !result.success);
      setServiceNotice(failed.length
        ? `已自动回复 ${succeeded.length} 条，${failed.length} 条因页面状态或安全规则转人工`
        : `已完成 ${succeeded.length} 条评论自动回复`);
    } catch (error) {
      setServiceNotice(error instanceof Error ? error.message : "自动回复未完成");
    }
  }

  async function saveCustomerMessage() {
    setServiceNotice("正在保存评论并生成合规回复…");
    const response = await fetch("/api/customer-service", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(messageForm),
    });
    const payload = await response.json() as { message?: CustomerMessage; error?: string };
    if (!response.ok || !payload.message) {
      setServiceNotice(payload.error || "评论保存失败");
      return;
    }
    setMessages((current) => [payload.message!, ...current]);
    setMessageForm({ senderName: "", message: "", sourceUrl: "" });
    setServiceNotice("评论已归档，已生成合规回复建议");
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
      <div className="section-heading"><div><span>PROJECT INTAKE</span><h2>交给秘书一个新项目</h2></div><span className="counter">{files.length ? `${files.length} / ${MAX_PROJECT_IMAGES} 张实景图` : "最多 10 张实景图"}</span></div>
      <form onSubmit={handleGenerate}>
        <label className="upload-zone"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFiles}/><div className="upload-icon">＋</div><strong>{files.length ? "继续添加项目实景图" : "上传项目实景图"}</strong><span>可分批人工添加，最多 10 张；点击缩略图选择封面</span></label>
        <div className="thumb-strip">{previews.slice(0, MAX_PROJECT_IMAGES).map((image, index) => <div className="thumb-wrap" key={`${image}-${index}`}><button type="button" className={index === (draft.coverIndex ?? 0) ? "thumb selected" : "thumb"} onClick={() => setDraft((current) => ({ ...current, coverIndex: index }))} aria-label={`选择第 ${index + 1} 张作为封面`}><img src={image} alt=""/></button>{files.length > 0 && <button type="button" className="remove-thumb" onClick={() => removeFile(index)} aria-label={`删除第 ${index + 1} 张图片`}>×</button>}<span>{index + 1}</span></div>)}</div>
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
      <div className="phone-frame"><div className={`cover-preview pattern-${normalizedCoverStyle(draft.coverStyle).pattern}`} style={{ "--cover-pattern": normalizedCoverStyle(draft.coverStyle).patternColor } as React.CSSProperties}><img src={coverImage} alt="项目封面预览"/><div className="cover-shade" style={{ background: normalizedCoverStyle(draft.coverStyle).overlayColor, opacity: normalizedCoverStyle(draft.coverStyle).overlayOpacity / 100 }}/><div className={`cover-copy position-${normalizedCoverStyle(draft.coverStyle).position} align-${normalizedCoverStyle(draft.coverStyle).align}`} style={{ color: normalizedCoverStyle(draft.coverStyle).titleColor, fontFamily: coverFontStacks[normalizedCoverStyle(draft.coverStyle).fontFamily] }}><h3 style={{ fontSize: `${Math.round(normalizedCoverStyle(draft.coverStyle).titleSize / 2.2)}px` }}>{draft.coverTitle}</h3><p style={{ color: normalizedCoverStyle(draft.coverStyle).subtitleColor }}>{draft.coverSubtitle}</p></div><span className="page-count">01 / {previews.length}</span></div></div>
      <div className={`bridge-status ${bridgeReady ? "connected" : ""}`}>
        <span>{bridgeReady ? "MJ 发布桥 1.3 已连接" : "未连接最新版 MJ 发布桥"}</span>
        <p>{bridgeReady ? "成品封面、项目图片、标题、正文与标签会保持统一；可选择人工发布或单篇确认后自动发布。" : "安装一次浏览器扩展，即可把已确认内容自动带入小红书官方图文发布页。"}</p>
        {!bridgeReady && <a href={XHS_BRIDGE_EXTENSION_URL} download>下载或更新 MJ 发布桥扩展</a>}
      </div>
      <div className="publish-actions">
        <button className="secondary-action" onClick={() => void publishNow()}>确认并预填小红书发布页</button>
        <button className="auto-publish-action" disabled={!bridgeReady} onClick={() => void publishNow(true)}>确认本篇并自动发布</button>
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
        <div className="cover-designer">
          <div className="cover-designer-heading"><div><small>COVER DESIGNER</small><strong>封面样式编辑</strong></div><button onClick={() => setDraft((current) => ({ ...current, coverStyle: defaultCoverStyle }))}>恢复默认</button></div>
          <div className="cover-control-grid">
            <label><small>标题字体</small><select value={normalizedCoverStyle(draft.coverStyle).fontFamily} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), fontFamily: event.target.value as CoverStyle["fontFamily"] } }))}><option value="serif">宋体 / 衬线</option><option value="sans">黑体 / 无衬线</option><option value="kai">楷体</option></select></label>
            <label><small>装饰图案</small><select value={normalizedCoverStyle(draft.coverStyle).pattern} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), pattern: event.target.value as CoverStyle["pattern"] } }))}><option value="none">无图案</option><option value="frame">细线边框</option><option value="grid">建筑网格</option><option value="dots">圆点阵列</option><option value="corners">四角标记</option></select></label>
            <label><small>文字位置</small><select value={normalizedCoverStyle(draft.coverStyle).position} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), position: event.target.value as CoverStyle["position"] } }))}><option value="top">顶部</option><option value="middle">居中</option><option value="bottom">底部</option></select></label>
            <label><small>文字对齐</small><select value={normalizedCoverStyle(draft.coverStyle).align} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), align: event.target.value as CoverStyle["align"] } }))}><option value="left">左对齐</option><option value="center">居中</option></select></label>
            <label className="color-control"><small>标题颜色</small><input type="color" value={normalizedCoverStyle(draft.coverStyle).titleColor} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), titleColor: event.target.value } }))}/></label>
            <label className="color-control"><small>副标题颜色</small><input type="color" value={normalizedCoverStyle(draft.coverStyle).subtitleColor} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), subtitleColor: event.target.value } }))}/></label>
            <label className="color-control"><small>图案颜色</small><input type="color" value={normalizedCoverStyle(draft.coverStyle).patternColor} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), patternColor: event.target.value } }))}/></label>
            <label className="color-control"><small>遮罩颜色</small><input type="color" value={normalizedCoverStyle(draft.coverStyle).overlayColor} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), overlayColor: event.target.value } }))}/></label>
            <label className="range-control"><small>标题字号 · {normalizedCoverStyle(draft.coverStyle).titleSize}</small><input type="range" min="52" max="120" value={normalizedCoverStyle(draft.coverStyle).titleSize} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), titleSize: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>遮罩强度 · {normalizedCoverStyle(draft.coverStyle).overlayOpacity}%</small><input type="range" min="0" max="90" value={normalizedCoverStyle(draft.coverStyle).overlayOpacity} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), overlayOpacity: Number(event.target.value) } }))}/></label>
          </div>
        </div>
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
        <div className="publish-mode-picker wide">
          <span>发布模式</span>
          <button className={settings.publishMode === "manual" ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, publishMode: "manual" }))}><strong>人工立即发布</strong><small>确认后复制文案并打开小红书官方发布页</small><em>始终可用</em></button>
          <button className={settings.publishMode === "official_api" ? "active" : ""} disabled={!settings.officialApiConnected} onClick={() => setSettings((current) => ({ ...current, publishMode: "official_api" }))}><strong>官方 API 自动发布</strong><small>仅使用小红书官方授权接口，到期后自动提交</small><em>{settings.officialApiConnected ? "已连接" : "等待官方授权"}</em></button>
        </div>
        <label><span>默认发布时间</span><input type="time" value={settings.publishTime} onChange={(event) => setSettings((current) => ({ ...current, publishTime: event.target.value }))}/></label>
        <label><span>发布间隔</span><div className="number-control"><input type="number" min="1" max="30" value={settings.publishCadenceDays} onChange={(event) => setSettings((current) => ({ ...current, publishCadenceDays: Number(event.target.value) }))}/><em>天</em></div></label>
        <label><span>每日参考收集时间</span><input type="time" value={settings.researchTime} onChange={(event) => setSettings((current) => ({ ...current, researchTime: event.target.value }))}/></label>
        <label className="toggle-row"><span>每日自动研究</span><input type="checkbox" checked={settings.dailyResearchEnabled} onChange={(event) => setSettings((current) => ({ ...current, dailyResearchEnabled: event.target.checked }))}/></label>
        <label className="toggle-row wide"><span>发布前保留人工确认</span><input type="checkbox" checked={settings.requireApproval} onChange={(event) => setSettings((current) => ({ ...current, requireApproval: event.target.checked }))}/></label>
      </div>
      <button className="primary-action settings-save" onClick={() => void saveSettings()}><span>保存自动配置</span><span>→</span></button>
      <p className="notice">{settingsNotice || (settings.officialApiConnected ? "官方发布接口已连接，可选择自动发布；人工发布入口仍保留。" : "当前未获得小红书官方发布 API 授权，系统会准备发布包并提醒人工发布。")}</p>
      {!settings.officialApiConnected && <a className="official-access-link" href="https://open.xiaohongshu.com/" target="_blank" rel="noreferrer">前往小红书开放平台申请或管理正式接口权限 ↗</a>}
    </section>
    <section className="dashboard-card queue-card">
      <div className="section-heading"><div><span>PUBLISH QUEUE</span><h2>项目发布日历</h2><p>仅人工确认后的内容可排期；到期后进入官方发布交接流程。</p></div><span className="counter">{scheduledProjects.length} 个已排期</span></div>
      <div className="queue-list">
        {projects.map((project) => <div className="queue-item" key={project.id}>
          <div className="queue-project">{project.images?.[0] ? <img src={project.images[0].url} alt=""/> : <span>{project.name.slice(0, 1)}</span>}<div><strong>{project.name}</strong><small>{project.location} · {project.area}</small></div></div>
          <input type="datetime-local" value={scheduleDrafts[project.id] || nextSlot(settings)} onChange={(event) => setScheduleDrafts((current) => ({ ...current, [project.id]: event.target.value }))}/>
          <div className="queue-buttons"><button onClick={() => void scheduleProject(project.id)}>{project.scheduledAt ? "更新排期" : project.status === "approved" ? "加入日历" : "先确认"}</button>{settings.officialApiConnected && ["approved", "scheduled"].includes(project.status) && <button className="official-submit" onClick={() => void submitOfficialProject(project.id)}>官方接口提交</button>}</div>
        </div>)}
        {!projects.length && <div className="empty-state"><strong>还没有可排期项目</strong><p>先在创作工作台上传项目实景图，项目会自动进入这里。</p></div>}
      </div>
    </section>
  </div>;

  const researchView = <section className="dashboard-card">
    <div className="section-heading"><div><span>DAILY CONTENT INTELLIGENCE</span><h2>每日 3 篇小红书高热参考解析</h2><p>每张参考卡片都可直接跳转到小红书原笔记网页；秘书提炼后的结构、封面层级与受众洞察会自动用于后续项目生成升级。</p></div><button className="small-action" disabled={researching} onClick={() => void runResearch(true)}>{researching ? "正在小红书研究…" : "刷新今日 3 篇"}</button></div>
    <div className="research-summary"><div><strong>{settings.researchTime}</strong><span>每日自动收集</span></div><div><strong>3 篇</strong><span>室内设计高热参考</span></div><div><strong>原创</strong><span>只提炼规律，不复制原文</span></div></div>
    <p className="research-notice">{researchNotice || `最近可浏览研究日：${visibleResearchReferences[0]?.researchDate || "请刷新今日 3 篇"}`}</p>
    <div className="research-grid">
      {visibleResearchReferences.map((reference, index) => <a className="research-card" href={reference.sourceUrl} target="_blank" rel="noreferrer" key={reference.id}>
        <div className={`research-cover tone-${index % 3}`}><span>REFERENCE {String((index % 3) + 1).padStart(2, "0")}</span><strong>{reference.title}</strong><small>{reference.author || "公开来源"}</small></div>
        <div className="metric-row"><span>赞 {reference.likes || "待核实"}</span><span>藏 {reference.saves || "待核实"}</span><span>评 {reference.comments || "待核实"}</span><em>{reference.metricConfidence === "verified" ? "已核实" : "估算信号"}</em></div>
        <div className="research-analysis"><span className="generation-ready">✓ 已纳入后续生成策略</span><h3>文案结构</h3><p>{reference.copyAnalysis}</p><h3>封面规律</h3><p>{reference.coverAnalysis}</p><h3>可复用方法</h3><p>{reference.reusablePattern}</p></div>
        <div className="source-row"><span>{reference.metricsNote}</span><strong>直接打开当前可浏览的原笔记网页 ↗</strong></div>
      </a>)}
      {!visibleResearchReferences.length && <div className="empty-state research-empty"><strong>需要重新采集可浏览笔记</strong><p>旧链接缺少小红书当前访问参数或已经失效。点击刷新后，秘书会重新打开小红书并替换为当前可直接浏览的原笔记链接。</p><button onClick={() => void runResearch(true)}>重新采集今日 3 篇</button></div>}
    </div>
  </section>;

  const serviceView = <div className="service-layout">
    <section className="dashboard-card service-intake">
      <div className="section-heading"><div><span>NOTE COMMENT SECRETARY</span><h2>笔记评论自动回复秘书</h2><p>同步当前登录账号公开笔记中的可见评论，识别咨询意图，生成合规回复并管理处理状态。</p></div><a className="small-action service-link" href={profileUrl || "https://www.xiaohongshu.com/"} target="_blank" rel="noreferrer">打开当前小红书主页 ↗</a></div>
      <div className="integration-warning"><strong>发布桥评论管理模式</strong><p>只读取本人公开笔记中当前可见的评论，不读取私信。登录验证、投诉争议、联系方式和风控提示均转人工。</p></div>
      <div className="comment-automation-actions">
        <button className="primary-action" onClick={() => void syncNoteComments()}><span>同步最近笔记评论</span><span>↻</span></button>
        <button className="auto-comment-action" disabled={!messages.some((item) => item.status === "pending" && item.autoReplyEligible)} onClick={() => void autoReplyPendingComments()}>确认并自动回复安全评论</button>
      </div>
      <div className="service-form">
        <div className="manual-comment-title"><strong>人工补录评论</strong><span>用于页面暂时无法自动读取时</span></div>
        <label><span>评论用户</span><input value={messageForm.senderName} onChange={(event) => setMessageForm((current) => ({ ...current, senderName: event.target.value }))} placeholder="例如：温州小林"/></label>
        <label><span>评论内容</span><textarea value={messageForm.message} onChange={(event) => setMessageForm((current) => ({ ...current, message: event.target.value }))} placeholder="粘贴公开笔记评论"/></label>
        <label><span>笔记链接</span><input value={messageForm.sourceUrl} onChange={(event) => setMessageForm((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="小红书笔记详情页链接"/></label>
        <button className="secondary-action manual-save" onClick={() => void saveCustomerMessage()}>补录并生成建议回复</button>
      </div>
      <div className="blocked-template"><span>高风险评论 · 自动转人工</span><code>联系方式 / 投诉 / 退款 / 争议 / 验证码</code><p>自动回复不会发送微信号、电话号码或其他站外导流信息，也不会处理争议性评论。</p></div>
      <p className="notice">{serviceNotice}</p>
    </section>
    <section className="dashboard-card service-inbox">
      <div className="section-heading"><div><span>COMMENT QUEUE</span><h2>笔记评论处理队列</h2><p>秘书区分安全评论与需人工介入的评论，并保留每条处理记录。</p></div><span className="counter">{messages.filter((item) => item.status === "pending").length} 条待回复</span></div>
      <div className="message-list">
        {messages.map((item) => <article className={`message-card ${item.status}`} key={item.id}>
          <div className="message-meta"><div><strong>{item.senderName}</strong><small>{new Date(item.createdAt).toLocaleString("zh-CN")}</small></div><span>{item.status === "replied" ? "已回复" : item.autoReplyEligible ? "可自动回复" : "转人工"}</span></div>
          <blockquote>{item.message}</blockquote>
          <div className="reply-suggestion"><small>建议回复</small><p>{item.suggestedReply}</p></div>
          <div className="message-actions"><button onClick={() => void copyServiceReply(item)}>复制合规回复</button><button onClick={() => void markMessageReplied(item)} disabled={item.status === "replied"}>{item.status === "replied" ? "已完成" : "标记已回复"}</button>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer">查看来源 ↗</a>}</div>
        </article>)}
        {!messages.length && <div className="empty-state"><strong>还没有同步到笔记评论</strong><p>点击“同步最近笔记评论”，秘书会打开你的主页和最近笔记建立待回复队列。</p></div>}
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
      <header className="topbar"><div><p className="kicker">XIAOHONGSHU CREATIVE SERVICE</p><h1>小红书创作服务平台</h1><p className="account-workspace">当前独立工作区：{accountName}</p></div><div className="topbar-actions"><span className={`status-chip ${phase}`}>{phaseLabel}</span><a className="avatar" href="https://www.xiaohongshu.com/" target="_blank" rel="noreferrer" aria-label="登录当前浏览器的小红书账户">XHS</a></div></header>
      <div className={`xhs-session-banner ${bridgeReady ? "connected" : ""}`}><div><strong>{bridgeReady ? "当前浏览器发布桥已连接" : "其他账户首次使用需重新登录小红书"}</strong><p>{bridgeReady ? "研究、评论与发布只使用这个浏览器当前登录的小红书账户，不会共享其他人的登录状态。" : "请先在当前浏览器登录自己的小红书账户，并安装 MJ 发布桥，再开始编辑创作和发布。"}</p><label><span>当前小红书主页链接</span><input value={profileUrl} onChange={(event) => { const value = event.target.value.trim(); setProfileUrl(value); window.localStorage.setItem("mj-xhs-profile-url", value); }} placeholder="登录后复制自己的小红书主页链接"/></label></div><div>{!bridgeReady && <a href={XHS_BRIDGE_EXTENSION_URL} download>下载发布桥</a>}<a href="https://www.xiaohongshu.com/" target="_blank" rel="noreferrer">登录小红书 ↗</a></div></div>
      {activeTab === "creator" && creatorView}
      {activeTab === "assets" && assetView}
      {activeTab === "calendar" && calendarView}
      {activeTab === "research" && researchView}
      {activeTab === "service" && serviceView}
    </section>
  </main>;
}
