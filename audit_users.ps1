
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwYnpkZ2ticm96cmplb2hvbmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQ5NjIsImV4cCI6MjA4NjEzMDk2Mn0.GCNwOd5WLoeDNYQv4BJIZCkmxOagtJj2-SJMgjhyt_c"
$headers = @{
    'apikey' = $token
    'Authorization' = "Bearer $token"
}

# Buscar todos os usuarios e verificar problemas
$users = Invoke-RestMethod -Uri "https://ipbzdgkbrozrjeohonbo.supabase.co/rest/v1/users?select=id,username,saram,approved,active,reset_password_at_login,pending_password_reset,password_status,name,rank&limit=200" -Headers $headers

Write-Host "=== TOTAL DE USUARIOS: $($users.Count) ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "=== PROBLEMAS DETECTADOS ===" -ForegroundColor Red

$problems = @()

foreach ($u in $users) {
    $issues = @()
    
    # Username diferente do saram
    if ($u.saram -and $u.username -ne $u.saram -and $u.username -ne 'admin' -and -not $u.username.StartsWith('sop.')) {
        $issues += "USERNAME ($($u.username)) != SARAM ($($u.saram))"
    }
    
    # Username vazio ou nulo
    if (-not $u.username) {
        $issues += "USERNAME VAZIO"
    }
    
    # SARAM vazio ou nulo
    if (-not $u.saram) {
        $issues += "SARAM VAZIO"
    }
    
    # Usuarios duplicados pelo mesmo SARAM
    $duplicates = $users | Where-Object { $_.saram -eq $u.saram -and $_.id -ne $u.id -and $u.saram }
    if ($duplicates) {
        $issues += "SARAM DUPLICADO com: $($duplicates.name)"
    }
    
    # Usuarios nao aprovados
    if ($u.approved -eq $false) {
        $issues += "NAO APROVADO"
    }
    
    # Usuarios inativos
    if ($u.active -eq $false) {
        $issues += "INATIVO"
    }
    
    if ($issues.Count -gt 0) {
        $problems += [PSCustomObject]@{
            Name = $u.name
            Rank = $u.rank
            Username = $u.username
            SARAM = $u.saram
            Issues = ($issues -join " | ")
        }
    }
}

if ($problems.Count -eq 0) {
    Write-Host "Nenhum problema encontrado!" -ForegroundColor Green
} else {
    $problems | Format-Table -AutoSize
}

Write-Host ""
Write-Host "=== TODOS OS USUARIOS (RESUMO) ===" -ForegroundColor Yellow
$users | Select-Object name, rank, username, saram, approved, active, reset_password_at_login, pending_password_reset | Format-Table -AutoSize
