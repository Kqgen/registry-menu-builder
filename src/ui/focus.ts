export function captureRenderedFocus(
  themeContainer: HTMLElement,
  tweakContainer: HTMLElement,
  systemActionContainer?: HTMLElement,
): () => void {
  const active = document.activeElement;
  if (active instanceof HTMLInputElement && themeContainer.contains(active) && active.name === "theme") {
    const value = active.value;
    return () => {
      const replacement = [...themeContainer.querySelectorAll<HTMLInputElement>('input[name="theme"]')]
        .find((candidate) => candidate.value === value);
      replacement?.focus({ preventScroll: true });
    };
  }
  if (active instanceof HTMLButtonElement && tweakContainer.contains(active)) {
    const action = active.dataset["action"];
    const tweakId = active.dataset["tweakId"];
    return () => {
      const replacement = [...tweakContainer.querySelectorAll<HTMLButtonElement>("button[data-action]")]
        .find((candidate) => candidate.dataset["action"] === action && candidate.dataset["tweakId"] === tweakId);
      replacement?.focus({ preventScroll: true });
    };
  }
  if (active instanceof HTMLButtonElement && systemActionContainer?.contains(active)) {
    const action = active.dataset["action"];
    const systemActionId = active.dataset["systemActionId"];
    return () => {
      const replacement = [...systemActionContainer.querySelectorAll<HTMLButtonElement>("button[data-action]")]
        .find((candidate) => candidate.dataset["action"] === action
          && candidate.dataset["systemActionId"] === systemActionId);
      replacement?.focus({ preventScroll: true });
    };
  }
  return () => undefined;
}
