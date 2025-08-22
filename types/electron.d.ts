interface ElectronAPI {
  minimizeWindow: () => Promise<{ success: boolean; error?: string }>
  maximizeWindow: () => Promise<{ success: boolean; isMaximized?: boolean; error?: string }>
  closeWindow: () => Promise<{ success: boolean; error?: string }>
  isMaximized: () => Promise<{ success: boolean; isMaximized: boolean; error?: string }>
  getAppInfo: () => Promise<{
    success: boolean
    version?: string
    name?: string
    isDev?: boolean
    error?: string
  }>
  platform: string
  isDevelopment: boolean
  openExternal: (url: string) => boolean
}

interface ElectronDev {
  openDevTools: () => void
  reloadApp: () => void
  getPerformanceMetrics: () => {
    memory: NodeJS.MemoryUsage
    versions: NodeJS.ProcessVersions
    platform: string
    arch: string
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electronDev?: ElectronDev
  }
}

export {}
