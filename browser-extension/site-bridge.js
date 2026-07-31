const STUDIO_SOURCE = "mj-xhs-studio";
const BRIDGE_SOURCE = "mj-xhs-bridge";

function notifyPage(type) {
  window.postMessage({ source: BRIDGE_SOURCE, type, version: 3 }, window.location.origin);
}

function normalizeDraft(value) {
  if (!value || value.version !== 2 || !Number.isInteger(value.projectId)) return null;
  const coverDataUrl = String(value.coverDataUrl || "");
  const images = Array.isArray(value.images)
    ? value.images.slice(0, 10).map((image) => ({
      url: String(image?.url || "").slice(0, 2000),
      fileName: String(image?.fileName || "project-image.jpg").slice(0, 180),
    })).filter((image) => /^https?:\/\//.test(image.url))
    : [];
  return {
    version: 2,
    projectId: value.projectId,
    projectName: String(value.projectName || "").slice(0, 120),
    title: String(value.title || "").trim().slice(0, 100),
    body: String(value.body || "").trim().slice(0, 10000),
    tags: Array.isArray(value.tags)
      ? value.tags.slice(0, 20).map((tag) => String(tag).replace(/^#/, "").trim().slice(0, 40)).filter(Boolean)
      : [],
    coverDataUrl: coverDataUrl.length <= 8_000_000 && /^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(coverDataUrl)
      ? coverDataUrl
      : "",
    images,
    publishAction: value.publishAction === "auto_publish" ? "auto_publish" : "prefill",
    authorization: value.publishAction === "auto_publish" && value.authorization ? {
      confirmedAt: String(value.authorization.confirmedAt || ""),
      expiresAt: String(value.authorization.expiresAt || ""),
      nonce: String(value.authorization.nonce || "").slice(0, 120),
    } : undefined,
    createdAt: String(value.createdAt || new Date().toISOString()),
  };
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const message = event.data;
  if (message?.source !== STUDIO_SOURCE) return;
  if (message.type === "MJ_XHS_BRIDGE_PING") {
    notifyPage("MJ_XHS_BRIDGE_READY");
    return;
  }
  if (message.type === "MJ_XHS_RESEARCH_REQUEST") {
    chrome.runtime.sendMessage({
      type: "MJ_XHS_START_RESEARCH",
      requestId: String(message.requestId || ""),
      force: message.force === true,
    });
    return;
  }
  if (message.type !== "MJ_XHS_DRAFT") return;
  const draft = normalizeDraft(message.payload);
  if (!draft) return;
  chrome.storage.local.set({ mjXhsDraft: draft }, () => {
    if (!chrome.runtime.lastError) notifyPage("MJ_XHS_DRAFT_STORED");
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  const result = changes.mjXhsResearchResult?.newValue;
  if (area !== "local" || !result) return;
  window.postMessage({
    source: BRIDGE_SOURCE,
    type: "MJ_XHS_RESEARCH_RESULT",
    version: 3,
    requestId: result.requestId,
    candidates: result.candidates || [],
    error: result.error || "",
  }, window.location.origin);
});

notifyPage("MJ_XHS_BRIDGE_READY");
