import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  verifyPassword: (password: string) =>
    ipcRenderer.send("verify-password", password),
  onAuthResult: (callback: (success: boolean) => void) => {
    ipcRenderer.on("auth-result", (_event, success) => callback(success));
  },
});
