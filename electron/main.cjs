const { app, BrowserWindow, clipboard, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { runSmokeTest } = require("./smoke.cjs");
const { validClipboardContent, validSaveRequest } = require("./text-contracts.cjs");

const smokeTest = process.argv.includes("--smoke-test");

ipcMain.handle("save-text", async (_event, request) => {
  if (!validSaveRequest(request)) {
    throw new Error("Invalid save request");
  }
  const extension = path.extname(request.filename).toLowerCase();
  const filter = extension === ".json"
    ? { name: request.locale === "ja" ? "Tweakプロジェクト" : "Tweak project", extensions: ["json"] }
    : { name: request.locale === "ja" ? "Gaming Tweak BATファイル" : "Gaming Tweak BAT file", extensions: ["bat"] };
  const result = await dialog.showSaveDialog({
    defaultPath: path.join(app.getPath("documents"), request.filename),
    filters: [filter],
  });
  if (result.canceled || result.filePath === undefined) {
    return false;
  }
  await fs.writeFile(result.filePath, request.content, "utf8");
  return true;
});

ipcMain.handle("copy-text", (_event, content) => {
  if (!validClipboardContent(content)) {
    throw new Error("Invalid clipboard content");
  }
  clipboard.writeText(content);
});

function createWindow() {
  const window = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 900,
    minHeight: 680,
    show: !smokeTest,
    icon: path.join(__dirname, "..", "dist", "icon.png"),
    backgroundColor: "#dcd8cf",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webviewTag: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.webContents.on("did-fail-load", () => {
    if (smokeTest) {
      app.exit(1);
    }
  });
  window.webContents.once("did-finish-load", async () => {
    if (!smokeTest) {
      return;
    }
    try {
      app.exit(await runSmokeTest(window) ? 0 : 1);
    } catch {
      app.exit(1);
    }
  });
  window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  return window;
}

app.whenReady().then(() => {
  app.setAppUserModelId("dev.kagen.gamingtweakforge");
  createWindow();
  if (smokeTest) {
    setTimeout(() => app.exit(1), 20_000);
  }
});

app.on("window-all-closed", () => app.quit());
