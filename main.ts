// main.ts
import { app, BrowserWindow } from "electron";
import next from "next";
import { createServer, Server } from "http";
import { parse } from "url";
import path from "path";
import log from "electron-log";
import dotenv from "dotenv";

// --- 로깅 설정 ---
log.transports.file.resolvePathFn = () =>
  path.join(app.getPath("userData"), "logs/main.log");
Object.assign(console, log.functions);
process.on("uncaughtException", (error) => {
  log.error("Caught uncaughtException:", error);
  app.quit();
});
// -----------------

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3001;

const appDir = app.isPackaged
  ? path.join(process.resourcesPath, "app")
  : app.getAppPath();
log.info(`App directory for Next.js: ${appDir}`);

dotenv.config({ path: path.join(appDir, ".env") });
log.info("Loading .env file from:", path.join(appDir, ".env"));

const nextApp = next({
  dev,
  dir: appDir,
});

const handle = nextApp.getRequestHandler();
let server: Server;

function createWindow() {
  log.info("Creating main window...");
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const url = `http://${hostname}:${port}`;
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
      log.info(`> Next.js server ready on http://localhost:${port}`);
      createWindow();
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
