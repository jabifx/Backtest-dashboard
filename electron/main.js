const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron")
const path = require("path")
const isDev = process.env.NODE_ENV === "development"

let mainWindow
let configWindow // Added config window variable
let nextServer // Added variable for the server Next.js standalone

// Function to start the server Next.js standalone
function startNextServer() {
  if (isDev) return Promise.resolve()

  return new Promise((resolve, reject) => {
    try {
      const { spawn } = require("child_process")

      // Get the correct path for the standalone server
      let serverPath
      let workingDir

      if (app.isPackaged) {
        // In packaged app, standalone files are in extraResources
        const resourcesPath = process.resourcesPath
        serverPath = path.join(resourcesPath, "standalone", "server.js")
        workingDir = path.join(resourcesPath, "standalone")
      } else {
        // In development, use the build output
        serverPath = path.join(__dirname, "../.next/standalone/server.js")
        workingDir = path.join(__dirname, "../.next/standalone")
      }

      console.log(`[v0] Server path: ${serverPath}`)
      console.log(`[v0] Working directory: ${workingDir}`)
      console.log(`[v0] Is packaged: ${app.isPackaged}`)

      // Check if server file exists
      if (!require("fs").existsSync(serverPath)) {
        throw new Error(`Server file not found at: ${serverPath}`)
      }

      // Set environment variables
      const env = {
        ...process.env,
        PORT: "3001",
        HOSTNAME: "localhost",
        NODE_ENV: "production",
      }

      // Start the server as a child process
      const serverProcess = spawn("node", [serverPath], {
        cwd: workingDir,
        env: env,
        stdio: ["pipe", "pipe", "pipe"],
      })

      serverProcess.stdout.on("data", (data) => {
        console.log(`[Next.js Server] ${data.toString()}`)
      })

      serverProcess.stderr.on("data", (data) => {
        console.error(`[Next.js Server Error] ${data.toString()}`)
      })

      serverProcess.on("error", (error) => {
        console.error("Failed to start Next.js server:", error)
        reject(error)
      })

      // Wait for server to be ready
      setTimeout(() => {
        console.log("✅ Next.js standalone server started on port 3001")
        nextServer = serverProcess
        resolve()
      }, 2000)
    } catch (error) {
      console.error("Error starting Next.js server:", error)
      reject(error)
    }
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false, // Keep false for IPC communication
      spellcheck: false, // Disable spellcheck for performance
      backgroundThrottling: false, // Keep app responsive
    },
    show: false,
    backgroundColor: "#ffffff",
    icon: path.join(__dirname, "../public/icon.png"),
    autoHideMenuBar: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    center: true,
    movable: true,
  })

  const startUrl = isDev ? "http://localhost:3000" : "http://localhost:3001"

  mainWindow.loadURL(startUrl)

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()

    if (mainWindow) {
      mainWindow.focus()
    }

    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: "deny" }
  })

  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)

    if (
        parsedUrl.origin !== "http://localhost:3000" &&
        parsedUrl.origin !== "http://localhost:3001" &&
        !navigationUrl.startsWith("file://")
    ) {
      event.preventDefault()
    }
  })

  if (isDev) {
    mainWindow.webContents.on("certificate-error", (event, url, error, certificate, callback) => {
      if (url.startsWith("http://localhost:")) {
        event.preventDefault()
        callback(true)
      } else {
        callback(false)
      }
    })
  }

  mainWindow.webContents.on("crashed", (event, killed) => {
    console.error("Renderer process crashed:", { killed })

    const options = {
      type: "error",
      title: "Application Error",
      message: "The application has crashed. Would you like to restart?",
      buttons: ["Restart", "Close"],
    }

    dialog.showMessageBox(mainWindow, options).then((result) => {
      if (result.response === 0) {
        app.relaunch()
        app.exit(0)
      } else {
        app.quit()
      }
    })
  })

  mainWindow.webContents.on("unresponsive", () => {
    console.warn("Renderer process became unresponsive")

    const options = {
      type: "warning",
      title: "Application Not Responding",
      message: "The application is not responding. Would you like to wait or restart?",
      buttons: ["Wait", "Restart"],
    }

    dialog.showMessageBox(mainWindow, options).then((result) => {
      if (result.response === 1) {
        app.relaunch()
        app.exit(0)
      }
    })
  })

  mainWindow.webContents.on("responsive", () => {
    console.log("Renderer process became responsive again")
  })
}

function createConfigWindow() {
  if (configWindow && !configWindow.isDestroyed()) {
    configWindow.focus()
    return
  }

  configWindow = new BrowserWindow({
    width: 500,
    height: 300,
    minWidth: 400,
    minHeight: 250,
    frame: false,
    titleBarStyle: "hidden",
    parent: mainWindow,
    modal: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
    },
    show: false,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    center: true,
    alwaysOnTop: true,
  })

  const configUrl = isDev ? "http://localhost:3000/config" : "http://localhost:3001/config"

  configWindow.loadURL(configUrl)

  configWindow.once("ready-to-show", () => {
    configWindow.show()
  })

  configWindow.on("closed", () => {
    configWindow = null
  })
}

ipcMain.handle("window-minimize", async () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize()
      return { success: true }
    }
    return { success: false, error: "Window not available" }
  } catch (error) {
    console.error("Error minimizing window:", error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("window-maximize", async () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
      return { success: true, isMaximized: mainWindow.isMaximized() }
    }
    return { success: false, isMaximized: false, error: "Window not available" }
  } catch (error) {
    console.error("Error maximizing window:", error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("window-close", async () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
      return { success: true }
    }
    return { success: false, error: "Window not available" }
  } catch (error) {
    console.error("Error closing window:", error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("window-is-maximized", async () => {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      return { success: true, isMaximized: mainWindow.isMaximized() }
    }
    return { success: false, isMaximized: false, error: "Window not available" }
  } catch (error) {
    console.error("Error checking window state:", error)
    return { success: false, isMaximized: false, error: error.message }
  }
})

ipcMain.handle("app-get-version", async () => {
  try {
    return {
      success: true,
      version: app.getVersion(),
      name: app.getName(),
      isDev: isDev,
    }
  } catch (error) {
    console.error("Error getting app info:", error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("open-config-window", async () => {
  try {
    createConfigWindow()
    return { success: true }
  } catch (error) {
    console.error("Error opening config window:", error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("get-api-url", async () => {
  try {
    const fs = require("fs")
    const configPath = path.join(app.getPath("userData"), "config.json")

    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
      return { success: true, apiUrl: config.apiUrl || "http://localhost:8000" }
    }

    return { success: true, apiUrl: "http://localhost:8000" }
  } catch (error) {
    console.error("Error getting API URL:", error)
    return { success: false, error: error.message, apiUrl: "http://localhost:8000" }
  }
})

ipcMain.handle("set-api-url", async (event, apiUrl) => {
  try {
    const fs = require("fs")
    const configPath = path.join(app.getPath("userData"), "config.json")

    const config = { apiUrl }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    return { success: true }
  } catch (error) {
    console.error("Error setting API URL:", error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle("close-config-window", async () => {
  try {
    if (configWindow && !configWindow.isDestroyed()) {
      configWindow.close()
      return { success: true }
    }
    return { success: false, error: "Config window not available" }
  } catch (error) {
    console.error("Error closing config window:", error)
    return { success: false, error: error.message }
  }
})

app.whenReady().then(async () => {
  try {
    if (!isDev) {
      await startNextServer()
    }
    createWindow()

    if (process.platform === "win32") {
      app.setAppUserModelId("com.tradingbot.dashboard")
    }
  } catch (error) {
    console.error("Error starting application:", error)
    app.quit()
  }
})

app.on("window-all-closed", () => {
  if (nextServer) {
    nextServer.kill()
  }

  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on("web-contents-created", (event, contents) => {
  contents.on("new-window", (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
})

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error)

  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showErrorBox("Unexpected Error", `An unexpected error occurred: ${error.message}`)
  }
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
})

app.on("before-quit", (event) => {
  console.log("App is about to quit")
  if (nextServer) {
    nextServer.kill()
  }
})

app.on("will-quit", (event) => {
  console.log("App will quit")
})
