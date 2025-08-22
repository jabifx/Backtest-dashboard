const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  // Window controls with enhanced error handling
  minimizeWindow: async () => {
    try {
      return await ipcRenderer.invoke("window-minimize")
    } catch (error) {
      console.error("Failed to minimize window:", error)
      return { success: false, error: error.message }
    }
  },

  maximizeWindow: async () => {
    try {
      return await ipcRenderer.invoke("window-maximize")
    } catch (error) {
      console.error("Failed to maximize window:", error)
      return { success: false, error: error.message }
    }
  },

  closeWindow: async () => {
    try {
      return await ipcRenderer.invoke("window-close")
    } catch (error) {
      console.error("Failed to close window:", error)
      return { success: false, error: error.message }
    }
  },

  isMaximized: async () => {
    try {
      return await ipcRenderer.invoke("window-is-maximized")
    } catch (error) {
      console.error("Failed to check window state:", error)
      return { success: false, isMaximized: false, error: error.message }
    }
  },

  getAppInfo: async () => {
    try {
      return await ipcRenderer.invoke("app-get-version")
    } catch (error) {
      console.error("Failed to get app info:", error)
      return { success: false, error: error.message }
    }
  },

  openConfigWindow: async () => {
    try {
      return await ipcRenderer.invoke("open-config-window")
    } catch (error) {
      console.error("Failed to open config window:", error)
      return { success: false, error: error.message }
    }
  },

  getApiUrl: async () => {
    try {
      return await ipcRenderer.invoke("get-api-url")
    } catch (error) {
      console.error("Failed to get API URL:", error)
      return { success: false, error: error.message, apiUrl: "http://localhost:8000" }
    }
  },

  setApiUrl: async (apiUrl) => {
    try {
      return await ipcRenderer.invoke("set-api-url", apiUrl)
    } catch (error) {
      console.error("Failed to set API URL:", error)
      return { success: false, error: error.message }
    }
  },

  closeConfigWindow: async () => {
    try {
      return await ipcRenderer.invoke("close-config-window")
    } catch (error) {
      console.error("Failed to close config window:", error)
      return { success: false, error: error.message }
    }
  },

  platform: process.platform,

  isDevelopment: process.env.NODE_ENV === "development",

  openExternal: (url) => {
    // Validate URL before opening
    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        ipcRenderer.send("open-external", url)
        return true
      }
      return false
    } catch (error) {
      console.error("Invalid URL:", error)
      return false
    }
  },
})

delete global.require
delete global.exports
delete global.module
delete global.__dirname
delete global.__filename
delete global.global
delete global.Buffer

Object.freeze(window.electronAPI)

if (process.env.NODE_ENV === "development") {
  contextBridge.exposeInMainWorld("electronDev", {
    openDevTools: () => ipcRenderer.send("open-dev-tools"),
    reloadApp: () => ipcRenderer.send("reload-app"),
    getPerformanceMetrics: () => {
      return {
        memory: process.memoryUsage(),
        versions: process.versions,
        platform: process.platform,
        arch: process.arch,
      }
    },
  })
}
