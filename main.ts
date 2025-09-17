import { app, BrowserWindow, ipcMain, dialog } from "electron";
import next from "next";
import { createServer, Server } from "http";
import { parse } from "url";
import path from "path";
import log from "electron-log";
import dotenv from "dotenv";
import macaddress from "macaddress";
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
const LICENSED_MAC_ADDRESS = process.env.LICENSED_MAC_ADDRESS;
const APP_PASSWORD = process.env.APP_PASSWORD;

const nextApp = next({ dev: isDev, dir: appDir, hostname, port });
const handle = nextApp.getRequestHandler();

let server: Server | null = null;

app.on("ready", async () => {
  if (!LICENSED_MAC_ADDRESS || !APP_PASSWORD) {
    dialog.showErrorBox(
      "설정 오류",
      "라이선스 정보가 올바르게 설정되지 않았습니다."
    );
    return app.quit();
  }

  try {
    const currentMac = await macaddress.one();

    // --- MAC 주소 정규화 및 비교 로직 (핵심 수정 부분) ---
    const normalizeMac = (mac: string | undefined | null): string => {
      if (!mac) return "";
      // 소문자로 바꾸고, 모든 하이픈(-)과 콜론(:)을 제거합니다.
      return mac.toLowerCase().replace(/[:-]/g, "");
    };

    const normalizedCurrentMac = normalizeMac(currentMac);
    const normalizedLicensedMac = normalizeMac(LICENSED_MAC_ADDRESS);

    log.info(`Current MAC (raw): ${currentMac}`);
    log.info(`Licensed MAC (raw): ${LICENSED_MAC_ADDRESS}`);
    log.info(`Normalized Current MAC: ${normalizedCurrentMac}`);
    log.info(`Normalized Licensed MAC: ${normalizedLicensedMac}`);

    if (normalizedCurrentMac !== normalizedLicensedMac) {
      log.error("MAC address does not match after normalization.");
      dialog.showErrorBox(
        "인증 오류",
        "이 기기에서는 프로그램을 사용할 수 없습니다."
      );
      return app.quit();
    }
    // ----------------------------------------------------

    const authWindow = new BrowserWindow({
      width: 600,
      height: 450,
      resizable: false,
      webPreferences: { preload: path.join(__dirname, "preload.js") },
    });
    authWindow.loadFile(path.join(appDir, "public", "startpw.html"));
  } catch (err) {
    log.error("Failed to get MAC address:", err);
    dialog.showErrorBox("오류", "네트워크 정보를 확인하는 데 실패했습니다.");
    return app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    server?.close();
    app.quit();
  }
});

ipcMain.on("verify-password", async (event, password) => {
  const passwordMatch = password === APP_PASSWORD;

  if (passwordMatch) {
    log.info("Password verification successful.");
    try {
      await nextApp.prepare();
      server = createServer((req, res) =>
        handle(req, res, parse(req.url!, true))
      ).listen(port, () => {
        const actualPort = (server!.address() as AddressInfo).port;
        log.info(`> Next.js server ready on http://${hostname}:${actualPort}`);

        const mainWindow = new BrowserWindow({
          width: 1920,
          height: 1080,
          webPreferences: { nodeIntegration: false, contextIsolation: true },
        });
        mainWindow.loadURL(`http://${hostname}:${actualPort}`);

        mainWindow.once("ready-to-show", () => {
          BrowserWindow.fromWebContents(event.sender)?.close();
          mainWindow.show();
        });
      });
    } catch (err) {
      log.error("Error starting Next.js server:", err);
      app.quit();
    }
  } else {
    log.warn("Password verification failed.");
    event.sender.send("auth-result", false);
  }
});
