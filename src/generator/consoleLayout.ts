export function consoleDisplayWidth(value: string): number {
  return [...value].reduce((width, character) => {
    const code = character.codePointAt(0) ?? 0;
    const wide = code >= 0x1100 && (
      code <= 0x115f ||
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1faff) ||
      (code >= 0x20000 && code <= 0x3fffd)
    );
    return width + (wide ? 2 : 1);
  }, 0);
}

export function truncateConsoleText(value: string, maxWidth: number): string {
  if (consoleDisplayWidth(value) <= maxWidth) {
    return value;
  }
  const suffix = "...";
  const limit = Math.max(0, maxWidth - suffix.length);
  let result = "";
  let width = 0;
  for (const character of value) {
    const characterWidth = consoleDisplayWidth(character);
    if (width + characterWidth > limit) {
      break;
    }
    result += character;
    width += characterWidth;
  }
  return `${result}${suffix}`;
}

export function padConsoleText(value: string, width: number): string {
  const truncated = truncateConsoleText(value, width);
  return `${truncated}${" ".repeat(Math.max(0, width - consoleDisplayWidth(truncated)))}`;
}

export function panelLine(value: string, width: number): string {
  return `| ${padConsoleText(value, Math.max(1, width - 4))} |`;
}

export function sectionRule(label: string, width: number, fill = "-"): string {
  const prefix = `+-- ${label} `;
  return `${prefix}${fill.repeat(Math.max(1, width - consoleDisplayWidth(prefix) - 1))}+`;
}

export function strongRule(width: number): string {
  return `+${"=".repeat(width - 2)}+`;
}
