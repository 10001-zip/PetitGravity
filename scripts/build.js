const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question(`현재 버전은 ${currentVersion} 입니다. 바로 빌드하려면 엔터, 버전을 바꾸시려면 새 버전을 입력해주세요: `, (answer) => {
  let newVersion = answer.trim();
  
  if (newVersion && newVersion !== currentVersion) {
    pkg.version = newVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`버전이 ${newVersion}으로 변경되었습니다.`);
  } else {
    console.log(`현재 버전(${currentVersion})으로 빌드를 진행합니다.`);
  }

  rl.close();

  console.log('앱 빌드를 시작합니다. 잠시만 기다려주세요...');
  // electron-builder 실행
  const builder = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['electron-builder'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    shell: true
  });

  builder.on('close', (code) => {
    if (code === 0) {
      try {
        const buildDir = path.join(__dirname, '..', 'dist-electron');
        const releaseDir = path.join(__dirname, '..', 'release');
        const versionDir = path.join(releaseDir, pkg.version);
        
        if (!fs.existsSync(releaseDir)) {
          fs.mkdirSync(releaseDir, { recursive: true });
        }
        if (!fs.existsSync(versionDir)) {
          fs.mkdirSync(versionDir, { recursive: true });
        }
        
        const filesToMove = [
          `petitgravity-Setup-${pkg.version}.exe`,
          `petitgravity-Setup-${pkg.version}.exe.blockmap`,
          `latest.yml`
        ];

        filesToMove.forEach(file => {
          const oldPath = path.join(buildDir, file);
          const newPath = path.join(versionDir, file);
          if (fs.existsSync(oldPath)) {
            fs.copyFileSync(oldPath, newPath);
          }
        });

        console.log(`빌드가 완료되었습니다. release/${pkg.version} 폴더를 확인해주세요.`);
      } catch (err) {
        console.error('빌드는 성공했으나 파일 이동 중 오류가 발생했습니다:', err);
      }
    } else {
      console.error(`빌드 중 오류가 발생했습니다. (Exit code: ${code})`);
    }
    process.exit(code);
  });
});
