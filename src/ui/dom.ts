export function requireElement<T extends Element>(
  selector: string,
  constructor: new (...args: never[]) => T,
): T {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

export function option(value: string, label: string): HTMLOptionElement {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}
