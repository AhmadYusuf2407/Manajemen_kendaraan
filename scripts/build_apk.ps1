Param()
Write-Host "=== Build APK Script: Manajemen Kendaraan ==="

function ExitWith([string]$msg){ Write-Host $msg; exit 1 }

# Check Java
try { java -version 2>$null } catch { }
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { ExitWith "Java (JDK) tidak ditemukan. Pasang JDK 11+ dan pastikan 'java' ada di PATH." }

# Check sdkmanager (Android SDK)
if (-not (Get-Command sdkmanager -ErrorAction SilentlyContinue)) { Write-Host "Perhatian: 'sdkmanager' tidak ditemukan. Pastikan Android SDK dan Android Studio terpasang." }

$cwd = Resolve-Path .
Write-Host "Working dir: $cwd"

# Ensure web assets are present in public/
if (-not (Test-Path .\public)) { ExitWith "Folder 'public/' tidak ditemukan. Pastikan aset web (HTML/CSS/JS) ada di 'public/'." }

# Copy and sync web assets to native project
Write-Host "Menjalankan: npx cap copy"
& npx cap copy

Write-Host "Menjalankan: npx cap sync"
& npx cap sync

# Add android platform if missing
if (-not (Test-Path .\android)) {
  Write-Host "Folder 'android/' tidak ditemukan. Menambahkan platform Android..."
  & npx cap add android
  if (-not (Test-Path .\android)) { ExitWith "Gagal membuat folder android/. Pastikan Android SDK terpasang dan jalankan 'npx cap add android' secara manual." }
}

# Build release APK
$gradlew = Join-Path -Path (Resolve-Path .\android) -ChildPath "gradlew.bat"
if (-not (Test-Path $gradlew)) {
  Write-Host "Menjalankan gradle wrapper..."
} else {
  Write-Host "Menjalankan: android\\gradlew.bat assembleRelease"
}

Push-Location android
if (Test-Path .\gradlew.bat) {
  & .\gradlew.bat assembleRelease
} elseif (Get-Command gradle -ErrorAction SilentlyContinue) {
  & gradle assembleRelease
} else {
  Pop-Location
  ExitWith "Gradle wrapper tidak ditemukan dan Gradle tidak terpasang. Buka folder 'android' di Android Studio untuk membangunnya." 
}
Pop-Location

# Locate APK
$apkPaths = @("android\app\build\outputs\apk\release\app-release-unsigned.apk", "android\app\build\outputs\apk\release\app-release.apk", "android\app\build\outputs\apk\release\app-release-unsigned.aab")
$found = $false
foreach ($p in $apkPaths) {
  if (Test-Path $p) { Write-Host "APK ditemukan: $p"; $found = $true }
}
if (-not $found) { Write-Host "Build selesai, namun APK tidak ditemukan otomatis. Periksa 'android/app/build/outputs/'." }

Write-Host "Selesai. Jika ingin menandatangani APK untuk pemasangan, gunakan Android Studio atau 'apksigner' dari Android SDK Build-Tools." 
