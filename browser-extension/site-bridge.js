const STUDIO_SOURCE = "mj-xhs-studio";
const BRIDGE_SOURCE = "mj-xhs-bridge";

function notifyPage(type) {
  window.postMessage({ source: BRIDGE_SOURCE, type }, window.location.origin);
}

function normalizeDraft(value) {
  if (!value || value.version !== 1 || !Number.isInteger(value.projectId)) return null;
  const images = Array.isArray(value.images)
    ? value.images.slice(0, 10).map((image) => ({
      url: String(image?.url || "").slice(0, 2000),
      fileName: String(image?.fileName || "project-image.jpg").slice(0, 180),
    })).filter((image) => /^https?:\/\//.test(image.url))
    : [];
  return {
    version: 1,
    projectId: value.projectId,
    projectName: String(value.projectName || "").slice(0, 120),
    title: String(value.title || "").trim().slice(0, 100),
    body: String(value.body || "").trim().slice(0, 10000),
    tags: Array.isArray(value.tags)
      ? value.tags.slice(0, 20).map((tag) => String(tag).replace(/^#/, "").trim().slice(0, 40)).filter(Boolean)
      : [],
    images,
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
  if (message.type !== "MJ_XHS_DRAFT") return;
  const draft = normalizeDraft(message.payload);
  if (!draft) return;
  chrome.storage.local.set({ mjXhsDraft: draft }, () => {
    if (!chrome.runtime.lastError) notifyPage("MJ_XHS_DRAFT_STORED");
  });
});

notifyPage("MJ_XHS_BRIDGE_READY");
