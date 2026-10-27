import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const svgContent = fs.readFileSync('public/icon.svg', 'utf8')

function generateHtml(size) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    overflow: hidden;
    background: transparent;
  }
  svg {
    width: ${size}px;
    height: ${size}px;
    display: block;
  }
</style>
</head>
<body>
${svgContent}
</body>
</html>`
}

const sizes = [
  { size: 512, file: 'public/icon-512.png' },
  { size: 192, file: 'public/icon-192.png' },
  { size: 180, file: 'public/apple-touch-icon.png' },
  { size: 128, file: 'public/gym-logo.png' },
  { size: 64, file: 'public/favicon-64.png' },
  { size: 32, file: 'public/favicon-32.png' },
]

const chromePath = 'C:\\Program Files\\Google\Chrome\\Application\\chrome.exe'
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const browserPath = fs.existsSync(chromePath) ? chromePath : edgePath

for (const { size, file } of sizes) {
  const tempHtmlPath = path.resolve(`scripts/temp-${size}.html`)
  fs.writeFileSync(tempHtmlPath, generateHtml(size))
  const absoluteOut = path.resolve(file)
  
  const cmd = `"${browserPath}" --headless=new --screenshot="${absoluteOut}" --window-size=${size},${size} --default-background-color=00000000 "file:///${tempHtmlPath.replace(/\\/g, '/')}"`
  execSync(cmd, { stdio: 'inherit' })
  fs.unlinkSync(tempHtmlPath)
  console.log(`Generated ${file} (${size}x${size})`)
}
