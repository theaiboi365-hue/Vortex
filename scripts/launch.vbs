Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appRoot = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
command = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & appRoot & "\scripts\start.ps1"""
shell.Run command, 0, False
