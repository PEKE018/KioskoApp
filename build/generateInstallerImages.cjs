// Script para generar imágenes del instalador NSIS
// Ejecutar con: node build/generateInstallerImages.cjs

const fs = require('fs');
const path = require('path');

// Colores del tema KioskoApp
const COLORS = {
  primary: '#10b981',      // Verde esmeralda
  dark: '#1a1a2e',         // Fondo oscuro
  darker: '#0f0f1a',       // Más oscuro
  text: '#ffffff',         // Texto blanco
  accent: '#3b82f6'        // Azul acento
};

// Crear BMP de 24 bits simple
function createBMP(width, height, r, g, b) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  
  const buffer = Buffer.alloc(fileSize);
  
  // BMP Header
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(0, 6);
  buffer.writeUInt32LE(54, 10);
  
  // DIB Header
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);
  buffer.writeUInt32LE(0, 46);
  buffer.writeUInt32LE(0, 50);
  
  // Pixel data (de abajo hacia arriba)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = 54 + y * rowSize + x * 3;
      
      // Crear gradiente vertical
      const gradientFactor = y / height;
      const darkR = Math.floor(26 * (1 - gradientFactor * 0.5));
      const darkG = Math.floor(26 * (1 - gradientFactor * 0.5));
      const darkB = Math.floor(46 * (1 - gradientFactor * 0.5));
      
      // Añadir línea de acento verde en el lado izquierdo para sidebar
      if (width === 164 && x < 4) {
        buffer.writeUInt8(129, offset);     // B
        buffer.writeUInt8(185, offset + 1); // G
        buffer.writeUInt8(16, offset + 2);  // R (#10b981)
      } else {
        buffer.writeUInt8(darkB, offset);     // B
        buffer.writeUInt8(darkG, offset + 1); // G
        buffer.writeUInt8(darkR, offset + 2); // R
      }
    }
  }
  
  return buffer;
}

// Crear header (150x57) - Barra superior con gradiente
function createHeader() {
  const width = 150;
  const height = 57;
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  
  const buffer = Buffer.alloc(fileSize);
  
  // BMP Header
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(0, 6);
  buffer.writeUInt32LE(54, 10);
  
  // DIB Header
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);
  buffer.writeUInt32LE(0, 46);
  buffer.writeUInt32LE(0, 50);
  
  // Pixel data con gradiente horizontal verde a azul
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = 54 + y * rowSize + x * 3;
      const factor = x / width;
      
      // Gradiente de verde (#10b981) a azul (#3b82f6)
      const r = Math.floor(16 + (59 - 16) * factor);
      const g = Math.floor(185 + (130 - 185) * factor);
      const b = Math.floor(129 + (246 - 129) * factor);
      
      buffer.writeUInt8(b, offset);
      buffer.writeUInt8(g, offset + 1);
      buffer.writeUInt8(r, offset + 2);
    }
  }
  
  return buffer;
}

// Crear sidebar (164x314) - Panel lateral con diseño moderno
function createSidebar() {
  const width = 164;
  const height = 314;
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  
  const buffer = Buffer.alloc(fileSize);
  
  // BMP Header
  buffer.write('BM', 0);
  buffer.writeUInt32LE(fileSize, 2);
  buffer.writeUInt32LE(0, 6);
  buffer.writeUInt32LE(54, 10);
  
  // DIB Header
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(width, 18);
  buffer.writeInt32LE(height, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(0, 30);
  buffer.writeUInt32LE(pixelArraySize, 34);
  buffer.writeInt32LE(2835, 38);
  buffer.writeInt32LE(2835, 42);
  buffer.writeUInt32LE(0, 46);
  buffer.writeUInt32LE(0, 50);
  
  // Pixel data - diseño moderno con gradiente y franja de acento
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = 54 + y * rowSize + x * 3;
      const yFactor = (height - y) / height; // Invertido porque BMP es de abajo hacia arriba
      
      // Fondo con gradiente sutil
      let r = Math.floor(26 + 10 * yFactor);
      let g = Math.floor(26 + 10 * yFactor);
      let b = Math.floor(46 + 15 * yFactor);
      
      // Franja verde en el lado izquierdo (acento)
      if (x < 5) {
        r = 16;
        g = 185;
        b = 129;
      }
      
      // Patrón decorativo - líneas sutiles
      if (y % 50 === 0 && y > 0 && y < height - 20 && x > 20 && x < width - 20) {
        r = Math.min(255, r + 15);
        g = Math.min(255, g + 15);
        b = Math.min(255, b + 20);
      }
      
      buffer.writeUInt8(b, offset);
      buffer.writeUInt8(g, offset + 1);
      buffer.writeUInt8(r, offset + 2);
    }
  }
  
  return buffer;
}

// Generar archivos
const buildDir = path.join(__dirname);

console.log('Generando imágenes del instalador...');

// Header
const headerBMP = createHeader();
fs.writeFileSync(path.join(buildDir, 'installerHeader.bmp'), headerBMP);
console.log('✓ installerHeader.bmp (150x57)');

// Sidebar
const sidebarBMP = createSidebar();
fs.writeFileSync(path.join(buildDir, 'installerSidebar.bmp'), sidebarBMP);
console.log('✓ installerSidebar.bmp (164x314)');

// Copiar icono si existe
const logoPath = path.join(__dirname, '..', 'logo.png');
const iconPath = path.join(__dirname, '..', 'release', '.icon-ico', 'icon.ico');
const destIconPath = path.join(buildDir, 'icon.ico');

if (fs.existsSync(iconPath)) {
  fs.copyFileSync(iconPath, destIconPath);
  console.log('✓ icon.ico (copiado desde release)');
} else {
  console.log('⚠ No se encontró icon.ico en release/.icon-ico/');
}

console.log('\n✅ Imágenes del instalador generadas en:', buildDir);
