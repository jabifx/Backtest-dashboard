"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, RotateCcw, X } from "lucide-react"
import { setApiUrl as setGlobalApiUrl } from "@/lib/config"

export default function ConfigPage() {
    const [apiUrl, setApiUrlState] = useState("http://localhost:8000")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        loadApiUrl()
    }, [])

    const loadApiUrl = async () => {
        try {
            let url = "http://localhost:8000"

            if (window.electronAPI) {
                const result = await window.electronAPI.getApiUrl()
                if (result.success) {
                    url = result.apiUrl
                }
            }

            setApiUrlState(url) // actualizamos estado local
        } catch (error) {
            console.error("Error loading API URL:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // guardamos en módulo global
            setGlobalApiUrl(apiUrl)

            // guardamos en Electron si existe
            if (window.electronAPI) {
                const result = await window.electronAPI.setApiUrl(apiUrl)
                if (result.success) {
                    await window.electronAPI.closeConfigWindow()
                }
            } else {
                console.log("API URL guardada localmente:", apiUrl)
            }
        } catch (error) {
            console.error("Error saving API URL:", error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleReset = () => {
        setApiUrlState("http://localhost:8000")
    }

    const handleClose = async () => {
        try {
            if (window.electronAPI) {
                await window.electronAPI.closeConfigWindow()
            }
        } catch (error) {
            console.error("Error closing config window:", error)
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="text-gray-500">Loading...</div>
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col bg-white">
            <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-8 bg-gray-50 border-b border-gray-200 drag-region">
                <div className="text-sm font-medium text-gray-700">Backtest Dashboard - Configuration</div>
                <button
                    onClick={handleClose}
                    className="no-drag flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors"
                >
                    <X className="h-4 w-4 text-gray-600" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4">API Configuration</h2>
                            <Label htmlFor="api-url" className="text-sm font-medium text-gray-700">
                                API Server URL
                            </Label>
                            <Input
                                id="api-url"
                                type="url"
                                value={apiUrl}
                                onChange={(e) => setApiUrlState(e.target.value)}
                                placeholder="http://localhost:8000"
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500">The base URL for the trading bot API server</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button onClick={handleSave} disabled={isSaving || !apiUrl.trim()} className="flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                {isSaving ? "Saving..." : "Save & Close"}
                            </Button>
                            <Button variant="outline" onClick={handleReset} className="flex items-center gap-2 bg-transparent">
                                <RotateCcw className="h-4 w-4" />
                                Reset to Default
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
