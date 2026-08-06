const DRAFT_KEY = "mjXhsDraft";
let activeDraftSignature = "";
let uploadStarted = false;
let titleFilled = false;
let bodyFilled = false;
let imageUploadCompleted = false;
let imagesTransferredAt = 0;
let autoPublishAttempted = false;
let publishSubmissionStarted = false;
let publishResultReported = false;
let currentDraft = null;

function statusPanel() {
  let panel = document.getElementById("mj-xhs-bridge-status");
  if (panel) return panel;
  panel = document.createElement("div");
  panel.id = "mj-xhs-bridge-status";
  Object.assign(panel.style, {
    position: "fixed",
    right: "22px",
    bottom: "22px",
    zIndex: "2147483647",
    maxWidth: "320px",
    padding: "13px 15px",
    border: "1px solid #b8c9bd",
    borderRadius: "12px",
    background: "#f3f7f3",
    boxShadow: "0 12px 34px rgba(30,48,38,.18)",
    color: "#294235",
    font: "13px/1.55 system-ui, sans-serif",
  });
  document.documentElement.appendChild(panel);
  return panel;
}

function setStatus(message, isError = false) {
  const panel = statusPanel();
  panel.style.borderColor = isError ? "#d5a99a" : "#b8c9bd";
  panel.style.background = isError ? "#fff3ef" : "#f3f7f3";
  panel.style.color = isError ? "#8b3e2b" : "#294235";
  panel.textContent = `MJ 发布桥：${message}`;
}

function setNativeValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function findTitleField() {
  const selectors = [
    'input[placeholder*="填写标题"]',
    'input[placeholder*="标题"]',
    'textarea[placeholder*="填写标题"]',
    'textarea[placeholder*="标题"]'
  ];
  return selectors.map((selector) => document.querySelector(selector)).find(Boolean) || null;
}

function findBodyField() {
  const selectors = [
    'textarea[placeholder*="填写正文"]',
    'textarea[placeholder*="正文"]',
    '[contenteditable="true"][data-placeholder*="正文"]',
    '.ql-editor[contenteditable="true"]',
    '[contenteditable="true"][role="textbox"]'
  ];
  return selectors.map((selector) => document.querySelector(selector)).find(Boolean) || null;
}

function findImageInput() {
  const inputs = [...document.querySelectorAll('input[type="file"]')];
  return inputs.find((input) => {
    const accept = String(input.getAttribute("accept") || "").toLowerCase();
    return accept.includes("image") || accept.includes(".jpg") || accept.includes(".png");
  }) || null;
}

function fetchImage(image) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "MJ_XHS_FETCH_IMAGE", url: image.url }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        reject(new Error(response?.error || chrome.runtime.lastError?.message || "图片读取失败"));
        return;
      }
      const binary = atob(response.base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      resolve(new File([bytes], image.fileName || "project-image.jpg", { type: response.contentType }));
    });
  });
}

function coverFile(draft) {
  const [metadata, base64] = String(draft.coverDataUrl || "").split(",");
  if (!metadata?.startsWith("data:image/jpeg;base64") || !base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const safeName = String(draft.projectName || "MJ项目").replace(/[\\/:*?"<>|]/g, "-").slice(0, 60);
  return new File([bytes], `${safeName}-封面.jpg`, { type: "image/jpeg" });
}

async function uploadImages(draft) {
  if (uploadStarted || (!draft.coverDataUrl && !draft.images.length)) return;
  const input = findImageInput();
  if (!input) return;
  uploadStarted = true;
  setStatus(`正在同步成品封面与 ${draft.images.length} 张项目图片…`);
  try {
    const files = [];
    const cover = coverFile(draft);
    if (cover) files.push(cover);
    for (const image of draft.images) files.push(await fetchImage(image));
    if (!files.length) throw new Error("没有可同步的项目图片");
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    imageUploadCompleted = true;
    imagesTransferredAt = Date.now();
    setStatus(`已带入 ${files.length} 张图片，首图为平台生成的统一封面；正在等待编辑区…`);
    window.setTimeout(() => {
      if (currentDraft) applyDraft(currentDraft);
    }, 4500);
  } catch (error) {
    uploadStarted = false;
    imageUploadCompleted = false;
    setStatus(`${error.message || "图片预填失败"}，可在页面中手动上传`, true);
  }
}

function fillCopy(draft) {
  const titleField = findTitleField();
  if (titleField && !titleFilled) {
    setNativeValue(titleField, draft.title);
    titleFilled = true;
  }
  const bodyField = findBodyField();
  if (bodyField && !bodyFilled) {
    const tags = draft.tags.map((tag) => `#${tag}`).join(" ");
    const text = [draft.body, tags].filter(Boolean).join("\n\n");
    if (bodyField instanceof HTMLInputElement || bodyField instanceof HTMLTextAreaElement) {
      setNativeValue(bodyField, text);
    } else {
      bodyField.focus();
      bodyField.textContent = text;
      bodyField.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: text,
      }));
      bodyField.dispatchEvent(new Event("change", { bubbles: true }));
    }
    bodyFilled = true;
  }
  if (titleFilled && bodyFilled) {
    setStatus(draft.publishAction === "auto_publish"
      ? "封面、图片、标题和正文已统一，正在等待官方发布按钮可用…"
      : "封面、图片、标题和正文已预填。请逐项检查，最终点击“发布”由你本人完成。");
  }
  tryAutoPublish(draft);
}

function authorizationIsValid(draft) {
  if (draft.publishAction !== "auto_publish" || !draft.authorization?.nonce) return false;
  const confirmedAt = Date.parse(draft.authorization.confirmedAt);
  const expiresAt = Date.parse(draft.authorization.expiresAt);
  const now = Date.now();
  return Number.isFinite(confirmedAt)
    && Number.isFinite(expiresAt)
    && confirmedAt <= now + 60_000
    && now <= expiresAt
    && expiresAt - confirmedAt <= 5 * 60_000;
}

function findPublishButton() {
  const candidates = [...document.querySelectorAll("button")].filter((button) => (
    button.textContent?.trim() === "发布"
    && button.getClientRects().length > 0
  ));
  return candidates.length === 1 ? candidates[0] : null;
}

function hasVerificationBlocker() {
  const text = document.body?.innerText || "";
  return /安全验证|请完成验证|账号异常|验证码/.test(text);
}

function tryAutoPublish(draft) {
  if (autoPublishAttempted || !authorizationIsValid(draft)) return;
  if (!imageUploadCompleted || !titleFilled || !bodyFilled) return;
  if (Date.now() - imagesTransferredAt < 4000) return;
  if (hasVerificationBlocker()) {
    setStatus("检测到安全验证或账号提示，已停止自动操作，请你在页面中处理。", true);
    return;
  }
  const button = findPublishButton();
  if (!button || button.disabled || button.getAttribute("aria-disabled") === "true") return;
  autoPublishAttempted = true;
  const consumedDraft = {
    ...draft,
    publishAction: "prefill",
    authorization: undefined,
    autoPublishConsumedAt: new Date().toISOString(),
  };
  chrome.storage.local.set({ [DRAFT_KEY]: consumedDraft }, () => {
    if (chrome.runtime.lastError) {
      autoPublishAttempted = false;
      setStatus("无法消费本次自动发布授权，请改为人工点击发布。", true);
      return;
    }
    setStatus("已使用本次限时授权点击一次官方发布按钮，正在等待小红书返回结果。");
    publishSubmissionStarted = true;
    button.click();
  });
}

function findPublishedNoteUrl() {
  const link = [...document.querySelectorAll("a[href]")].find((item) => /xiaohongshu\.com\/(?:explore|discovery\/item)\//.test(String(item.href || "")));
  return link ? String(link.href || "") : "";
}

function reportPublishedResult() {
  if (!currentDraft || !publishSubmissionStarted || publishResultReported) return;
  const pageText = document.body?.innerText || "";
  const confirmed = /(?:笔记)?发布成功|发布完成|已成功发布/.test(pageText);
  if (!confirmed) return;
  publishResultReported = true;
  const result = {
    ownerKey: String(currentDraft.ownerKey || ""),
    projectId: Number(currentDraft.projectId),
    projectName: String(currentDraft.projectName || ""),
    status: "published",
    publishedAt: new Date().toISOString(),
    publishUrl: findPublishedNoteUrl(),
  };
  chrome.runtime.sendMessage({ type: "MJ_XHS_PUBLISH_RESULT", result });
  setStatus("小红书已返回发布成功，结果已同步到项目发布日历。");
}

document.addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("button") : null;
  if (currentDraft && button?.textContent?.trim() === "发布") publishSubmissionStarted = true;
}, true);

function applyDraft(draft) {
  if (!draft?.title || !draft?.body) {
    setStatus("尚未收到已确认的笔记，请从 MJ 创作平台点击“确认并预填”。");
    return;
  }
  const signature = `${draft.projectId}:${draft.createdAt}`;
  if (signature !== activeDraftSignature) {
    activeDraftSignature = signature;
    uploadStarted = false;
    titleFilled = false;
    bodyFilled = false;
    imageUploadCompleted = false;
    imagesTransferredAt = 0;
    autoPublishAttempted = false;
    publishSubmissionStarted = false;
    publishResultReported = false;
  }
  currentDraft = draft;
  void uploadImages(draft);
  fillCopy(draft);
}

function loadDraft() {
  chrome.storage.local.get(DRAFT_KEY, (result) => applyDraft(result[DRAFT_KEY]));
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[DRAFT_KEY]?.newValue) applyDraft(changes[DRAFT_KEY].newValue);
});

const observer = new MutationObserver(() => {
  loadDraft();
  reportPublishedResult();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
loadDraft();
