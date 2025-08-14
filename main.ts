import { app, BrowserWindow, ipcMain, dialog } from "electron";
import next from "next";
import { createServer, Server } from "http";
import { parse } from "url";
import path from "path";
import log from "electron-log";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import macaddress from "macaddress";
import fs from "fs";
import type { AddressInfo } from "net";

// --- 로깅 설정 ---
log.transports.file.resolvePathFn = () =>
  path.join(app.getPath("userData"), "logs/main.log");
Object.assign(console, log.functions);
process.on("uncaughtException", (error) => {
  log.error("Caught uncaughtException:", error);
  app.quit();
});
// -----------------

const hostname = "localhost";
const isDev = !app.isPackaged;
const port = isDev ? 3001 : 0;
const appDir = isDev
  ? app.getAppPath()
  : path.join(process.resourcesPath, "app");

dotenv.config({ path: path.join(appDir, ".env") });
const APP_ACTIVATION_KEY = process.env.APP_ACTIVATION_KEY;

const nextApp = next({ dev: isDev, dir: appDir, hostname, port });
const handle = nextApp.getRequestHandler();

let server: Server;
let mainWindow: BrowserWindow | null = null;
let authWindow: BrowserWindow | null = null;

const licensePath = path.join(app.getPath("userData"), "license.json");

async function createLicenseFile(password: string) {
  try {
    const mac = await macaddress.one();
    if (!mac) {
      log.error("Could not get MAC address.");
      return false;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const licenseData = { macAddress: mac, passwordHash: hashedPassword };
    fs.writeFileSync(licensePath, JSON.stringify(licenseData, null, 2));
    log.info(`License file created for MAC: ${mac}`);
    return true;
  } catch (err) {
    log.error("Failed to create license file:", err);
    return false;
  }
}

async function launchMainApp() {
  if (mainWindow) {
    return;
  }
  log.info("Authentication successful. Preparing Next.js server...");
  try {
    await nextApp.prepare();
    server = createServer((req, res) =>
      handle(req, res, parse(req.url!, true))
    ).listen(port, () => {
      const actualPort = (server.address() as AddressInfo).port;
      log.info(`> Next.js server ready on http://${hostname}:${actualPort}`);
      createMainWindow(actualPort);
    });
  } catch (err) {
    log.error("Error starting Next.js server:", err);
    app.quit();
  }
}

function createMainWindow(actualPort: number) {
  // 메인 창을 먼저 생성합니다.
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  const url = `http://${hostname}:${actualPort}`;
  mainWindow.loadURL(url).catch((err) => log.error("Failed to load URL:", err));

  // 메인 창이 성공적으로 표시되면, 그 때 인증 창을 닫습니다.
  mainWindow.once("ready-to-show", () => {
    if (authWindow) {
      authWindow.close();
    }
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createAuthWindow() {
  authWindow = new BrowserWindow({
    width: 600,
    height: 480,
    resizable: false,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  authWindow.loadFile(path.join(appDir, "public", "startpw.html"));
  authWindow.on("closed", () => {
    authWindow = null;
  });
}

app.on("ready", () => {
  createAuthWindow();
  authWindow?.webContents.on("did-finish-load", () => {
    if (!fs.existsSync(licensePath)) {
      authWindow?.webContents.send("set-mode", "register");
    } else {
      authWindow?.webContents.send("set-mode", "login");
    }
  });
});

app.on("window-all-closed", () => {
  // 메인 창이 닫혔을 때만 앱을 종료하도록 합니다.
  if (process.platform !== "darwin") {
    server?.close();
    app.quit();
  }
});

// --- IPC 통신 핸들러 ---
ipcMain.on("register-app", async (_event, key) => {
  if (key === APP_ACTIVATION_KEY) {
    const success = await createLicenseFile(key);
    if (success) {
      // 창을 여기서 닫지 않고, 메인 앱 실행 함수를 호출합니다.
      await launchMainApp();
    } else {
      authWindow?.webContents.send(
        "auth-result",
        false,
        "라이선스 생성에 실패했습니다."
      );
    }
  } else {
    authWindow?.webContents.send(
      "auth-result",
      false,
      "제품 키가 올바르지 않습니다."
    );
  }
});

ipcMain.on("verify-password", async (_event, password) => {
  try {
    const licenseData = JSON.parse(fs.readFileSync(licensePath, "utf-8"));
    const currentMac = await macaddress.one();
    if (currentMac !== licenseData.macAddress) {
      dialog.showErrorBox(
        "인증 오류",
        "이 기기에서는 프로그램을 사용할 수 없습니다."
      );
      app.quit();
      return;
    }
    const success = await bcrypt.compare(password, licenseData.passwordHash);
    if (success) {
      // 창을 여기서 닫지 않고, 메인 앱 실행 함수를 호출합니다.
      await launchMainApp();
    } else {
      authWindow?.webContents.send("auth-result", false);
    }
  } catch (err) {
    authWindow?.webContents.send(
      "auth-result",
      false,
      "인증 중 오류가 발생했습니다.",
      err
    );
  }
});
