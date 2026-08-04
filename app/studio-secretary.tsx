"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Draft = {
  projectName?: string;
  detectedSpaceType?: string;
  designSummary?: string;
  title: string;
  titleOptions: string[];
  coverEyebrow: string;
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
  pattern: "none" | "frame" | "grid" | "dots" | "corners" | "polka" | "textile" | "gradient" | "blue-white-dots" | "ad-badge" | "ad-ribbon" | "editorial-bars" | "spotlight";
  patternColor: string;
  titleSize: number;
  titleOffsetX: number;
  titleOffsetY: number;
  titleDirection: "horizontal" | "vertical";
  align: "left" | "center";
  position: "top" | "middle" | "bottom";
  patternOffsetX: number;
  patternOffsetY: number;
  patternScale: number;
  eyebrowX: number;
  eyebrowY: number;
  eyebrowSize: number;
  eyebrowOpacity: number;
  showEyebrowLine: boolean;
  subtitleSize: number;
  subtitleOffsetX: number;
  subtitleOffsetY: number;
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
  publishMode: "manual" | "browser_bridge";
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
  tags?: string[];
  commentsText?: string;
  savesText?: string;
  keywordUsed?: string;
};
type ViralAnalysis = {
  sampleCount: number;
  topKeywords: Array<{ value: string; uses: number }>;
  topTags: Array<{ value: string; uses: number }>;
  titleStructures: Array<{ value: string; uses: number }>;
  topics: string[];
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
type Tab = "creator" | "assets" | "calendar" | "research";

const defaultCoverStyle: CoverStyle = {
  fontFamily: "serif",
  titleColor: "#ffffff",
  subtitleColor: "#eee9df",
  overlayColor: "#121713",
  overlayOpacity: 58,
  pattern: "frame",
  patternColor: "#ffffff",
  titleSize: 88,
  titleOffsetX: 0,
  titleOffsetY: 0,
  titleDirection: "horizontal",
  align: "left",
  position: "bottom",
  patternOffsetX: 0,
  patternOffsetY: 0,
  patternScale: 100,
  eyebrowX: 7.6,
  eyebrowY: 5.8,
  eyebrowSize: 26,
  eyebrowOpacity: 100,
  showEyebrowLine: true,
  subtitleSize: 28,
  subtitleOffsetX: 0,
  subtitleOffsetY: 0,
};
const emptyDraft: Draft = {
  title: "",
  titleOptions: ["", "", ""],
  coverEyebrow: "",
  coverTitle: "",
  coverSubtitle: "",
  coverStyle: defaultCoverStyle,
  body: "",
  tags: [],
  highlights: [],
  riskNotes: [],
  coverIndex: 0,
  mode: "等待上传项目实景图",
};
const initialMeta: ProjectMeta = {
  name: "",
  location: "",
  area: "",
  projectType: "",
  category: "其他项目",
  audience: "",
  brief: "",
};
const defaultSettings: AutomationSettings = {
  publishTime: "12:00",
  publishCadenceDays: 3,
  researchTime: "09:00",
  dailyResearchEnabled: false,
  requireApproval: true,
  publishMode: "manual",
  officialApiConnected: false,
  timezone: "Asia/Shanghai",
};
const navItems: Array<{ id: Tab; number: string; label: string }> = [
  { id: "creator", number: "01", label: "创作工作台" },
  { id: "assets", number: "02", label: "项目资产库" },
  { id: "calendar", number: "03", label: "发布日历" },
  { id: "research", number: "04", label: "引流笔记库" },
];
const projectCategories = ["全部项目", "商业项目", "住宅项目", "办公项目", "酒店项目", "展厅陈列项目", "其他项目"];
const spaceTypes = ["客厅", "餐厅", "厨房", "客餐厨一体", "卧室", "儿童房", "书房", "衣帽间", "卫浴空间", "玄关", "整屋住宅", "办公室", "设计工作室", "酒店大堂", "酒店客房", "民宿", "零售店铺", "餐饮空间", "咖啡空间", "商业展厅", "艺术展陈"];
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
const bodyEmojiGroups = [
  "💛💚💙💜🧡🖤❤💔💖💝💘💞💓💕💗❣🌸🌺🌷🎀💟",
  "🌵🌲🎄🌳🌴🌿🍀☘🌱🍃🎋🌾🎍🌼🏵🌻🌹💐🥀🍂🍁",
  "💯♨✨🌟⭐💫🔆✏🔥🎁🥇🥈🥉🏅🏆💧💦💎💍🌀🔷❄🎐🌊☁🌈",
  "❕❔❗❓⁉✖❌✔⭕💢➕➖➗✅❎⚠📍📢💬🎬🎈📷📝💡",
  "🥳🌝👧🏻👦🏻👀👂👃👄💅👨👩👫🙋🙌🙏👏👌👍👎👋✌💪",
  "🏠🏛🏖🌅🌄🌇🌆🌉🌌🌃☕🍰🍝🍿🥖🥨🍎🥞🍕🎨🖌📖",
];

function normalizedCoverStyle(value?: Partial<CoverStyle>): CoverStyle {
  const color = (candidate: unknown, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(candidate || "")) ? String(candidate) : fallback;
  const fontFamily = ["serif", "sans", "kai"].includes(String(value?.fontFamily)) ? value?.fontFamily as CoverStyle["fontFamily"] : defaultCoverStyle.fontFamily;
  const pattern = ["none", "frame", "grid", "dots", "corners", "polka", "textile", "gradient", "blue-white-dots", "ad-badge", "ad-ribbon", "editorial-bars", "spotlight"].includes(String(value?.pattern)) ? value?.pattern as CoverStyle["pattern"] : defaultCoverStyle.pattern;
  const align = ["left", "center"].includes(String(value?.align)) ? value?.align as CoverStyle["align"] : defaultCoverStyle.align;
  const position = ["top", "middle", "bottom"].includes(String(value?.position)) ? value?.position as CoverStyle["position"] : defaultCoverStyle.position;
  const titleDirection = ["horizontal", "vertical"].includes(String(value?.titleDirection)) ? value?.titleDirection as CoverStyle["titleDirection"] : defaultCoverStyle.titleDirection;
  return {
    ...defaultCoverStyle,
    fontFamily,
    pattern,
    align,
    position,
    titleDirection,
    titleColor: color(value?.titleColor, defaultCoverStyle.titleColor),
    subtitleColor: color(value?.subtitleColor, defaultCoverStyle.subtitleColor),
    overlayColor: color(value?.overlayColor, defaultCoverStyle.overlayColor),
    patternColor: color(value?.patternColor, defaultCoverStyle.patternColor),
    overlayOpacity: Math.min(90, Math.max(0, Number(value?.overlayOpacity ?? defaultCoverStyle.overlayOpacity))),
    titleSize: Math.min(120, Math.max(52, Number(value?.titleSize ?? defaultCoverStyle.titleSize))),
    titleOffsetX: Math.min(35, Math.max(-35, Number(value?.titleOffsetX ?? defaultCoverStyle.titleOffsetX))),
    titleOffsetY: Math.min(30, Math.max(-30, Number(value?.titleOffsetY ?? defaultCoverStyle.titleOffsetY))),
    patternOffsetX: Math.min(25, Math.max(-25, Number(value?.patternOffsetX ?? defaultCoverStyle.patternOffsetX))),
    patternOffsetY: Math.min(25, Math.max(-25, Number(value?.patternOffsetY ?? defaultCoverStyle.patternOffsetY))),
    patternScale: Math.min(160, Math.max(50, Number(value?.patternScale ?? defaultCoverStyle.patternScale))),
    eyebrowX: Math.min(50, Math.max(2, Number(value?.eyebrowX ?? defaultCoverStyle.eyebrowX))),
    eyebrowY: Math.min(35, Math.max(2, Number(value?.eyebrowY ?? defaultCoverStyle.eyebrowY))),
    eyebrowSize: Math.min(48, Math.max(16, Number(value?.eyebrowSize ?? defaultCoverStyle.eyebrowSize))),
    eyebrowOpacity: Math.min(100, Math.max(10, Number(value?.eyebrowOpacity ?? defaultCoverStyle.eyebrowOpacity))),
    showEyebrowLine: typeof value?.showEyebrowLine === "boolean" ? value.showEyebrowLine : defaultCoverStyle.showEyebrowLine,
    subtitleSize: Math.min(54, Math.max(18, Number(value?.subtitleSize ?? defaultCoverStyle.subtitleSize))),
    subtitleOffsetX: Math.min(30, Math.max(-30, Number(value?.subtitleOffsetX ?? defaultCoverStyle.subtitleOffsetX))),
    subtitleOffsetY: Math.min(25, Math.max(-20, Number(value?.subtitleOffsetY ?? defaultCoverStyle.subtitleOffsetY))),
  };
}

function collectResearchFromBridge(force: boolean) {
  return new Promise<BrowserResearchCandidate[]>((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", receiveResult);
      reject(new Error("等待右键收藏笔记超时，请确认发布桥已重新加载"));
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
  context.translate(style.patternOffsetX / 100 * 1080, style.patternOffsetY / 100 * 1440);
  const patternScale = style.patternScale / 100;
  context.translate(540, 720);
  context.scale(patternScale, patternScale);
  context.translate(-540, -720);
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
  } else if (style.pattern === "polka") {
    context.globalAlpha = 0.36;
    for (let row = 0, y = 70; y < 1440; row += 1, y += 92) {
      for (let x = 60 + (row % 2) * 46; x < 1080; x += 92) {
        context.beginPath(); context.arc(x, y, 15, 0, Math.PI * 2); context.fill();
      }
    }
  } else if (style.pattern === "textile") {
    context.globalAlpha = 0.18;
    context.lineWidth = 1.4;
    for (let offset = -1440; offset < 1080; offset += 18) {
      context.beginPath(); context.moveTo(offset, 0); context.lineTo(offset + 1440, 1440); context.stroke();
      context.beginPath(); context.moveTo(offset + 1440, 0); context.lineTo(offset, 1440); context.stroke();
    }
  } else if (style.pattern === "gradient") {
    context.globalAlpha = 0.48;
    const gradient = context.createRadialGradient(250, 360, 30, 250, 360, 720);
    gradient.addColorStop(0, style.patternColor);
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 1080, 1440);
  } else if (style.pattern === "blue-white-dots") {
    context.globalAlpha = 0.5;
    for (let row = 0, y = 64; y < 1440; row += 1, y += 76) {
      for (let column = 0, x = 52 + (row % 2) * 38; x < 1080; column += 1, x += 76) {
        context.fillStyle = (row + column) % 2 ? "#ffffff" : "#9fbfe6";
        context.beginPath(); context.arc(x, y, 9, 0, Math.PI * 2); context.fill();
      }
    }
  } else if (style.pattern === "ad-badge") {
    context.globalAlpha = 0.9;
    context.beginPath(); context.arc(870, 240, 118, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#ffffff"; context.lineWidth = 5; context.beginPath(); context.arc(870, 240, 94, 0, Math.PI * 2); context.stroke();
  } else if (style.pattern === "ad-ribbon") {
    context.globalAlpha = 0.88;
    context.beginPath(); context.moveTo(0, 150); context.lineTo(760, 0); context.lineTo(1080, 0); context.lineTo(1080, 155); context.lineTo(0, 310); context.closePath(); context.fill();
  } else if (style.pattern === "editorial-bars") {
    context.globalAlpha = 0.78;
    context.fillRect(60, 96, 480, 18); context.fillRect(60, 126, 270, 8);
    context.fillRect(760, 1280, 260, 18); context.fillRect(885, 1310, 135, 8);
  } else if (style.pattern === "spotlight") {
    const spotlight = context.createRadialGradient(810, 340, 20, 810, 340, 340);
    spotlight.addColorStop(0, style.patternColor); spotlight.addColorStop(1, "transparent");
    context.globalAlpha = 0.58; context.fillStyle = spotlight; context.fillRect(400, 0, 680, 760);
  }
  context.restore();
}

async function renderCoverDataUrl(source: string, eyebrow: string, title: string, subtitle: string, inputStyle?: Partial<CoverStyle>) {
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
  context.textAlign = "left";
  context.font = `700 ${style.eyebrowSize}px Georgia, "Times New Roman", serif`;
  context.fillStyle = style.titleColor;
  const eyebrowX = style.eyebrowX / 100 * canvas.width;
  const eyebrowY = style.eyebrowY / 100 * canvas.height;
  context.globalAlpha = style.eyebrowOpacity / 100;
  context.fillText((eyebrow || "ORIGINAL DESIGN · INTERIOR").toUpperCase().slice(0, 44), eyebrowX, eyebrowY);
  if (style.showEyebrowLine) {
    context.globalAlpha = style.eyebrowOpacity / 100 * 0.72;
    context.fillRect(eyebrowX, eyebrowY + style.eyebrowSize, Math.max(180, canvas.width - eyebrowX - 82), 2);
  }
  context.globalAlpha = 1;
  context.textAlign = style.align;
  const anchorX = (style.align === "center" ? canvas.width / 2 : 82) + style.titleOffsetX / 100 * canvas.width;
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
  const titleBase = (style.position === "top" ? 270 : style.position === "middle" ? 720 : 1110) + style.titleOffsetY / 100 * canvas.height;
  const lineHeight = style.titleSize * 1.15;
  const renderedLines = style.titleDirection === "vertical" ? chars.slice(0, 8) : lines.slice(0, 3);
  renderedLines.forEach((text, index) => context.fillText(text, anchorX, titleBase + index * lineHeight));
  context.font = `${style.subtitleSize}px system-ui, "Microsoft YaHei", sans-serif`;
  context.fillStyle = style.subtitleColor;
  const subtitleX = anchorX + style.subtitleOffsetX / 100 * canvas.width;
  const subtitleY = Math.min(1380, titleBase + renderedLines.length * lineHeight + 42 + style.subtitleOffsetY / 100 * canvas.height);
  context.fillText(subtitle.trim(), subtitleX, subtitleY);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function localFallback(meta: ProjectMeta, existingProjects: ProjectRecord[] = []): Draft {
  const location = meta.location || "项目所在地待确认";
  const area = meta.area || "面积待确认";
  const projectName = meta.name || `${location}${meta.projectType || "空间"}`;
  const space = `${meta.projectType} ${meta.category}`;
  const office = /办公|工作室/.test(space);
  const commercial = /商业|店铺|零售|餐饮|咖啡/.test(space);
  const hospitality = /酒店|民宿/.test(space);
  const creative = office ? {
    eyebrow: "ORIGINAL DESIGN · WORKPLACE",
    titles: [`${projectName}｜让灵感正在发生✨`, `${projectName}的协作场景`, `${projectName}如何表达品牌气质`],
    cover: `${projectName} · 灵感发生地`,
    body: `${projectName}位于${location}，这次先从已知设计信息梳理它与日常工作的关系✨\n\n${meta.brief || "项目围绕品牌表达、团队交流与真实工作动线组织空间。"}\n\n当前为本地预览，画面中的具体材质、色彩、灯光和空间关系需在 AI 图像识别恢复后进一步核验；未确认的内容不会写成项目事实。\n\n对于这个项目，你更希望先了解品牌表达还是协作动线？`,
    tags: ["办公空间设计", "办公室设计", "品牌空间", "室内设计", "实景案例", "设计工作室"],
  } : commercial ? {
    eyebrow: "ORIGINAL DESIGN · RETAIL",
    titles: [`${projectName}｜把体验写进空间✨`, `${projectName}的到店第一眼`, `${projectName}如何组织顾客路径`],
    cover: `${projectName} · 品牌场景`,
    body: `${projectName}位于${location}，本次先依据已知信息整理品牌与空间体验的关系✨\n\n${meta.brief || "项目围绕品牌识别、顾客路径、陈列与停留体验组织空间。"}\n\n当前为本地预览，照片中的材料、灯光、陈列和真实动线需在 AI 图像识别恢复后逐项核验，不把推测写成结论。\n\n你更想了解这个项目的品牌记忆点，还是顾客行走路径？`,
    tags: ["商业空间设计", "店铺设计", "品牌空间", "室内设计", "实景案例", "空间设计"],
  } : hospitality ? {
    eyebrow: "ORIGINAL DESIGN · HOSPITALITY",
    titles: [`${projectName}｜从抵达开始✨`, `${projectName}的停留节奏`, `${projectName}如何安放旅居体验`],
    cover: `${projectName} · 抵达之后`,
    body: `${projectName}位于${location}，本次从已知需求梳理抵达、停留和休息之间的关系✨\n\n${meta.brief || "项目围绕客人的抵达、停留、休息与服务动线重新组织空间。"}\n\n当前为本地预览，照片中的光线、材质、尺度和服务场景将在 AI 图像识别恢复后核验，避免把看不清的内容写进正文。\n\n对于这次旅居设计，你更关注抵达体验还是客房舒适度？`,
    tags: ["酒店设计", "民宿设计", "旅居空间", "室内设计", "实景案例", "空间体验"],
  } : {
    eyebrow: "ORIGINAL DESIGN · INTERIOR",
    titles: [`${projectName}｜${area}的居住线索🌿`, `${projectName}从已知需求出发`, `${projectName}如何回应日常生活`],
    cover: `${projectName} · 居住线索`,
    body: `${projectName}位于${location}，面积为${area}。本次先从已知设计信息理解它的居住需求🌿\n\n${meta.brief || "项目围绕光线、材质、动线与收纳重新梳理空间。"}\n\n当前为本地预览，实景图中的具体空间、材料、光线和功能关系将在 AI 图像识别恢复后逐项核验；没有得到照片或资料支持的内容不会被写成事实。\n\n对于${projectName}，你最想先了解哪一种生活场景？`,
    tags: ["室内设计", "住宅设计", "实景案例", "全案设计", "自然系住宅", "设计工作室"],
  };
  const used = new Set(existingProjects.flatMap((project) => [
    project.draft?.title,
    ...(project.draft?.titleOptions || []),
    project.draft?.coverTitle,
    project.draft?.coverSubtitle,
    project.draft?.body,
  ]).map((value) => String(value || "").replace(/\s+/g, "").trim()).filter(Boolean));
  const unique = (value: string, index: number) => used.has(value.replace(/\s+/g, "").trim()) ? `${value} · ${projectName}${index + 1}` : value;
  const titleOptions = creative.titles.map(unique);
  const coverTitle = unique(creative.cover, 3);
  const body = unique(creative.body, 4);
  return {
    title: titleOptions[0],
    titleOptions,
    coverEyebrow: creative.eyebrow,
    coverTitle,
    coverSubtitle: `${location} · ${area} ${meta.projectType || "空间设计"}`,
    coverStyle: defaultCoverStyle,
    body,
    tags: creative.tags,
    highlights: ["从上传图片提取视觉基调", "依据画面选择竖版封面", "正文避免虚构未知项目事实"],
    riskNotes: ["当前为本地差异化预览；AI 调用恢复后才能完成逐张实景图语义识别"],
    coverIndex: 0,
    mode: "本地视觉预览",
  };
}

export function StudioSecretary({ accountName, isSiteOwner }: { accountName: string; isSiteOwner: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>("creator");
  const [meta, setMeta] = useState(initialMeta);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const insertBodyEmoji = (emoji: string) => {
    const textarea = bodyTextareaRef.current;
    const start = textarea?.selectionStart ?? draft.body.length;
    const end = textarea?.selectionEnd ?? start;
    setDraft((current) => ({ ...current, body: `${current.body.slice(0, start)}${emoji}${current.body.slice(end)}` }));
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };
  const [renderedCoverPreview, setRenderedCoverPreview] = useState("");
  const [phase, setPhase] = useState<"ready" | "uploading" | "analyzing" | "done">("ready");
  const [notice, setNotice] = useState("示例已就绪，可替换图片重新生成");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [settings, setSettings] = useState<AutomationSettings>(defaultSettings);
  const [references, setReferences] = useState<ResearchReference[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<number, string>>({});
  const [selectedScheduleProjectId, setSelectedScheduleProjectId] = useState<number | null>(null);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchNotice, setResearchNotice] = useState("");
  const [viralAnalysis, setViralAnalysis] = useState<ViralAnalysis | null>(null);
  const [assetCategory, setAssetCategory] = useState("全部项目");
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [messageForm, setMessageForm] = useState({ senderName: "", message: "", sourceUrl: "" });
  const [serviceNotice, setServiceNotice] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [bridgeReady, setBridgeReady] = useState(false);
  const [profileUrl, setProfileUrl] = useState(() => (
    typeof window === "undefined" ? "" : window.localStorage.getItem("mj-xhs-profile-url") || ""
  ));

  const coverImage = previews[draft.coverIndex ?? 0] || "";
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
  const selectedScheduleProject = projects.find((project) => project.id === selectedScheduleProjectId);
  const selectedScheduleReady = Boolean(selectedScheduleProject && ["approved", "scheduled"].includes(selectedScheduleProject.status));
  const visibleProjects = assetCategory === "全部项目"
    ? projects
    : projects.filter((project) => project.category === assetCategory);
  const visibleResearchReferences = references.filter((reference) => {
    try {
      const url = new URL(reference.sourceUrl);
      return url.hostname.endsWith("xiaohongshu.com") && /\/(?:explore|discovery\/item)\//.test(url.pathname);
    } catch {
      return false;
    }
  }).slice(0, 3);

  useEffect(() => {
    if (!coverImage) { setRenderedCoverPreview(""); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void renderCoverDataUrl(coverImage, draft.coverEyebrow, draft.coverTitle, draft.coverSubtitle, draft.coverStyle)
        .then((dataUrl) => { if (!cancelled) setRenderedCoverPreview(dataUrl); })
        .catch(() => { if (!cancelled) setRenderedCoverPreview(""); });
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [coverImage, draft.coverEyebrow, draft.coverTitle, draft.coverSubtitle, draft.coverStyle]);

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const [projectResponse, settingsResponse, researchResponse] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/settings"),
          fetch("/api/research"),
        ]);
        const projectPayload = projectResponse.ok ? await projectResponse.json() as { projects: ProjectRecord[] } : { projects: [] };
        const settingsPayload = settingsResponse.ok ? await settingsResponse.json() as { settings: AutomationSettings } : { settings: defaultSettings };
        const researchPayload = researchResponse.ok ? await researchResponse.json() as { references: ResearchReference[] } : { references: [] };
        setProjects(projectPayload.projects);
        setSettings(settingsPayload.settings);
        setReferences(researchPayload.references);
        setScheduleDrafts(Object.fromEntries(projectPayload.projects.map((project) => [
          project.id,
          project.scheduledAt ? dateTimeInput(new Date(project.scheduledAt)) : nextSlot(settingsPayload.settings),
        ])));
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
      if (message.version === 4 && (["MJ_XHS_BRIDGE_READY", "MJ_XHS_DRAFT_STORED", "MJ_XHS_SCHEDULE_STORED"].includes(String(message.type)))) {
        setBridgeReady(true);
      }
    }
    window.addEventListener("message", receiveBridgeStatus);
    window.postMessage({ source: XHS_BRIDGE_SOURCE, type: "MJ_XHS_BRIDGE_PING" }, window.location.origin);
    return () => window.removeEventListener("message", receiveBridgeStatus);
  }, []);

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
    setNotice(files.length ? "正在上传并建立项目资产档案…" : currentProjectId ? "正在同步设计信息并重新分析项目原图…" : "正在重新分析示例项目…");
    if (!files.length && !currentProjectId) {
      setDraft(emptyDraft);
      setPhase("ready");
      setNotice("请先上传项目实景图，再生成封面、标题与正文");
      return;
    }
    try {
      let projectId = currentProjectId;
      if (files.length) {
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
        projectId = project.id;
        setCurrentProjectId(project.id);
        setScheduleDrafts((current) => ({ ...current, [project.id]: nextSlot(settings) }));
      } else if (projectId) {
        const synced = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ meta }),
        });
        if (!synced.ok) throw new Error("最新设计信息同步失败");
      }
      if (!projectId) throw new Error("请先选择项目或上传实景图");
      setPhase("analyzing");
      setNotice("秘书正在重新识别原图，并同步生成全部标题、封面、正文与标签…");
      const generated = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!generated.ok) {
        const error = await generated.json() as { error?: string };
        throw new Error(error.error || "AI 生成暂不可用");
      }
      const result = await generated.json() as { draft: Draft; meta?: Partial<ProjectMeta> };
      setDraft({ ...result.draft, coverStyle: normalizedCoverStyle(result.draft.coverStyle) });
      if (result.meta) setMeta((current) => ({ ...current, ...result.meta }));
      setPhase("done");
      setNotice("已依据项目原图与最新设计信息，完整更新标题、封面样式、正文和标签");
      await refreshProjects();
    } catch (error) {
      setDraft(localFallback(meta, projects));
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
    setSettingsNotice(settings.publishMode === "browser_bridge"
      ? `已启用发布桥定时发布：排期后由当前电脑的 Edge 到点打开小红书发布页`
      : `已保存人工发布模式：每 ${settings.publishCadenceDays} 天 ${settings.publishTime} 提醒发布`);
  }

  async function sendScheduleToBridge(project: ProjectRecord, scheduledAt: string) {
    const projectDraft = project.id === currentProjectId
      ? draft
      : { ...emptyDraft, ...project.draft, coverStyle: normalizedCoverStyle(project.draft?.coverStyle) } as Draft;
    const coverIndex = Math.max(0, projectDraft.coverIndex ?? 0);
    const sourceImage = project.images?.[coverIndex]?.url || project.images?.[0]?.url;
    if (!sourceImage) throw new Error("项目没有可用于定时发布的封面图片");
    const coverDataUrl = await renderCoverDataUrl(sourceImage, projectDraft.coverEyebrow, projectDraft.coverTitle, projectDraft.coverSubtitle, projectDraft.coverStyle);
    const images = (project.images || []).filter((_, index) => index !== coverIndex).slice(0, 9).map((image) => ({
      url: new URL(image.url, window.location.origin).href,
      fileName: image.fileName,
    }));
    const payload: XhsBridgeDraft = {
      version: 2,
      projectId: project.id,
      projectName: project.name,
      title: projectDraft.title.trim(),
      body: projectDraft.body.trim(),
      tags: projectDraft.tags.map((tag) => tag.replace(/^#/, "").trim()).filter(Boolean),
      coverDataUrl,
      images,
      publishAction: "prefill",
      createdAt: new Date().toISOString(),
    };
    window.postMessage({ source: XHS_BRIDGE_SOURCE, type: "MJ_XHS_SCHEDULE_REQUEST", scheduledAt, payload }, window.location.origin);
  }

  async function scheduleProject(projectId: number) {
    const scheduledAt = scheduleDrafts[projectId] || nextSlot(settings);
    const project = projects.find((item) => item.id === projectId);
    if (settings.publishMode === "browser_bridge" && !bridgeReady) {
      setNotice("发布桥定时发布需要先安装并连接 MJ 发布桥 1.9");
      return;
    }
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
    if (settings.publishMode === "browser_bridge" && project) {
      try {
        await sendScheduleToBridge(project, new Date(scheduledAt).toISOString());
        setNotice("项目已保存到发布桥定时队列；到点会打开小红书官方发布页并执行一次受限发布");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "发布桥定时任务保存失败");
      }
    } else {
      setNotice("项目已加入发布日历，发布前会保留人工确认");
    }
    await refreshProjects();
  }

  async function removeSchedule(project: ProjectRecord) {
    if (!project.scheduledAt || !window.confirm(`确认从发布日历移除“${project.name}”吗？项目仍会保留在资产库中。`)) return;
    const response = await fetch(`/api/projects/${project.id}/schedule`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledAt: null }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setNotice(payload.error || "取消排期失败");
      return;
    }
    setScheduleDrafts((current) => ({ ...current, [project.id]: nextSlot(settings) }));
    window.postMessage({ source: XHS_BRIDGE_SOURCE, type: "MJ_XHS_CANCEL_SCHEDULE", projectId: project.id }, window.location.origin);
    setNotice(`“${project.name}”已从发布日历移除，项目仍保存在资产库中`);
    await refreshProjects();
  }

  async function deleteProject(project: ProjectRecord) {
    if (!window.confirm(`确认永久删除“${project.name}”吗？项目图片、封面、文案和排期都会一并删除，且无法恢复。`)) return;
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setNotice(payload.error || "项目删除失败");
      return;
    }
    if (currentProjectId === project.id) {
      setCurrentProjectId(null);
      setFiles([]);
      setPreviews([]);
      setMeta(initialMeta);
      setDraft(emptyDraft);
      setPhase("ready");
    }
    setProjects((current) => current.filter((item) => item.id !== project.id));
    setScheduleDrafts((current) => {
      const next = { ...current };
      delete next[project.id];
      return next;
    });
    setNotice(`“${project.name}”已从项目资产库删除`);
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
    setDraft({ ...emptyDraft, ...project.draft, coverStyle: normalizedCoverStyle(project.draft?.coverStyle), titleOptions: project.draft?.titleOptions?.length === 3 ? project.draft.titleOptions : [project.draft?.title || "", "", ""], tags: project.draft?.tags || [], highlights: project.draft?.highlights || [], riskNotes: project.draft?.riskNotes || [] });
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
      coverDataUrl = await renderCoverDataUrl(coverImage, draft.coverEyebrow, draft.coverTitle, draft.coverSubtitle, draft.coverStyle);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "封面生成失败");
      return false;
    }
    if (!draft.title.trim() || !draft.coverTitle.trim() || !draft.body.trim()) {
      setNotice("保存前请确认笔记标题、封面主标题和正文不为空");
      return false;
    }
    const [response, coverResponse] = await Promise.all([
      fetch(`/api/projects/${currentProjectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ meta, draft: { ...draft, mode: "人工编辑" }, status, publishUrl }),
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
    const automaticAuthorized = autoPublish && bridgeReady;
    if (automaticAuthorized && !window.confirm(`确认自动发布「${draft.title.trim()}」？\n\n平台会同步1080×1440成品封面、项目图片、标题、正文与标签，并在 5 分钟内授权扩展点击一次小红书官方“发布”按钮。`)) {
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
      coverDataUrl = await renderCoverDataUrl(coverImage, draft.coverEyebrow, draft.coverTitle, draft.coverSubtitle, draft.coverStyle);
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
      publishAction: automaticAuthorized ? "auto_publish" : "prefill",
      authorization: automaticAuthorized ? {
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
      setNotice(automaticAuthorized
        ? "已同步成品封面、图片、标题与正文；MJ 发布桥将在页面准备完成后执行一次自动发布"
        : autoPublish && !bridgeReady
        ? "内容已保存并打开小红书官方发布页；发布桥尚未连接，本次已安全降级为人工确认发布"
        : bridgeReady
        ? "已把图片、标题与正文交给 MJ 发布桥；小红书发布页将自动预填，请检查后人工点击发布"
        : "已复制完整文案并打开小红书发布页；安装 MJ 发布桥后可自动预填图片、标题与正文");
    } catch {
      setNotice(automaticAuthorized
        ? "已把本次限时授权交给 MJ 发布桥，正在等待小红书页面完成预填并发布"
        : autoPublish && !bridgeReady
        ? "内容已保存并打开小红书官方发布页；请检查1080×1440封面后人工点击发布"
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
    setResearchNotice("正在同步浏览器中右键收藏的小红书室内设计笔记…");
    try {
      if (!bridgeReady) throw new Error("请安装或更新 MJ 发布桥 1.9，刷新平台后再解析右键收藏笔记");
      const browserCandidates = await collectResearchFromBridge(force);
      setResearchNotice(`已读取 ${browserCandidates.length} 篇右键收藏笔记，正在整理标题与正文引流结构…`);
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force, browserCandidates }),
      });
      const payload = await response.json() as { references?: ResearchReference[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "引流笔记收集失败");
      const latest = payload.references || [];
      setReferences((current) => [...latest, ...current.filter((item) => item.researchDate !== localDate())]);
      setResearchNotice(`已同步 ${latest.length} 篇室内设计引流笔记：保存原链接、标题与正文结构，不复制原文`);
    } catch (error) {
      setResearchNotice(error instanceof Error ? error.message : "引流笔记收集失败");
    } finally {
      setResearching(false);
    }
  }

  async function runPlaywrightResearch() {
    if (researching) return;
    setResearching(true);
    setResearchNotice("正在连接本机 Playwright，并采集室内设计热门图文笔记…");
    try {
      const local = await fetch("http://127.0.0.1:8766/crawl", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          keywords: ["室内设计", "住宅设计", "商业空间设计", "办公空间设计", "酒店设计", "展厅设计"],
          targetCount: 12,
        }),
      });
      const collected = await local.json() as { candidates?: BrowserResearchCandidate[]; analysis?: ViralAnalysis; error?: string };
      if (!local.ok) throw new Error(collected.error || "Playwright 采集失败");
      const browserCandidates = collected.candidates || [];
      if (!browserCandidates.length) throw new Error("没有采集到可用的室内设计笔记");
      setViralAnalysis(collected.analysis || null);
      setResearchNotice(`已采集 ${browserCandidates.length} 篇热门笔记，正在保存爆款结构分析…`);
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force: true, browserCandidates }),
      });
      const payload = await response.json() as { references?: ResearchReference[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "热门笔记分析保存失败");
      const latest = payload.references || [];
      setReferences((current) => [...latest, ...current.filter((item) => item.researchDate !== localDate())]);
      setResearchNotice(`已完成 ${browserCandidates.length} 篇样本分析；关键词、标签、标题结构和互动写法会用于下一次实景图文案生成`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Playwright 采集失败";
      setResearchNotice(message.includes("fetch") || message.includes("Failed")
        ? "本机采集助手未启动。请先运行 playwright-research/start.ps1，再点击采集"
        : message);
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
      setServiceNotice("请安装或更新 MJ 发布桥 1.8，刷新平台后再同步笔记评论");
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
      setServiceNotice("请先连接 MJ 发布桥 1.8");
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
          <label className="wide"><span>项目名称（选填）</span><input placeholder="可留空，系统将仅根据实景图创作" value={meta.name} onChange={(event) => updateMeta("name", event.target.value)}/></label>
          <label><span>所在地（选填）</span><input placeholder="可留空" value={meta.location} onChange={(event) => updateMeta("location", event.target.value)}/></label>
          <label><span>项目面积（选填）</span><input placeholder="可留空" value={meta.area} onChange={(event) => updateMeta("area", event.target.value)}/></label>
          <label><span>资产库分区</span><select value={meta.category} onChange={(event) => updateMeta("category", event.target.value)}>{projectCategories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label>
          <label><span>空间类型（决定文案与封面策略）</span><input list="space-type-options" value={meta.projectType} placeholder="选择或输入具体空间" onChange={(event) => updateMeta("projectType", event.target.value)}/><datalist id="space-type-options">{spaceTypes.map((space) => <option key={space} value={space}/>)}</datalist><small className="field-hint">例如客厅侧重采光与家庭互动，商业空间侧重品牌与顾客动线</small></label>
          <label><span>目标客户（选填）</span><input placeholder="可留空" value={meta.audience} onChange={(event) => updateMeta("audience", event.target.value)}/></label>
          <label className="wide"><span>已知设计信息（选填）</span><textarea placeholder="可留空；AI 会从实景图识别空间、材质、色彩、采光与动线" value={meta.brief} onChange={(event) => updateMeta("brief", event.target.value)}/></label>
        </div>
        <button className="primary-action" disabled={phase === "uploading" || phase === "analyzing"}><span>{phase === "analyzing" ? "正在逐张识别图片并生成全部内容…" : "生成封面＋正文与标题"}</span><span>→</span></button>
        <p className="notice">{notice}</p>
      </form>
    </section>
    <section className="preview-panel">
      <div className="section-heading compact"><div><span>LIVE PREVIEW</span><h2>发布预览</h2></div><span className="mode-label">{draft.mode || "AI 分析"}</span></div>
      <div className="phone-frame"><div className="cover-preview final-artwork-preview">{coverImage ? <img src={renderedCoverPreview || coverImage} alt="与小红书最终封面完全一致的发布预览"/> : <div className="empty-cover-placeholder">上传项目实景图后生成封面</div>}</div></div>
      <p className="final-preview-note">1080 × 1440 小红书竖版封面 · 此处直接显示最终合成图片</p>
      <div className={`bridge-status ${bridgeReady ? "connected" : ""}`}>
        <span>{bridgeReady ? "MJ 发布桥 1.9 已连接" : "未连接最新版 MJ 发布桥"}</span>
        <p>{bridgeReady ? "成品封面、项目图片、标题、正文与标签会保持统一；可选择人工发布或单篇确认后自动发布。" : "安装一次浏览器扩展，即可把已确认内容自动带入小红书官方图文发布页。"}</p>
        {!bridgeReady && <a href={XHS_BRIDGE_EXTENSION_URL} download>下载或更新 MJ 发布桥扩展</a>}
      </div>
      <div className="publish-actions">
        <button type="button" className="secondary-action" onClick={() => void publishNow()}>确认并预填小红书发布页</button>
        <button type="button" className="auto-publish-action" onClick={() => void publishNow(true)}>确认本篇并自动发布</button>
        <button type="button" className="queue-action" onClick={() => void approveAndSchedule()}>确认并加入三天队列</button>
        <button type="button" className="icon-action" onClick={() => void saveProject("drafted")} aria-label="保存到项目资产库">保存到资产库</button>
      </div>
    </section>
    <section className="editorial-card editor-mode">
      <div className="editorial-title"><span>EDITABLE COPY</span><label><small>已选择的笔记标题</small><textarea value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}/></label><div className="fact-row">{facts.map((fact) => <span key={fact}>{fact}</span>)}</div></div>
      <div className="copy-column">
        <div className="title-options"><small>3 个标题方案 · 点击选择</small>{draft.titleOptions.map((title, index) => <button className={draft.title === title ? "active" : ""} key={`${title}-${index}`} onClick={() => setDraft((current) => ({ ...current, title }))}><span>0{index + 1}</span>{title}<em>{draft.title === title ? "已选择" : "选择"}</em></button>)}</div>
        <label><small>封面英文栏目</small><input value={draft.coverEyebrow} maxLength={44} onChange={(event) => setDraft((current) => ({ ...current, coverEyebrow: event.target.value.toUpperCase() }))}/></label>
        <label><small>封面主标题</small><input value={draft.coverTitle} onChange={(event) => setDraft((current) => ({ ...current, coverTitle: event.target.value }))}/></label>
        <label><small>封面副标题</small><input value={draft.coverSubtitle} onChange={(event) => setDraft((current) => ({ ...current, coverSubtitle: event.target.value }))}/></label>
        <div className="cover-designer">
          <div className="cover-designer-heading"><div><small>COVER DESIGNER</small><strong>封面样式编辑</strong></div><button onClick={() => setDraft((current) => ({ ...current, coverStyle: defaultCoverStyle }))}>恢复默认</button></div>
          <div className="cover-control-grid">
            <label><small>标题字体</small><select value={normalizedCoverStyle(draft.coverStyle).fontFamily} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), fontFamily: event.target.value as CoverStyle["fontFamily"] } }))}><option value="serif">宋体 / 衬线</option><option value="sans">黑体 / 无衬线</option><option value="kai">楷体</option></select></label>
            <label><small>广告封面装饰</small><select value={normalizedCoverStyle(draft.coverStyle).pattern} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), pattern: event.target.value as CoverStyle["pattern"] } }))}><option value="none">无图案</option><option value="ad-badge">广告圆形角标</option><option value="ad-ribbon">广告斜切色带</option><option value="editorial-bars">杂志编辑线条</option><option value="spotlight">广告聚光色块</option><option value="frame">细线边框</option><option value="grid">建筑网格</option><option value="dots">圆点阵列</option><option value="corners">四角标记</option><option value="polka">波点</option><option value="textile">面料肌理</option><option value="gradient">柔和渐变</option><option value="blue-white-dots">蓝白波点</option></select></label>
            <label><small>文字位置</small><select value={normalizedCoverStyle(draft.coverStyle).position} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), position: event.target.value as CoverStyle["position"] } }))}><option value="top">顶部</option><option value="middle">居中</option><option value="bottom">底部</option></select></label>
            <label><small>文字对齐</small><select value={normalizedCoverStyle(draft.coverStyle).align} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), align: event.target.value as CoverStyle["align"] } }))}><option value="left">左对齐</option><option value="center">居中</option></select></label>
            <label><small>主标题排版</small><select value={normalizedCoverStyle(draft.coverStyle).titleDirection} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), titleDirection: event.target.value as CoverStyle["titleDirection"] } }))}><option value="horizontal">横向海报排版</option><option value="vertical">竖向中文排版</option></select></label>
            <label className="color-control"><small>标题颜色</small><input type="color" value={normalizedCoverStyle(draft.coverStyle).titleColor} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), titleColor: event.target.value } }))}/></label>
            <label className="color-control"><small>副标题颜色</small><input type="color" value={normalizedCoverStyle(draft.coverStyle).subtitleColor} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), subtitleColor: event.target.value } }))}/></label>
            <label className="color-control"><small>图案颜色</small><input type="color" value={normalizedCoverStyle(draft.coverStyle).patternColor} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), patternColor: event.target.value } }))}/></label>
            <label className="color-control"><small>遮罩颜色</small><input type="color" value={normalizedCoverStyle(draft.coverStyle).overlayColor} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), overlayColor: event.target.value } }))}/></label>
            <label className="range-control"><small>标题字号 · {normalizedCoverStyle(draft.coverStyle).titleSize}</small><input type="range" min="52" max="120" value={normalizedCoverStyle(draft.coverStyle).titleSize} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), titleSize: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>主标题水平位置 · {normalizedCoverStyle(draft.coverStyle).titleOffsetX}</small><input type="range" min="-35" max="35" value={normalizedCoverStyle(draft.coverStyle).titleOffsetX} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), titleOffsetX: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>主标题垂直位置 · {normalizedCoverStyle(draft.coverStyle).titleOffsetY}</small><input type="range" min="-30" max="30" value={normalizedCoverStyle(draft.coverStyle).titleOffsetY} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), titleOffsetY: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>遮罩强度 · {normalizedCoverStyle(draft.coverStyle).overlayOpacity}%</small><input type="range" min="0" max="90" value={normalizedCoverStyle(draft.coverStyle).overlayOpacity} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), overlayOpacity: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>图案水平位置 · {normalizedCoverStyle(draft.coverStyle).patternOffsetX}</small><input type="range" min="-25" max="25" value={normalizedCoverStyle(draft.coverStyle).patternOffsetX} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), patternOffsetX: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>图案垂直位置 · {normalizedCoverStyle(draft.coverStyle).patternOffsetY}</small><input type="range" min="-25" max="25" value={normalizedCoverStyle(draft.coverStyle).patternOffsetY} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), patternOffsetY: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>图案大小 · {normalizedCoverStyle(draft.coverStyle).patternScale}%</small><input type="range" min="50" max="160" value={normalizedCoverStyle(draft.coverStyle).patternScale} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), patternScale: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>英文水平位置 · {normalizedCoverStyle(draft.coverStyle).eyebrowX}%</small><input type="range" min="2" max="50" value={normalizedCoverStyle(draft.coverStyle).eyebrowX} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), eyebrowX: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>英文垂直位置 · {normalizedCoverStyle(draft.coverStyle).eyebrowY}%</small><input type="range" min="2" max="35" value={normalizedCoverStyle(draft.coverStyle).eyebrowY} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), eyebrowY: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>英文字号 · {normalizedCoverStyle(draft.coverStyle).eyebrowSize}</small><input type="range" min="16" max="48" value={normalizedCoverStyle(draft.coverStyle).eyebrowSize} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), eyebrowSize: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>英文透明度 · {normalizedCoverStyle(draft.coverStyle).eyebrowOpacity}%</small><input type="range" min="10" max="100" value={normalizedCoverStyle(draft.coverStyle).eyebrowOpacity} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), eyebrowOpacity: Number(event.target.value) } }))}/></label>
            <label className="line-toggle"><small>英文栏目横线</small><span><input type="checkbox" checked={normalizedCoverStyle(draft.coverStyle).showEyebrowLine} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), showEyebrowLine: event.target.checked } }))}/> 显示横线</span></label>
            <label className="range-control"><small>副标题字号 · {normalizedCoverStyle(draft.coverStyle).subtitleSize}</small><input type="range" min="18" max="54" value={normalizedCoverStyle(draft.coverStyle).subtitleSize} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), subtitleSize: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>副标题水平位置 · {normalizedCoverStyle(draft.coverStyle).subtitleOffsetX}</small><input type="range" min="-30" max="30" value={normalizedCoverStyle(draft.coverStyle).subtitleOffsetX} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), subtitleOffsetX: Number(event.target.value) } }))}/></label>
            <label className="range-control"><small>副标题垂直位置 · {normalizedCoverStyle(draft.coverStyle).subtitleOffsetY}</small><input type="range" min="-20" max="25" value={normalizedCoverStyle(draft.coverStyle).subtitleOffsetY} onChange={(event) => setDraft((current) => ({ ...current, coverStyle: { ...normalizedCoverStyle(current.coverStyle), subtitleOffsetY: Number(event.target.value) } }))}/></label>
          </div>
        </div>
        <div className="body-compose"><label><small>正文</small><textarea ref={bodyTextareaRef} className="body-editor" value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}/></label><details className="emoji-picker"><summary>Emoji 表情大全</summary><p>先点击正文任意位置，再点击表情即可插入光标处</p><div>{bodyEmojiGroups.flatMap((group) => Array.from(group).filter((emoji) => emoji !== "️")).map((emoji, index) => <button type="button" key={`${emoji}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => insertBodyEmoji(emoji)} aria-label={`插入 ${emoji}`}>{emoji}</button>)}</div></details></div>
        <label><small>话题标签（用逗号或空格分隔）</small><input value={draft.tags.join("，")} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value.split(/[，,\s#]+/).filter(Boolean).slice(0, 12) }))}/></label>
        <div className="editor-actions"><button type="button" onClick={() => void saveProject("drafted")}>保存到资产库</button><button type="button" className="approve-action" onClick={() => void saveProject("approved")}>确认并同步保存</button><button type="button" onClick={() => void approveAndSchedule()}>确认并加入三天队列</button></div>
        <p className="sync-state">{lastSyncedAt ? `✓ 已于 ${lastSyncedAt} 同步更新到项目资产库` : "确认后会同步更新封面、标题、正文与标签，并保存到项目资产库"}</p>
      </div>
      <div className="analysis-column"><div><span className="mini-heading">图片分析要点</span><ul>{draft.highlights.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="risk-box"><span>发布前确认</span>{draft.riskNotes.map((note) => <p key={note}>{note}</p>)}</div></div>
    </section>
  </div>;

  const assetView = <section className="dashboard-card">
    <div className="section-heading"><div><span>PROJECT ASSET LIBRARY</span><h2>项目资产库</h2><p>所有实景图、项目信息、生成文案与排期都按项目长期保存。</p></div><button className="small-action" onClick={() => setActiveTab("creator")}>＋ 新建项目</button></div>
    <div className="category-tabs">{projectCategories.map((category) => <button className={assetCategory === category ? "active" : ""} key={category} onClick={() => setAssetCategory(category)}>{category}<span>{category === "全部项目" ? projects.length : projects.filter((project) => project.category === category).length}</span></button>)}</div>
    <div className="asset-grid">
      {visibleProjects.map((project) => <article className="asset-card" key={project.id}>
        {project.images?.[0] ? <img src={project.images[0].url} alt={project.name}/> : <div className="asset-placeholder">栖</div>}
        <div><span className={`state-pill ${project.status}`}>{statusLabels[project.status] || project.status}</span><h3>{project.name}</h3><p>{project.location || "地点待补充"}　{project.area || "面积待补充"}</p><small>{project.projectType || "空间类型待补充"} · {project.images?.length || 0} 张实景图 · {project.scheduledAt ? new Date(project.scheduledAt).toLocaleString("zh-CN") : "尚未排期"}</small><div className="asset-actions"><button onClick={() => loadProject(project)}>打开编辑</button>{["approved", "scheduled"].includes(project.status) && <button onClick={() => void markPublished(project)}>标记已发布</button>}<button className="danger-action" onClick={() => void deleteProject(project)}>删除项目</button></div></div>
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
          <button className={settings.publishMode === "browser_bridge" ? "active" : ""} disabled={!bridgeReady} onClick={() => setSettings((current) => ({ ...current, publishMode: "browser_bridge" }))}><strong>发布桥定时发布</strong><small>当前电脑到点自动打开官方发布页、预填并执行一次发布</small><em>{bridgeReady ? "发布桥 1.9 已连接" : "请安装发布桥 1.9"}</em></button>
        </div>
        <label><span>默认发布时间</span><input type="time" value={settings.publishTime} onChange={(event) => setSettings((current) => ({ ...current, publishTime: event.target.value }))}/></label>
        <label><span>发布间隔</span><div className="number-control"><input type="number" min="1" max="30" value={settings.publishCadenceDays} onChange={(event) => setSettings((current) => ({ ...current, publishCadenceDays: Number(event.target.value) }))}/><em>天</em></div></label>
        <label><span>引流笔记收集时间</span><input type="time" value={settings.researchTime} onChange={(event) => setSettings((current) => ({ ...current, researchTime: event.target.value }))}/></label>
        <label className="toggle-row"><span>自动发布小红书笔记项目</span><input type="checkbox" disabled={!bridgeReady} checked={settings.publishMode === "browser_bridge"} onChange={(event) => setSettings((current) => ({ ...current, publishMode: event.target.checked ? "browser_bridge" : "manual" }))}/></label>
        <label className="toggle-row wide"><span>发布前保留人工确认</span><input type="checkbox" checked={settings.requireApproval} onChange={(event) => setSettings((current) => ({ ...current, requireApproval: event.target.checked }))}/></label>
      </div>
      <button className="primary-action settings-save" onClick={() => void saveSettings()}><span>保存自动配置</span><span>→</span></button>
      <p className="notice">{settingsNotice || "可选择人工立即发布，或使用当前电脑上的 MJ 发布桥进行定时发布。"}</p>
    </section>
    <section className="dashboard-card queue-card">
      <div className="section-heading"><div><span>PUBLISH QUEUE</span><h2>项目发布日历</h2><p>选择项目与北京时间；发布桥会同步任务，到点打开并预填小红书官方发布页。排期可随时更新或取消。</p></div><span className="counter">{scheduledProjects.length} 个已排期</span></div>
      <div className="quick-schedule">
        <label><span>选择项目</span><select value={selectedScheduleProjectId ?? ""} onChange={(event) => setSelectedScheduleProjectId(event.target.value ? Number(event.target.value) : null)}><option value="">请选择项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}{["approved", "scheduled"].includes(project.status) ? "" : "（需先确认文案）"}</option>)}</select></label>
        <label><span>发布日期与时间</span><input type="datetime-local" disabled={!selectedScheduleProjectId} value={selectedScheduleProjectId ? scheduleDrafts[selectedScheduleProjectId] || nextSlot(settings) : ""} onChange={(event) => selectedScheduleProjectId && setScheduleDrafts((current) => ({ ...current, [selectedScheduleProjectId]: event.target.value }))}/></label>
        <button disabled={!selectedScheduleReady || (settings.publishMode === "browser_bridge" && !bridgeReady)} onClick={() => selectedScheduleProjectId && void scheduleProject(selectedScheduleProjectId)}>{selectedScheduleProject?.scheduledAt ? "同步更新排期" : "加入发布桥定时发布"}</button>
      </div>
      <div className="queue-list">
        {projects.map((project) => <div className="queue-item" key={project.id}>
          <button className="queue-project queue-project-button" onClick={() => loadProject(project)}>{project.images?.[0] ? <img src={project.images[0].url} alt=""/> : <span>{project.name.slice(0, 1)}</span>}<div><strong>{project.name}</strong><small>{project.location || "未填写地点"} · {project.area || project.projectType || "室内设计项目"}</small><em>{project.scheduledAt ? `已同步：${new Date(project.scheduledAt).toLocaleString("zh-CN")}` : "点击打开项目"}</em></div></button>
          <input type="datetime-local" value={scheduleDrafts[project.id] || nextSlot(settings)} onChange={(event) => setScheduleDrafts((current) => ({ ...current, [project.id]: event.target.value }))}/>
          <div className="queue-buttons"><button disabled={!['approved', 'scheduled'].includes(project.status)} onClick={() => void scheduleProject(project.id)}>{project.scheduledAt ? "更新并同步" : project.status === "approved" ? "加入日历" : "需先确认"}</button>{project.scheduledAt && <button className="danger-action" onClick={() => void removeSchedule(project)}>取消定时发布</button>}</div>
        </div>)}
        {!projects.length && <div className="empty-state"><strong>还没有可排期项目</strong><p>先在创作工作台上传项目实景图，项目会自动进入这里。</p></div>}
      </div>
    </section>
  </div>;

  const researchView = <section className="dashboard-card">
    <div className="section-heading"><div><span>XIAOHONGSHU VIRAL NOTE LIBRARY</span><h2>室内设计引流笔记解析库</h2><p>从当前登录的小红书公开页面收藏真实笔记，按可见点赞排序，并用千问解析标题关键词、正文结构、空间卖点与互动转化方法；只提炼规律，不复制原文。</p></div><div className="research-actions"><button className="small-action primary-research" disabled={researching} onClick={() => void runPlaywrightResearch()}>{researching ? "正在采集分析…" : "采集热门室内设计笔记"}</button><button className="small-action" disabled={researching} onClick={() => void runResearch(true)}>解析右键收藏</button></div></div>
    <div className="research-summary"><div><strong>热度</strong><span>点赞优先排序</span></div><div><strong>规律</strong><span>关键词·标签·标题结构</span></div><div><strong>生成</strong><span>实景图原创文案</span></div></div>
    {viralAnalysis && <div className="viral-analysis-panel">
      <div><small>热门关键词</small><p>{viralAnalysis.topKeywords.slice(0, 6).map((item) => item.value).join(" · ") || "等待更多样本"}</p></div>
      <div><small>热门标签</small><p>{viralAnalysis.topTags.slice(0, 6).map((item) => `#${item.value}`).join(" ") || "等待更多样本"}</p></div>
      <div><small>标题结构</small><p>{viralAnalysis.titleStructures.filter((item) => item.uses > 0).map((item) => `${item.value}（${item.uses}）`).join(" · ") || "情绪体验 + 设计亮点"}</p></div>
      <div className="topic-suggestions"><small>自动生成选题</small>{viralAnalysis.topics.map((topic, index) => <button type="button" key={topic} onClick={() => { setMeta((current) => ({ ...current, brief: `${current.brief ? `${current.brief}\n` : ""}选题方向 ${index + 1}：${topic}` })); setActiveTab("creator"); setNotice("选题已加入设计信息，请上传实景图并生成完整文案"); }}>{topic}<span>应用到创作 →</span></button>)}</div>
    </div>}
    <p className="research-notice">{researchNotice || `最近收集日期：${visibleResearchReferences[0]?.researchDate || "请启动本机采集助手或右键收藏原笔记"}`}</p>
    <div className="research-grid">
      {visibleResearchReferences.map((reference, index) => <a className="research-card" href={reference.sourceUrl} target="_blank" rel="noreferrer" key={reference.id}>
        <div className={`research-cover tone-${index % 3}`}><span>REFERENCE {String((index % 3) + 1).padStart(2, "0")}</span><strong>{reference.title}</strong><small>{reference.author || "公开来源"}</small></div>
        <div className="research-analysis"><span className="generation-ready">✓ 真实原笔记链接已收藏并完成结构解析</span>{reference.likes > 0 && <span className="generation-ready">公开可见点赞：{reference.likes.toLocaleString("zh-CN")}</span>}<h3>标题与关键词布局</h3><p>{reference.coverAnalysis}</p><h3>正文内容结构解析</h3><p>{reference.copyAnalysis}</p><h3>可复用的引流方法</h3><p>{reference.reusablePattern}</p></div>
        <div className="source-row"><span>来源：{reference.author || "小红书公开作者"}</span><strong>直接打开原笔记网页 ↗</strong></div>
      </a>)}
      {!visibleResearchReferences.length && <div className="empty-state research-empty"><strong>还没有热门笔记样本</strong><p>先启动本机 Playwright 采集助手，再点击“Playwright 采集热门笔记”；也可以继续使用扩展右键收藏单篇原笔记。</p><button onClick={() => void runPlaywrightResearch()}>开始热门笔记分析</button></div>}
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
      <nav aria-label="平台功能导航">{navItems.map((item) => <button aria-current={activeTab === item.id ? "page" : undefined} className={activeTab === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => setActiveTab(item.id)}><span>{item.number}</span>{item.label}</button>)}</nav>
      <div className="cadence-card copyright-card"><small>©2026</small><strong>由 MJ 制作</strong><p>网站平台</p></div>
      <a className="wechat-share-link" href="/wechat" target="_blank" rel="noreferrer">微信转发页 ↗</a>
      <p className="sidebar-note">图片、事实、排期与参考均按项目归档。正式发布前保留人工确认。</p>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><p className="kicker">XIAOHONGSHU CREATIVE SERVICE</p><h1>小红书创作服务平台</h1><p className="account-workspace">{isSiteOwner ? "网站作者专属工作区" : "新账户独立工作区"}：{accountName}</p><p className="account-privacy">仅当前登录账户可查看本工作区资料，其他账户无法访问。</p></div><div className="topbar-actions"><span className={`status-chip ${phase}`}>{phaseLabel}</span><a className="avatar" href="https://www.xiaohongshu.com/" target="_blank" rel="noreferrer" aria-label="登录当前浏览器的小红书账户">XHS</a></div></header>
      <div className={`xhs-session-banner ${bridgeReady ? "connected" : ""}`}><div><strong>{bridgeReady ? "当前浏览器发布桥已连接" : "其他账户首次使用需重新登录小红书"}</strong><p>{bridgeReady ? "研究、评论与发布只使用这个浏览器当前登录的小红书账户，不会共享其他人的登录状态。" : "请先在当前浏览器登录自己的小红书账户，并安装 MJ 发布桥，再开始编辑创作和发布。"}</p><label><span>当前小红书主页链接</span><input value={profileUrl} onChange={(event) => { const value = event.target.value.trim(); setProfileUrl(value); window.localStorage.setItem("mj-xhs-profile-url", value); }} placeholder="登录后复制自己的小红书主页链接"/></label></div><div>{!bridgeReady && <a href={XHS_BRIDGE_EXTENSION_URL} download>下载发布桥</a>}<a href="https://www.xiaohongshu.com/" target="_blank" rel="noreferrer">登录小红书 ↗</a></div></div>
      {activeTab === "creator" && creatorView}
      {activeTab === "assets" && assetView}
      {activeTab === "calendar" && calendarView}
      {activeTab === "research" && researchView}
    </section>
  </main>;
}
