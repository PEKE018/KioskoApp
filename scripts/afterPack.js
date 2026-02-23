const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
  const appOutDir = context.appOutDir;
  const resourcesDir = path.join(appOutDir, 'resources');
  const appDir = path.join(resourcesDir, 'app');
  
  console.log('[afterPack] Configurando Prisma para produccion...');
  console.log('[afterPack] App dir:', appDir);
  
  // Verificar y copiar .prisma si no existe
  const prismaDestDir = path.join(appDir, 'node_modules', '.prisma');
  const prismaSourceDir = path.join(__dirname, '..', 'node_modules', '.prisma');
  
  if (!fs.existsSync(prismaDestDir)) {
    console.log('[afterPack] Copiando .prisma manualmente...');
    console.log('[afterPack] Desde:', prismaSourceDir);
    console.log('[afterPack] Hacia:', prismaDestDir);
    
    if (fs.existsSync(prismaSourceDir)) {
      copyRecursive(prismaSourceDir, prismaDestDir);
      console.log('[afterPack] .prisma copiado correctamente');
    } else {
      console.error('[afterPack] ERROR: No se encontro .prisma en node_modules del proyecto');
    }
  } else {
    console.log('[afterPack] .prisma ya existe en destino');
  }
  
  // Verificar query engine
  const clientDir = path.join(prismaDestDir, 'client');
  if (fs.existsSync(clientDir)) {
    const files = fs.readdirSync(clientDir);
    const engineFile = files.find(f => f.includes('query_engine'));
    if (engineFile) {
      console.log('[afterPack] Query engine encontrado:', engineFile);
    } else {
      console.log('[afterPack] WARN: Query engine no encontrado. Archivos:', files.join(', '));
    }
  } else {
    console.log('[afterPack] ERROR: Directorio client no existe en:', prismaDestDir);
  }
};

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}
