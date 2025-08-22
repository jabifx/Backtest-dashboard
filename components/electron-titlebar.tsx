"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Minus, Square, X, Activity, BarChart3, Settings } from "lucide-react"
import { usePathname } from "next/navigation"

interface ElectronTitlebarProps {
  backtestStatus?: "idle" | "starting" | "running" | "completed" | "error"
}

export function ElectronTitlebar({ backtestStatus = "idle" }: ElectronTitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isElectron, setIsElectron] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const checkElectron = () => {
      const hasElectronAPI = typeof window !== "undefined" && window.electronAPI !== undefined
      setIsElectron(hasElectronAPI)
      if (hasElectronAPI && window.electronAPI) window.electronAPI.isMaximized().then(setIsMaximized)
    }
    checkElectron()
  }, [])

  const handleMinimize = () => window.electronAPI?.minimizeWindow()
  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow()
      setIsMaximized(!isMaximized)
    }
  }
  const handleClose = () => window.electronAPI?.closeWindow()
  const handleOpenConfig = () => window.electronAPI?.openConfigWindow()

  const getStatusColor = () => {
    switch (backtestStatus) {
      case "idle": return "secondary"
      case "starting":
      case "running": return "default"
      case "completed": return "default"
      case "error": return "destructive"
      default: return "secondary"
    }
  }

  const getStatusText = () => {
    switch (backtestStatus) {
      case "idle": return "Idle"
      case "starting": return "Starting..."
      case "running": return "Running"
      case "completed": return "Completed"
      case "error": return "Error"
      default: return "Unknown"
    }
  }

  return (
      <div className="flex h-12 w-full items-center justify-between bg-white/95 backdrop-blur-sm border-b border-gray-200/80 shadow-sm select-none fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-6 px-4 flex-1 drag-region">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white shadow-lg">
              <Activity className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 tracking-tight">TradingBot Platform</span>
              <span className="text-xs text-gray-500 font-medium">Professional Trading Suite</span>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-6">
            <nav className="flex items-center gap-1">
              <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 text-xs no-drag transition-all duration-200 rounded-md ${
                      pathname === "/" ? "bg-blue-50 text-blue-700 font-medium border border-blue-200 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                  }`}
                  asChild
              >
                <Link href="/" className="flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" />
                  Dashboard
                </Link>
              </Button>

              <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 text-xs no-drag transition-all duration-200 rounded-md ${
                      pathname === "/optimizer" ? "bg-blue-50 text-blue-700 font-medium border border-blue-200 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                  }`}
                  asChild
              >
                <Link href="/optimizer" className="flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  Optimizer
                </Link>
              </Button>

              <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-3 text-xs no-drag transition-all duration-200 rounded-md ${
                      pathname === "/results" ? "bg-blue-50 text-blue-700 font-medium border border-blue-200 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                  }`}
                  asChild
              >
                <Link href="/results" className="flex items-center gap-2">
                  <BarChart3 className="h-3 w-3" />
                  Results
                </Link>
              </Button>
            </nav>

            <div className="h-4 w-px bg-gray-300"></div>

            <Badge
                variant={getStatusColor()}
                className={`text-xs h-6 px-2 font-medium rounded-full ${
                    backtestStatus === "running" ? "animate-pulse" : ""
                } ${
                    backtestStatus === "completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
                        : backtestStatus === "error"
                            ? "bg-red-50 text-red-700 border-red-200 shadow-sm"
                            : backtestStatus === "running"
                                ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm"
                                : "bg-gray-50 text-gray-600 border-gray-200 shadow-sm"
                }`}
            >
              {getStatusText()}
            </Badge>
          </div>
        </div>

        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="h-12 w-12 p-0 rounded-none text-gray-400 hover:text-gray-600 hover:bg-gray-50/80 transition-all duration-200 ease-in-out group mr-2 border-r border-gray-200/50" onClick={handleOpenConfig} disabled={!isElectron}>
            <Settings className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          </Button>
          <Button variant="ghost" size="sm" className="h-12 w-12 p-0 rounded-none text-gray-400 hover:text-gray-600 hover:bg-gray-50/80 transition-all duration-200 ease-in-out group" onClick={handleMinimize} disabled={!isElectron}>
            <Minus className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          </Button>
          <Button variant="ghost" size="sm" className="h-12 w-12 p-0 rounded-none text-gray-400 hover:text-gray-600 hover:bg-gray-50/80 transition-all duration-200 ease-in-out group" onClick={handleMaximize} disabled={!isElectron}>
            <Square className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          </Button>
          <Button variant="ghost" size="sm" className="h-12 w-12 p-0 rounded-none text-gray-400 hover:text-white hover:bg-red-500/90 transition-all duration-200 ease-in-out group shadow-sm hover:shadow-md" onClick={handleClose} disabled={!isElectron}>
            <X className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          </Button>
        </div>
      </div>
  )
}
