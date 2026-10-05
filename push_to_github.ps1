# GitHub Push Script for Real-Time Location Tracking
$gitPath = "E:\MinGit\cmd\git.exe"
if (-not (Test-Path $gitPath)) {
    $gitPath = "git"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Push Code to: bonchantha57-ux/-Location-Tracking        " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "ជម្រើសទី ១: ប្រសិនបើលោកអ្នកមាន GitHub Personal Access Token (PAT)" -ForegroundColor Yellow
$token = Read-Host "សូមបិទភ្ជាប់ (Paste) GitHub Token នៅទីនេះ (ឬចុច Enter ដើម្បីរំលង)"

if (-not [string]::IsNullOrWhiteSpace($token)) {
    $authRemote = "https://$($token.Trim())@github.com/bonchantha57-ux/-Location-Tracking.git"
    Write-Host "កំពុង Push ទៅកាន់ GitHub..." -ForegroundColor Cyan
    & $gitPath push -u $authRemote main
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Push កូដបានជោគជ័យ ១០០%!" -ForegroundColor Green
        Write-Host "ឥឡូវនេះលោកអ្នកអាចបើក GitHub Pages បានហើយ:" -ForegroundColor Yellow
        Write-Host "https://bonchantha57-ux.github.io/-Location-Tracking/" -ForegroundColor Cyan
    }
} else {
    Write-Host "កំពុងដំណើរការ git push ផ្ទាល់..." -ForegroundColor Cyan
    & $gitPath push -u origin main
}
