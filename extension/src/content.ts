function getReadableText(): string {
  const bodyText = document.body?.innerText ?? "";
  return bodyText.replace(/\s+/g, " ").trim();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "extractContent") {
    sendResponse({
      url: window.location.href,
      title: document.title,
      text: getReadableText(),
    });
  }
});
