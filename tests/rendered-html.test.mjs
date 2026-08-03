import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the studio secretary product surface", async () => {
  const page = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  assert.match(page, /小红书创作服务平台/);
  assert.match(page, /上传项目实景图/);
  assert.match(page, /项目资产库/);
  assert.match(page, /自动工作节奏/);
  assert.match(page, /室内设计小红书引流笔记收藏/);
  assert.match(page, /确认并预填小红书发布页/);
  assert.match(page, /确认本篇并自动发布/);
  assert.match(page, /MJ 发布桥 1.6 已连接/);
  assert.match(page, /同步浏览器中右键收藏/);
  assert.match(page, /from=menu&target=image/);
  assert.match(page, /renderCoverDataUrl/);
  assert.match(page, /5 \* 60_000/);
  assert.match(page, /确认并加入三天队列/);
  assert.match(page, /商业项目/);
  assert.match(page, /住宅项目/);
  assert.match(page, /办公项目/);
  assert.match(page, /酒店项目/);
  assert.match(page, /展厅陈列项目/);
  assert.match(page, /3 个标题方案 · 点击选择/);
  assert.match(page, /确认并同步保存/);
  assert.match(page, /©2026/);
  assert.match(page, /由 MJ 制作/);
  assert.match(page, /最多 10 张实景图/);
  assert.match(page, /可分批人工添加，最多 10 张/);
  assert.match(page, /人工立即发布/);
  assert.doesNotMatch(page, /官方 API 自动发布/);
  assert.match(page, /封面样式编辑/);
  assert.match(page, /建筑网格/);
  assert.match(page, /标题颜色/);
  assert.match(page, /原笔记完整网址、标题与可见正文已收藏/);
  assert.match(page, /href=\{reference\.sourceUrl\}/);
  assert.match(page, /直接打开原笔记网页/);
  assert.match(page, /同步右键收藏/);
  assert.match(page, /visibleResearchReferences/);
  assert.match(page, /保存项目并生成封面与文案/);
  assert.match(page, /浙江 · 温州/);
});

test("ships a local bridge with manual prefill and single-use auto-publish authorization", async () => {
  const manifest = JSON.parse(await readFile(new URL("../browser-extension/manifest.json", import.meta.url), "utf8"));
  const siteBridge = await readFile(new URL("../browser-extension/site-bridge.js", import.meta.url), "utf8");
  const prefill = await readFile(new URL("../browser-extension/xhs-prefill.js", import.meta.url), "utf8");
  const research = await readFile(new URL("../browser-extension/xhs-research.js", import.meta.url), "utf8");
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.content_scripts.some((entry) => entry.matches.includes("https://creator.xiaohongshu.com/publish/*")));
  assert.match(siteBridge, /MJ_XHS_DRAFT_STORED/);
  assert.match(prefill, /DataTransfer/);
  assert.match(prefill, /findTitleField/);
  assert.match(prefill, /findBodyField/);
  assert.match(prefill, /coverFile/);
  assert.match(prefill, /authorizationIsValid/);
  assert.match(prefill, /autoPublishConsumedAt/);
  assert.match(prefill, /hasVerificationBlocker/);
  assert.match(prefill, /candidates\.length === 1/);
  assert.match(prefill, /button\.click\(\)/);
  assert.match(siteBridge, /MJ_XHS_RESEARCH_REQUEST/);
  assert.match(research, /collectCandidates/);
  assert.match(research, /安全验证/);
  assert.match(research, /MJ_XHS_RESEARCH_RESULTS/);
  assert.ok(manifest.permissions.includes("contextMenus"));
  assert.match(research, /MJ_XHS_COLLECT_CURRENT_NOTE/);
});

test("uses Node CI instead of applying Deno lint rules to the Node app", async () => {
  const workflow = await readFile(new URL("../.github/workflows/node.yml", import.meta.url), "utf8");
  assert.match(workflow, /name: Node CI/);
  assert.match(workflow, /node-version: "24"/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm test/);
  assert.doesNotMatch(workflow, /deno lint/);
});

test("accepts and analyzes at most ten project images", async () => {
  const projects = await readFile(new URL("../app/api/projects/route.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(projects, /images\.length > 10/);
  assert.match(projects, /最多上传 10 张图片/);
  assert.match(generate, /images\.length/);
});

test("deletes owned projects and generates space-specific creative strategies", async () => {
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  assert.match(project, /export async function DELETE/);
  assert.match(project, /eq\(projects\.ownerEmail, ownerEmail\)/);
  assert.match(project, /db\.delete\(projectImages\)/);
  assert.match(studio, /删除项目/);
  assert.match(studio, /spaceTypes/);
  assert.match(generate, /officeStrategies/);
  assert.match(generate, /专注与协作场景/);
});

test("generates and persists three selectable title options", async () => {
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  assert.match(generate, /titleOptions: titles/);
  assert.match(generate, /办公室设计，先抓住这3点/);
  assert.match(project, /titleOptions/);
});

test("generates an office traffic draft without external AI APIs", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  assert.match(studio, /ORIGINAL DESIGN · INTERIOR/);
  assert.match(studio, /封面英文栏目/);
  assert.match(studio, /renderCoverDataUrl\(coverImage, draft\.coverEyebrow/);
  assert.match(generate, /coverEyebrow/);
  assert.match(generate, /办公室流量策划引擎 · 无 API/);
  assert.match(generate, /打开率/);
  assert.match(generate, /使用价值/);
  assert.match(generate, /搜一搜布局/);
  assert.doesNotMatch(generate, /api\.openai\.com|ark\.cn-beijing\.volces\.com|DOUBAO_API_KEY|OPENAI_API_KEY/);
  assert.match(studio, /本地差异化预览/);
  assert.match(project, /coverEyebrow/);
});

test("profiles uploaded office photos locally and varies the traffic strategy", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(studio, /analyzeProjectImages/);
  assert.match(studio, /createImageBitmap/);
  assert.match(studio, /明亮简约办公室/);
  assert.match(studio, /温润自然办公室/);
  assert.match(studio, /活力创意办公室/);
  assert.match(studio, /品牌展示型办公室/);
  assert.match(studio, /submissionMeta/);
  assert.match(generate, /visualSeed/);
  assert.match(generate, /spaceType.*strategy\.cover/);
});

test("regenerates existing projects from stored photos after syncing current design information", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(studio, /currentProjectId \? "正在同步设计信息并重新分析项目原图/);
  assert.match(studio, /JSON\.stringify\(\{ meta \}\)/);
  assert.match(studio, /按原图与最新设计信息重新生成全部内容/);
  assert.match(project, /payload\.meta/);
  assert.match(project, /projectType: cleanMeta/);
  assert.match(generate, /办公动线/);
  assert.match(generate, /品牌表达/);
});

test("creates photo-only drafts when project metadata is omitted", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const projects = await readFile(new URL("../app/api/projects/route.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(studio, /项目名称（选填）/);
  assert.match(studio, /可留空，系统将仅根据实景图创作/);
  assert.match(projects, /payload\.name\?\.trim\(\) \|\| "实景图识别项目"/);
  assert.match(generate, /实景图识别项目\|未命名项目/);
  assert.match(generate, /共序办公空间/);
  assert.match(generate, /detectedSpaceType/);
  assert.match(generate, /designSummary/);
  assert.match(generate, /generatedMeta/);
  assert.match(studio, /result\.meta/);
});

test("moves cover decorations and controls English eyebrow opacity and line visibility", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(studio, /图案水平位置/);
  assert.match(studio, /图案垂直位置/);
  assert.match(studio, /英文水平位置/);
  assert.match(studio, /英文垂直位置/);
  assert.match(studio, /英文透明度/);
  assert.match(studio, /英文栏目横线/);
  assert.match(studio, /if \(style\.showEyebrowLine\)/);
  assert.match(project, /patternOffsetX/);
  assert.match(project, /eyebrowOpacity/);
  assert.match(project, /showEyebrowLine/);
  assert.match(generate, /titleOffsetX: 0/);
});

test("renders polka, textile, gradient, and blue-white dot cover decorations", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  for (const label of ["波点", "面料肌理", "柔和渐变", "蓝白波点"]) assert.match(studio, new RegExp(label));
  for (const value of ["polka", "textile", "gradient", "blue-white-dots"]) {
    assert.match(studio, new RegExp(`style\\.pattern === \\\"${value}\\\"`));
    assert.match(project, new RegExp(value));
  }
  assert.match(studio, /createRadialGradient/);
});

test("resizes cover decorations, English eyebrow, and subtitle in the final artwork", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(studio, /图案大小 · \{normalizedCoverStyle\(draft\.coverStyle\)\.patternScale\}%/);
  assert.match(studio, /英文字号 · \{normalizedCoverStyle\(draft\.coverStyle\)\.eyebrowSize\}/);
  assert.match(studio, /副标题字号 · \{normalizedCoverStyle\(draft\.coverStyle\)\.subtitleSize\}/);
  assert.match(studio, /context\.scale\(patternScale, patternScale\)/);
  assert.match(studio, /700 \$\{style\.eyebrowSize\}px/);
  assert.match(project, /patternScale: Math\.min\(160/);
  assert.match(project, /eyebrowSize: Math\.min\(48/);
  assert.match(generate, /patternScale: 100/);
  assert.match(generate, /eyebrowSize: 24/);
});

test("moves and resizes the cover main title and inserts emoji into body copy", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  assert.match(studio, /主标题水平位置/);
  assert.match(studio, /主标题垂直位置/);
  assert.match(studio, /主标题排版/);
  assert.match(studio, /titleDirection === "vertical"/);
  assert.match(studio, /Emoji 表情大全/);
  assert.match(studio, /bodyEmojiGroups/);
  assert.match(project, /titleOffsetX/);
  assert.match(project, /titleDirection/);
});

test("resizes and repositions the cover subtitle in preview and exported artwork", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(studio, /副标题字号/);
  assert.match(studio, /副标题水平位置/);
  assert.match(studio, /副标题垂直位置/);
  assert.match(studio, /style\.subtitleOffsetX \/ 100 \* canvas\.width/);
  assert.match(studio, /style\.subtitleOffsetY \/ 100 \* canvas\.height/);
  assert.match(project, /subtitleSize/);
  assert.match(project, /subtitleOffsetX/);
  assert.match(project, /subtitleOffsetY/);
  assert.match(generate, /subtitleSize: 26/);
});

test("uses the final 1080 by 1440 rendered cover as the live Xiaohongshu preview", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  assert.match(studio, /const \[renderedCoverPreview/);
  assert.match(studio, /renderCoverDataUrl\(coverImage, draft\.coverEyebrow/);
  assert.match(studio, /src=\{renderedCoverPreview \|\| coverImage\}/);
  assert.match(studio, /1080 × 1440 小红书竖版封面/);
  assert.match(studio, /与小红书最终封面完全一致的发布预览/);
});

test("keeps save, prefill, three-day queue, and guarded auto-publish actions clickable", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  assert.match(studio, /const automaticAuthorized = autoPublish && bridgeReady/);
  assert.doesNotMatch(studio, /className="auto-publish-action" disabled=/);
  assert.match(studio, /publishAction: automaticAuthorized \? "auto_publish" : "prefill"/);
  assert.match(studio, /本次已安全降级为人工确认发布/);
  assert.match(studio, /await saveProject\("approved"\)/);
  assert.match(studio, /await scheduleProject\(currentProjectId\)/);
  assert.match(studio, /保存前请确认笔记标题、封面主标题和正文不为空/);
  assert.match(studio, /同步1080×1440成品封面/);
});

test("binds durable project storage", async () => {
  const hosting = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  assert.equal(hosting.d1, "DB");
  assert.equal(hosting.r2, "PROJECT_MEDIA");
  assert.match(schema, /project_images/);
  assert.match(schema, /draft_json/);
  assert.match(schema, /automation_settings/);
  assert.match(schema, /research_references/);
  assert.match(schema, /customer_messages/);
  assert.match(schema, /category/);
  assert.match(schema, /publish_mode/);
  assert.match(schema, /owner_email/);
  assert.match(schema, /account_automation_settings/);
});

test("removes the note comment secretary from navigation and the publishing bridge", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const manifest = await readFile(new URL("../browser-extension/manifest.json", import.meta.url), "utf8");
  assert.doesNotMatch(studio, /id: "service"/);
  assert.doesNotMatch(studio, /activeTab === "service"/);
  assert.doesNotMatch(manifest, /xhs-comments\.js/);
});

test("removes scheduled projects from the calendar without deleting their assets", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const schedule = await readFile(new URL("../app/api/projects/[id]/schedule/route.ts", import.meta.url), "utf8");
  assert.match(studio, /删除排期/);
  assert.match(studio, /body: JSON\.stringify\(\{ scheduledAt: null \}\)/);
  assert.match(schedule, /scheduledAt === null/);
  assert.match(schedule, /scheduledAt: null, status: "approved"/);
});

test("schedules guarded Xiaohongshu publishing through the local browser bridge", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const settings = await readFile(new URL("../app/api/settings/route.ts", import.meta.url), "utf8");
  const bridge = await readFile(new URL("../browser-extension/site-bridge.js", import.meta.url), "utf8");
  const worker = await readFile(new URL("../browser-extension/service-worker.js", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../browser-extension/manifest.json", import.meta.url), "utf8"));
  assert.match(studio, /发布桥定时发布/);
  assert.match(studio, /自动发布小红书笔记项目/);
  assert.doesNotMatch(studio, /每日自动研究/);
  assert.match(studio, /MJ_XHS_SCHEDULE_REQUEST/);
  assert.match(studio, /MJ_XHS_CANCEL_SCHEDULE/);
  assert.match(settings, /browser_bridge/);
  assert.match(bridge, /MJ_XHS_SAVE_SCHEDULE/);
  assert.match(worker, /chrome\.alarms\.create/);
  assert.match(worker, /chrome\.alarms\.onAlarm/);
  assert.match(worker, /publishAction: "auto_publish"/);
  assert.match(worker, /5 \* 60_000/);
  assert.ok(manifest.permissions.includes("alarms"));
  assert.match(worker, /收藏到 MJ 引流笔记库/);
});

test("ships configurable scheduling and daily research APIs", async () => {
  const settings = await readFile(new URL("../app/api/settings/route.ts", import.meta.url), "utf8");
  const research = await readFile(new URL("../app/api/research/route.ts", import.meta.url), "utf8");
  const researchService = await readFile(new URL("../lib/research.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(settings, /publishCadenceDays/);
  assert.match(settings, /researchTime/);
  assert.match(research, /collectDailyResearch/);
  assert.match(researchService, /type: "web_search"/);
  assert.match(researchService, /不得大段摘录或改写原文/);
  assert.match(researchService, /isXiaohongshuNoteUrl/);
  assert.match(researchService, /collectBrowserResearch/);
  assert.match(researchService, /abstractReusablePattern/);
  assert.match(researchService, /return url\.href\.slice/);
  assert.match(researchService, /parseVisibleMetric\(b\.likesText/);
  assert.match(researchService, /noteIdentity/);
  assert.match(researchService, /db\.delete\(researchReferences\)/);
  assert.match(generate, /搜一搜布局/);
  assert.match(generate, /长尾关键词/);
});

test("requires a human-approved draft before scheduling", async () => {
  const projectApi = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const scheduleApi = await readFile(new URL("../app/api/projects/[id]/schedule/route.ts", import.meta.url), "utf8");
  assert.match(projectApi, /approvedAt/);
  assert.match(projectApi, /publishedAt/);
  assert.match(scheduleApi, /请先保存并人工确认封面与文案/);
});

test("persists designed covers while keeping official API publishing out of the interface", async () => {
  const page = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const projectApi = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const coverApi = await readFile(new URL("../app/api/projects/[id]/cover/route.ts", import.meta.url), "utf8");
  const publishApi = await readFile(new URL("../app/api/publish/official/route.ts", import.meta.url), "utf8");
  const publisher = await readFile(new URL("../lib/official-publish.ts", import.meta.url), "utf8");
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(page, /normalizedCoverStyle/);
  assert.match(page, /drawCoverPattern/);
  assert.doesNotMatch(page, /submitOfficialProject/);
  assert.match(projectApi, /coverStyle/);
  assert.match(coverApi, /approved-cover\.jpg/);
  assert.match(publishApi, /publishProjectOfficial/);
  assert.match(publisher, /xiaohongshu\.com/);
  assert.match(publisher, /\["approved", "scheduled"\]/);
  assert.match(publisher, /publishDueProjects/);
  assert.match(worker, /publishDueProjects/);
});

test("publishes a sign-in-gated multi-account workspace without sharing Xiaohongshu sessions", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const account = await readFile(new URL("../lib/account.ts", import.meta.url), "utf8");
  const projects = await readFile(new URL("../app/api/projects/route.ts", import.meta.url), "utf8");
  const settings = await readFile(new URL("../app/api/settings/route.ts", import.meta.url), "utf8");
  assert.match(page, /requireChatGPTUser/);
  assert.match(page, /force-dynamic/);
  assert.match(page, /canClaimLegacyData/);
  assert.match(studio, /其他账户首次使用需重新登录小红书/);
  assert.match(studio, /网站作者专属工作区/);
  assert.match(studio, /新账户独立工作区/);
  assert.match(studio, /其他账户无法访问/);
  assert.match(studio, /mj-xhs-profile-url/);
  assert.doesNotMatch(studio, /60f6318b0000000001015907/);
  assert.match(account, /PRIMARY_OWNER_EMAIL/);
  assert.match(projects, /requireAccountEmail/);
  assert.match(projects, /projects\.ownerEmail/);
  assert.match(settings, /accountAutomationSettings/);
  assert.match(settings, /onConflictDoNothing/);
});

test("publishes a WeChat share page synchronized with the main site content", async () => {
  const sharePage = await readFile(new URL("../app/wechat/page.tsx", import.meta.url), "utf8");
  const sharedContent = await readFile(new URL("../lib/site-content.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(sharePage, /微信转发专页/);
  assert.match(sharePage, /与主站同步/);
  assert.match(sharePage, /openGraph/);
  assert.match(sharePage, /href="\/"/);
  assert.match(sharePage, /siteContent\.features/);
  assert.match(sharedContent, /shareDescription/);
  assert.match(page, /siteContent/);
  assert.match(layout, /siteContent/);
});

test("keeps every private author resource scoped to the signed-in account", async () => {
  const protectedRoutes = [
    "../app/api/projects/route.ts",
    "../app/api/projects/[id]/route.ts",
    "../app/api/projects/[id]/cover/route.ts",
    "../app/api/projects/[id]/schedule/route.ts",
    "../app/api/media/[id]/route.ts",
    "../app/api/generate/route.ts",
    "../app/api/research/route.ts",
    "../app/api/customer-service/route.ts",
    "../app/api/settings/route.ts",
    "../app/api/publish/official/route.ts",
  ];
  for (const route of protectedRoutes) {
    const source = await readFile(new URL(route, import.meta.url), "utf8");
    assert.match(source, /requireAccountEmail/, `${route} must authenticate the caller`);
    assert.match(source, /ownerEmail/, `${route} must scope records to the caller`);
  }
});

test("ships a touch-friendly mobile application layout", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /appleWebApp/);
  assert.match(studio, /aria-label="平台功能导航"/);
  assert.match(studio, /aria-current=/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /position:fixed/);
  assert.match(styles, /repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(styles, /min-height:46px/);
  assert.match(styles, /font-size:16px/);
});

test("ships an OpenID-isolated native WeChat mini program", async () => {
  const appConfig = JSON.parse(await readFile(new URL("../wechat-miniprogram/miniprogram/app.json", import.meta.url), "utf8"));
  const projectConfig = JSON.parse(await readFile(new URL("../wechat-miniprogram/project.config.json", import.meta.url), "utf8"));
  const cloudFunction = await readFile(new URL("../wechat-miniprogram/cloudfunctions/studio/index.js", import.meta.url), "utf8");
  const home = await readFile(new URL("../wechat-miniprogram/miniprogram/pages/home/index.js", import.meta.url), "utf8");
  const account = await readFile(new URL("../wechat-miniprogram/miniprogram/pages/account/index.wxml", import.meta.url), "utf8");
  assert.equal(appConfig.pages.length, 5);
  assert.equal(appConfig.tabBar.list.length, 5);
  assert.equal(projectConfig.miniprogramRoot, "miniprogram/");
  assert.equal(projectConfig.cloudfunctionRoot, "cloudfunctions/");
  assert.match(cloudFunction, /cloud\.getWXContext\(\)\.OPENID/);
  assert.match(cloudFunction, /ownerOpenId/);
  assert.match(cloudFunction, /项目不存在或无权访问/);
  assert.match(home, /count: remaining/);
  assert.match(cloudFunction, /slice\(0, 10\)/);
  assert.match(account, /open-type="getPhoneNumber"/);
});
