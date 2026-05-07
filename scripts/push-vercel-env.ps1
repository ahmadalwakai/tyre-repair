param(
  [string]$EnvFile = "apps/web/.env.local",
  [string[]]$Targets = @("production","preview","development"),
  [string[]]$Skip = @("VERCEL_OIDC_TOKEN")
)

$ErrorActionPreference = "Stop"
$lines = Get-Content -LiteralPath $EnvFile

foreach ($line in $lines) {
  if ($line -notmatch '^[A-Z][A-Z0-9_]*=') { continue }
  $idx = $line.IndexOf('=')
  $key = $line.Substring(0, $idx)
  $val = $line.Substring($idx + 1)
  # strip surrounding quotes if present
  if ($val.Length -ge 2 -and (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'")))) {
    $val = $val.Substring(1, $val.Length - 2)
  }
  if ($Skip -contains $key) { Write-Host "SKIP $key"; continue }

  foreach ($t in $Targets) {
    Write-Host "-> $key [$t]" -NoNewline
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "$env:COMSPEC"
    $psi.Arguments = "/c vercel env add $key $t --force"
    $psi.RedirectStandardInput = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.WorkingDirectory = (Get-Location).Path
    $p = [System.Diagnostics.Process]::Start($psi)
    $p.StandardInput.Write($val)   # no newline
    $p.StandardInput.Close()
    $out = $p.StandardOutput.ReadToEnd()
    $err = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    if ($p.ExitCode -eq 0) { Write-Host "  OK" -ForegroundColor Green }
    else { Write-Host "  FAIL" -ForegroundColor Red; Write-Host $out; Write-Host $err }
  }
}
