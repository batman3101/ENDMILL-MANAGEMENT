# Supabase 데이터베이스 자동 백업 스크립트
# 사용법: powershell -File backup-supabase.ps1

$ErrorActionPreference = "Stop"

# 설정
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backupDir = Join-Path $projectRoot "backups"
$backupFile = Join-Path $backupDir "backup_$timestamp.sql"
$logFile = Join-Path $backupDir "backup_log.txt"

# 백업 보관 기간 (일)
$retentionDays = 30

# 로그 함수
function Write-Log {
    param([string]$Message)
    $logMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $Message"
    Write-Host $logMessage
    Add-Content -Path $logFile -Value $logMessage
}

try {
    Write-Log "========== 백업 시작 =========="

    # 백업 디렉토리 생성
    if (!(Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir | Out-Null
        Write-Log "백업 디렉토리 생성: $backupDir"
    }

    # Supabase CLI 설치 확인
    $supabasePath = Get-Command supabase -ErrorAction SilentlyContinue
    if (!$supabasePath) {
        Write-Log "ERROR: Supabase CLI가 설치되지 않았습니다."
        Write-Log "설치 방법: npm install -g supabase"
        exit 1
    }

    # 백업 실행
    Write-Log "데이터베이스 백업 시작..."
    Write-Log "백업 파일: $backupFile"

    # Supabase 백업 명령 실행
    supabase db dump --data-only > $backupFile

    if ($LASTEXITCODE -eq 0) {
        # 백업 파일 크기 확인
        $fileSize = (Get-Item $backupFile).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        Write-Log "백업 완료! 파일 크기: $fileSizeMB MB"

        # 백업 파일 압축 (선택 사항)
        Write-Log "백업 파일 압축 중..."
        Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip" -Force
        Remove-Item $backupFile
        Write-Log "압축 완료: $backupFile.zip"

        # 오래된 백업 파일 삭제
        Write-Log "오래된 백업 파일 정리 시작 (보관 기간: $retentionDays 일)..."
        $oldBackups = Get-ChildItem $backupDir -Filter "backup_*.zip" |
            Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$retentionDays) }

        if ($oldBackups) {
            foreach ($oldBackup in $oldBackups) {
                Remove-Item $oldBackup.FullName
                Write-Log "삭제: $($oldBackup.Name)"
            }
            Write-Log "총 $($oldBackups.Count)개 파일 삭제됨"
        } else {
            Write-Log "삭제할 오래된 백업 파일이 없습니다."
        }

        # 백업 파일 목록
        Write-Log "현재 백업 파일 목록:"
        $backupFiles = Get-ChildItem $backupDir -Filter "backup_*.zip" | Sort-Object LastWriteTime -Descending
        foreach ($file in $backupFiles) {
            $age = (Get-Date) - $file.LastWriteTime
            Write-Log "  - $($file.Name) ($(​[math]::Round($file.Length / 1MB, 2)) MB, $($age.Days)일 전)"
        }

        Write-Log "========== 백업 성공 =========="
        exit 0
    } else {
        Write-Log "ERROR: 백업 실패 (Exit Code: $LASTEXITCODE)"
        exit 1
    }

} catch {
    Write-Log "ERROR: 예외 발생 - $($_.Exception.Message)"
    Write-Log "Stack Trace: $($_.ScriptStackTrace)"
    exit 1
}
