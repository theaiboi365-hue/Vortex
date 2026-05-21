Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appRoot = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
command = "powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -File """ & appRoot & "\scripts\vortex-desktop.ps1"""
shell.Run command, 1, False
