$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$ensureRedisScript = Join-Path $scriptDir "ensure-redis.ps1"
$npxCmd = Join-Path $env:ProgramFiles "nodejs\npx.cmd"

if (-not (Test-Path $npxCmd)) {
  $npxCmd = "npx.cmd"
}

function Get-WorkerProcess {
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq "node.exe" -and
      $_.CommandLine -match "src[\\/]+workers[\\/]+index\.ts|dist[\\/]+workers[\\/]+index\.js"
    } |
    Select-Object -First 1
}

& powershell -ExecutionPolicy Bypass -File $ensureRedisScript

Push-Location $backendRoot
try {
  npm run db:prepare:dev

  $existingWorker = Get-WorkerProcess
  if (-not $existingWorker) {
    $workerLog = Join-Path $backendRoot "worker.log"
    $workerErrorLog = Join-Path $backendRoot "worker-error.log"

    Write-Host "Starting background worker for professor sync queues..."
    Start-Process `
      -FilePath $npxCmd `
      -ArgumentList "ts-node", "src/workers/index.ts" `
      -WorkingDirectory $backendRoot `
      -WindowStyle Hidden `
      -RedirectStandardOutput $workerLog `
      -RedirectStandardError $workerErrorLog | Out-Null

    Start-Sleep -Seconds 3
  } else {
    Write-Host ("Background worker already running (PID {0})." -f $existingWorker.ProcessId)
  }

  & $npxCmd nest start --watch
} finally {
  Pop-Location
}
