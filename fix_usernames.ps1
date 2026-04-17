
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwYnpkZ2ticm96cmplb2hvbmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTQ5NjIsImV4cCI6MjA4NjEzMDk2Mn0.GCNwOd5WLoeDNYQv4BJIZCkmxOagtJj2-SJMgjhyt_c"
$headers = @{
    'apikey' = $token
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
    'Prefer' = 'return=minimal'
}

$users = Invoke-RestMethod -Uri "https://ipbzdgkbrozrjeohonbo.supabase.co/rest/v1/users?select=id,username,saram,name&limit=300" -Headers $headers

$fixed = 0
$errors = 0

foreach ($u in $users) {
    # Usuário com username errado (user_TIMESTAMP) mas com SARAM valido
    if ($u.username -match "^user_\d+" -and $u.saram -and $u.saram.Length -ge 5) {
        Write-Host "Corrigindo: $($u.name) | USERNAME: $($u.username) -> $($u.saram)" -ForegroundColor Yellow
        
        $body = @{ username = $u.saram } | ConvertTo-Json
        
        try {
            Invoke-RestMethod -Method PATCH `
                -Uri "https://ipbzdgkbrozrjeohonbo.supabase.co/rest/v1/users?id=eq.$($u.id)" `
                -Headers $headers `
                -Body $body | Out-Null
            Write-Host "  OK!" -ForegroundColor Green
            $fixed++
        } catch {
            Write-Host "  ERRO: $_" -ForegroundColor Red
            $errors++
        }
    }
}

Write-Host ""
Write-Host "=== RESULTADO ===" -ForegroundColor Cyan
Write-Host "Corrigidos: $fixed" -ForegroundColor Green
Write-Host "Erros: $errors" -ForegroundColor Red
