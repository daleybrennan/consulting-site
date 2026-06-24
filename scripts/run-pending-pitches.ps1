# Local diagnostic-generation worker wrapper (for Windows Task Scheduler).
#
# Runs the pitch worker (scripts/run-pending-pitches.ts via tsx) from the repo
# root and appends a timestamped record to data/pitch-worker.log. Generation can
# take minutes (Opus research + Chromium render), which is exactly why it runs
# here and not in a Vercel function (Hobby caps functions at 60s).
#
# tsx is invoked through its CLI via `node` directly (not `npx`) so npm's stderr
# warnings do not surface and trip PowerShell's native-stderr handling.
#
# The scheduled task launches this through run-pending-pitches-silent.vbs (via
# wscript) so no console window flashes up. Register (once), every 5 minutes:
#   $action  = New-ScheduledTaskAction -Execute "wscript.exe" `
#       -Argument '"C:\projects\consulting-site\scripts\run-pending-pitches-silent.vbs"'
#   $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date)
#   $trigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) `
#       -RepetitionInterval (New-TimeSpan -Minutes 5)).Repetition
#   Register-ScheduledTask -TaskName "DaleyBrennanPitchWorker" -Action $action `
#       -Trigger $trigger -Force
# Inspect:  schtasks /Query /TN "DaleyBrennanPitchWorker" /V /FO LIST
# Remove:   schtasks /Delete /TN "DaleyBrennanPitchWorker" /F

# Native stderr (e.g. tooling warnings) must NOT abort the run, so do not use Stop.
$ErrorActionPreference = 'Continue'

# Repo root = parent of this script's folder.
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$log = Join-Path $repo 'data\pitch-worker.log'
$stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
$tsx = Join-Path $repo 'node_modules\tsx\dist\cli.mjs'

Add-Content -Path $log -Value "[$stamp] pitch worker start"
# Append every stream (stdout + stderr) to the log; capture node's exit code.
& node $tsx 'scripts/run-pending-pitches.ts' *>> $log
$code = $LASTEXITCODE
Add-Content -Path $log -Value "[$stamp] pitch worker done (exit $code)"
exit $code
