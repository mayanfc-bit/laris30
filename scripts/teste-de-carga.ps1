# =====================================================================
# Missão 30 — teste de carga
#
# Simula o pico da festa: vários convidados enviando foto e vídeo ao
# mesmo tempo, e depois um volume grande de registros para conferir se
# a galeria e o ranking aguentam.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\teste-de-carga.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\teste-de-carga.ps1 -Limpar
#
# Todos os dados criados usam o prefixo LOADTEST- e são apagados no fim.
# =====================================================================

param(
  [int]$Convidados = 20,      # quantos sobem ao mesmo tempo
  [int]$FotoMB = 3,           # tamanho de cada "foto"
  [int]$VideoMB = 20,         # tamanho de cada "vídeo"
  [int]$VolumeRegistros = 300,# registros só de metadado, para testar leitura
  [switch]$Limpar             # só limpa o que sobrou de execuções anteriores
)

$ErrorActionPreference = 'Stop'
$PREFIXO = 'LOADTEST-'

# ---------- credenciais do .env ----------
$raiz = Split-Path -Parent $PSScriptRoot
$env_ = @{}
foreach ($linha in [IO.File]::ReadAllLines((Join-Path $raiz '.env'))) {
  if ($linha -match '^\s*([A-Z_]+)\s*=\s*(.+)$') { $env_[$Matches[1]] = $Matches[2].Trim() }
}
$URL = $env_['VITE_SUPABASE_URL']
$KEY = $env_['VITE_SUPABASE_ANON_KEY']
if (-not $URL -or -not $KEY) { throw 'Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env' }

$H  = @{ apikey = $KEY; Authorization = "Bearer $KEY" }
$HJ = @{ apikey = $KEY; Authorization = "Bearer $KEY"; 'Content-Type' = 'application/json' }

function Rest($metodo, $caminho, $corpo) {
  $p = @{ UseBasicParsing = $true; Method = $metodo; Uri = "$URL/rest/v1/$caminho"; Headers = $HJ }
  if ($corpo) { $p.Body = $corpo }
  Invoke-WebRequest @p
}

# ---------------------------------------------------------------------
# Limpeza — apaga convidados de teste e as mídias deles
# ---------------------------------------------------------------------
function Limpar-Tudo {
  Write-Host '--- limpando dados de teste'
  $todos = (Rest GET 'guests?select=id,name').Content | ConvertFrom-Json
  $alvos = @($todos | Where-Object { $_.name -like "$PREFIXO*" })
  Write-Host ("    convidados de teste encontrados: {0}" -f $alvos.Count)

  foreach ($g in $alvos) {
    $comps = (Rest GET "completions?select=media_url,thumb_url&guest_id=eq.$($g.id)").Content | ConvertFrom-Json
    foreach ($c in $comps) {
      foreach ($u in @($c.media_url, $c.thumb_url)) {
        if ($u) {
          $p = $u -replace '.*/party-media/', ''
          try { Invoke-WebRequest -UseBasicParsing -Method Delete -Uri "$URL/storage/v1/object/party-media/$p" -Headers $H | Out-Null } catch {}
        }
      }
    }
    Rest DELETE "guests?id=eq.$($g.id)" | Out-Null
  }

  # varre a pasta do bucket usada pelo teste
  $body = '{"prefix":"loadtest","limit":1000}'
  try {
    $objs = (Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$URL/storage/v1/object/list/party-media" -Headers $HJ -Body $body).Content | ConvertFrom-Json
    foreach ($o in $objs) {
      try { Invoke-WebRequest -UseBasicParsing -Method Delete -Uri "$URL/storage/v1/object/party-media/loadtest/$($o.name)" -Headers $H | Out-Null } catch {}
    }
  } catch {}
  Write-Host '    limpeza concluida'
}

if ($Limpar) { Limpar-Tudo; return }

# ---------------------------------------------------------------------
# Preparação
# ---------------------------------------------------------------------
Write-Host "=== TESTE DE CARGA — Missao 30 ==="
$antes = @{
  guests      = ((Rest GET 'guests?select=id').Content | ConvertFrom-Json).Count
  completions = ((Rest GET 'completions?select=id').Content | ConvertFrom-Json).Count
}
Write-Host ("estado inicial: {0} convidados, {1} envios reais" -f $antes.guests, $antes.completions)

Write-Host "`n--- criando $Convidados convidados de teste"
$ids = @()
for ($i = 1; $i -le $Convidados; $i++) {
  $nome = '{0}{1:d2}' -f $PREFIXO, $i
  $corpo = @{ name = $nome; name_key = $nome.ToLower() } | ConvertTo-Json -Compress
  $r = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$URL/rest/v1/guests" `
        -Headers (@{ apikey = $KEY; Authorization = "Bearer $KEY"; 'Content-Type' = 'application/json'; Prefer = 'return=representation' }) -Body $corpo
  $ids += (($r.Content | ConvertFrom-Json)[0]).id
}
Write-Host ("    criados: {0}" -f $ids.Count)

$desafios = (Rest GET 'challenges?select=id,difficulty&limit=60').Content | ConvertFrom-Json

# ---------------------------------------------------------------------
# Fase 1 e 2 — uploads simultâneos
# ---------------------------------------------------------------------
function Rodar-Fase($titulo, $tamanhoMB, $guestIds, $fase) {
  Write-Host "`n--- $titulo : $($guestIds.Count) uploads de ${tamanhoMB} MB ao mesmo tempo"

  $pool = [RunspaceFactory]::CreateRunspacePool(1, $guestIds.Count)
  $pool.Open()
  $jobs = @()

  $script = {
    param($url, $key, $gid, $mb, $indice, $fase)
    $bytes = New-Object byte[] ($mb * 1MB)
    (New-Object Random($indice)).NextBytes($bytes)
    $path = "loadtest/$fase-$gid-$indice.bin"
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
      Invoke-WebRequest -UseBasicParsing -Method Post `
        -Uri "$url/storage/v1/object/party-media/$path" `
        -Headers @{ apikey = $key; Authorization = "Bearer $key"; 'Content-Type' = 'application/octet-stream' } `
        -Body $bytes -TimeoutSec 600 | Out-Null
      [pscustomobject]@{ ok = $true; segundos = [math]::Round($sw.Elapsed.TotalSeconds, 1); erro = $null; url = "$url/storage/v1/object/public/party-media/$path" }
    } catch {
      $detalhe = $_.Exception.Message
      try { $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream()); $detalhe = $sr.ReadToEnd() } catch {}
      [pscustomobject]@{ ok = $false; segundos = [math]::Round($sw.Elapsed.TotalSeconds, 1); erro = $detalhe; url = $null }
    }
  }

  $i = 0
  foreach ($gid in $guestIds) {
    $i++
    $ps = [PowerShell]::Create().AddScript($script).AddArgument($URL).AddArgument($KEY).AddArgument($gid).AddArgument($tamanhoMB).AddArgument($i).AddArgument($fase)
    $ps.RunspacePool = $pool
    $jobs += [pscustomobject]@{ ps = $ps; handle = $ps.BeginInvoke(); gid = $gid }
  }

  $relogio = [Diagnostics.Stopwatch]::StartNew()
  $res = @()
  foreach ($j in $jobs) {
    $res += $j.ps.EndInvoke($j.handle)
    $j.ps.Dispose()
  }
  $pool.Close()
  $relogio.Stop()

  $ok = @($res | Where-Object ok)
  $falhas = @($res | Where-Object { -not $_.ok })
  $tempos = $ok | ForEach-Object { $_.segundos }

  Write-Host ("    sucesso : {0}/{1}" -f $ok.Count, $res.Count)
  if ($falhas.Count) {
    Write-Host ("    FALHAS  : {0}" -f $falhas.Count) -ForegroundColor Red
    $falhas | Select-Object -First 3 | ForEach-Object { Write-Host ("      - " + $_.erro) -ForegroundColor Red }
  }
  if ($tempos.Count) {
    $m = ($tempos | Measure-Object -Average -Minimum -Maximum)
    Write-Host ("    por upload: min {0}s / media {1}s / max {2}s" -f $m.Minimum, [math]::Round($m.Average,1), $m.Maximum)
  }
  Write-Host ("    parede total: {0}s para {1} MB" -f [int]$relogio.Elapsed.TotalSeconds, ($tamanhoMB * $res.Count))
  return $res
}

$fotos  = Rodar-Fase 'FASE 1 (fotos)'  $FotoMB  $ids 'f1'
$videos = Rodar-Fase 'FASE 2 (videos)' $VideoMB $ids 'f2'

# registra as conclusões correspondentes
Write-Host "`n--- gravando os envios no banco"
$n = 0
for ($i = 0; $i -lt $ids.Count; $i++) {
  foreach ($lote in @($fotos[$i], $videos[$i])) {
    if (-not $lote.ok) { continue }
    $corpo = @{ guest_id = $ids[$i]; challenge_id = $null; custom_title = "Carga $($n)"; media_url = $lote.url } | ConvertTo-Json -Compress
    try { Rest POST 'completions' $corpo | Out-Null; $n++ } catch {}
  }
}
Write-Host ("    envios gravados: {0}" -f $n)

# ---------------------------------------------------------------------
# Fase 3 — volume de registros
# ---------------------------------------------------------------------
Write-Host "`n--- FASE 3: inserindo $VolumeRegistros registros para testar leitura"
$lotes = [math]::Ceiling($VolumeRegistros / 50)
$criados = 0
for ($l = 0; $l -lt $lotes; $l++) {
  $linhas = @()
  for ($j = 0; $j -lt 50 -and $criados -lt $VolumeRegistros; $j++) {
    # par unico: um envio por desafio por convidado (o indice do banco exige)
    $g = $ids[$criados % $ids.Count]
    $d = $desafios[[math]::Floor($criados / $ids.Count) % $desafios.Count]
    $linhas += @{ guest_id = $g; challenge_id = $d.id; media_url = $null }
    $criados++
  }
  try { Rest POST 'completions' ($linhas | ConvertTo-Json -Compress -Depth 3) | Out-Null }
  catch { Write-Host ("    lote {0} falhou: {1}" -f $l, $_.Exception.Message) -ForegroundColor Yellow }
}
$totalAgora = ((Rest GET 'completions?select=id').Content | ConvertFrom-Json).Count
Write-Host ("    total de envios no banco agora: {0}" -f $totalAgora)

# ---------------------------------------------------------------------
# Fase 4 — leitura sob volume
# ---------------------------------------------------------------------
Write-Host "`n--- FASE 4: tempo de leitura com o banco cheio"
foreach ($consulta in @(
    @{ nome = 'galeria    '; q = 'completions?select=*,guests(name),challenges(title,type,difficulty)&order=completed_at.desc' },
    @{ nome = 'ranking    '; q = 'completions?select=guest_id,challenge_id,completed_at,challenges(difficulty)' },
    @{ nome = 'convidados '; q = 'guests?select=*' },
    @{ nome = 'desafios   '; q = 'challenges?select=*' }
  )) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $r = Rest GET $consulta.q
  $sw.Stop()
  Write-Host ("    {0} {1,5} ms   {2,7} KB" -f $consulta.nome, [int]$sw.Elapsed.TotalMilliseconds, [int]($r.RawContentLength / 1KB))
}

Write-Host "`n=== FIM. Rode com -Limpar para apagar os dados de teste. ==="
