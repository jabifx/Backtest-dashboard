"use client"

import type React from "react"
import { ElectronTitlebar } from "@/components/electron-titlebar"
import { useEffect, useState } from "react"

function ConditionalTitlebar() {
    const [isConfigPage, setIsConfigPage] = useState(false)
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
        try {
            const currentPath = window.location.pathname
            setIsConfigPage(currentPath === "/config" || currentPath === "/config/")
        } catch (error) {
            console.warn("Could not determine pathname, showing titlebar by default")
            setIsConfigPage(false)
        }
    }, [])

    if (!isClient) {
        return <ElectronTitlebar />
    }

    if (isConfigPage) {
        return null
    }

    return <ElectronTitlebar />
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-screen">
            <ConditionalTitlebar />
            <div className="electron-content flex-1 flex flex-col">
                {children}
            </div>
        </div>
    )
}


