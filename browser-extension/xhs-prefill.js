const DRAFT_KEY = "mjXhsDraft";
let activeDraftSignature = "";
let uploadStarted = false;
let titleFilled = false;
let bodyFilled = false;

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

async function uploadImages(draft) {
  if (uploadStarted || !draft.images.length) return;
  const input = findImageInput();
  if (!input) return;
  uploadStarted = true;
  setStatus(`正在预填 ${draft.images.length} 张项目图片…`);
  try {
    const files = [];
    for (const image of draft.images) files.push(await fetchImage(image));
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    setStatus(`已带入 ${files.length} 张图片，正在等待编辑区…`);
  } catch (error) {
    uploadStarted = false;
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
    setStatus("图片、标题和正文已预填。请逐项检查，最终点击“发布”由你本人完成。");
  }
}

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
  }
  void uploadImages(draft);
  fillCopy(draft);
}

function loadDraft() {
  chrome.storage.local.get(DRAFT_KEY, (result) => applyDraft(result[DRAFT_KEY]));
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[DRAFT_KEY]?.newValue) applyDraft(changes[DRAFT_KEY].newValue);
});

const observer = new MutationObserver(() => loadDraft());
observer.observe(document.documentElement, { childList: true, subtree: true });
loadDraft();
