export async function downloadText(filename: string, content: string, type: string): Promise<boolean> {
  if (window.tweakForge !== undefined) {
    return window.tweakForge.saveText({ filename, content, type });
  }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

export async function copyText(content: string): Promise<void> {
  if (window.tweakForge !== undefined) {
    await window.tweakForge.copyText(content);
    return;
  }
  if (navigator.clipboard !== undefined) {
    await navigator.clipboard.writeText(content);
    return;
  }
  const input = document.createElement("textarea");
  input.value = content;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) {
    throw new Error("Clipboard copy failed");
  }
}
