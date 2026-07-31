chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
