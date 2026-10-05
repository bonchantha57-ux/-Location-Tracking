# Robust PowerShell HTTP Server for Real-Time Map Tracking
param(
    [int]$Port = 3000
)

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:${Port}/")
$listener.Prefixes.Add("http://127.0.0.1:${Port}/")

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " Real-Time Location Tracking Server Started Successfully! " -ForegroundColor Cyan
    Write-Host " Local URL: http://localhost:${Port}                      " -ForegroundColor Yellow
    Write-Host " Press Ctrl+C to stop the server                          " -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Host "Failed to start listener on port ${Port}: $_" -ForegroundColor Red
    exit 1
}

$baseDir = $PSScriptRoot

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $req = $context.Request
            $res = $context.Response

            $rawPath = $req.Url.LocalPath
            if ([string]::IsNullOrWhiteSpace($rawPath) -or $rawPath -eq "/") {
                $rawPath = "/index.html"
            }

            $cleanPath = [System.Uri]::UnescapeDataString($rawPath).TrimStart('/')
            $cleanPath = $cleanPath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $targetFile = Join-Path $baseDir $cleanPath

            if (Test-Path $targetFile -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($targetFile).ToLower()
                $type = "application/octet-stream"
                if ($mimeTypes.ContainsKey($ext)) {
                    $type = $mimeTypes[$ext]
                }
                $fileBytes = [System.IO.File]::ReadAllBytes($targetFile)

                $res.ContentType = $type
                $res.StatusCode = 200
                $res.AddHeader("Access-Control-Allow-Origin", "*")
                $res.AddHeader("Cache-Control", "no-cache")
                $res.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            } else {
                $res.StatusCode = 404
                $errMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $res.ContentType = "text/plain; charset=utf-8"
                $res.OutputStream.Write($errMsg, 0, $errMsg.Length)
            }
        } catch {
            # Catch transient network resets without terminating the listener
        } finally {
            try { $context.Response.OutputStream.Close() } catch {}
            try { $context.Response.Close() } catch {}
        }
    }
} finally {
    try {
        $listener.Stop()
        $listener.Close()
    } catch {}
}
