import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Renderer -> Main
  verifyPassword: (password: string) =>
    ipcRenderer.send("verify-password", password),
  registerApp: (key: string) => ipcRenderer.send("register-app", key),

  // Main -> Renderer
  onAuthResult: (callback: (success: boolean, message?: string) => void) => {
    ipcRenderer.on("auth-result", (_event, success, message) =>
      callback(success, message)
    );
  },
  onSetMode: (callback: (mode: "login" | "register") => void) => {
    ipcRenderer.on("set-mode", (_event, mode) => callback(mode));
  },
});
