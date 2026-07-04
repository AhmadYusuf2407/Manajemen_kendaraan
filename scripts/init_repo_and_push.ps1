param(
    [string]$remoteUrl
)

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git not found. Please install Git for Windows and run this script again."
    exit 1
}

if (-not $remoteUrl) {
    $remoteUrl = Read-Host "Enter Git remote URL (https://github.com/username/repo.git)"
}

git init
git add .
git commit -m "Initial: add project and CI workflows"
git branch -M main
git remote add origin $remoteUrl
git push -u origin main

Write-Host "Pushed to $remoteUrl" -ForegroundColor Green
