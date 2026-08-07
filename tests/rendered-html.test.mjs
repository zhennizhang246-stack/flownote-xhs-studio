import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the studio secretary product surface", async () => {
  const page = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  assert.match(page, /小红书创作服务平台/);
  assert.match(page, /上传项目实景图/);
  assert.match(page, /项目资产库/);
  assert.match(page, /自动工作节奏/);
  assert.match(page, /引流笔记库/);
  assert.match(page, /确认并预填小红书发布页/);
  assert.match(page, /确认本篇并自动发布/);
  assert.match(page, /MJ 发布桥 2.2 已连接/);
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
  assert.match(page, /5 个爆款标题公式 · 点击选择/);
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
  assert.match(page, /真实原笔记链接已收藏并完成结构解析/);
  assert.match(page, /href=\{reference\.sourceUrl\}/);
  assert.match(page, /直接打开原笔记网页/);
  assert.match(page, /解析右键收藏/);
  assert.match(page, /visibleResearchReferences/);
  assert.match(page, /生成封面＋正文与标题/);
  assert.match(page, /const emptyDraft/);
  assert.doesNotMatch(page, /浙江 · 温州/);
});

test("ships a local bridge with manual prefill and single-use auto-publish authorization", async () => {
  const manifest = JSON.parse(await readFile(new URL("../browser-extension/manifest.json", import.meta.url), "utf8"));
  const siteBridge = await readFile(new URL("../browser-extension/site-bridge.js", import.meta.url), "utf8");
  const prefill = await readFile(new URL("../browser-extension/xhs-prefill.js", import.meta.url), "utf8");
  const research = await readFile(new URL("../browser-extension/xhs-research.js", import.meta.url), "utf8");
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, "2.2.0");
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

test("binds at most three computers to one isolated cloud workspace", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const devicesApi = await readFile(new URL("../app/api/devices/route.ts", import.meta.url), "utf8");
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  const sharedContent = await readFile(new URL("../lib/site-content.ts", import.meta.url), "utf8");
  assert.match(devicesApi, /MAX_ACCOUNT_DEVICES = 3/);
  assert.match(devicesApi, /requireAccountEmail/);
  assert.match(devicesApi, /eq\(accountDevices\.ownerEmail, ownerEmail\)/);
  assert.match(schema, /account_devices/);
  assert.match(schema, /idx_account_devices_owner_key/);
  assert.match(studio, /共享电脑 \{devices\.length\} \/ 3/);
  assert.match(studio, /打开小红书扫码登录/);
  assert.match(studio, /xhsWorkspace\.linked/);
  assert.match(sharedContent, /三台电脑共享发布/);
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
  assert.match(generate, /slice\(0, 10\)/);
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
  assert.match(generate, /styleVariants/);
  assert.match(generate, /detectedSpaceType/);
  assert.match(generate, /coverEyebrow/);
  assert.match(generate, /bodyOptions/);
  assert.match(generate, /coverEyebrow = ""/);
  assert.match(generate, /blue-white-dots/);
  assert.match(generate, /项目视觉档案/);
  assert.match(generate, /松弛生活/);
  assert.match(generate, /专业设计/);
  assert.match(generate, /高级极简/);
});

test("generates and persists five selectable title options", async () => {
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  assert.match(generate, /titleOptions 必须有 5 项/);
  assert.match(generate, /draft\.titleOptions = options/);
  assert.match(project, /titleOptions/);
});

test("falls back to an embedded viral-copy engine when visual API quota is unavailable", async () => {
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  const router = await readFile(new URL("../lib/ai-model-router.ts", import.meta.url), "utf8");
  const fallback = await readFile(new URL("../lib/fallback-copy.ts", import.meta.url), "utf8");
  assert.match(generate, /createFallbackDraft/);
  assert.match(generate, /generated\.attempts\.some/);
  assert.match(generate, /已自动切换免额度生成/);
  assert.match(router, /429/);
  assert.match(fallback, /网站内置爆款文案引擎 · 免 API 额度/);
  assert.match(fallback, /bodyOptions/);
  assert.match(fallback, /item\.slice\(0, 180\)/);
  assert.match(fallback, /exhibition/);
  assert.match(fallback, /architecture/);
  assert.match(fallback, /titleOptions/);
  assert.match(fallback, /谁懂啊！这/);
  assert.match(fallback, /建议收藏！/);
  assert.match(fallback, /\.slice\(0, 8\)/);
});

test("generates a complete photo-driven draft with three styles and restrained emoji", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  const router = await readFile(new URL("../lib/ai-model-router.ts", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  assert.match(studio, /ORIGINAL DESIGN · INTERIOR/);
  assert.match(studio, /封面英文栏目/);
  assert.match(studio, /renderCoverDataUrl\(coverImage, draft\.coverEyebrow/);
  assert.match(studio, /留空则封面不显示英文/);
  assert.match(studio, /4 套图片识别正文/);
  assert.doesNotMatch(studio, /eyebrow \|\| "ORIGINAL DESIGN · INTERIOR"/);
  assert.match(generate, /正文自然加入 3-6 个/);
  assert.match(generate, /researchReferences\.copyAnalysis/);
  assert.match(generate, /不得复制原句/);
  assert.match(generate, /image_url/);
  assert.doesNotMatch(generate, /DOUBAO_API_KEY/);
  assert.match(router, /qwen3-vl-plus/);
  assert.match(studio, /本地差异化预览/);
  assert.match(project, /coverEyebrow/);
  assert.match(studio, /生成封面＋正文与标题/);
  assert.match(generate, /识别空间类型、材质、色彩、自然与人工采光/);
  assert.match(generate, /generated\.mode/);
});

test("regenerates existing projects from stored photos after syncing current design information", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(studio, /currentProjectId \? "正在同步设计信息并重新分析项目原图/);
  assert.match(studio, /JSON\.stringify\(\{ meta \}\)/);
  assert.match(studio, /正在逐张识别图片并生成全部内容/);
  assert.match(project, /payload\.meta/);
  assert.match(project, /projectType: cleanMeta/);
  assert.match(generate, /只依据画面中可见事实/);
  assert.match(generate, /可选项目信息/);
});

test("creates photo-only drafts when project metadata is omitted", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const projects = await readFile(new URL("../app/api/projects/route.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(studio, /项目名称（选填）/);
  assert.match(studio, /可留空，系统将仅根据实景图创作/);
  assert.match(projects, /payload\.name\?\.trim\(\) \|\| "实景图识别项目"/);
  assert.match(generate, /用户提供的可选项目信息/);
  assert.match(generate, /禁止猜测材料品牌/);
  assert.match(generate, /项目名称、地点、面积、客户和设计信息缺失时直接省略/);
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
  assert.match(studio, /eyebrowWeight/);
  assert.match(project, /patternScale: Math\.min\(160/);
  assert.match(project, /eyebrowSize: Math\.min\(48/);
});

test("selects English logo presets and uploads fonts into the exported cover", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const fonts = await readFile(new URL("../app/api/fonts/route.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(studio, /固定英文 Logo 样式/);
  assert.match(studio, /WAOOOOOOOC!ESION/);
  assert.match(studio, /上传封面字体/);
  assert.match(studio, /new FontFace\("MJ Custom Cover"/);
  assert.match(studio, /customFontUrl/);
  assert.match(studio, /fetch\("\/api\/fonts"/);
  assert.match(project, /eyebrowLogoStyle/);
  assert.match(project, /customFontUrl/);
  assert.match(fonts, /PROJECT_MEDIA\.put/);
  assert.match(fonts, /8 \* 1024 \* 1024/);
  assert.match(project, /coverEyebrow: cleanText\(input\.coverEyebrow, 44\)\.toUpperCase\(\),/);
  assert.match(css, /NotoSansSC-Regular\.woff2/);
  assert.match(css, /Inter-var-2\.ttf/);
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
  assert.match(studio, /bodyTextareaRef/);
  assert.match(studio, /selectionStart/);
  assert.match(studio, /insertBodyEmoji/);
  assert.match(studio, /插入光标处/);
  assert.match(project, /titleOffsetX/);
  assert.match(project, /titleDirection/);
});

test("starts with a blank creator and renders movable advertising cover graphics", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  assert.match(studio, /const emptyDraft/);
  assert.match(studio, /useState<string\[\]>\(\[\]\)/);
  assert.match(studio, /上传项目实景图后生成封面/);
  assert.doesNotMatch(studio, /<span className="state-pill">示例项目<\/span>/);
  for (const pattern of ["ad-badge", "ad-ribbon", "editorial-bars", "spotlight"]) {
    assert.match(studio, new RegExp(`style\\.pattern === "${pattern}"`));
    assert.match(project, new RegExp(pattern));
  }
  assert.match(studio, /广告封面装饰/);
});

test("uses browser right-click collection first and keeps Playwright optional", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const research = await readFile(new URL("../lib/research.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  const router = await readFile(new URL("../lib/ai-model-router.ts", import.meta.url), "utf8");
  const collector = await readFile(new URL("../playwright-research/server.mjs", import.meta.url), "utf8");
  assert.match(studio, /http:\/\/127\.0\.0\.1:8766\/crawl/);
  assert.match(studio, /同步右键收藏并解析/);
  assert.match(studio, /本机批量采集（可选）/);
  assert.match(studio, /无需启动本机助手/);
  assert.match(studio, /热门关键词/);
  assert.match(studio, /自动生成选题/);
  assert.match(collector, /launchPersistentContext/);
  assert.match(collector, /室内设计/);
  assert.match(collector, /titleStructures/);
  assert.match(research, /keywordUsed/);
  assert.match(generate, /近期引流笔记的抽象规律/);
  assert.match(generate, /不得复制原句/);
  assert.match(generate, /generateWithModelFallback/);
  assert.match(router, /XHS_AI_MODELS/);
  assert.match(router, /for \(const model of provider\.models\)/);
  assert.match(router, /\[408, 429, 500, 502, 503, 504\]/);
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
  assert.match(studio, /取消排期/);
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

test("syncs confirmed Xiaohongshu publish results back to the project calendar", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const bridge = await readFile(new URL("../browser-extension/site-bridge.js", import.meta.url), "utf8");
  const worker = await readFile(new URL("../browser-extension/service-worker.js", import.meta.url), "utf8");
  const prefill = await readFile(new URL("../browser-extension/xhs-prefill.js", import.meta.url), "utf8");
  assert.match(prefill, /MJ_XHS_PUBLISH_RESULT/);
  assert.match(prefill, /发布成功\|发布完成\|已成功发布/);
  assert.match(worker, /mjXhsPublishResults/);
  assert.match(bridge, /MJ_XHS_PUBLISH_RESULTS/);
  assert.match(studio, /syncPublishedResults/);
  assert.match(studio, /仅在官方页面确认发布成功后/);
});

test("selects an approved project and date for bridge scheduling", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(studio, /selectedScheduleProjectId/);
  assert.match(studio, /请选择项目/);
  assert.match(studio, /发布日期与时间/);
  assert.match(studio, /加入发布桥定时发布/);
  assert.match(styles, /quick-schedule/);
});

test("ships configurable scheduling and browser-collected research APIs", async () => {
  const settings = await readFile(new URL("../app/api/settings/route.ts", import.meta.url), "utf8");
  const research = await readFile(new URL("../app/api/research/route.ts", import.meta.url), "utf8");
  const researchService = await readFile(new URL("../lib/research.ts", import.meta.url), "utf8");
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  assert.match(settings, /publishCadenceDays/);
  assert.match(settings, /researchTime/);
  assert.match(research, /collectDailyResearch/);
  assert.match(researchService, /analyzeCollectedNotes/);
  assert.match(researchService, /不复述或改写原文/);
  assert.match(researchService, /isXiaohongshuNoteUrl/);
  assert.match(researchService, /collectBrowserResearch/);
  assert.match(researchService, /abstractReusablePattern/);
  assert.match(researchService, /return url\.href\.slice/);
  assert.match(researchService, /parseVisibleMetric\(b\.likesText/);
  assert.match(researchService, /noteIdentity/);
  assert.match(researchService, /db\.delete\(researchReferences\)/);
  assert.match(generate, /近期引流笔记的抽象规律/);
  assert.match(generate, /不得复制原句/);
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
  assert.match(studio, /请扫码登录当前电脑的小红书/);
  assert.match(studio, /网站作者专属工作区/);
  assert.match(studio, /新账户独立工作区/);
  assert.match(studio, /绑定小红书共享工作区前/);
  assert.match(studio, /mj-xhs-profile-url/);
  assert.doesNotMatch(studio, /60f6318b0000000001015907/);
  assert.match(account, /PRIMARY_OWNER_EMAIL/);
  assert.match(projects, /requireAccountEmail/);
  assert.match(projects, /projects\.ownerEmail/);
  assert.match(settings, /accountAutomationSettings/);
  assert.match(settings, /onConflictDoNothing/);
});

test("syncs the latest creator features into isolated new-user workspaces", async () => {
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(studio, /!isSiteOwner && <section className="new-user-sync-card"/);
  assert.match(studio, /新账户功能已同步/);
  assert.match(studio, /实景图识别与多模型文案/);
  assert.match(studio, /右键收藏引流笔记并解析/);
  assert.match(studio, /同一小红书账号共享新项目库/);
  assert.match(css, /\.new-user-sync-card/);
});

test("shares only new projects across GPT accounts bound to the same Xiaohongshu profile", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  const account = await readFile(new URL("../lib/account.ts", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../app/api/xhs-workspace/route.ts", import.meta.url), "utf8");
  const studio = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  const migration = await readFile(new URL("../drizzle/0007_luxuriant_scarecrow.sql", import.meta.url), "utf8");
  assert.match(schema, /xhsWorkspaceLinks/);
  assert.match(account, /link\?\.workspaceKey \|\| userEmail/);
  assert.match(workspace, /requireRawAccountEmail/);
  assert.match(workspace, /bridgeConfirmed/);
  assert.match(workspace, /\/user\/profile\//);
  assert.match(studio, /绑定同一小红书项目库/);
  assert.match(studio, /网站作者绑定前的历史项目保持私有/);
  assert.match(studio, /window\.location\.reload\(\)/);
  assert.match(migration, /CREATE TABLE `xhs_workspace_links`/);
});

test("publishes a WeChat share page synchronized with the main site content", async () => {
  const sharePage = await readFile(new URL("../app/wechat/page.tsx", import.meta.url), "utf8");
  const sharedContent = await readFile(new URL("../lib/site-content.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(sharePage, /微信转发专页/);
  assert.match(sharePage, /公开功能介绍 · 不包含任何账户资料/);
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
