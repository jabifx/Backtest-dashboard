const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("🔨 Building Next.js app in standalone mode...")
execSync("npm run build", { stdio: "inherit" })

console.log("📁 Verifying standalone build...")

const standaloneDir = path.join(process.cwd(), ".next/standalone")
const staticDir = path.join(process.cwd(), ".next/static")
const publicDir = path.join(process.cwd(), "public")

if (!fs.existsSync(standaloneDir)) {
    console.error("❌ Standalone build not found. Make sure output: 'standalone' is set in next.config.mjs")
    process.exit(1)
}

const serverPath = path.join(standaloneDir, "server.js")
if (!fs.existsSync(serverPath)) {
    console.error("❌ server.js not found in standalone build")
    process.exit(1)
}

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
    }

    const entries = fs.readdirSync(src, { withFileTypes: true })

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
        } else {
            fs.copyFileSync(srcPath, destPath)
        }
    }
}

// Copy static files to standalone directory
if (fs.existsSync(staticDir)) {
    const targetStaticDir = path.join(standaloneDir, ".next/static")
    copyDir(staticDir, targetStaticDir)
    console.log("✅ Static files copied to standalone directory")
}

// Copy public files to standalone directory
if (fs.existsSync(publicDir)) {
    const targetPublicDir = path.join(standaloneDir, "public")
    copyDir(publicDir, targetPublicDir)
    console.log("✅ Public files copied to standalone directory")
}

console.log("✅ Standalone build verified and prepared")

console.log("📦 Building Electron app...")
execSync("electron-builder", { stdio: "inherit" })

console.log("✅ Build completed!")
