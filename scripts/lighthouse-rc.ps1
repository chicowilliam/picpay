param([ValidateSet('before','after')][string]$Phase, [string]$LighthouseCli = 'C:\Users\User1\AppData\Local\npm-cache\_npx\0f94ee7615faf582\node_modules\lighthouse\cli\index.js')
$ErrorActionPreference = 'Stop'
$env:CHROME_PATH = 'C:\Users\User1\AppData\Local\ms-playwright\chromium-1237\chrome-win64\chrome.exe'
foreach ($device in @('mobile','desktop')) {
  foreach ($run in 1..3) {
    $suffix = if ($run -eq 1) { '' } else { "-$run" }
    $output = "output/playwright/lighthouse-$Phase-$device$suffix.json"
    if (Test-Path -LiteralPath $output) { continue }
    $arguments = @($LighthouseCli,'http://127.0.0.1:5174/','--output=json',"--output-path=$output",'--port=9233','--quiet')
    if ($device -eq 'desktop') { $arguments += '--preset=desktop' }
    & node @arguments
    if ($LASTEXITCODE -ne 0) { throw "Lighthouse failed: $device/$run" }
    $report = Get-Content -LiteralPath $output -Raw | ConvertFrom-Json
    [pscustomobject]@{phase=$Phase;device=$device;run=$run;performance=$report.categories.performance.score;lcp=$report.audits.'largest-contentful-paint'.numericValue;cls=$report.audits.'cumulative-layout-shift'.numericValue;tbt=$report.audits.'total-blocking-time'.numericValue} | ConvertTo-Json -Compress
  }
}
