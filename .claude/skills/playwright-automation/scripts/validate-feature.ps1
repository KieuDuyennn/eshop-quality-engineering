param(
  [Parameter(Mandatory = $true)][string]$Feature,
  [Parameter(Mandatory = $true)][string]$SpecPath,
  [Parameter(Mandatory = $true)][string]$DataPath,
  [Parameter(Mandatory = $true)][string[]]$ReportJsonPaths,
  [int]$MinCases = 12
)

$ErrorActionPreference = 'Stop'
$failures = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

function Resolve-RequiredFile([string]$Path, [string]$Label) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    $failures.Add("Missing ${Label}: $Path")
    return $null
  }
  return (Resolve-Path -LiteralPath $Path).Path
}

$resolvedSpec = Resolve-RequiredFile $SpecPath 'spec'
$resolvedData = Resolve-RequiredFile $DataPath 'data file'

$cases = @()
if ($resolvedData) {
  switch ([IO.Path]::GetExtension($resolvedData).ToLowerInvariant()) {
    '.csv' { $cases = @(Import-Csv -LiteralPath $resolvedData) }
    '.json' {
      $json = Get-Content -LiteralPath $resolvedData -Raw -Encoding UTF8 | ConvertFrom-Json
      if ($json -is [array]) {
        $cases = @($json)
      } elseif ($json.PSObject.Properties.Name -contains 'cases') {
        $cases = @($json.cases)
      } else {
        $failures.Add("JSON data must be an array or contain a 'cases' array: $DataPath")
      }
    }
    default { $failures.Add("Unsupported data extension: $DataPath") }
  }
}

if ($cases.Count -lt $MinCases) {
  $failures.Add("Expected at least $MinCases cases; found $($cases.Count)")
}

$ids = @($cases | ForEach-Object { $_.tc_id })
if ($ids.Count -ne $cases.Count -or @($ids | Where-Object { [string]::IsNullOrWhiteSpace($_) }).Count) {
  $failures.Add('Every data row must have a non-empty tc_id')
}
$duplicateIds = @($ids | Group-Object | Where-Object Count -gt 1 | Select-Object -ExpandProperty Name)
if ($duplicateIds.Count) {
  $failures.Add("Duplicate tc_id values: $($duplicateIds -join ', ')")
}

if ($resolvedSpec) {
  $specText = Get-Content -LiteralPath $resolvedSpec -Raw -Encoding UTF8
  if ($specText -notmatch 'data-loader|loadCsv|loadJson|load.*Cases') {
    $warnings.Add('Spec does not expose a recognizable external-data loader; review manually')
  }
  if ($specText -match 'waitForTimeout\s*\(') {
    $failures.Add('Spec contains waitForTimeout; replace it with an observable wait')
  }
}

$reportRows = @()
foreach ($reportPath in $ReportJsonPaths) {
  $resolvedReport = Resolve-RequiredFile $reportPath 'JSON report'
  if (-not $resolvedReport) { continue }
  $report = Get-Content -LiteralPath $resolvedReport -Raw -Encoding UTF8 | ConvertFrom-Json
  $metadata = $report.config.metadata
  $started = $metadata.'Run started (ISO)'
  $parsedTime = [DateTimeOffset]::MinValue
  if (-not [DateTimeOffset]::TryParse([string]$started, [ref]$parsedTime)) {
    $failures.Add("$reportPath has an invalid ISO timestamp: '$started'")
  }
  $browser = [string]$metadata.Browser
  if ([string]::IsNullOrWhiteSpace($browser) -or $browser -eq 'all') {
    $warnings.Add("$reportPath has non-specific Browser metadata '$browser'; preserve it but disclose the limitation")
  }
  $total = [int]$report.stats.expected + [int]$report.stats.unexpected +
    [int]$report.stats.flaky + [int]$report.stats.skipped
  $reportRows += [pscustomobject]@{
    path = $reportPath
    browser = $browser
    started_at = $started
    tests = $total
    passed = [int]$report.stats.expected
    failed = [int]$report.stats.unexpected
  }
}

if ($reportRows.Count -lt 3) {
  $failures.Add("Expected at least three report entry points; found $($reportRows.Count)")
}

$result = [ordered]@{
  feature = $Feature
  validation_status = if ($failures.Count) { 'FAIL' } elseif ($warnings.Count) { 'PASS_WITH_REVIEW_ITEMS' } else { 'PASS' }
  workflow_state = if ($failures.Count) { 'BLOCKED' } else { 'READY_FOR_REVIEW' }
  spec = $resolvedSpec
  data = $resolvedData
  case_count = $cases.Count
  unique_tc_ids = @($ids | Sort-Object -Unique).Count
  reports = $reportRows
  warnings = @($warnings)
  failures = @($failures)
}

$result | ConvertTo-Json -Depth 6
if ($failures.Count) { exit 1 }
