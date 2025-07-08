const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applySchema() {
  console.log('🗄️  Supabase 스키마 적용 시작...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // 1. 스키마 파일 읽기
    console.log('1️⃣ 스키마 파일 읽기');
    const schemaPath = path.join(__dirname, '..', 'supabase_schema_fixed.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.log('❌ 스키마 파일을 찾을 수 없습니다:', schemaPath);
      return false;
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log(`✅ 스키마 파일 읽기 성공 (${Math.round(schemaSQL.length / 1024)}KB)`);

    // 2. SQL 명령어들을 분리
    console.log('\n2️⃣ SQL 명령어 분리 및 실행');
    
    // SQL을 세미콜론으로 분리하고 빈 라인 제거
    const sqlCommands = schemaSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
      .filter(cmd => !cmd.match(/^\/\*[\s\S]*?\*\/$/)); // 블록 주석 제거

    console.log(`📝 총 ${sqlCommands.length}개의 SQL 명령어 발견`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // 3. 각 명령어 실행
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      // 명령어 타입 판별
      const commandType = getCommandType(command);
      
      try {
        console.log(`[${i + 1}/${sqlCommands.length}] ${commandType} 실행 중...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: command + ';' 
        });

        if (error) {
          // 이미 존재하는 객체에 대한 경고는 무시
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('already defined')) {
            console.log(`⚠️  ${commandType}: ${error.message}`);
          } else {
            console.log(`❌ ${commandType} 실패: ${error.message}`);
            errors.push({ command: commandType, error: error.message });
            errorCount++;
          }
        } else {
          console.log(`✅ ${commandType} 성공`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ ${commandType} 실행 오류:`, err.message);
        errors.push({ command: commandType, error: err.message });
        errorCount++;
      }
    }

    // 4. 실행 결과 요약
    console.log('\n📊 스키마 적용 결과:');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    
    if (errors.length > 0) {
      console.log('\n🚨 발생한 오류들:');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.command}: ${err.error}`);
      });
    }

    // 5. 기본 데이터 삽입 (역할)
    console.log('\n3️⃣ 기본 데이터 삽입');
    
    const defaultRoles = [
      {
        id: 'role-system-admin',
        name: '시스템 관리자',
        type: 'system_admin',
        description: '시스템 전체 관리 권한',
        permissions: {
          dashboard: ['create', 'read', 'update', 'delete', 'manage'],
          equipment: ['create', 'read', 'update', 'delete', 'manage'],
          endmill: ['create', 'read', 'update', 'delete', 'manage'],
          inventory: ['create', 'read', 'update', 'delete', 'manage'],
          camSheets: ['create', 'read', 'update', 'delete', 'manage'],
          toolChanges: ['create', 'read', 'update', 'delete', 'manage'],
          reports: ['create', 'read', 'update', 'delete', 'manage'],
          settings: ['create', 'read', 'update', 'delete', 'manage'],
          users: ['create', 'read', 'update', 'delete', 'manage']
        },
        is_system_role: true,
        is_active: true
      }
    ];

    for (const role of defaultRoles) {
      const { error } = await supabase
        .from('user_roles')
        .upsert(role);

      if (error) {
        console.log(`❌ 기본 역할 생성 실패:`, error.message);
      } else {
        console.log(`✅ 기본 역할 생성 성공: ${role.name}`);
      }
    }

    return errorCount === 0;

  } catch (error) {
    console.error('❌ 스키마 적용 중 치명적 오류:', error);
    return false;
  }
}

function getCommandType(command) {
  const upperCommand = command.trim().toUpperCase();
  
  if (upperCommand.startsWith('CREATE EXTENSION')) return 'EXTENSION';
  if (upperCommand.startsWith('CREATE TYPE')) return 'TYPE';
  if (upperCommand.startsWith('CREATE TABLE')) return 'TABLE';
  if (upperCommand.startsWith('CREATE INDEX')) return 'INDEX';
  if (upperCommand.startsWith('CREATE TRIGGER')) return 'TRIGGER';
  if (upperCommand.startsWith('CREATE FUNCTION') || upperCommand.startsWith('CREATE OR REPLACE FUNCTION')) return 'FUNCTION';
  if (upperCommand.startsWith('CREATE VIEW')) return 'VIEW';
  if (upperCommand.startsWith('INSERT INTO')) return 'INSERT';
  if (upperCommand.startsWith('ALTER TABLE')) return 'ALTER';
  if (upperCommand.startsWith('COMMENT ON')) return 'COMMENT';
  
  return 'UNKNOWN';
}

// exec_sql 함수가 없을 경우를 대비한 간단한 실행 방법
async function executeSimpleCommand(supabase, command) {
  try {
    // rpc 대신 직접 실행 시도
    const { data, error } = await supabase.rpc('exec', { 
      sql: command 
    });
    
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

applySchema()
  .then((success) => {
    if (success) {
      console.log('\n🎉 스키마 적용 완료!');
    } else {
      console.log('\n💥 스키마 적용 중 오류 발생');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  }); 