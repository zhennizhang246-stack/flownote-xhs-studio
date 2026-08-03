import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectImages, projects } from "../../../db/schema";
import { apiError, requireAccountEmail } from "../../../lib/account";

type GeneratedDraft = {
  projectName: string;
  detectedSpaceType: string;
  designSummary: string;
  title: string;
  titleOptions: string[];
  coverEyebrow: string;
  coverTitle: string;
  coverSubtitle: string;
  coverStyle: Record<string, unknown>;
  body: string;
  tags: string[];
  highlights: string[];
  riskNotes: string[];
  coverIndex: number;
  mode: string;
};

type OfficeProject = {
  id: number;
  name: string;
  location: string;
  area: string;
  projectType: string;
  category: string;
  audience: string;
  brief: string;
};

const officeStrategies = [
  { name: "共序办公空间", hook: "办公室不只要好看，更要让协作自然发生", cover: "让协作自然发生", subtitle: "办公动线 × 品牌表达 × 使用效率", question: "你的团队更需要安静专注，还是高效协作？" },
  { name: "流动工作场", hook: "好的办公室，先解决团队每天真正遇到的问题", cover: "办公室先解决问题", subtitle: "从动线开始重做工作体验", question: "如果只能先改一个区域，你会选择工位、会议室还是休息区？" },
  { name: "光合办公场", hook: "把采光、秩序与松弛感放进同一间办公室", cover: "让办公空间会呼吸", subtitle: "自然光 × 空间秩序 × 团队体验", question: "你理想中的办公室，最重要的关键词是什么？" },
  { name: "品牌会客厅", hook: "客户走进办公室的第一分钟，已经开始认识品牌", cover: "空间就是品牌名片", subtitle: "第一印象 × 接待体验 × 场景记忆", question: "你的办公室现在能让客户记住什么？" },
];

function localOfficeDraft(project: OfficeProject, imageCount: number): GeneratedDraft {
  const visualSeed = `${project.projectType}${project.brief}`.split("").reduce((sum, char) => sum + char.charCodeAt(0), project.id);
  const strategy = officeStrategies[Math.abs(visualSeed) % officeStrategies.length];
  const projectName = project.name && !/实景图识别项目|未命名项目/.test(project.name) ? project.name : strategy.name;
  const spaceType = project.projectType || "办公室设计";
  const designSummary = project.brief?.trim() || "围绕办公动线、专注与协作场景、客户接待和品牌表达组织内容；具体材质与空间细节以项目实景图和人工确认为准。";
  const titles = [
    `${spaceType}，${strategy.cover}✨`,
    "办公室设计，先抓住这3点",
    `${spaceType}如何兼顾颜值与效率`,
  ].map((item) => item.slice(0, 20));
  const locationKeyword = project.location ? `${project.location}办公室设计` : "办公室设计";
  const areaKeyword = project.area ? `${project.area}办公空间` : "办公空间设计";
  return {
    projectName,
    detectedSpaceType: spaceType,
    designSummary,
    title: titles[0],
    titleOptions: titles,
    coverEyebrow: "ORIGINAL DESIGN · WORKPLACE",
    coverTitle: strategy.cover,
    coverSubtitle: strategy.subtitle,
    coverStyle: { fontFamily: "sans", titleColor: "#ffffff", subtitleColor: "#f1eee7", overlayColor: "#162019", overlayOpacity: 52, pattern: "frame", patternColor: "#ffffff", titleSize: 82, titleOffsetX: 0, titleOffsetY: 2, titleDirection: "horizontal", align: "left", position: "bottom", patternOffsetX: 0, patternOffsetY: 0, patternScale: 100, eyebrowX: 7.6, eyebrowY: 5.8, eyebrowSize: 24, eyebrowOpacity: 92, showEyebrowLine: true, subtitleSize: 26, subtitleOffsetX: 0, subtitleOffsetY: 0 },
    body: `${strategy.hook}。\n\n💧 打开率：封面只保留一个核心利益点，让客户第一眼知道这不是单纯晒图，而是在解决办公效率与品牌表达。\n\n💧 使用价值：办公空间需要同时回应专注、协作、接待与休息。内容从真实工作场景出发，说明动线如何减少干扰、不同区域如何支持团队切换状态。\n\n💧 专业表达：${designSummary}\n\n💧 搜一搜布局：围绕“${locationKeyword}”“${areaKeyword}”“${spaceType}”“办公空间改造”自然展开，让正在找设计公司的客户更容易长期搜索到这篇笔记。\n\n${strategy.question}`,
    tags: [locationKeyword, areaKeyword, spaceType, "办公室设计", "办公空间改造", "设计公司", "商业空间设计", "办公动线"],
    highlights: ["封面利益点清晰", "正文提供可收藏的办公设计价值", "标题与正文自然布局长尾关键词", "结尾用真实需求问题引导咨询"],
    riskNotes: ["具体材质、面积与客户信息需人工确认后再发布", "内置策划引擎不会根据照片推测不可确认的事实"],
    coverIndex: imageCount > 0 ? 0 : 0,
    mode: "办公室流量策划引擎 · 无 API",
  };
}

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireAccountEmail();
    const { projectId } = await request.json() as { projectId?: number };
    if (!projectId) return Response.json({ error: "缺少项目编号" }, { status: 400 });
    const db = getDb();
    const [project] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail))).limit(1);
    if (!project) return Response.json({ error: "项目不存在" }, { status: 404 });
    const images = await db.select().from(projectImages).where(eq(projectImages.projectId, projectId));
    if (!images.length) return Response.json({ error: "项目没有图片" }, { status: 400 });
    const draft = localOfficeDraft(project, images.length);
    const generatedMeta = { name: draft.projectName, projectType: draft.detectedSpaceType, brief: draft.designSummary };
    await db.update(projects).set({ ...generatedMeta, status: "drafted", draftJson: JSON.stringify(draft) }).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail)));
    return Response.json({ draft, meta: generatedMeta });
  } catch (error) {
    return apiError(error, "生成失败");
  }
}
