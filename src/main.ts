import "./styles.css";
import { mergeImportedValues } from "./domain/import.ts";
import { addTweak, removeTweak, updateIdentity, updateTweak } from "./domain/project.ts";
import { getTheme } from "./domain/themes.ts";
import { MAX_PROJECT_JSON_BYTES, type BannerStyleId, type RegistryProject, type ThemeId } from "./domain/types.ts";
import { parseProjectJson, validateProject } from "./domain/validation.ts";
import { renderStyledAsciiBanner } from "./generator/ascii.ts";
import { generateBatch, projectFilename } from "./generator/batch.ts";
import { MAX_REG_IMPORT_BYTES, parseRegFile } from "./import/regFile.ts";
import { loadProject, saveProject } from "./state/storage.ts";
import { requireElement } from "./ui/dom.ts";
import { copyText, downloadText } from "./ui/download.ts";
import {
  clearTweakForm,
  fillTweakForm,
  hideFormErrors,
  initializeTweakForm,
  readTweakForm,
  showFormErrors,
} from "./ui/form.ts";
import { renderAsciiPreview, renderThemeOptions, renderTweakList } from "./ui/render.ts";

let project: RegistryProject = loadProject();
let generatedBatch = "";
let toastTimer: number | undefined;

const titleInput = requireElement("#project-title", HTMLInputElement);
const bannerInput = requireElement("#banner-text", HTMLInputElement);
const bannerStyleInput = requireElement("#banner-style", HTMLSelectElement);
const subtitleInput = requireElement("#project-subtitle", HTMLInputElement);
const asciiPreview = requireElement("#ascii-art-preview", HTMLPreElement);
const preview = requireElement("#batch-preview", HTMLPreElement);
const themeOptions = requireElement("#theme-options", HTMLDivElement);
const tweakList = requireElement("#tweak-list", HTMLDivElement);

function showToast(message: string): void {
  const toast = requireElement("#toast", HTMLDivElement);
  toast.textContent = message;
  toast.classList.add("visible");
  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer);
  }
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

function render(): void {
  const theme = getTheme(project.theme);
  titleInput.value = project.title;
  bannerInput.value = project.bannerText;
  bannerStyleInput.value = project.bannerStyle;
  subtitleInput.value = project.subtitle;
  renderThemeOptions(themeOptions, project.theme);
  preview.style.setProperty("--preview-accent", theme.swatch);
  renderTweakList(tweakList, project);
  requireElement("#tweak-count", HTMLSpanElement).textContent = String(project.tweaks.length).padStart(2, "0");
  requireElement("#project-summary", HTMLSpanElement).textContent = `${project.tweaks.length} gaming tweak${project.tweaks.length === 1 ? "" : "s"} / local project`;
  requireElement("#preview-heading", HTMLElement).textContent = projectFilename(project, "bat");
  try {
    renderAsciiPreview(asciiPreview, renderStyledAsciiBanner(project.bannerText, project.bannerStyle), theme);
  } catch {
    asciiPreview.textContent = "ASCIIロゴに使えない文字があります";
  }
  const issues = validateProject(project);
  const status = requireElement("#project-status", HTMLElement);
  if (issues.length > 0) {
    generatedBatch = "";
    status.textContent = `${issues.length}件の入力を確認してください`;
    preview.textContent = issues.map((issue) => `[${issue.path}] ${issue.message}`).join("\n");
    return;
  }
  try {
    generatedBatch = generateBatch(project);
    preview.textContent = generatedBatch;
    status.textContent = "Tweak BATを生成できます";
    saveProject(project);
  } catch (error) {
    generatedBatch = "";
    status.textContent = "Tweak BATを生成できません";
    preview.textContent = error instanceof Error ? error.message : "生成中にエラーが発生しました";
  }
}

function updateProjectIdentity(): void {
  const selectedTheme = themeOptions.querySelector<HTMLInputElement>('input[name="theme"]:checked');
  project = updateIdentity(project, {
    title: titleInput.value,
    bannerText: bannerInput.value,
    bannerStyle: bannerStyleInput.value as BannerStyleId,
    subtitle: subtitleInput.value,
    theme: (selectedTheme?.value ?? project.theme) as ThemeId,
  });
  render();
}

function resetEditor(): void {
  clearTweakForm();
  hideFormErrors();
}

initializeTweakForm();
render();

[titleInput, bannerInput, subtitleInput].forEach((element) => {
  element.addEventListener("input", updateProjectIdentity);
});
bannerStyleInput.addEventListener("change", updateProjectIdentity);
themeOptions.addEventListener("change", updateProjectIdentity);

requireElement("#tweak-form", HTMLFormElement).addEventListener("submit", (event) => {
  event.preventDefault();
  const tweak = readTweakForm();
  const exists = project.tweaks.some((candidate) => candidate.id === tweak.id);
  const next = exists ? updateTweak(project, tweak) : addTweak(project, tweak);
  const issues = validateProject(next);
  if (issues.length > 0) {
    showFormErrors(issues.map((issue) => issue.message));
    return;
  }
  project = next;
  resetEditor();
  render();
  showToast(exists ? "Gaming Tweakを更新しました" : "Gaming Tweakを追加しました");
});

requireElement("#cancel-edit-button", HTMLButtonElement).addEventListener("click", resetEditor);

tweakList.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>("button[data-action]");
  const tweakId = button?.dataset["tweakId"];
  if (button === null || button === undefined || tweakId === undefined) {
    return;
  }
  const tweak = project.tweaks.find((candidate) => candidate.id === tweakId);
  if (tweak === undefined) {
    return;
  }
  if (button.dataset["action"] === "edit") {
    fillTweakForm(tweak);
    return;
  }
  project = removeTweak(project, tweakId);
  resetEditor();
  render();
  showToast("Gaming Tweakを削除しました");
});

requireElement("#reg-import-button", HTMLButtonElement).addEventListener("click", () => {
  requireElement("#reg-import-input", HTMLInputElement).click();
});

requireElement("#reg-import-input", HTMLInputElement).addEventListener("change", async (event) => {
  const fileInput = event.currentTarget as HTMLInputElement;
  const files = [...(fileInput.files ?? [])];
  fileInput.value = "";
  if (files.length === 0) {
    return;
  }
  if (files.length > 20) {
    showToast("一度に取り込めるREGファイルは20個までです");
    return;
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_REG_IMPORT_BYTES) {
    showToast(`一度に取り込めるREGファイルは合計${MAX_REG_IMPORT_BYTES / 1_048_576}MBまでです`);
    return;
  }
  try {
    const results = await Promise.all(files.map(async (file) =>
      parseRegFile(new Uint8Array(await file.arrayBuffer()), file.name),
    ));
    const values = results.flatMap((result) => result.values);
    const warnings = results.flatMap((result) => result.warnings);
    const next = mergeImportedValues(project, values);
    const issues = validateProject(next);
    if (issues.length > 0) {
      throw new Error(issues[0]?.message ?? "REGファイルの内容を追加できません");
    }
    project = next;
    resetEditor();
    render();
    const warningText = warnings.length > 0 ? ` / 警告${warnings.length}件` : "";
    showToast(`${files.length}ファイルから${values.length}件のTweakを取り込みました${warningText}`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "REGファイルを読み込めませんでした");
  }
});

requireElement("#import-button", HTMLButtonElement).addEventListener("click", () => {
  requireElement("#import-input", HTMLInputElement).click();
});

requireElement("#import-input", HTMLInputElement).addEventListener("change", async (event) => {
  const fileInput = event.currentTarget as HTMLInputElement;
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (file === undefined) {
    return;
  }
  if (file.size > MAX_PROJECT_JSON_BYTES) {
    showToast(`JSONは${MAX_PROJECT_JSON_BYTES / 1_048_576}MB以下にしてください`);
    return;
  }
  const result = parseProjectJson(await file.text());
  if (!result.ok) {
    showToast(result.errors[0] ?? "JSONを読み込めませんでした");
    return;
  }
  project = result.project;
  resetEditor();
  render();
  showToast("Tweakプロジェクトを読み込みました");
});

requireElement("#export-button", HTMLButtonElement).addEventListener("click", async () => {
  if (validateProject(project).length > 0) {
    showToast("入力エラーを直してから保存してください");
    return;
  }
  const saved = await downloadText(
    projectFilename(project, "json"),
    `${JSON.stringify(project, null, 2)}\n`,
    "application/json;charset=utf-8",
  );
  if (saved) {
    showToast("Tweakプロジェクトを保存しました");
  }
});

requireElement("#download-button", HTMLButtonElement).addEventListener("click", async () => {
  if (generatedBatch.length === 0) {
    showToast("入力エラーを直してから保存してください");
    return;
  }
  const saved = await downloadText(projectFilename(project, "bat"), generatedBatch, "text/plain;charset=utf-8");
  if (saved) {
    showToast("Gaming Tweak BATを保存しました");
  }
});

requireElement("#copy-button", HTMLButtonElement).addEventListener("click", async () => {
  if (generatedBatch.length === 0) {
    showToast("コピーできるTweak BATがありません");
    return;
  }
  try {
    await copyText(generatedBatch);
    showToast("Gaming Tweak BATをコピーしました");
  } catch {
    showToast("クリップボードへコピーできませんでした");
  }
});
