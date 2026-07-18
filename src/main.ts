import "./styles.css";
import { mergeImportedValues } from "./domain/import.ts";
import {
  addSystemAction,
  addTweak,
  removeSystemAction,
  removeTweak,
  updateIdentity,
  updateSystemAction,
  updateTweak,
} from "./domain/project.ts";
import { getTheme } from "./domain/themes.ts";
import { MAX_PROJECT_JSON_BYTES, type BannerStyleId, type RegistryProject, type ThemeId } from "./domain/types.ts";
import { parseProjectJson, validateProject } from "./domain/validation.ts";
import { renderStyledAsciiBanner } from "./generator/ascii.ts";
import { generateBatch, projectFilename } from "./generator/batch.ts";
import { BUILDER_COPY } from "./i18n/builderCopy.ts";
import { isAppLocale } from "./i18n/locale.ts";
import { MAX_REG_IMPORT_BYTES, parseRegFile, RegImportError } from "./import/regFile.ts";
import { loadLocale, saveLocale } from "./state/locale.ts";
import { loadProject, saveProject } from "./state/storage.ts";
import { requireElement } from "./ui/dom.ts";
import { copyText, downloadText } from "./ui/download.ts";
import {
  clearTweakForm,
  fillTweakForm,
  hideFormErrors,
  initializeTweakForm,
  readTweakForm,
  setTweakFormLocale,
  showFormErrors,
} from "./ui/form.ts";
import { captureRenderedFocus } from "./ui/focus.ts";
import { applyDocumentLocale } from "./ui/localize.ts";
import {
  clearPowerPlanForm,
  fillPowerPlanForm,
  hidePowerPlanErrors,
  initializePowerPlanForm,
  readPowerPlanForm,
  setPowerPlanFormLocale,
  showPowerPlanErrors,
} from "./ui/powerPlanForm.ts";
import { renderAsciiPreview, renderThemeOptions, renderTweakList } from "./ui/render.ts";
import { renderSystemActionList } from "./ui/systemActionRender.ts";

let locale = loadLocale();
let copy = BUILDER_COPY[locale];
let project: RegistryProject = loadProject(locale);
saveLocale(locale);
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
const systemActionList = requireElement("#system-action-list", HTMLDivElement);
const languageInput = requireElement("#builder-language", HTMLSelectElement);

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
  renderTweakList(tweakList, project, copy);
  renderSystemActionList(systemActionList, project.actions, copy);
  requireElement("#tweak-count", HTMLSpanElement).textContent = String(project.tweaks.length).padStart(2, "0");
  requireElement("#system-action-count", HTMLSpanElement).textContent = String(project.actions.length).padStart(2, "0");
  requireElement("#project-summary", HTMLSpanElement).textContent = copy.summary(project.tweaks.length, project.actions.length);
  requireElement("#preview-heading", HTMLElement).textContent = projectFilename(project, "bat");
  try {
    renderAsciiPreview(asciiPreview, renderStyledAsciiBanner(project.bannerText, project.bannerStyle), theme);
  } catch {
    asciiPreview.textContent = copy.asciiInvalid;
  }
  const issues = validateProject(project, locale);
  const status = requireElement("#project-status", HTMLElement);
  if (issues.length > 0) {
    generatedBatch = "";
    status.textContent = copy.checkInputs(issues.length);
    preview.textContent = issues.map((issue) => `[${issue.path}] ${issue.message}`).join("\n");
    return;
  }
  try {
    generatedBatch = generateBatch(project);
    preview.textContent = generatedBatch;
    status.textContent = copy.canGenerate;
    saveProject(project);
  } catch (error) {
    generatedBatch = "";
    status.textContent = copy.cannotGenerate;
    preview.textContent = copy.generationError;
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

function resetPowerPlanEditor(): void {
  clearPowerPlanForm();
  hidePowerPlanErrors();
}

initializeTweakForm(copy);
initializePowerPlanForm(copy, locale);
applyDocumentLocale(locale, copy);
render();

languageInput.addEventListener("change", () => {
  if (!isAppLocale(languageInput.value) || languageInput.value === locale) {
    languageInput.value = locale;
    return;
  }
  locale = languageInput.value;
  copy = BUILDER_COPY[locale];
  const restoreFocus = captureRenderedFocus(themeOptions, tweakList, systemActionList);
  saveLocale(locale);
  applyDocumentLocale(locale, copy);
  setTweakFormLocale(copy);
  setPowerPlanFormLocale(copy, locale);
  hideFormErrors();
  render();
  restoreFocus();
  showToast(copy.languageChanged);
});

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
  const issues = validateProject(next, locale);
  if (issues.length > 0) {
    showFormErrors(issues.map((issue) => issue.message));
    return;
  }
  project = next;
  resetEditor();
  render();
  showToast(exists ? copy.tweakUpdated : copy.tweakAdded);
});

requireElement("#cancel-edit-button", HTMLButtonElement).addEventListener("click", resetEditor);

requireElement("#power-plan-form", HTMLFormElement).addEventListener("submit", (event) => {
  event.preventDefault();
  const action = readPowerPlanForm();
  const exists = project.actions.some((candidate) => candidate.id === action.id);
  const next = exists ? updateSystemAction(project, action) : addSystemAction(project, action);
  const issues = validateProject(next, locale);
  if (issues.length > 0) {
    showPowerPlanErrors(issues.map((issue) => issue.message));
    return;
  }
  project = next;
  resetPowerPlanEditor();
  render();
  showToast(exists ? copy.powerPlanUpdated : copy.powerPlanAdded);
});

requireElement("#cancel-power-plan-button", HTMLButtonElement).addEventListener("click", resetPowerPlanEditor);

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
  showToast(copy.tweakDeleted);
});

systemActionList.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>("button[data-action]");
  const actionId = button?.dataset["systemActionId"];
  if (button === null || button === undefined || actionId === undefined) {
    return;
  }
  const action = project.actions.find((candidate) => candidate.id === actionId);
  if (action === undefined) {
    return;
  }
  if (button.dataset["action"] === "edit") {
    fillPowerPlanForm(action);
    return;
  }
  project = removeSystemAction(project, actionId);
  resetPowerPlanEditor();
  render();
  showToast(copy.powerPlanDeleted);
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
    showToast(copy.tooManyRegFiles(20));
    return;
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_REG_IMPORT_BYTES) {
    showToast(copy.regTotalTooLarge(MAX_REG_IMPORT_BYTES / 1_048_576));
    return;
  }
  try {
    const results = await Promise.all(files.map(async (file) =>
      parseRegFile(new Uint8Array(await file.arrayBuffer()), file.name, locale),
    ));
    const values = results.flatMap((result) => result.values);
    const warnings = results.flatMap((result) => result.warnings);
    const next = mergeImportedValues(project, values, locale);
    const issues = validateProject(next, locale);
    if (issues.length > 0) {
      showToast(issues[0]?.message ?? copy.regCannotAdd);
      return;
    }
    project = next;
    resetEditor();
    render();
    showToast(copy.regImported(files.length, values.length, warnings.length));
  } catch (error) {
    showToast(error instanceof RegImportError ? error.message : copy.regImportFailed);
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
    showToast(copy.jsonTooLarge(MAX_PROJECT_JSON_BYTES / 1_048_576));
    return;
  }
  const result = parseProjectJson(await file.text(), locale);
  if (!result.ok) {
    showToast(result.errors[0] ?? copy.jsonInvalid);
    return;
  }
  project = result.project;
  resetEditor();
  resetPowerPlanEditor();
  render();
  showToast(copy.projectLoaded);
});

requireElement("#export-button", HTMLButtonElement).addEventListener("click", async () => {
  if (validateProject(project, locale).length > 0) {
    showToast(copy.fixBeforeSave);
    return;
  }
  try {
    const saved = await downloadText(
      projectFilename(project, "json"),
      `${JSON.stringify(project, null, 2)}\n`,
      "application/json;charset=utf-8",
      locale,
    );
    if (saved) {
      showToast(copy.projectSaved);
    }
  } catch {
    showToast(copy.projectSaveFailed);
  }
});

requireElement("#download-button", HTMLButtonElement).addEventListener("click", async () => {
  if (generatedBatch.length === 0) {
    showToast(copy.fixBeforeSave);
    return;
  }
  try {
    const saved = await downloadText(
      projectFilename(project, "bat"),
      generatedBatch,
      "text/plain;charset=utf-8",
      locale,
    );
    if (saved) {
      showToast(copy.batSaved);
    }
  } catch {
    showToast(copy.batSaveFailed);
  }
});

requireElement("#copy-button", HTMLButtonElement).addEventListener("click", async () => {
  if (generatedBatch.length === 0) {
    showToast(copy.noBatToCopy);
    return;
  }
  try {
    await copyText(generatedBatch);
    showToast(copy.batCopied);
  } catch {
    showToast(copy.clipboardFailed);
  }
});
