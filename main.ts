// main.ts
import { app, BrowserWindow } from "electron";
import next from "next";
import { createServer, Server } from "http";
import { parse } from "url";
import path from "path";
import log from "electron-log";
import dotenv from "dotenv";
import type { AddressInfo } from "net"; // AddressInfo 타입을 가져옵니다.

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

// Electron 앱이 패키징되었는지 여부로 개발/프로덕션 환경을 구분합니다.
const isDev = !app.isPackaged;

// 개발 환경에서는 3001 포트를, 설치된 앱에서는 0 (사용 가능한 포트 자동 할당)을 사용합니다.
const port = isDev ? 3001 : 0;

const appDir = isDev
  ? app.getAppPath()
  : path.join(process.resourcesPath, "app");
log.info(`App directory for Next.js: ${appDir}`);

dotenv.config({ path: path.join(appDir, ".env") });
log.info("Loading .env file from:", path.join(appDir, ".env"));

const nextApp = next({
  dev: isDev,
  dir: appDir,
  hostname,
  port,
});

const handle = nextApp.getRequestHandler();
let server: Server;

function createWindow(actualPort: number) {
  log.info(`Creating main window for port: ${actualPort}`);
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const url = `http://${hostname}:${actualPort}`;
  win.loadURL(url).catch((err) => {
    log.error("Failed to load URL:", url, err);
  });
}

app.on("ready", async () => {
  log.info("App is ready. Preparing Next.js server...");
  try {
    await nextApp.prepare();
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    }).listen(port, () => {
      // 서버가 실제로 사용하게 된 포트 번호를 가져옵니다.
      const actualPort = (server.address() as AddressInfo).port;
      log.info(`> Next.js server ready on http://${hostname}:${actualPort}`);
      createWindow(actualPort); // 실제 포트 번호를 전달합니다.
    });
  } catch (err) {
    log.error("Error starting Next.js server:", err);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    log.info("All windows closed, quitting app.");
    server?.close();
    app.quit();
  }
});
