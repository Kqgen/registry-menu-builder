const SCRIPT = `
  (() => {
    const localeKey = "gaming-tweak-forge.locale.v1";
    const projectKey = "gaming-tweak-forge.project.v1";
    const localeSelect = document.querySelector("#builder-language");
    const draft = document.querySelector("#tweak-label");
    const operation = document.querySelector("#tweak-operation");
    const risk = document.querySelector("#tweak-risk");
    const preview = document.querySelector("#batch-preview");
    if (!(localeSelect instanceof HTMLSelectElement) ||
        !(draft instanceof HTMLInputElement) ||
        !(operation instanceof HTMLSelectElement) ||
        !(risk instanceof HTMLSelectElement) ||
        !(preview instanceof HTMLPreElement)) {
      return { valid: false, checks: { requiredElements: false } };
    }
    const initialLocale = localeSelect.value;
    const storedLocale = localStorage.getItem(localeKey);
    const originalDraft = draft.value;
    const originalProject = localStorage.getItem(projectKey);
    const originalPreview = preview.textContent;
    const operationValues = [...operation.options].map((entry) => entry.value).join(",");
    const riskValues = [...risk.options].map((entry) => entry.value).join(",");
    const switchLocale = (value) => {
      localeSelect.value = value;
      localeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    };
    draft.value = "locale-switch-draft";
    draft.focus();
    switchLocale("en");
    const englishChecks = {
      htmlLang: document.documentElement.lang === "en",
      intro: document.querySelector("[data-i18n='introTitleFirst']")?.textContent === "Add your tweaks.",
      saveButton: document.querySelector("#save-tweak-button span:last-child")?.textContent === "Add tweak",
      operation: operation.selectedOptions[0]?.textContent === "Set value",
      risk: risk.selectedOptions[0]?.textContent === "Medium",
      aria: document.querySelector(".brand")?.getAttribute("aria-label") === "Gaming Tweak Forge home",
      persisted: localStorage.getItem(localeKey) === "en",
      draft: draft.value === "locale-switch-draft",
      focus: document.activeElement === draft,
      viewport: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    };
    const englishValid = Object.values(englishChecks).every(Boolean);
    switchLocale("ja");
    const japaneseChecks = {
      htmlLang: document.documentElement.lang === "ja",
      intro: document.querySelector("[data-i18n='introTitleFirst']")?.textContent === "Tweakを入れる。",
      saveButton: document.querySelector("#save-tweak-button span:last-child")?.textContent === "Tweakを追加",
      operation: operation.selectedOptions[0]?.textContent === "値を設定",
      risk: risk.selectedOptions[0]?.textContent === "中",
      aria: document.querySelector(".brand")?.getAttribute("aria-label") === "Gaming Tweak Forge ホーム",
      persisted: localStorage.getItem(localeKey) === "ja",
      draft: draft.value === "locale-switch-draft",
      focus: document.activeElement === draft,
      viewport: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    };
    const japaneseValid = Object.values(japaneseChecks).every(Boolean);
    const selectedTheme = document.querySelector('input[name="theme"]:checked');
    let replacementFocusChecks = { controls: false };
    if (selectedTheme instanceof HTMLInputElement) {
      const themeValue = selectedTheme.value;
      selectedTheme.focus();
      switchLocale("en");
      const themeFocus =
        document.activeElement instanceof HTMLInputElement &&
        document.activeElement.name === "theme" &&
        document.activeElement.value === themeValue;
      const focusedAction = document.querySelector("button[data-action='edit']");
      if (focusedAction instanceof HTMLButtonElement) {
        const action = focusedAction.dataset.action;
        const tweakId = focusedAction.dataset.tweakId;
        focusedAction.focus();
        switchLocale("ja");
        const actionFocus =
          document.activeElement instanceof HTMLButtonElement &&
          document.activeElement.dataset.action === action &&
          document.activeElement.dataset.tweakId === tweakId;
        replacementFocusChecks = { controls: true, themeFocus, actionFocus };
      }
    }
    const replacementFocusValid = Object.values(replacementFocusChecks).every(Boolean);
    const editButton = document.querySelector("button[data-action='edit']");
    const cancelButton = document.querySelector("#cancel-edit-button");
    let editChecks = { controls: false };
    if (editButton instanceof HTMLButtonElement && cancelButton instanceof HTMLButtonElement) {
      editButton.click();
      const editId = document.querySelector("#tweak-id")?.value;
      draft.value = "locale-edit-draft";
      draft.focus();
      switchLocale("en");
      const englishEdit =
        document.querySelector("#save-tweak-button span:last-child")?.textContent === "Update tweak" &&
        document.querySelector("#tweak-id")?.value === editId &&
        draft.value === "locale-edit-draft" &&
        document.activeElement === draft;
      switchLocale("ja");
      const japaneseEdit =
        document.querySelector("#save-tweak-button span:last-child")?.textContent === "Tweakを更新" &&
        document.querySelector("#tweak-id")?.value === editId &&
        draft.value === "locale-edit-draft" &&
        document.activeElement === draft;
      editChecks = { controls: true, englishEdit, japaneseEdit };
      cancelButton.click();
    }
    const editValid = Object.values(editChecks).every(Boolean);
    const stableValid =
      [...operation.options].map((entry) => entry.value).join(",") === operationValues &&
      [...risk.options].map((entry) => entry.value).join(",") === riskValues &&
      localStorage.getItem(projectKey) === originalProject &&
      preview.textContent === originalPreview;
    draft.value = originalDraft;
    switchLocale(initialLocale);
    if (storedLocale === null) {
      localStorage.removeItem(localeKey);
    } else {
      localStorage.setItem(localeKey, storedLocale);
    }
    const checks = {
      documentTitle: document.title === "Gaming Tweak Forge",
      fileProtocol: location.protocol === "file:",
      tweakForm: document.querySelector("#tweak-form") !== null,
      regImport: document.querySelector("#reg-import-button") !== null,
      asciiPreview: document.querySelector("#ascii-art-preview")?.textContent.length > 0,
      saveBridge: typeof window.tweakForge?.saveText === "function",
      copyBridge: typeof window.tweakForge?.copyText === "function",
      englishLocale: englishValid,
      japaneseLocale: japaneseValid,
      replacementFocus: replacementFocusValid,
      editMode: editValid,
      stableProjectAndDraft: stableValid,
    };
    return {
      valid: Object.values(checks).every(Boolean),
      checks,
      englishChecks,
      japaneseChecks,
      replacementFocusChecks,
      editChecks,
    };
  })()
`;

async function runSmokeTest(window) {
  window.setSize(900, 680);
  const result = await window.webContents.executeJavaScript(SCRIPT);
  if (!result.valid) {
    console.error(JSON.stringify(result));
  }
  return result.valid;
}

module.exports = { runSmokeTest };
