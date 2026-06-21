# Daily prospecting harvest wrapper (for Windows Task Scheduler).
#
# Runs `python -m harvest.run` from the repo root and appends a timestamped
# record to data/harvest.log. Rules-only and free; safe to run unattended daily.
# The weekly qualify/draft pass is a separate, human-triggered Claude Code step.
#
# Register (once):
#   schtasks /Create /TN "DaleyBrennanProspectingHarvest" `
#     /TR "powershell -NoProfile -ExecutionPolicy Bypass -File \"C:\projects\consulting-site\scripts\run-harvest.ps1\"" `
#     /SC DAILY /ST 07:30 /F
# Inspect:  schtasks /Query /TN "DaleyBrennanProspectingHarvest" /V /FO LIST
# Remove:   schtasks /Delete /TN "DaleyBrennanProspectingHarvest" /F

$ErrorActionPreference = 'Stop'

# Repo root = parent of this script's folder.
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$log = Join-Path $repo 'data\harvest.log'
$stamp = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')

# Prefer the py launcher, fall back to python on PATH.
$py = (Get-Command py -ErrorAction SilentlyContinue)
if ($py) { $exe = 'py'; $pre = @('-3') } else { $exe = 'python'; $pre = @() }

Add-Content -Path $log -Value "[$stamp] harvest start ($exe)"
try {
    $output = & $exe @pre -m harvest.run 2>&1
    $output | Add-Content -Path $log
    Add-Content -Path $log -Value "[$stamp] harvest done (exit $LASTEXITCODE)"
    exit $LASTEXITCODE
}
catch {
    Add-Content -Path $log -Value "[$stamp] harvest ERROR: $($_.Exception.Message)"
    exit 1
}
