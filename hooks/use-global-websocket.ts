"use client"

import { useEffect, useRef, useCallback, useState } from "react"

interface WebSocketMessage {
    type: string
    [key: string]: any
}

interface WebSocketOptions {
    url: string
    onMessage?: (data: any) => void
    onError?: () => void
    onClose?: () => void
    onOpen?: () => void
}

class GlobalWebSocketManager {
    private static instance: GlobalWebSocketManager
    private ws: WebSocket | null = null
    private url = ""
    private subscribers: Map<string, (data: any) => void> = new Map()
    private errorHandlers: Map<string, () => void> = new Map()
    private closeHandlers: Map<string, () => void> = new Map()
    private openHandlers: Map<string, () => void> = new Map()
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
    private reconnectDelay = 1000
    private isConnecting = false

    static getInstance(): GlobalWebSocketManager {
        if (!GlobalWebSocketManager.instance) {
            GlobalWebSocketManager.instance = new GlobalWebSocketManager()
        }
        return GlobalWebSocketManager.instance
    }

    connect(url: string): void {
        if (this.ws?.readyState === WebSocket.OPEN && this.url === url) {
            return // Already connected to the same URL
        }

        if (this.isConnecting) {
            return // Already attempting to connect
        }

        this.url = url
        this.isConnecting = true

        try {
            if (this.ws) {
                this.ws.close()
            }

            this.ws = new WebSocket(url)

            this.ws.onopen = () => {
                console.log("WebSocket connected globally")
                this.isConnecting = false
                this.reconnectAttempts = 0
                this.openHandlers.forEach((handler) => handler())
            }

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    // Send to all subscribers immediately without any throttling
                    this.subscribers.forEach((handler) => handler(data))
                } catch (error) {
                    console.error("Error parsing WebSocket message:", error)
                }
            }

            this.ws.onerror = () => {
                console.error("WebSocket error")
                this.isConnecting = false
                this.errorHandlers.forEach((handler) => handler())
            }

            this.ws.onclose = () => {
                console.log("WebSocket closed")
                this.isConnecting = false
                this.closeHandlers.forEach((handler) => handler())

                // Auto-reconnect if not manually closed
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    setTimeout(() => {
                        this.reconnectAttempts++
                        this.connect(this.url)
                    }, this.reconnectDelay * this.reconnectAttempts)
                }
            }
        } catch (error) {
            console.error("Error creating WebSocket:", error)
            this.isConnecting = false
        }
    }

    disconnect(): void {
        this.reconnectAttempts = this.maxReconnectAttempts // Prevent auto-reconnect
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
    }

    send(data: any): boolean {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(data))
                return true
            } catch (error) {
                console.error("Error sending WebSocket message:", error)
                return false
            }
        }
        return false
    }

    subscribe(id: string, onMessage: (data: any) => void): void {
        this.subscribers.set(id, onMessage)
    }

    unsubscribe(id: string): void {
        this.subscribers.delete(id)
        this.errorHandlers.delete(id)
        this.closeHandlers.delete(id)
        this.openHandlers.delete(id)
    }

    setErrorHandler(id: string, handler: () => void): void {
        this.errorHandlers.set(id, handler)
    }

    setCloseHandler(id: string, handler: () => void): void {
        this.closeHandlers.set(id, handler)
    }

    setOpenHandler(id: string, handler: () => void): void {
        this.openHandlers.set(id, handler)
    }

    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN
    }

    getStatus(): string {
        if (!this.ws) return "disconnected"
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return "connecting"
            case WebSocket.OPEN:
                return "connected"
            case WebSocket.CLOSING:
                return "closing"
            case WebSocket.CLOSED:
                return "disconnected"
            default:
                return "unknown"
        }
    }
}

export function useGlobalWebSocket(options: WebSocketOptions) {
    const [status, setStatus] = useState<string>("disconnected")
    const [isConnected, setIsConnected] = useState(false)
    const manager = useRef(GlobalWebSocketManager.getInstance())
    const subscriberId = useRef(`subscriber_${Date.now()}_${Math.random()}`)

    const updateStatus = useCallback(() => {
        const newStatus = manager.current.getStatus()
        const connected = manager.current.isConnected()
        setStatus(newStatus)
        setIsConnected(connected)
    }, [])

    useEffect(() => {
        const id = subscriberId.current

        // Subscribe to messages
        if (options.onMessage) {
            manager.current.subscribe(id, options.onMessage)
        }

        // Set handlers
        if (options.onError) {
            manager.current.setErrorHandler(id, () => {
                options.onError?.()
                updateStatus()
            })
        }

        if (options.onClose) {
            manager.current.setCloseHandler(id, () => {
                options.onClose?.()
                updateStatus()
            })
        }

        if (options.onOpen) {
            manager.current.setOpenHandler(id, () => {
                options.onOpen?.()
                updateStatus()
            })
        }

        // Update initial status
        updateStatus()

        return () => {
            manager.current.unsubscribe(id)
        }
    }, [options.onMessage, options.onError, options.onClose, options.onOpen, updateStatus])

    const connect = useCallback(() => {
        manager.current.connect(options.url)
        updateStatus()
    }, [options.url, updateStatus])

    const disconnect = useCallback(() => {
        manager.current.disconnect()
        updateStatus()
    }, [updateStatus])

    const send = useCallback((data: any) => {
        return manager.current.send(data)
    }, [])

    return {
        status,
        isConnected,
        connect,
        disconnect,
        send,
    }
}
