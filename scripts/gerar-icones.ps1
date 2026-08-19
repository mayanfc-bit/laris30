# Gera todos os icones do app (PWA, favicon e previa de link) a partir de uma
# unica imagem de origem.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\gerar-icones.ps1 -Origem "C:\caminho\arte.png"
#
# Produz em public/icons:
#   icon-192.png            icone do PWA
#   icon-512.png            icone do PWA em alta
#   icon-maskable-512.png   com margem, para o Android recortar em circulo
#   apple-touch-icon.png    180x180, tela de inicio do iPhone
#   favicon-32.png          aba do navegador
# E em public:
#   og-image.png            1200x630, a previa que aparece ao mandar o link
#
# ATENCAO: este arquivo precisa ser salvo em UTF-8 COM BOM, senao o PowerShell
# 5.1 le como ANSI e os acentos saem quebrados no og-image.

param(
  [Parameter(Mandatory = $true)][string]$Origem
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Origem)) { throw "Nao encontrei a imagem: $Origem" }

$raiz    = Split-Path -Parent $PSScriptRoot
$destIco = Join-Path $raiz 'public\icons'
$destPub = Join-Path $raiz 'public'
New-Item -ItemType Directory -Force -Path $destIco | Out-Null

$original = New-Object System.Drawing.Bitmap ([System.Drawing.Image]::FromFile((Resolve-Path $Origem)))

# --- cor de fundo: o proprio canto da arte, para nao aparecer emenda ---------
$canto = $original.GetPixel(2, 2)
$fundo = if ($canto.A -lt 250) {
  [System.Drawing.ColorTranslator]::FromHtml('#F8F4EE')
} else { $canto }
"Fundo detectado: #{0:X2}{1:X2}{2:X2}" -f $fundo.R, $fundo.G, $fundo.B

# --- recorte automatico: acha o retangulo do que nao e fundo -----------------
# Tolerancia alta porque o print tem uma area branca levemente diferente do
# fundo; so queremos a moldura de verdade.
function Get-Bounds($bmp, $ref, [int]$tol, [int]$passo) {
  $minX = $bmp.Width; $minY = $bmp.Height; $maxX = 0; $maxY = 0
  for ($y = 0; $y -lt $bmp.Height; $y += $passo) {
    for ($x = 0; $x -lt $bmp.Width; $x += $passo) {
      $p = $bmp.GetPixel($x, $y)
      if ($p.A -lt 200) { continue }
      $d = [Math]::Abs($p.R - $ref.R) + [Math]::Abs($p.G - $ref.G) + [Math]::Abs($p.B - $ref.B)
      if ($d -gt $tol) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -le $minX -or $maxY -le $minY) { return $null }
  $folga = 6
  $minX = [Math]::Max(0, $minX - $folga); $minY = [Math]::Max(0, $minY - $folga)
  $maxX = [Math]::Min($bmp.Width - 1, $maxX + $folga); $maxY = [Math]::Min($bmp.Height - 1, $maxY + $folga)
  New-Object System.Drawing.Rectangle $minX, $minY, ($maxX - $minX), ($maxY - $minY)
}

$area = Get-Bounds $original $fundo 90 2
if ($area) {
  "Recorte: {0}x{1} a partir de ({2},{3}) — origem era {4}x{5}" -f `
    $area.Width, $area.Height, $area.X, $area.Y, $original.Width, $original.Height
  $src = $original.Clone($area, $original.PixelFormat)
} else {
  'Nada para recortar, usando a imagem inteira.'
  $src = $original
}

function New-Canvas([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode     = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode   = 'HighQuality'
  $g.Clear($fundo)
  @{ bmp = $bmp; g = $g }
}

function Draw-Fit($g, [int]$w, [int]$h, [double]$margem) {
  $livreW = $w * (1 - 2 * $margem)
  $livreH = $h * (1 - 2 * $margem)
  $escala = [Math]::Min($livreW / $src.Width, $livreH / $src.Height)
  $novoW  = [int]($src.Width * $escala)
  $novoH  = [int]($src.Height * $escala)
  $g.DrawImage($src, [int](($w - $novoW) / 2), [int](($h - $novoH) / 2), $novoW, $novoH)
}

function Save-Icon([int]$tamanho, [double]$margem, [string]$arquivo, [string]$pasta) {
  $c = New-Canvas $tamanho $tamanho
  Draw-Fit $c.g $tamanho $tamanho $margem
  $c.bmp.Save((Join-Path $pasta $arquivo), [System.Drawing.Imaging.ImageFormat]::Png)
  $c.g.Dispose(); $c.bmp.Dispose()
  "  $arquivo  ($tamanho x $tamanho)"
}

'Gerando icones...'
Save-Icon 192 0.06 'icon-192.png'          $destIco
Save-Icon 512 0.06 'icon-512.png'          $destIco
Save-Icon 512 0.20 'icon-maskable-512.png' $destIco
Save-Icon 180 0.08 'apple-touch-icon.png'  $destIco
Save-Icon 32  0.04 'favicon-32.png'        $destIco

'Gerando previa de link...'
$og = New-Canvas 1200 630
$g  = $og.g

$escala = [Math]::Min(500 / $src.Height, 430 / $src.Width)
$mW = [int]($src.Width * $escala)
$mH = [int]($src.Height * $escala)
$g.DrawImage($src, 90, [int]((630 - $mH) / 2), $mW, $mH)

$petroleo = [System.Drawing.ColorTranslator]::FromHtml('#145A63')
$dourado  = [System.Drawing.ColorTranslator]::FromHtml('#C99A4A')
$pincelP  = New-Object System.Drawing.SolidBrush $petroleo
$pincelD  = New-Object System.Drawing.SolidBrush $dourado

# Georgia e a serifada do Windows mais proxima da Playfair Display.
$fTitulo = New-Object System.Drawing.Font('Georgia', 74, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fSub    = New-Object System.Drawing.Font('Georgia', 36, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fPe     = New-Object System.Drawing.Font('Segoe UI', 25, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

$g.TextRenderingHint = 'AntiAliasGridFit'
$x = 90 + $mW + 60
$larg = 1140 - $x
$fmt = New-Object System.Drawing.StringFormat

$g.DrawString('Missão 30', $fTitulo, $pincelP, (New-Object System.Drawing.RectangleF $x, 200, $larg, 100), $fmt)
$g.DrawString("The One Where`nLaris Turns Thirty", $fSub, $pincelD, (New-Object System.Drawing.RectangleF $x, 296, $larg, 130), $fmt)
$g.DrawString('Os desafios da festa', $fPe, $pincelP, (New-Object System.Drawing.RectangleF $x, 412, $larg, 40), $fmt)

$og.bmp.Save((Join-Path $destPub 'og-image.png'), [System.Drawing.Imaging.ImageFormat]::Png)
foreach ($d in @($fTitulo, $fSub, $fPe, $pincelP, $pincelD)) { $d.Dispose() }
$og.g.Dispose(); $og.bmp.Dispose()
'  og-image.png  (1200 x 630)'

if ($src -ne $original) { $src.Dispose() }
$original.Dispose()
'Pronto.'
