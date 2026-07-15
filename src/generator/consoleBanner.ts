import type { ConsoleTheme } from "../domain/themes.ts";
import type { StyledBanner } from "./ascii.ts";
import { encodeUtf16LeBase64, encodeUtf8Base64 } from "./encoding.ts";

const TONE_IDS = { plain: 0, primary: 1, secondary: 2 } as const;

export function buildConsoleBannerPayload(rows: StyledBanner, width: number): string {
  const bannerWidth = rows.reduce(
    (maximum, row) => Math.max(maximum, row.reduce((total, segment) => total + segment.text.length, 0)),
    0,
  );
  const padding = Math.max(0, Math.floor((width - bannerWidth) / 2));
  const serialized = rows.map((row) => {
    const segments: string[] = [];
    if (padding > 0) {
      segments.push(`0${" ".repeat(padding)}`);
    }
    segments.push(...row.map((segment) => `${TONE_IDS[segment.tone]}${segment.text}`));
    return segments.join("\u001f");
  });
  return encodeUtf8Base64(serialized.join("\u001e"));
}

export function buildConsoleBannerCommand(theme: ConsoleTheme): string {
  const script = [
    "$ProgressPreference='SilentlyContinue'",
    "$j=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:TF_BANNER))",
    "$rows=$j -split [char]30",
    "foreach($row in $rows){",
    "foreach($part in ($row -split [char]31)){",
    "$tone=[int]$part.Substring(0,1)",
    "$value=$part.Substring(1)",
    `if($tone -eq 1){Write-Host $value -NoNewline -ForegroundColor ${theme.bannerPrimary}}`,
    `elseif($tone -eq 2){Write-Host $value -NoNewline -ForegroundColor ${theme.bannerSecondary}}`,
    "else{Write-Host $value -NoNewline}",
    "}",
    "Write-Host",
    "}",
  ].join("\r\n");
  return `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encodeUtf16LeBase64(script)}`;
}
