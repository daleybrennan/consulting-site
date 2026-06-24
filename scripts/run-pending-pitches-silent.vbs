' Silent launcher for the local diagnostic-generation worker.
'
' Task Scheduler runs this through wscript.exe. The "0" window style starts
' PowerShell fully hidden, so no console window flashes up when the job fires.
' (powershell.exe -WindowStyle Hidden still shows a brief console flash because
' conhost spawns a window before the script can hide it; launching via wscript
' with window style 0 avoids that entirely.)
'
' The worker output still goes to data\pitch-worker.log; only the visible window
' is suppressed.

Dim shell, repoDir, cmd
Set shell = CreateObject("WScript.Shell")

' This .vbs lives in <repo>\scripts; derive the repo root from its own path.
repoDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\scripts\") - 1)

cmd = "powershell -NoProfile -ExecutionPolicy Bypass -File """ & repoDir & "\scripts\run-pending-pitches.ps1"""

' 0 = hidden window, False = don't wait for it to finish.
shell.Run cmd, 0, False
