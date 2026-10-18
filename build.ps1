$ErrorActionPreference = 'Stop'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here 'src'

$html = Get-Content -Raw -Encoding UTF8 (Join-Path $src 'index.html')
$css = Get-Content -Raw -Encoding UTF8 (Join-Path $src 'style.css')
$audio = Get-Content -Raw -Encoding UTF8 (Join-Path $src 'audio.js')
$art = Get-Content -Raw -Encoding UTF8 (Join-Path $src 'art.js')
$engine = Get-Content -Raw -Encoding UTF8 (Join-Path $src 'engine.js')

$nl = "`r`n"
$html = $html.Replace('<link rel="stylesheet" href="style.css">', ('<style>' + $nl + $css + $nl + '</style>'))
$html = $html.Replace('<script src="audio.js"></script>', ('<script>' + $nl + $audio + $nl + '</script>'))
$html = $html.Replace('<script src="art.js"></script>', ('<script>' + $nl + $art + $nl + '</script>'))
$html = $html.Replace('<script src="engine.js"></script>', ('<script>' + $nl + $engine + $nl + '</script>'))

if ($html -match 'src="(audio|art|engine)\.js"' -or $html -match 'href="style\.css"') {
  throw 'Inline build failed: external references remain'
}

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $here 'index.html'), $html, $enc)
Write-Host ("Built {0} ({1:N0} KB)" -f (Join-Path $here 'index.html'), ($html.Length / 1KB))
