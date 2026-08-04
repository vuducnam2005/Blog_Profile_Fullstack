param(
    [string]$SiteUrl = "https://www.ducnamdev.site",
    [string]$ApiUrl = "https://blog-api-ducnam.onrender.com"
)

$ErrorActionPreference = "Stop"

Write-Output "Building production bundle"
npm run build

Write-Output "Production asset sizes"
$assetSizeTable = Get-ChildItem -Path "dist\assets" -File |
    Sort-Object Length -Descending |
    Select-Object Name, Length |
    Format-Table -AutoSize |
    Out-String
Write-Output $assetSizeTable.TrimEnd()

if (Get-Command rg -ErrorAction SilentlyContinue) {
    Write-Output "Source inventory"
    $aosCount = (rg -o "data-aos" src -g "*.jsx" | Measure-Object).Count
    $glassCount = (rg -o "\bglass\b" src -g "*.jsx" | Measure-Object).Count
    $imageCount = (rg -o "<img" src -g "*.jsx" | Measure-Object).Count
    $lazyImageCount = (rg -o "loading=.lazy." src -g "*.jsx" | Measure-Object).Count
    $videoCount = (rg -o "<video" src -g "*.jsx" | Measure-Object).Count

    Write-Output "AosAttributes=$aosCount"
    Write-Output "GlassClassUsages=$glassCount"
    Write-Output "ImageElements=$imageCount"
    Write-Output "LazyImages=$lazyImageCount"
    Write-Output "VideoElements=$videoCount"
}

Write-Output "Live production resources"
$html = curl.exe -sS "$SiteUrl/"
$assetPaths = [regex]::Matches($html, '(?:src|href)="(?<path>/assets/[^"]+)"') |
    ForEach-Object { $_.Groups["path"].Value } |
    Sort-Object -Unique

$resourcePaths = @("/") + $assetPaths + @(
    "/avatar_AI.webm",
    "/avatar_AI_alpha_v2.webm",
    "/avatar_AI_safari_mask_v2.mp4",
    "/avatar_AI_poster_v2.png"
)
foreach ($resourcePath in $resourcePaths) {
    curl.exe -sS --compressed -o NUL -w "$resourcePath status=%{http_code} transfer=%{size_download}B ttfb=%{time_starttransfer}s total=%{time_total}s`n" "$SiteUrl$resourcePath"
}

Write-Output "API timing samples"
1..5 | ForEach-Object {
    curl.exe -sS -o NUL -w "sample=$_ status=%{http_code} connect=%{time_connect}s ttfb=%{time_starttransfer}s total=%{time_total}s bytes=%{size_download}`n" "$ApiUrl/api/config"
}

Write-Output "Effect source checksums"
$effectFiles = @(
    "index.html",
    "src\main.jsx",
    "src\App.jsx",
    "src\index.css",
    "src\pages\Home.jsx",
    "src\hooks\useDeferredSections.js",
    "src\background\blackHoleEngine.js",
    "src\background\blackHole.worker.js",
    "src\background\blackHoleFallback.js",
    "src\background\performanceBridge.js",
    "src\components\ChromaKeyVideo.jsx",
    "src\context\PortfolioContext.jsx",
    "src\components\ScrollProgressBar.jsx"
)

Get-FileHash -Algorithm SHA256 $effectFiles |
    ForEach-Object {
        $relativePath = $_.Path.Replace((Get-Location).Path + "\", "")
        "$relativePath $($_.Hash)"
    }
