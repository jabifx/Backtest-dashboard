"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConnectionStatusProps {
  isConnected: boolean
  onReconnect?: () => void
  className?: string
}

export function ConnectionStatus({ isConnected, onReconnect, className }: ConnectionStatusProps) {
  const [showReconnect, setShowReconnect] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      const timer = setTimeout(() => setShowReconnect(true), 3000)
      return () => clearTimeout(timer)
    } else {
      setShowReconnect(false)
    }
  }, [isConnected])

  if (isConnected) {
    return (
      <Badge variant="outline" className={cn("gap-1 text-green-700 border-green-200 bg-green-50", className)}>
        <Wifi className="h-3 w-3" />
        Connected
      </Badge>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant="outline" className="gap-1 text-red-700 border-red-200 bg-red-50 animate-pulse">
        <WifiOff className="h-3 w-3" />
        Disconnected
      </Badge>
      {showReconnect && onReconnect && (
        <Button size="sm" variant="outline" onClick={onReconnect} className="h-6 px-2 text-xs gap-1 bg-transparent">
          <RefreshCw className="h-3 w-3" />
          Reconnect
        </Button>
      )}
    </div>
  )
}
