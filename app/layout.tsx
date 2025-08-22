import type React from "react"
import "./globals.css"
import ClientLayout from "./ClientLayout"

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body className="h-screen m-0 p-0 bg-background font-sans antialiased">
        <ClientLayout>{children}</ClientLayout>
        </body>
        </html>
    )
}
