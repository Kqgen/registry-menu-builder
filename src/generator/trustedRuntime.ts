import { encodeUtf16LeBase64 } from "./encoding.ts";
import { buildProtectedDirectoryFunctions } from "./protectedDirectoryScript.ts";

function psString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function buildTrustedRuntimeSource(projectId: string): string {
  return [
    "$ErrorActionPreference = 'Stop'",
    "$self = $env:RB_SELF",
    "$language = $env:TF_LANG",
    "$expectedHash = $env:TF_SELF_SHA256",
    "if ([string]::IsNullOrWhiteSpace($self) -or -not (Test-Path -LiteralPath $self -PathType Leaf)) { throw 'Script path is invalid.' }",
    "if ($language -notin @('ja','en')) { throw 'Display language is invalid.' }",
    "if ($expectedHash -cnotmatch '^[A-Za-z0-9+/]{43}=$') { throw 'Script digest is invalid.' }",
    "function Get-Digest([byte[]]$Bytes) {",
    "  $algorithm = [Security.Cryptography.SHA256]::Create()",
    "  try { return [Convert]::ToBase64String($algorithm.ComputeHash($Bytes)) } finally { $algorithm.Dispose() }",
    "}",
    ...buildProtectedDirectoryFunctions(),
    "function Reset-ProtectedFiles([string]$Path, [bool]$Preserve) {",
    "  foreach ($entryPath in [IO.Directory]::EnumerateFileSystemEntries($Path)) {",
    "    $entry = Get-Item -LiteralPath $entryPath -Force",
    "    if ($entry.PSIsContainer -or (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)) { throw ('State entry is invalid: ' + $entry.Name) }",
    "    if (-not $Preserve) { [IO.File]::Delete($entry.FullName); continue }",
    "    if ($entry.Name -cnotmatch '^(actions\\.log|[a-z][a-z0-9_]{2,47}\\.clixml)$') { [IO.File]::Delete($entry.FullName); continue }",
    "    $limit = if ($entry.Name -ceq 'actions.log') { 8388608 } else { 1048576 }",
    "    if ($entry.Length -gt $limit) { throw ('State entry is too large: ' + $entry.Name) }",
    "    $content = [IO.File]::ReadAllBytes($entry.FullName)",
    "    [IO.File]::Delete($entry.FullName)",
    "    [IO.File]::WriteAllBytes($entry.FullName, $content)",
    "  }",
    "}",
    "$commonData = [Environment]::GetFolderPath([Environment+SpecialFolder]::CommonApplicationData)",
    "if ([string]::IsNullOrWhiteSpace($commonData)) { throw 'ProgramData path is unavailable.' }",
    "$appRoot = Join-Path $commonData 'GamingTweakForge'",
    "$stateBase = Join-Path $appRoot 'State'",
    "$runtimeBase = Join-Path $appRoot 'Runtime'",
    `"$stateRoot = Join-Path $stateBase ${psString(projectId)}"`,
    "$runtimeRoot = Join-Path $runtimeBase ([Guid]::NewGuid().ToString('N'))",
    "$stateWasProtected = (Test-ProtectedDirectory $appRoot)",
    "if ($stateWasProtected) { $stateWasProtected = Test-ProtectedDirectory $stateBase }",
    "if ($stateWasProtected) { $stateWasProtected = Test-ProtectedDirectory $stateRoot }",
    "Open-ProtectedDirectory $appRoot",
    "Open-ProtectedDirectory $stateBase",
    "Open-ProtectedDirectory $runtimeBase",
    "Open-ProtectedDirectory $stateRoot",
    "Open-ProtectedDirectory $runtimeRoot",
    "Reset-ProtectedFiles $stateRoot $stateWasProtected",
    "$runtimeBat = Join-Path $runtimeRoot 'tool.bat'",
    "$bytes = [IO.File]::ReadAllBytes($self)",
    "if ($bytes.Length -eq 0 -or $bytes.Length -gt 67108864) { throw 'Script size is invalid.' }",
    "if ((Get-Digest $bytes) -cne $expectedHash) { throw 'Script changed during elevation.' }",
    "[IO.File]::WriteAllBytes($runtimeBat, $bytes)",
    "$runtimeFile = Get-Item -LiteralPath $runtimeBat -Force",
    "if (($runtimeFile.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Protected script is a reparse point.' }",
    "$env:TF_STATE_ROOT = $stateRoot",
    "$env:TF_RUNTIME_ROOT = $runtimeRoot",
    "$systemDirectory = [Environment]::SystemDirectory",
    "$cmd = Join-Path $systemDirectory 'cmd.exe'",
    "if (-not (Test-Path -LiteralPath $cmd -PathType Leaf)) { throw 'cmd.exe was not found in System32.' }",
    "$env:TF_TRUSTED_SYSTEM32 = $systemDirectory",
    "$argumentLine = '/d /s /c \"\"{0}\" --tweakforge-utf8 --lang {1} --trusted-runtime\"' -f $runtimeBat.Replace('\"','\"\"'), $language",
    "$exitCode = 1",
    "try {",
    "  $process = Start-Process -FilePath $cmd -ArgumentList $argumentLine -WorkingDirectory $runtimeRoot -Wait -PassThru",
    "  $exitCode = $process.ExitCode",
    "} finally {",
    "  if (Test-Path -LiteralPath $runtimeRoot) { Remove-Item -LiteralPath $runtimeRoot -Recurse -Force -ErrorAction SilentlyContinue }",
    "}",
    "exit $exitCode",
  ].join("\r\n");
}

export function buildTrustedRuntimeEncodedCommand(projectId: string): string {
  return encodeUtf16LeBase64(buildTrustedRuntimeSource(projectId));
}
