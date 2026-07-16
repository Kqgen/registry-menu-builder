const MAX_TEXT_CHARS = 32 * 1_048_576;

function validClipboardContent(content) {
  return typeof content === "string" && content.length <= MAX_TEXT_CHARS;
}

function validSaveRequest(request) {
  return request !== null &&
    typeof request === "object" &&
    typeof request.filename === "string" &&
    /^[^<>:"/\\|?*\u0000-\u001f]{1,80}$/u.test(request.filename) &&
    validClipboardContent(request.content) &&
    typeof request.type === "string" &&
    request.type.length <= 96 &&
    (request.locale === "ja" || request.locale === "en");
}

module.exports = { MAX_TEXT_CHARS, validClipboardContent, validSaveRequest };
