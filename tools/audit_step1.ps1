param()

$repoRoot = "C:\Users\yvallott\.codex\notionlab_010925"
$envPath = Join-Path $repoRoot ".env"

$kv = @{}
if (Test-Path $envPath) {
  $lines = Get-Content $envPath
  foreach ($line in $lines) {
    if ($line -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.+)\s*$') {
      $k = $Matches[1]
      $v = $Matches[2].Trim('"').Trim("'")
      $kv[$k] = $v
    }
  }
}

$url  = $kv['VITE_SUPABASE_URL']
$anon = $kv['VITE_SUPABASE_ANON_KEY']

if (-not $url -or -not $anon) {
  Write-Output "[audit] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY"
  exit 1
}

$headers = @{
  apikey        = $anon
  Authorization = "Bearer $anon"
  Accept        = "application/json"
}

function Invoke-JSON {
  param(
    [string]$Method,
    [string]$Url,
    $Body
  )
  try {
    if ($null -ne $Body) {
      $json = ($Body | ConvertTo-Json -Depth 20)
      return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ContentType "application/json" -Body $json -ErrorAction Stop
    } else {
      return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ErrorAction Stop
    }
  } catch {
    return @{ __error = $_.Exception.Message }
  }
}

function Test-Table {
  param([string]$Name)
  $endpoint = "$url/rest/v1/$Name?select=id&limit=1"
  try {
    $r = Invoke-WebRequest -Method Head -Uri $endpoint -Headers $headers -ErrorAction Stop
    return @{ name=$Name; exists=$true; status=[int]$r.StatusCode }
  } catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    return @{ name=$Name; exists=$false; status=$status; error=$_.Exception.Message }
  }
}

function Sample-Select {
  param([string]$Name,[string]$Select,[string]$Query)
  $endpoint = "$url/rest/v1/$Name?select=$Select"
  if ($Query) { $endpoint = "$endpoint&$Query" }
  $r = Invoke-JSON -Method Get -Url $endpoint -Body $null
  return @{ name=$Name; select=$Select; query=$Query; result=$r }
}

function Test-RPC {
  param([string]$Name, $Body)
  $endpoint = "$url/rest/v1/rpc/$Name"
  $r = Invoke-JSON -Method Post -Url $endpoint -Body $Body
  $exists = $true
  if ($r -is [hashtable] -and $r.ContainsKey('__error')) {
    $msg = $r['__error']
    if ($msg -match 'not found|does not exist|could not find') { $exists = $false }
    return @{ name=$Name; exists=$exists; ok=$false; error=$msg }
  } else {
    return @{ name=$Name; exists=$true; ok=$true; sample=$r }
  }
}

Write-Output "=== Tables existence ==="
$tables = @('formation_module_statuses','user_formation_submissions','formation_submission','user_formation_snapshots','courses')
foreach ($t in $tables) { (Test-Table -Name $t | ConvertTo-Json -Compress) }

Write-Output "`n=== formation_module_statuses sample ==="
(Sample-Select -Name "formation_module_statuses" -Select "id,user_id,submission_id,module_uuid,status,position" -Query "limit=5" | ConvertTo-Json -Depth 20)

Write-Output "`n=== formation_module_statuses status distinct ==="
$endpoint = "$url/rest/v1/formation_module_statuses?select=status&distinct=true"
($endpoint)
($null -ne $endpoint) | Out-Null
($endpoint | Out-String) | Out-Null
$rd = Invoke-JSON -Method Get -Url $endpoint -Body $null
($rd | ConvertTo-Json -Depth 20)

Write-Output "`n=== courses custom nodes sample ==="
(Sample-Select -Name "courses" -Select "id,course_type,status,nodes" -Query "course_type=eq.custom&limit=5" | ConvertTo-Json -Depth 20)

Write-Output "`n=== RPC existence ==="
$rpctests = @(
 @{Name="approve_user_parcours_submission"; Body=@{ p_submission_id="00000000-0000-0000-0000-000000000000" }},
 @{Name="get_user_kanban_modules"; Body=@{ p_user_id="00000000-0000-0000-0000-000000000000" }},
 @{Name="get_admin_kanban_module_statuses"; Body=@{ p_user_id="00000000-0000-0000-0000-000000000000"; p_course_id="00000000-0000-0000-0000-000000000000" }}
)
foreach ($rc in $rpctests) { (Test-RPC -Name $rc.Name -Body $rc.Body | ConvertTo-Json -Depth 20) }

Write-Output "`n=== Approved submissions sample: formation_submission ==="
(Sample-Select -Name "formation_submission" -Select "id,user_id,course_id,status,created_at" -Query "status=eq.approved&limit=5" | ConvertTo-Json -Depth 20)

Write-Output "`n=== Approved submissions sample: user_formation_submissions ==="
(Sample-Select -Name "user_formation_submissions" -Select "id,user_id,course_id,submission_status,submitted_at" -Query "submission_status=eq.approved&limit=5" | ConvertTo-Json -Depth 20)

Write-Output "`n=== user_formation_snapshots sample ==="
(Sample-Select -Name "user_formation_snapshots" -Select "id,user_id,submission_id,course_id,created_at" -Query "limit=5" | ConvertTo-Json -Depth 20)

Write-Output "`n[audit] Done."
