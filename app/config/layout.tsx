import type React from "react"

export default function ConfigLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        </body>
        </html>
    )
}