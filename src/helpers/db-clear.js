const fs = require('fs');
const path = require('path');

// To avoid WASM path issues in packaged Electron, we resolve the path explicitly
function getWasmPath() {
  const isPackaged = process.defaultApp !== true && !process.argv.includes('--dev');
  let wasmPath;
  if (isPackaged) {
    // In an asar archive, sql.js might have trouble if it tries to read the WASM directly using its default logic
    wasmPath = path.join(process.resourcesPath, 'app.asar', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  } else {
    wasmPath = path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  }
  return wasmPath;
}

async function clearAntigravityAuthDb(appDataPath) {
  try {
    const initSqlJs = require('sql.js');
    const wasmPath = getWasmPath();
    
    let SQL;
    try {
      SQL = await initSqlJs({ locateFile: file => wasmPath });
    } catch (e) {
      // Fallback to default
      console.log('Failed to load WASM from explicit path, trying default...', e);
      SQL = await initSqlJs();
    }
    
    // In Windows, AppData\Roaming is usually passed or we construct it
    const dbPath = path.join(appDataPath, 'Antigravity', 'User', 'globalStorage', 'state.vscdb');
    
    if (!fs.existsSync(dbPath)) {
      console.log('state.vscdb not found at', dbPath);
      return false;
    }
    
    console.log('Clearing auth keys from:', dbPath);
    const filebuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(filebuffer);
    
    db.run("DELETE FROM ItemTable WHERE key IN ('antigravityUnifiedStateSync.oauthToken', 'antigravityAuthStatus')");
    
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    console.log('Successfully cleared auth keys from state.vscdb');
    return true;
  } catch (err) {
    console.error('Error modifying state.vscdb:', err);
    return false;
  }
}

module.exports = {
  clearAntigravityAuthDb
};
