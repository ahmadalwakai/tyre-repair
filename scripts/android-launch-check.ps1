[CmdletBinding()]
param(
    [string]$Apk = "$PSScriptRoot\..\apps\admin\android\app\build\outputs\apk\release\app-release.apk",
    [string]$Package = "uk.tyrerepair.admin",
    [int]$WaitSeconds = 8
)

$ErrorActionPreference = 'Continue'

function Get-Adb {
    foreach ($p in @(
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:ANDROID_HOME\platform-tools\adb.exe",
        "adb"
    )) { if ($p -and (Get-Command $p -ErrorAction SilentlyContinue)) { return $p } }
    throw "adb not found"
}

$adb = Get-Adb
Write-Host "adb: $adb"

$devices = & $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\sdevice$" }
if (-not $devices) { throw "No device/emulator connected" }
Write-Host "Devices:`n$devices"

# Resolve package from APK manifest if aapt available
$aapt = "$env:LOCALAPPDATA\Android\Sdk\build-tools" | Get-ChildItem -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1 |
        ForEach-Object { Join-Path $_.FullName 'aapt.exe' } | Where-Object { Test-Path $_ }
if ($aapt) {
    $info = & $aapt dump badging $Apk 2>$null
    $pkgLine = $info | Select-String "^package: name='([^']+)'"
    if ($pkgLine) { $Package = $pkgLine.Matches[0].Groups[1].Value }
    $actLine = $info | Select-String "launchable-activity: name='([^']+)'"
    if ($actLine) { $launch = $actLine.Matches[0].Groups[1].Value }
}
if (-not $launch) { $launch = "$Package/.MainActivity" } else { $launch = "$Package/$launch" }
Write-Host "Package : $Package"
Write-Host "Activity: $launch"

Write-Host "--- Uninstalling old build ---"
& $adb uninstall $Package 2>&1 | Out-Host

Write-Host "--- Installing $Apk ---"
& $adb install -r -d $Apk 2>&1 | Out-Host

& $adb logcat -c
Write-Host "--- Launching ---"
& $adb shell am start -W -n $launch 2>&1 | Out-Host

Start-Sleep -Seconds $WaitSeconds

$log = "$PSScriptRoot\..\android-launch-check.log"
& $adb logcat -d -v time `
    AndroidRuntime:E ReactNativeJS:V ReactNative:V Expo:V SoLoader:E `
    ActivityManager:I ActivityTaskManager:I System.err:W `
    DEBUG:E libc:F Zygote:I "*:S" > $log
Write-Host "Logcat written to $log"
Write-Host "--- AndroidRuntime/ReactNativeJS excerpt ---"
Get-Content $log | Select-String -Pattern 'AndroidRuntime|ReactNativeJS|FATAL|Exception|Unable|cannot|Caused by' | Select-Object -First 80
