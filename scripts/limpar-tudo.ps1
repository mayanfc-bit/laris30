# =====================================================================
# Missão 30 — reset para o dia da festa
#
# Apaga TODOS os convidados, envios, sorteios e mídias.
# Mantém os 63 desafios, que são a configuração da festa.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\limpar-tudo.ps1
#       -> só MOSTRA o que seria apagado, não apaga nada
#
#   powershell -ExecutionPolicy Bypass -File scripts\limpar-tudo.ps1 -Confirmar
#       -> apaga de verdade
#
# O modo de conferência é o padrão de propósito: apagar é irreversível e
# não existe backup dessas mídias fora do Supabase.
# =====================================================================

param([switch]$Confirmar)

$ErrorActionPreference = 'Stop'

# ---------- credenciais do .env ----------
$raiz = Split-Path -Parent $PSScriptRoot
$cfg = @{}
foreach ($linha in [IO.File]::ReadAllLines((Join-Path $raiz '.env'))) {
  if ($linha -match '^\s*([A-Z_]+)\s*=\s*(.+)$') { $cfg[$Matches[1]] = $Matches[2].Trim() }
}
$URL = $cfg['VITE_SUPABASE_URL']
$KEY = $cfg['VITE_SUPABASE_ANON_KEY']
if (-not $URL -or -not $KEY) { throw 'Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env' }

$H  = @{ apikey = $KEY; Authorization = "Bearer $KEY" }
$HJ = @{ apikey = $KEY; Authorization = "Bearer $KEY"; 'Content-Type' = 'application/json' }

# Devolve sempre uma lista de verdade. Sem o Write-Output explicito, o
# PowerShell 5.1 entrega o array inteiro como um unico item.
function Get-Json($caminho) {
  $txt = (Invoke-WebRequest -UseBasicParsing -Uri "$URL/rest/v1/$caminho" -Headers $H).Content
  $obj = ConvertFrom-Json $txt
  if ($null -eq $obj) { return }
  Write-Output $obj
}

# ---------- inventário ----------
Write-Host '=== RESET DA MISSAO 30 ==='
$convidados  = @(Get-Json 'guests?select=id,name,created_at')
$envios      = @(Get-Json 'completions?select=id,media_url,thumb_url')
$sorteios    = @(Get-Json 'drawn_challenges?select=id')
$desafios    = @(Get-Json 'challenges?select=id')

$midias = @()
foreach ($e in $envios) { foreach ($u in @($e.media_url, $e.thumb_url)) { if ($u) { $midias += $u } } }

# arquivos no bucket que não estão em nenhum envio (órfãos de testes antigos)
$pastas = @()
try {
  $pastas = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$URL/storage/v1/object/list/party-media" `
              -Headers $HJ -Body '{"prefix":"","limit":1000}').Content | ConvertFrom-Json
} catch {}

Write-Host ''
Write-Host ('  convidados     : {0}' -f $convidados.Count)
foreach ($c in $convidados) { Write-Host ('      - {0}  (entrou em {1})' -f $c.name, $c.created_at) }
Write-Host ('  envios         : {0}' -f $envios.Count)
Write-Host ('  sorteios       : {0}' -f $sorteios.Count)
Write-Host ('  midias         : {0} arquivos referenciados' -f $midias.Count)
Write-Host ('  pastas/objetos no bucket: {0}' -f $pastas.Count)
Write-Host ''
Write-Host ('  desafios       : {0}  <- SERAO MANTIDOS' -f $desafios.Count) -ForegroundColor Green

if (-not $Confirmar) {
  Write-Host ''
  Write-Host 'MODO CONFERENCIA — nada foi apagado.' -ForegroundColor Yellow
  Write-Host 'Para apagar de verdade, rode de novo com  -Confirmar' -ForegroundColor Yellow
  return
}

# ---------- execução ----------
Write-Host ''
Write-Host '--- apagando midias do storage'
$apagadas = 0
foreach ($u in $midias) {
  $p = $u -replace '.*/party-media/', ''
  try { Invoke-WebRequest -UseBasicParsing -Method Delete -Uri "$URL/storage/v1/object/party-media/$p" -Headers $H | Out-Null; $apagadas++ } catch {}
}
Write-Host ("    removidas: {0}/{1}" -f $apagadas, $midias.Count)

# varre cada pasta de convidado e remove o que sobrou (orfaos)
Write-Host '--- varrendo pastas do bucket'
$orfaos = 0
foreach ($pasta in $pastas) {
  if (-not $pasta.name) { continue }
  foreach ($sub in @('', '/thumbs')) {
    $prefixo = ($pasta.name + $sub).TrimStart('/')
    try {
      $itens = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$URL/storage/v1/object/list/party-media" `
                 -Headers $HJ -Body ('{"prefix":"' + $prefixo + '","limit":1000}')).Content | ConvertFrom-Json
      foreach ($it in $itens) {
        if (-not $it.id) { continue }  # é subpasta, não arquivo
        try { Invoke-WebRequest -UseBasicParsing -Method Delete -Uri "$URL/storage/v1/object/party-media/$prefixo/$($it.name)" -Headers $H | Out-Null; $orfaos++ } catch {}
      }
    } catch {}
  }
}
Write-Host ("    orfaos removidos: {0}" -f $orfaos)

Write-Host '--- apagando registros do banco'
# guests tem "on delete cascade" para completions e drawn_challenges,
# entao apagar o convidado leva tudo dele junto.
foreach ($c in $convidados) {
  Invoke-WebRequest -UseBasicParsing -Method Delete -Uri "$URL/rest/v1/guests?id=eq.$($c.id)" -Headers $H | Out-Null
}
Write-Host ("    convidados removidos: {0}" -f $convidados.Count)

# ---------- conferência final ----------
Write-Host ''
Write-Host '--- estado final'
$fim = @{
  convidados = @(Get-Json 'guests?select=id').Count
  envios     = @(Get-Json 'completions?select=id').Count
  sorteios   = @(Get-Json 'drawn_challenges?select=id').Count
  desafios   = @(Get-Json 'challenges?select=id').Count
}
Write-Host ('    convidados : {0}' -f $fim.convidados)
Write-Host ('    envios     : {0}' -f $fim.envios)
Write-Host ('    sorteios   : {0}' -f $fim.sorteios)
Write-Host ('    desafios   : {0}' -f $fim.desafios)

$restou = 0
try {
  $r = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$URL/storage/v1/object/list/party-media" `
         -Headers $HJ -Body '{"prefix":"","limit":1000}').Content | ConvertFrom-Json
  $restou = @($r).Count
} catch {}
Write-Host ('    pastas no bucket: {0}' -f $restou)

if ($fim.convidados -eq 0 -and $fim.envios -eq 0 -and $fim.sorteios -eq 0 -and $fim.desafios -gt 0) {
  Write-Host ''
  Write-Host 'PRONTO — app zerado e os desafios intactos.' -ForegroundColor Green
} else {
  Write-Host ''
  Write-Host 'ATENCAO: o estado final nao ficou como esperado. Confira acima.' -ForegroundColor Red
}
