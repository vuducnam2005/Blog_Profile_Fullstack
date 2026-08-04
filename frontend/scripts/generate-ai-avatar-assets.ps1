param(
    [string]$InputPath = "",
    [string]$OutputDirectory = "",
    [string]$FfmpegPath = "",
    [int]$Sensitivity = 38,
    [int]$Smoothness = 18,
    [double]$DespillMix = 0.5,
    [int]$Vp9Crf = 24,
    [int]$H264Crf = 20,
    [double]$PosterTime = 0.04
)

$ErrorActionPreference = "Stop"

$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($InputPath)) {
    $InputPath = Join-Path $frontendRoot "public\avatar_AI.webm"
}
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $frontendRoot "public"
}

$sourceFile = (Resolve-Path -LiteralPath $InputPath).Path
$outputRoot = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

if ([string]::IsNullOrWhiteSpace($FfmpegPath)) {
    $bundledFfmpeg = Join-Path $frontendRoot "node_modules\ffmpeg-static\ffmpeg.exe"
    if (Test-Path -LiteralPath $bundledFfmpeg) {
        $FfmpegPath = $bundledFfmpeg
    } else {
        $ffmpegCommand = Get-Command ffmpeg -ErrorAction SilentlyContinue
        if ($ffmpegCommand) {
            $FfmpegPath = $ffmpegCommand.Source
        }
    }
}

if ([string]::IsNullOrWhiteSpace($FfmpegPath) -or -not (Test-Path -LiteralPath $FfmpegPath)) {
    throw "FFmpeg was not found. Pass -FfmpegPath or install ffmpeg in PATH."
}

if ($Smoothness -le 0 -or $Sensitivity -le $Smoothness) {
    throw "Sensitivity must be greater than Smoothness, and Smoothness must be positive."
}

function Invoke-Ffmpeg {
    param([string[]]$Arguments)

    & $FfmpegPath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "FFmpeg failed with exit code $LASTEXITCODE."
    }
}

$softThreshold = $Sensitivity - $Smoothness
$maxRedBlue = "max(r(X,Y),b(X,Y))"
$greenDifference = "g(X,Y)-$maxRedBlue"
$greenExpression = "if(gt(g(X,Y),50)*gt($greenDifference,$softThreshold),$maxRedBlue,g(X,Y))"
$alphaExpression = "if(gt(g(X,Y),60)*gt($greenDifference,$Sensitivity),0,if(gt(g(X,Y),50)*gt($greenDifference,$softThreshold),clip(255*(1-($greenDifference-$softThreshold)/$Smoothness),0,255),255))"
$keyFilter = "format=rgba,geq=r='r(X,Y)':g='$greenExpression':b='b(X,Y)':a='$alphaExpression',despill=green:mix=$DespillMix"

$alphaPath = Join-Path $outputRoot "avatar_AI_alpha.webm"
$fallbackPath = Join-Path $outputRoot "avatar_AI_fallback.mp4"
$posterPath = Join-Path $outputRoot "avatar_AI_poster.png"

Invoke-Ffmpeg @(
    "-hide_banner", "-y",
    "-i", $sourceFile,
    "-map", "0:v:0", "-an",
    "-vf", "$keyFilter,format=yuva420p",
    "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
    "-b:v", "0", "-crf", "$Vp9Crf",
    "-deadline", "good", "-cpu-used", "2", "-row-mt", "1", "-auto-alt-ref", "0",
    $alphaPath
)

Invoke-Ffmpeg @(
    "-hide_banner", "-y",
    "-i", $sourceFile,
    "-map", "0:v:0", "-an",
    "-c:v", "libx264", "-preset", "slow", "-crf", "$H264Crf",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    $fallbackPath
)

Invoke-Ffmpeg @(
    "-hide_banner", "-y",
    "-ss", "$PosterTime", "-i", $sourceFile,
    "-map", "0:v:0", "-an", "-frames:v", "1",
    "-vf", "$keyFilter,format=rgba",
    "-compression_level", "9", "-update", "1",
    $posterPath
)

Get-Item -LiteralPath $alphaPath, $fallbackPath, $posterPath |
    Select-Object Name, Length, FullName
