$ErrorActionPreference = 'Stop'
$webProcesses = Get-CimInstance Win32_Process -Filter "name='node.exe'" | Where-Object { $_.CommandLine -like '*vite/bin/vite.js --mode conformity-local*' }
foreach ($webProcess in $webProcesses) { Stop-Process -Id $webProcess.ProcessId -ErrorAction SilentlyContinue }
docker --context desktop-linux stop -t 30 astro657-api astro657-auth astro657-mongo astro657-redis astro657-postgres
Write-Output 'Serviços da SCRUM-657 encerrados. Os volumes e os arquivos locais foram preservados.'
