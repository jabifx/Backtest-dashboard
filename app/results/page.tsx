"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, RefreshCw } from "lucide-react"

export default function ResultsPage() {
    const [resultsUrl, setResultsUrl] = useState<string | null>(null)

    useEffect(() => {
        const storedUrl = localStorage.getItem("resultsUrl")
        setResultsUrl(storedUrl)
    }, [])

    const refreshResults = () => {
        const storedUrl = localStorage.getItem("resultsUrl")
        setResultsUrl(storedUrl)
    }

    const clearResults = () => {
        localStorage.removeItem("resultsUrl")
        setResultsUrl(null)
    }

    if (!resultsUrl) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
                <div className="text-center space-y-4">
                    <p className="text-lg text-muted-foreground">No Results Available</p>
                    <div className="flex gap-2 justify-center">
                        <Button onClick={refreshResults} variant="outline" size="sm">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-full w-full overflow-hidden flex flex-col">
            {/* Botones flotando a la derecha */}
            <div className="absolute top-2 right-2 z-10 flex gap-1">
                <Button
                    onClick={refreshResults}
                    variant="outline"
                    size="icon"
                    className="h-6 px-2 text-xs bg-transparent"
                >
                    <RefreshCw className="w-3 h-3" />
                </Button>
                <Button
                    onClick={() => window.open(resultsUrl, "_blank")}
                    variant="outline"
                    size="icon"
                    className="h-6 px-2 text-xs"
                >
                    <ExternalLink className="w-3 h-3" />
                </Button>
                <Button onClick={clearResults} variant="destructive" size="icon" className="h-6 px-2 text-xs">
                    Clear
                </Button>
            </div>

            {/* Iframe con bordes redondeados */}
            <div className="flex-1 p-2">
                <div className="w-full h-full rounded-lg overflow-hidden">
                    <iframe
                        src={resultsUrl}
                        className="w-full h-full border-0"
                        title="Backtest Results"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        style={{ display: 'block', boxSizing: 'border-box' }}
                    />
                </div>
            </div>
        </div>
    )
}
