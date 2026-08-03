const COLLECT_NOTE_MENU_ID = "mj-xhs-collect-note";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: COLLECT_NOTE_MENU_ID,
      title: "收藏到 MJ 引流笔记库",
      contexts: ["page", "link", "selection"],
      documentUrlPatterns: [
        "https://www.xiaohongshu.com/explore/*",
        "https://www.xiaohongshu.com/discovery/item/*",
      ],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== COLLECT_NOTE_MENU_ID || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "MJ_XHS_COLLECT_CURRENT_NOTE" }, (response) => {
    if (chrome.runtime.lastError || !response?.candidate?.sourceUrl) return;
    chrome.storage.local.get("mjXhsCollectedNotes", (stored) => {
      const current = Array.isArray(stored.mjXhsCollectedNotes) ? stored.mjXhsCollectedNotes : [];
      const candidate = response.candidate;
      const next = [candidate, ...current.filter((item) => item.sourceUrl !== candidate.sourceUrl)].slice(0, 30);
      chrome.storage.local.set({ mjXhsCollectedNotes: next, mjXhsCollectedAt: new Date().toISOString() });
    });
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "MJ_XHS_START_COMMENT_SYNC") {
    const requestId = String(message.requestId || "");
    const profileUrl = String(message.profileUrl || "");
    if (!requestId || !/^https:\/\/www\.xiaohongshu\.com\/user\/profile\/[0-9a-z]+/i.test(profileUrl)) return false;
    chrome.storage.local.set({
      mjXhsCommentSync: {
        requestId,
        profileUrl,
        createdAt: new Date().toISOString(),
        noteUrls: [],
        results: {},
      },
    }, () => chrome.tabs.create({ url: profileUrl, active: true }));
    return false;
  }
  if (message?.type === "MJ_XHS_PROFILE_NOTES") {
    chrome.storage.local.get("mjXhsCommentSync", (stored) => {
      const state = stored.mjXhsCommentSync;
      if (!state || state.requestId !== message.requestId) return;
      const noteUrls = Array.isArray(message.noteUrls) ? [...new Set(message.noteUrls)].slice(0, 3) : [];
      if (!noteUrls.length) {
        chrome.storage.local.set({
          mjXhsCommentSyncResult: {
            requestId: state.requestId,
            comments: [],
            error: "没有从主页读取到公开笔记，请确认账号已登录并重试",
          },
        });
        return;
      }
      chrome.storage.local.set({
        mjXhsCommentSync: { ...state, noteUrls, results: {} },
      }, () => noteUrls.forEach((url) => chrome.tabs.create({ url, active: false })));
    });
    return false;
  }
  if (message?.type === "MJ_XHS_NOTE_COMMENTS") {
    chrome.storage.local.get("mjXhsCommentSync", (stored) => {
      const state = stored.mjXhsCommentSync;
      if (!state || state.requestId !== message.requestId || !state.noteUrls?.includes(message.sourceUrl)) return;
      const results = { ...(state.results || {}), [message.sourceUrl]: Array.isArray(message.comments) ? message.comments : [] };
      const next = { ...state, results };
      chrome.storage.local.set({ mjXhsCommentSync: next });
      if (Object.keys(results).length >= state.noteUrls.length) {
        chrome.storage.local.set({
          mjXhsCommentSyncResult: {
            requestId: state.requestId,
            comments: Object.values(results).flat().slice(0, 50),
            error: "",
          },
        });
      }
    });
    return false;
  }
  if (message?.type === "MJ_XHS_START_COMMENT_REPLY") {
    const requestId = String(message.requestId || "");
    const actions = Array.isArray(message.actions) ? message.actions.slice(0, 5) : [];
    if (!requestId || !actions.length) return false;
    const state = {
      requestId,
      actions,
      authorization: message.authorization,
      results: {},
      createdAt: new Date().toISOString(),
    };
    chrome.storage.local.set({ mjXhsCommentReply: state }, () => {
      [...new Set(actions.map((action) => action.sourceUrl))].forEach((url) => {
        if (/^https:\/\/www\.xiaohongshu\.com\/(?:explore|discovery\/item)\//.test(url)) {
          chrome.tabs.create({ url, active: false });
        }
      });
    });
    return false;
  }
  if (message?.type === "MJ_XHS_COMMENT_REPLY_PROGRESS") {
    chrome.storage.local.get("mjXhsCommentReply", (stored) => {
      const state = stored.mjXhsCommentReply;
      if (!state || state.requestId !== message.requestId) return;
      const results = { ...(state.results || {}) };
      for (const result of Array.isArray(message.results) ? message.results : []) results[result.id] = result;
      const next = { ...state, results };
      chrome.storage.local.set({ mjXhsCommentReply: next });
      if (Object.keys(results).length >= state.actions.length) {
        chrome.storage.local.set({
          mjXhsCommentReplyResult: {
            requestId: state.requestId,
            results: Object.values(results),
            error: "",
          },
        });
      }
    });
    return false;
  }
  if (message?.type === "MJ_XHS_START_RESEARCH") {
    const requestId = String(message.requestId || "");
    if (!requestId) return false;
    chrome.storage.local.set({
      mjXhsResearchRequest: {
        requestId,
        createdAt: new Date().toISOString(),
      },
    }, () => {
      const query = encodeURIComponent("室内设计公司 实景案例 空间设计");
      chrome.tabs.create({
        url: `https://www.xiaohongshu.com/search_result?keyword=${query}&source=web_search_result_notes`,
        active: true,
      });
    });
    return false;
  }
  if (message?.type === "MJ_XHS_RESEARCH_RESULTS") {
    chrome.storage.local.set({
      mjXhsResearchResult: {
        requestId: String(message.requestId || ""),
        candidates: Array.isArray(message.candidates) ? message.candidates.slice(0, 12) : [],
        error: String(message.error || ""),
        collectedAt: new Date().toISOString(),
      },
    });
    return false;
  }
  if (message?.type !== "MJ_XHS_FETCH_IMAGE") return false;
  const url = String(message.url || "");
  if (!/^https:\/\/xhs-studio-secretary\.mj051225\.chatgpt\.site\/api\/media\/\d+$/.test(url)
      && !/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/api\/media\/\d+$/.test(url)) {
    sendResponse({ ok: false, error: "图片地址不在允许的平台范围内" });
    return false;
  }
  fetch(url, { credentials: "include" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`图片读取失败：${response.status}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
      }
      sendResponse({
        ok: true,
        base64: btoa(binary),
        contentType: response.headers.get("content-type") || "image/jpeg",
      });
    })
    .catch((error) => sendResponse({ ok: false, error: error.message || "图片读取失败" }));
  return true;
});

const scheduleKey = (projectId) => `mjXhsSchedule:${projectId}`;
const alarmName = (projectId) => `mj-xhs-publish:${projectId}`;

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "MJ_XHS_SAVE_SCHEDULE") {
    const projectId = Number(message.draft?.projectId);
    const when = Date.parse(String(message.scheduledAt || ""));
    if (!Number.isInteger(projectId) || !Number.isFinite(when) || when <= Date.now()) return false;
    chrome.storage.local.set({ [scheduleKey(projectId)]: { draft: message.draft, scheduledAt: new Date(when).toISOString() } });
    chrome.alarms.create(alarmName(projectId), { when });
    return false;
  }
  if (message?.type === "MJ_XHS_CANCEL_SCHEDULE") {
    const projectId = Number(message.projectId);
    if (!Number.isInteger(projectId)) return false;
    chrome.alarms.clear(alarmName(projectId));
    chrome.storage.local.remove(scheduleKey(projectId));
    return false;
  }
  return false;
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm.name.startsWith("mj-xhs-publish:")) return;
  const projectId = Number(alarm.name.split(":").pop());
  chrome.storage.local.get(scheduleKey(projectId), (stored) => {
    const scheduled = stored[scheduleKey(projectId)];
    if (!scheduled?.draft) return;
    const confirmedAt = new Date();
    const draft = {
      ...scheduled.draft,
      publishAction: "auto_publish",
      authorization: {
        confirmedAt: confirmedAt.toISOString(),
        expiresAt: new Date(confirmedAt.getTime() + 5 * 60_000).toISOString(),
        nonce: crypto.randomUUID(),
      },
      createdAt: confirmedAt.toISOString(),
    };
    chrome.storage.local.set({ mjXhsDraft: draft }, () => {
      chrome.tabs.create({
        url: "https://creator.xiaohongshu.com/publish/publish?source=official&from=menu&target=image",
        active: true,
      });
      chrome.storage.local.remove(scheduleKey(projectId));
    });
  });
});
