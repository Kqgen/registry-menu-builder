import type { RegistryProject } from "../domain/types.ts";
import { buildActionUi, buildStartupUi } from "./batchActionUi.ts";
import { buildMenuUi } from "./batchMenuUi.ts";
import { escapeBatchText, labelIndex } from "./batchUiLayout.ts";

export { escapeBatchText, labelIndex };

export function buildInteractiveUi(
  project: RegistryProject,
  width: number,
  bannerCommand: string,
): readonly string[] {
  const showBanner = "call :show_banner";
  return [
    ":show_banner",
    bannerCommand,
    "exit /b 0",
    "",
    ...buildStartupUi(width, showBanner),
    ...buildMenuUi(project, width, showBanner),
    ...buildActionUi(project, width, showBanner),
  ];
}
