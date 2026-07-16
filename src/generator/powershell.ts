import { parseRegistryData } from "../domain/validation.ts";
import type {
  ParsedRegistryData,
  RegistryHive,
  RegistryProject,
  RegistryTweak,
  RegistryValueType,
} from "../domain/types.ts";
import { BATCH_COPY } from "./batchLocale.ts";
import { encodeUtf16LeBase64 } from "./encoding.ts";

const PROVIDER_ROOTS: Readonly<Record<RegistryHive, string>> = {
  HKCU: "HKEY_CURRENT_USER",
  HKLM: "HKEY_LOCAL_MACHINE",
  HKCR: "HKEY_CLASSES_ROOT",
  HKU: "HKEY_USERS",
  HKCC: "HKEY_CURRENT_CONFIG",
};

const REGISTRY_KINDS: Readonly<Record<RegistryValueType, string>> = {
  REG_SZ: "String",
  REG_EXPAND_SZ: "ExpandString",
  REG_MULTI_SZ: "MultiString",
  REG_BINARY: "Binary",
  REG_DWORD: "DWord",
  REG_QWORD: "QWord",
};

function psString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function signedLiteral(value: bigint, bits: 32 | 64): string {
  const boundary = 1n << BigInt(bits - 1);
  const modulus = 1n << BigInt(bits);
  const signed = value >= boundary ? value - modulus : value;
  return `[int${bits}]${signed.toString()}`;
}

function psDataLiteral(data: ParsedRegistryData, valueType: RegistryValueType): string {
  if (data.kind === "string") {
    return psString(data.value);
  }
  if (data.kind === "multi") {
    return `[string[]]@(${data.value.map(psString).join(",")})`;
  }
  if (data.kind === "binary") {
    return `[byte[]]@(${data.value.map((value) => `0x${value.toString(16).padStart(2, "0")}`).join(",")})`;
  }
  return signedLiteral(data.value, valueType === "REG_DWORD" ? 32 : 64);
}

function tweakLiteral(tweak: RegistryTweak): string {
  const data: ParsedRegistryData = tweak.operation === "set"
    ? parseRegistryData(tweak.valueType, tweak.data)
    : { kind: "string", value: "" };
  const properties = [
    `Id=${psString(tweak.id)}`,
    `Hive=${psString(tweak.hive)}`,
    `KeyPath=${psString(tweak.keyPath)}`,
    `ValueName=${psString(tweak.valueName)}`,
    `ProviderPath=${psString(`Registry::${PROVIDER_ROOTS[tweak.hive]}\\${tweak.keyPath}`)}`,
    `Operation=${psString(tweak.operation)}`,
    `Kind=${psString(REGISTRY_KINDS[tweak.valueType])}`,
    `Data=${psDataLiteral(data, tweak.valueType)}`,
  ];
  return `[pscustomobject]@{${properties.join(";")}}`;
}

export function buildPowerShellEngine(project: RegistryProject): string {
  const entries = project.tweaks.map(tweakLiteral).join(",\n");
  return [
    "[CmdletBinding()]",
    "param(",
    "  [Parameter(Mandatory=$true)][ValidateSet('Apply','Restore','RestorePoint')][string]$Action,",
    "  [ValidatePattern('^[a-z][a-z0-9_]{2,47}$')][string]$TweakId = '',",
    "  [ValidateSet('ja','en')][string]$Language = 'en'",
    ")",
    "$ErrorActionPreference = 'Stop'",
    "$stateRoot = $env:RB_STATE",
    "$logFile = $env:RB_LOG",
    "$messages = @{",
    `  ja = @{ RestorePoint=${psString(BATCH_COPY.ja.messages.engineRestorePointCreated)}; Apply=${psString(BATCH_COPY.ja.messages.engineApplyCompleted)}; Restore=${psString(BATCH_COPY.ja.messages.engineRestoreCompleted)}; Error=${psString(BATCH_COPY.ja.messages.engineError)} }`,
    `  en = @{ RestorePoint=${psString(BATCH_COPY.en.messages.engineRestorePointCreated)}; Apply=${psString(BATCH_COPY.en.messages.engineApplyCompleted)}; Restore=${psString(BATCH_COPY.en.messages.engineRestoreCompleted)}; Error=${psString(BATCH_COPY.en.messages.engineError)} }`,
    "}",
    "$message = $messages[$Language]",
    `$projectId = ${psString(project.projectId)}`,
    "if ([string]::IsNullOrWhiteSpace($stateRoot) -or [string]::IsNullOrWhiteSpace($logFile)) { throw 'Runtime paths are missing.' }",
    "$entries = @(",
    entries,
    ")",
    "$entryMap = @{}",
    "foreach ($entry in $entries) { $entryMap[$entry.Id] = $entry }",
    "function Write-Result([string]$Id, [string]$Operation, [string]$Status) {",
    "  $line = '{0:o}\t{1}\t{2}\t{3}' -f [DateTimeOffset]::Now, $Id, $Operation, $Status",
    "  Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8",
    "}",
    "function Assert-State([object]$State, [object]$Entry) {",
    "  if ($null -eq $State) { throw 'Backup state is empty.' }",
    "  foreach ($property in @('Schema','ProjectId','TweakId','Hive','KeyPath','ValueName','KeyExists','ValueExists','Kind','Data')) {",
    "    if ($null -eq $State.PSObject.Properties[$property]) { throw ('Backup property is missing: ' + $property) }",
    "  }",
    "  if ($State.Schema -isnot [int] -or $State.Schema -ne 1) { throw 'Unsupported backup schema.' }",
    "  foreach ($property in @('ProjectId','TweakId','Hive','KeyPath','ValueName')) { if ($State.$property -isnot [string]) { throw ('Backup text property is invalid: ' + $property) } }",
    "  if ($State.ProjectId -cne $projectId) { throw 'Backup project ID mismatch.' }",
    "  if ($State.TweakId -cne $Entry.Id) { throw 'Backup tweak ID mismatch.' }",
    "  if ($State.Hive -cne $Entry.Hive) { throw 'Backup hive mismatch.' }",
    "  if ($State.KeyPath -cne $Entry.KeyPath) { throw 'Backup key mismatch.' }",
    "  if ($State.ValueName -cne $Entry.ValueName) { throw 'Backup value mismatch.' }",
    "  if ($State.KeyExists -isnot [bool] -or $State.ValueExists -isnot [bool]) { throw 'Backup flags are invalid.' }",
    "  if (-not $State.ValueExists) { return }",
    "  if ($State.Kind -isnot [string]) { throw 'Backup value kind is invalid.' }",
    "  $allowedKinds = @('String','ExpandString','Binary','DWord','MultiString','QWord','None')",
    "  if ($allowedKinds -cnotcontains [string]$State.Kind) { throw 'Backup value kind is invalid.' }",
    "  switch ([string]$State.Kind) {",
    "    'String' { if ($State.Data -isnot [string]) { throw 'Backup string data is invalid.' } }",
    "    'ExpandString' { if ($State.Data -isnot [string]) { throw 'Backup expand-string data is invalid.' } }",
    "    'DWord' { if ($State.Data -isnot [int]) { throw 'Backup DWORD data is invalid.' } }",
    "    'QWord' { if ($State.Data -isnot [long]) { throw 'Backup QWORD data is invalid.' } }",
    "    'MultiString' { if ($State.Data -isnot [System.Collections.IEnumerable] -or $State.Data -is [string]) { throw 'Backup multi-string data is invalid.' }; foreach ($item in $State.Data) { if ($item -isnot [string]) { throw 'Backup multi-string item is invalid.' } } }",
    "    'Binary' { if ($State.Data -isnot [System.Array]) { throw 'Backup binary data is invalid.' }; foreach ($item in $State.Data) { if ($item -isnot [byte]) { throw 'Backup binary item is invalid.' } } }",
    "    'None' { if ($State.Data -isnot [System.Array]) { throw 'Backup none data is invalid.' }; foreach ($item in $State.Data) { if ($item -isnot [byte]) { throw 'Backup none item is invalid.' } } }",
    "  }",
    "}",
    "function Read-State([string]$Path, [object]$Entry) {",
    "  $file = Get-Item -LiteralPath $Path",
    "  if ($file.Length -gt 1048576) { throw 'Backup state is too large.' }",
    "  $state = Import-Clixml -LiteralPath $Path",
    "  Assert-State $state $Entry",
    "  return $state",
    "}",
    "function Save-InitialState([object]$Entry, [string]$Path) {",
    "  $temporary = $Path + '.' + $PID + '.tmp'",
    "  try {",
    "    $keyExists = Test-Path -LiteralPath $Entry.ProviderPath",
    "    $valueExists = $false",
    "    $kind = $null",
    "    $data = $null",
    "    if ($keyExists) {",
    "      $key = Get-Item -LiteralPath $Entry.ProviderPath",
    "      if ($key.GetValueNames() -contains $Entry.ValueName) {",
    "        $valueExists = $true",
    "        $kind = $key.GetValueKind($Entry.ValueName).ToString()",
    "        $data = $key.GetValue($Entry.ValueName, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)",
    "      }",
    "    }",
    "    $state = [pscustomobject]@{ Schema=1; ProjectId=$projectId; TweakId=$Entry.Id; Hive=$Entry.Hive; KeyPath=$Entry.KeyPath; ValueName=$Entry.ValueName; KeyExists=[bool]$keyExists; ValueExists=[bool]$valueExists; Kind=$kind; Data=$data }",
    "    $state | Export-Clixml -LiteralPath $temporary -Depth 4",
    "    [void](Read-State $temporary $Entry)",
    "    Move-Item -LiteralPath $temporary -Destination $Path -Force",
    "  } finally {",
    "    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue }",
    "  }",
    "}",
    "function Apply-Entry([object]$Entry) {",
    "  $mutex = [Threading.Mutex]::new($false, ('Local\\GamingTweakForge_' + $projectId + '_' + $Entry.Id))",
    "  $lockTaken = $false",
    "  try {",
    "    try { $lockTaken = $mutex.WaitOne(30000) } catch [Threading.AbandonedMutexException] { $lockTaken = $true }",
    "    if (-not $lockTaken) { throw 'Timed out waiting for another registry action.' }",
    "    $stateFile = Join-Path $stateRoot ($Entry.Id + '.clixml')",
    "    if (Test-Path -LiteralPath $stateFile) { [void](Read-State $stateFile $Entry) } else { Save-InitialState $Entry $stateFile }",
    "    if ($Entry.Operation -eq 'set') {",
    "      if (-not (Test-Path -LiteralPath $Entry.ProviderPath)) { [void](New-Item -Path $Entry.ProviderPath -Force) }",
    "      $key = Get-Item -LiteralPath $Entry.ProviderPath",
    "      $kind = [Microsoft.Win32.RegistryValueKind]([Enum]::Parse([Microsoft.Win32.RegistryValueKind], [string]$Entry.Kind, $false))",
    "      $key.SetValue($Entry.ValueName, $Entry.Data, $kind)",
    "    } elseif ($Entry.Operation -eq 'delete') {",
    "      if (Test-Path -LiteralPath $Entry.ProviderPath) {",
    "        $key = Get-Item -LiteralPath $Entry.ProviderPath",
    "        if ($key.GetValueNames() -contains $Entry.ValueName) { $key.DeleteValue($Entry.ValueName, $false) }",
    "      }",
    "    } else { throw 'Unsupported registry operation.' }",
    "  } finally {",
    "    if ($lockTaken) { [void]$mutex.ReleaseMutex() }",
    "    $mutex.Dispose()",
    "  }",
    "}",
    "function Restore-Entry([object]$Entry) {",
    "  $mutex = [Threading.Mutex]::new($false, ('Local\\GamingTweakForge_' + $projectId + '_' + $Entry.Id))",
    "  $lockTaken = $false",
    "  try {",
    "    try { $lockTaken = $mutex.WaitOne(30000) } catch [Threading.AbandonedMutexException] { $lockTaken = $true }",
    "    if (-not $lockTaken) { throw 'Timed out waiting for another registry action.' }",
    "    $stateFile = Join-Path $stateRoot ($Entry.Id + '.clixml')",
    "    if (-not (Test-Path -LiteralPath $stateFile)) { Write-Result $Entry.Id 'Restore' 'NO_BACKUP'; return }",
    "    $state = Read-State $stateFile $Entry",
    "    if ($state.ValueExists) {",
    "      if (-not (Test-Path -LiteralPath $Entry.ProviderPath)) { [void](New-Item -Path $Entry.ProviderPath -Force) }",
    "      $key = Get-Item -LiteralPath $Entry.ProviderPath",
    "      $kind = [Microsoft.Win32.RegistryValueKind]([Enum]::Parse([Microsoft.Win32.RegistryValueKind], [string]$state.Kind, $false))",
    "      $value = switch ([string]$state.Kind) {",
    "        'DWord' { [int]$state.Data; break }",
    "        'QWord' { [long]$state.Data; break }",
    "        'MultiString' { [string[]]$state.Data; break }",
    "        'Binary' { [byte[]]$state.Data; break }",
    "        'None' { [byte[]]$state.Data; break }",
    "        default { [string]$state.Data; break }",
    "      }",
    "      $key.SetValue($Entry.ValueName, $value, $kind)",
    "    } elseif (Test-Path -LiteralPath $Entry.ProviderPath) {",
    "      $key = Get-Item -LiteralPath $Entry.ProviderPath",
    "      if ($key.GetValueNames() -contains $Entry.ValueName) { $key.DeleteValue($Entry.ValueName, $false) }",
    "    }",
    "    Remove-Item -LiteralPath $stateFile -Force",
    "  } finally {",
    "    if ($lockTaken) { [void]$mutex.ReleaseMutex() }",
    "    $mutex.Dispose()",
    "  }",
    "}",
    "if ($Action -eq 'RestorePoint') {",
    "  try {",
    "    Write-Result '-' 'RestorePoint' 'START'",
    `    Checkpoint-Computer -Description ${psString(`${project.title} checkpoint`)} -RestorePointType MODIFY_SETTINGS`,
    "    Write-Result '-' 'RestorePoint' 'OK'",
    "    Write-Host $message.RestorePoint -ForegroundColor Green",
    "    exit 0",
    "  } catch {",
    "    try { Write-Result '-' 'RestorePoint' 'FAIL' } catch {}",
    "    Write-Host ($message.Error + ': ' + $_.Exception.Message) -ForegroundColor Red",
    "    exit 1",
    "  }",
    "}",
    "if (-not $entryMap.ContainsKey($TweakId)) { throw 'Unknown tweak ID.' }",
    "$selected = $entryMap[$TweakId]",
    "try {",
    "  Write-Result $selected.Id $Action 'START'",
    "  if ($Action -eq 'Apply') { Apply-Entry $selected } else { Restore-Entry $selected }",
    "  Write-Result $selected.Id $Action 'OK'",
    "  $completed = if ($Action -eq 'Apply') { $message.Apply } else { $message.Restore }",
    "  Write-Host ($completed + ': ' + $selected.Id) -ForegroundColor Green",
    "  exit 0",
    "} catch {",
    "  try { Write-Result $selected.Id $Action 'FAIL' } catch {}",
    "  Write-Host ($message.Error + ': ' + $_.Exception.Message) -ForegroundColor Red",
    "  exit 1",
    "}",
    "",
  ].join("\r\n");
}

export function buildElevationEncodedCommand(): string {
  const source = [
    "$ErrorActionPreference = 'Stop'",
    "$self = $env:RB_SELF",
    "$language = $env:TF_LANG",
    "if ([string]::IsNullOrWhiteSpace($self)) { throw 'Script path is missing.' }",
    "if ($language -notin @('ja','en')) { throw 'Display language is invalid.' }",
    "Start-Process -FilePath $self -ArgumentList @('--tweakforge-utf8', '--lang', $language) -Verb RunAs",
  ].join(";");
  return encodeUtf16LeBase64(source);
}

export function buildBootstrapEncodedCommand(): string {
  const source = [
    "$ErrorActionPreference='Stop'",
    "& $env:TF_SELF '--tweakforge-utf8'",
    "exit $LASTEXITCODE",
  ].join(";");
  return encodeUtf16LeBase64(source);
}

export function buildExtractorEncodedCommand(): string {
  const source = [
    "$ErrorActionPreference='Stop'",
    "$lines=[IO.File]::ReadAllLines($env:RB_SELF)",
    "$start=[Array]::IndexOf($lines,':RB_ENGINE_BEGIN')",
    "$end=[Array]::IndexOf($lines,':RB_ENGINE_END')",
    "if($start -lt 0 -or $end -le $start){throw 'Engine payload is missing.'}",
    "$chunks=$lines[($start+1)..($end-1)]|ForEach-Object{if(-not $_.StartsWith(':')){throw 'Engine payload is malformed.'};$_.Substring(1)}",
    "$bytes=[Convert]::FromBase64String(($chunks -join ''))",
    "[IO.File]::WriteAllBytes($env:RB_ENGINE,$bytes)",
  ].join(";");
  return encodeUtf16LeBase64(source);
}
