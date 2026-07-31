import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the studio secretary product surface", async () => {
  const page = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  assert.match(page, /小红书创作服务平台/);
  assert.match(page, /上传项目实景图/);
  assert.match(page, /项目资产库/);
  assert.match(page, /自动工作节奏/);
  assert.match(page, /每日 3 篇小红书高热参考解析/);
  assert.match(page, /确认并打开小红书发布页/);
  assert.match(page, /确认并加入三天队列/);
  assert.match(page, /商业项目/);
  assert.match(page, /住宅项目/);
  assert.match(page, /办公项目/);
  assert.match(page, /酒店项目/);
  assert.match(page, /展厅陈列项目/);
  assert.match(page, /小红书客服助手/);
  assert.match(page, /高风险站外导流模板 · 已禁用自动发送/);
  assert.match(page, /3 个标题方案 · 点击选择/);
  assert.match(page, /确认并同步保存/);
  assert.match(page, /©2026/);
  assert.match(page, /由 MJ 制作/);
  assert.match(page, /最多 10 张实景图/);
  assert.match(page, /可分批人工添加，最多 10 张/);
  assert.match(page, /人工立即发布/);
  assert.match(page, /官方 API 自动发布/);
  assert.match(page, /等待官方授权/);
  assert.match(page, /保存项目并生成封面与文案/);
  assert.match(page, /浙江 · 温州/);
});

test("uses Node CI instead of applying Deno lint rules to the Node app", async () => {
  const workflow = await readFile(new URL("../.github/workflows/deno.yml", import.meta.url), "utf8");
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
  assert.match(generate, /slice\(0,10\)/);
});

test("generates and persists three selectable title options", async () => {
  const generate = await readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8");
  const project = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  assert.match(generate, /titleOptions 必须正好包含 3 个标题/);
  assert.match(generate, /draft\.titleOptions=options/);
  assert.match(project, /titleOptions/);
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
});

test("ships a durable, human-reviewed customer service handoff", async () => {
  const route = await readFile(new URL("../app/api/customer-service/route.ts", import.meta.url), "utf8");
  assert.match(route, /SAFE_REPLY/);
  assert.match(route, /suggestedReply/);
  assert.doesNotMatch(route, /LIKE-MJ0666666/);
});

test("ships configurable scheduling and daily research APIs", async () => {
  const settings = await readFile(new URL("../app/api/settings/route.ts", import.meta.url), "utf8");
  const research = await readFile(new URL("../app/api/research/route.ts", import.meta.url), "utf8");
  const researchService = await readFile(new URL("../lib/research.ts", import.meta.url), "utf8");
  assert.match(settings, /publishCadenceDays/);
  assert.match(settings, /researchTime/);
  assert.match(research, /collectDailyResearch/);
  assert.match(researchService, /type: "web_search"/);
  assert.match(researchService, /不得大段摘录或改写原文/);
  assert.match(researchService, /isXiaohongshuNoteUrl/);
});

test("requires a human-approved draft before scheduling", async () => {
  const projectApi = await readFile(new URL("../app/api/projects/[id]/route.ts", import.meta.url), "utf8");
  const scheduleApi = await readFile(new URL("../app/api/projects/[id]/schedule/route.ts", import.meta.url), "utf8");
  assert.match(projectApi, /approvedAt/);
  assert.match(projectApi, /publishedAt/);
  assert.match(scheduleApi, /请先保存并人工确认封面与文案/);
});
