const { app, BrowserWindow, clipboard, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const smokeTest = process.argv.includes("--smoke-test");

function validSaveRequest(request) {
  return request !== null &&
    typeof request === "object" &&
    typeof request.filename === "string" &&
    /^[^<>:"/\\|?*\u0000-\u001f]{1,80}$/u.test(request.filename) &&
    typeof request.content === "string" &&
    request.content.length <= 16_777_216 &&
    typeof request.type === "string" &&
    request.type.length <= 96;
}

ipcMain.handle("save-text", async (_event, request) => {
  if (!validSaveRequest(request)) {
    throw new Error("Invalid save request");
  }
  const extension = path.extname(request.filename).toLowerCase();
  const filter = extension === ".json"
    ? { name: "Tweak project", extensions: ["json"] }
    : { name: "Gaming Tweak BAT", extensions: ["bat"] };
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
  if (typeof content !== "string" || content.length > 16_777_216) {
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
      const valid = await window.webContents.executeJavaScript(`
        document.title === "Gaming Tweak Forge" &&
        location.protocol === "file:" &&
        document.querySelector("#tweak-form") !== null &&
        document.querySelector("#reg-import-button") !== null &&
        document.querySelector("#ascii-art-preview")?.textContent.length > 0 &&
        typeof window.tweakForge?.saveText === "function" &&
        typeof window.tweakForge?.copyText === "function"
      `);
      app.exit(valid ? 0 : 1);
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
