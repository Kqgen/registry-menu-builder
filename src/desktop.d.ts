interface SaveTextRequest {
  readonly filename: string;
  readonly content: string;
  readonly type: string;
  readonly locale: "ja" | "en";
}

interface TweakForgeDesktopBridge {
  saveText(request: SaveTextRequest): Promise<boolean>;
  copyText(content: string): Promise<void>;
}

interface Window {
  readonly tweakForge?: TweakForgeDesktopBridge;
}
