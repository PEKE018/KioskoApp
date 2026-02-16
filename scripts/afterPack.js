const path = require('path');
const fs = require('fs');

exports.default = async function(context) {
  const appOutDir = context.appOutDir;
  const resourcesDir = path.join(appOutDir, 'resources');
  const unpackedDir = path.join(resourcesDir, 'app.asar.unpacked', 'node_modules');
  
  // Fuente de .prisma
  const prismaSource = path.join(__dirname, '..', 'node_modules', '.prisma');
  const prismaDest = path.join(unpackedDir, '.prisma');
  
  console.log('📦 Copiando .prisma a app.asar.unpacked...');
  console.log(`   Desde: ${prismaSource}`);
  console.log(`   Hacia: ${prismaDest}`);
  
  // Crear directorio si no existe
  if (!fs.existsSync(unpackedDir)) {
    fs.mkdirSync(unpackedDir, { recursive: true });
  }
  
  // Copiar recursivamente
  copyRecursive(prismaSource, prismaDest);
  
  console.log('✅ .prisma copiado correctamente');
};

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
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
