"use client"

import { useRef, useEffect, useCallback, useState } from "react"

export type WebSocketStatus = "connecting" | "connected" | "disconnected" | "error"

interface UseWebSocketOptions {
  url: string
  onMessage?: (data: any) => void
  onError?: (error: Event) => void
  onClose?: () => void
  reconnectAttempts?: number
  reconnectInterval?: number
}

interface UseWebSocketReturn {
  status: WebSocketStatus
  send: (data: any) => boolean
  connect: () => void
  disconnect: () => void
  isConnected: boolean
}

export function useWebSocket({
  url,
  onMessage,
  onError,
  onClose,
  reconnectAttempts = 3,
  reconnectInterval = 3000,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectCountRef = useRef(0)
  const [status, setStatus] = useState<WebSocketStatus>("disconnected")

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null

      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }

      wsRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    cleanup()
    setStatus("connecting")

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus("connected")
        reconnectCountRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage?.(data)
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error)
        }
      }

      ws.onclose = () => {
        setStatus("disconnected")
        onClose?.()

        // Auto-reconnect if we haven't exceeded attempts
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      ws.onerror = (error) => {
        setStatus("error")
        onError?.(error)
      }
    } catch (error) {
      setStatus("error")
      console.error("Failed to create WebSocket connection:", error)
    }
  }, [url, onMessage, onError, onClose, reconnectAttempts, reconnectInterval, cleanup])

  const disconnect = useCallback(() => {
    reconnectCountRef.current = reconnectAttempts // Prevent auto-reconnect
    cleanup()
    setStatus("disconnected")
  }, [cleanup, reconnectAttempts])

  const send = useCallback((data: any): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(data))
        return true
      } catch (error) {
        console.error("Failed to send WebSocket message:", error)
        return false
      }
    }
    return false
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    status,
    send,
    connect,
    disconnect,
    isConnected: status === "connected",
  }
}
