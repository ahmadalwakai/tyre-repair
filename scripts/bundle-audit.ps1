$ErrorActionPreference = 'Stop'
$bundle = (Get-ChildItem -Path "$PSScriptRoot\..\apps\admin\android" -Recurse -Filter 'index.android.bundle' -ErrorAction SilentlyContinue |
           Sort-Object Length -Descending | Select-Object -First 1).FullName
if (-not $bundle) { Write-Host 'NO BUNDLE FOUND'; exit 1 }
Write-Host "BUNDLE : $bundle"
Write-Host "SIZE   : $((Get-Item $bundle).Length)"

$text = [System.IO.File]::ReadAllText($bundle)

function Count([string]$pat, [bool]$regex = $true) {
  if ($regex) { return ([regex]::Matches($text, $pat)).Count }
  return (([regex]::Escape($pat) | ForEach-Object { [regex]::Matches($text, $_) })).Count
}

Write-Host ("localhost                : {0}" -f (Count 'localhost'))
Write-Host ("localhost:8081           : {0}" -f (Count 'localhost:8081'))
Write-Host ("127\.0\.0\.1             : {0}" -f (Count '127\.0\.0\.1'))
Write-Host ("10\.0\.2\.2              : {0}" -f (Count '10\.0\.2\.2'))
Write-Host ("http:// (any)            : {0}" -f (Count 'http://'))
Write-Host ("https://www.tyrerepair.uk: {0}" -f (Count 'https://www\.tyrerepair\.uk'))
Write-Host ("/api/admin               : {0}" -f (Count '/api/admin'))
Write-Host ("/api/admin/notifications/inbox: {0}" -f (Count '/api/admin/notifications/inbox'))
Write-Host ("/api/auth                : {0}" -f (Count '/api/auth'))
Write-Host ("/api/pusher              : {0}" -f (Count '/api/pusher'))
Write-Host ("fetch(                   : {0}" -f (Count 'fetch\('))
Write-Host ("axios                    : {0}" -f (Count 'axios'))

Write-Host ''
Write-Host '----- localhost contexts (first 30) -----'
$matches = [regex]::Matches($text, 'localhost')
$max = [Math]::Min(30, $matches.Count)
for ($i = 0; $i -lt $max; $i++) {
  $m = $matches[$i]
  $s = [Math]::Max(0, $m.Index - 100)
  $l = [Math]::Min(220, $text.Length - $s)
  Write-Host ("[{0}] @{1}: {2}" -f $i, $m.Index, ($text.Substring($s, $l) -replace "[\r\n]", ' '))
  Write-Host '---'
}

Write-Host ''
Write-Host '----- http:// contexts (first 30) -----'
$matches = [regex]::Matches($text, 'http://[A-Za-z0-9._:%/\-]*')
$max = [Math]::Min(30, $matches.Count)
for ($i = 0; $i -lt $max; $i++) {
  $m = $matches[$i]
  $s = [Math]::Max(0, $m.Index - 80)
  $l = [Math]::Min(220, $text.Length - $s)
  Write-Host ("[{0}] @{1} '{2}' -- {3}" -f $i, $m.Index, $m.Value, ($text.Substring($s, $l) -replace "[\r\n]", ' '))
  Write-Host '---'
}
