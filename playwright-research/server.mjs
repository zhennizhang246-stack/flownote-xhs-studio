import http from "node:http";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const port = 8766;
const root = path.dirname(fileURLToPath(import.meta.url));
const profile = path.join(root, ".profile");
const allowedOrigins = new Set([
  "https://xhs-studio-secretary.mj051225.chatgpt.site",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
]);
const indoorKeywords = ["室内设计", "住宅设计", "商业空间设计", "办公空间设计", "酒店设计", "展厅设计"];

function cors(origin = "") {
  return {
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "null",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "origin",
  };
}

function json(response, status, payload, origin) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", ...cors(origin) });
  response.end(JSON.stringify(payload));
}

async function bodyOf(request) {
  let text = "";
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 100_000) throw new Error("请求内容过大");
  }
  return text ? JSON.parse(text) : {};
}

function metric(text = "") {
  const match = String(text).replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([万wWkK]?)/);
  if (!match) return 0;
  const unit = match[2].toLowerCase();
  return Math.round(Number(match[1]) * (unit === "万" || unit === "w" ? 10_000 : unit === "k" ? 1_000 : 1));
}

function tokenize(text) {
  const stop = new Set(["室内设计", "设计", "空间", "项目", "真的", "这个", "我们", "一个", "如何", "什么"]);
  return (String(text).match(/[\u4e00-\u9fff]{2,6}|[A-Za-z]{3,}/g) || [])
    .map((word) => word.toLowerCase()).filter((word) => !stop.has(word));
}

function top(items, count = 10) {
  const frequency = new Map();
  for (const item of items) frequency.set(item, (frequency.get(item) || 0) + 1);
  return [...frequency.entries()].sort((a, b) => b[1] - a[1]).slice(0, count).map(([value, uses]) => ({ value, uses }));
}

function analyze(notes) {
  const titles = notes.map((note) => note.title);
  const titleStructures = [
    { value: "数字/面积 + 空间收益", uses: titles.filter((title) => /\d|㎡|m²/i.test(title)).length },
    { value: "疑问或痛点切入", uses: titles.filter((title) => /[?？]|怎么|如何|为什么|避坑/.test(title)).length },
    { value: "情绪体验 + 设计亮点", uses: titles.filter((title) => /氛围|松弛|治愈|高级|自然|光|感/.test(title)).length },
  ].sort((a, b) => b.uses - a.uses);
  const topKeywords = top(titles.flatMap(tokenize));
  const topTags = top(notes.flatMap((note) => note.tags.map((tag) => tag.replace(/^#/, ""))));
  const topics = [
    topKeywords[0]?.value && `从${topKeywords[0].value}切入，拆解照片里最值得借鉴的设计判断`,
    topTags[0]?.value && `${topTags[0].value}实景：材质、光线与动线如何共同形成体验`,
    "不堆砌风格：用3个照片可验证细节讲清空间价值",
  ].filter(Boolean).slice(0, 3);
  return { sampleCount: notes.length, topKeywords, topTags, titleStructures, topics };
}

async function text(locator, limit = 2000) {
  try { return String(await locator.first().innerText()).replace(/\s+/g, " ").trim().slice(0, limit); }
  catch { return ""; }
}

async function crawl(input = {}) {
  await mkdir(profile, { recursive: true });
  const keywords = Array.isArray(input.keywords) && input.keywords.length
    ? input.keywords.map(String).map((v) => v.trim()).filter(Boolean).slice(0, 6)
    : indoorKeywords;
  const targetCount = Math.min(20, Math.max(3, Number(input.targetCount) || 12));
  const context = await chromium.launchPersistentContext(profile, { headless: false, viewport: { width: 1440, height: 900 } });
  const page = context.pages()[0] || await context.newPage();
  const candidates = new Map();
  try {
    for (const keyword of keywords) {
      const url = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_explore_feed`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(2200);
      const pageText = await text(page.locator("body"), 2000);
      if (/安全验证|账号异常|完成验证/.test(pageText)) throw new Error("小红书要求安全验证，请在采集窗口人工完成后重试");
      if (/登录|扫码/.test(pageText) && !(await page.locator('a[href*="/explore/"]').count())) {
        throw new Error("请先在弹出的采集窗口登录小红书，然后再次点击采集");
      }
      for (let i = 0; i < 3; i += 1) {
        await page.mouse.wheel(0, 900);
        await page.waitForTimeout(900);
      }
      const cards = page.locator("section.note-item");
      for (let i = 0; i < Math.min(await cards.count(), 30); i += 1) {
        const card = cards.nth(i);
        const anchor = card.locator('a[href*="/explore/"],a[href*="/discovery/item/"]').first();
        const href = await anchor.getAttribute("href").catch(() => "");
        if (!href) continue;
        const sourceUrl = new URL(href, "https://www.xiaohongshu.com").href;
        const title = await text(card.locator('[class*="title"],.title'), 120);
        if (!title || candidates.has(sourceUrl)) continue;
        const author = await text(card.locator('[class*="author"],[class*="name"]'), 80);
        const cardText = await text(card, 600);
        const likesText = (cardText.match(/(?:赞|点赞)?\s*(\d+(?:\.\d+)?\s*[万wWkK]?)/)?.[1] || "").trim();
        candidates.set(sourceUrl, { sourceUrl, title, author, likesText, cardText, keywordUsed: keyword });
      }
      if (candidates.size >= targetCount) break;
    }

    const notes = [];
    const ranked = [...candidates.values()].sort((a, b) => metric(b.likesText) - metric(a.likesText)).slice(0, targetCount);
    for (const candidate of ranked) {
      await page.goto(candidate.sourceUrl, { waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => null);
      await page.waitForTimeout(1000);
      const body = await text(page.locator('#detail-desc,[class*="desc"],[class*="note-text"],article'), 1800);
      const tags = (body.match(/#[^#\s，。！？]{2,24}/g) || []).slice(0, 20);
      const content = body.replace(/\s+/g, " ").trim();
      notes.push({ ...candidate, cardText: content || candidate.cardText, tags });
    }
    return { candidates: notes, analysis: analyze(notes), collectedAt: new Date().toISOString() };
  } finally {
    await context.close();
  }
}

let running = false;
http.createServer(async (request, response) => {
  const origin = String(request.headers.origin || "");
  if (request.method === "OPTIONS") { response.writeHead(204, cors(origin)); response.end(); return; }
  if (!allowedOrigins.has(origin) && origin) { json(response, 403, { error: "不允许的来源" }, origin); return; }
  if (request.method === "GET" && request.url === "/health") { json(response, 200, { ok: true, service: "MJ Playwright Research" }, origin); return; }
  if (request.method === "POST" && request.url === "/crawl") {
    if (running) { json(response, 409, { error: "采集任务正在运行" }, origin); return; }
    running = true;
    try { json(response, 200, await crawl(await bodyOf(request)), origin); }
    catch (error) { json(response, 500, { error: error instanceof Error ? error.message : "采集失败" }, origin); }
    finally { running = false; }
    return;
  }
  json(response, 404, { error: "Not found" }, origin);
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`MJ Playwright Research ready: http://127.0.0.1:${port}\n`);
});
