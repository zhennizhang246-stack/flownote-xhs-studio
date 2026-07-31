chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
