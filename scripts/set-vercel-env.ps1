param(
  [Parameter(Mandatory=$true)][hashtable]$Vars,
  [string[]]$Targets = @("production","preview","development")
)
$ErrorActionPreference = "Stop"
foreach ($key in $Vars.Keys) {
  $val = $Vars[$key]
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
    $p.StandardInput.Write($val)
    $p.StandardInput.Close()
    $null = $p.StandardOutput.ReadToEnd()
    $err = $p.StandardError.ReadToEnd()
    $p.WaitForExit()
    if ($p.ExitCode -eq 0) { Write-Host "  OK" -ForegroundColor Green }
    else { Write-Host "  FAIL"; Write-Host $err }
  }
}
