import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the studio secretary product surface", async () => {
  const page = await readFile(new URL("../app/studio-secretary.tsx", import.meta.url), "utf8");
  assert.match(page, /小红书创作服务平台/);
  assert.match(page, /上传项目实景图/);
  assert.match(page, /项目资产库/);
  assert.match(page, /自动工作节奏/);
  assert.match(page, /每日 3 篇高热参考解析/);
  assert.match(page, /保存项目并生成封面与文案/);
  assert.match(page, /浙江 · 温州/);
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
});
