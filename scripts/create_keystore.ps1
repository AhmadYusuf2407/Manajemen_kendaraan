param(
    [string]$keystorePath = "release.keystore",
    [string]$alias = "appkey",
    [int]$validity = 10000
)

if (-not (Get-Command keytool -ErrorAction SilentlyContinue)) {
    Write-Warning "keytool not found. Please install a JDK (Temurin/Adoptium) and ensure keytool is in PATH."
    Write-Host "You can install Temurin via winget: " -ForegroundColor Yellow
    Write-Host "winget install --id EclipseAdoptium.Temurin.17 -e" -ForegroundColor Cyan
    exit 1
}

$pass = Read-Host -AsSecureString "Enter keystore password"
$passConfirm = Read-Host -AsSecureString "Confirm keystore password"

if ([Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass)) -ne [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($passConfirm))) {
    Write-Error "Passwords do not match"
    exit 1
}

$plainPass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pass))

keytool -genkeypair -v -keystore $keystorePath -alias $alias -keyalg RSA -keysize 2048 -validity $validity -storepass $plainPass -keypass $plainPass

Write-Host "Keystore created at $keystorePath" -ForegroundColor Green
