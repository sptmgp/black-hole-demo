# Run this from inside your black-hole-demo project folder.
# Usage:  .\setup.ps1

Write-Host "Step 1: Copying BlackHole3D.jsx from Downloads..." -ForegroundColor Cyan
$source = "$env:USERPROFILE\Downloads\black-hole-3d.jsx"
if (-not (Test-Path $source)) {
    Write-Host "ERROR: Could not find $source" -ForegroundColor Red
    Write-Host "Make sure black-hole-3d.jsx is in your Downloads folder, then run this script again." -ForegroundColor Red
    exit 1
}
Copy-Item $source -Destination "src\BlackHole3D.jsx" -Force
Write-Host "Copied." -ForegroundColor Green

Write-Host "Step 2: Writing src\App.jsx..." -ForegroundColor Cyan
@"
import BlackHole3D from './BlackHole3D';

export default function App() {
  return <BlackHole3D />;
}
"@ | Set-Content -Path "src\App.jsx" -Encoding utf8
Write-Host "Done." -ForegroundColor Green

Write-Host "Step 3: Installing Tailwind CSS (this may take a minute)..." -ForegroundColor Cyan
npm install -D tailwindcss postcss autoprefixer

Write-Host "Step 4: Writing tailwind.config.js..." -ForegroundColor Cyan
@"
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
"@ | Set-Content -Path "tailwind.config.js" -Encoding utf8

Write-Host "Step 5: Writing postcss.config.js..." -ForegroundColor Cyan
@"
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
"@ | Set-Content -Path "postcss.config.js" -Encoding utf8

Write-Host "Step 6: Writing src\index.css..." -ForegroundColor Cyan
@"
@tailwind base;
@tailwind components;
@tailwind utilities;
"@ | Set-Content -Path "src\index.css" -Encoding utf8

Write-Host "All set up. Starting the dev server now..." -ForegroundColor Green
Write-Host "Open the http://localhost:5173/ link that appears below." -ForegroundColor Yellow
npm run dev
