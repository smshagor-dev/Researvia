$redisDir = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\Redis-8.8.0-Windows-x64-msys2'
$redisServer = Join-Path $redisDir 'redis-server.exe'
$redisCli = Join-Path $redisDir 'redis-cli.exe'

function Test-RedisPort {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $async = $client.BeginConnect('127.0.0.1', 6379, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(1000, $false)) {
      $client.Close()
      return $false
    }
    $client.EndConnect($async)
    $client.Close()
    return $true
  } catch {
    return $false
  }
}

if (Test-RedisPort) {
  Write-Host 'Redis already available on 127.0.0.1:6379'
  exit 0
}

if (-not (Test-Path $redisServer)) {
  Write-Error "Windows Redis is not installed at $redisServer"
  exit 1
}

Start-Process -FilePath $redisServer -ArgumentList @('--bind', '127.0.0.1', '--port', '6379', '--save', '""', '--appendonly', 'no') -WorkingDirectory $redisDir -WindowStyle Hidden
Start-Sleep -Seconds 2

if (-not (Test-RedisPort)) {
  Write-Error 'Redis did not start successfully on 127.0.0.1:6379'
  exit 1
}

if (Test-Path $redisCli) {
  & $redisCli -h 127.0.0.1 -p 6379 ping
} else {
  Write-Host 'Redis started successfully on 127.0.0.1:6379'
}
