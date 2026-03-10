/**
 * Script para convertir icono.png a icon.ico
 * Genera múltiples resoluciones para Windows
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const toIco = require('to-ico');

const inputPath = path.join(__dirname, '..', 'icono.png');
const outputPath = path.join(__dirname, '..', 'build', 'icon.ico');

// Resoluciones necesarias para un buen icono de Windows
const sizes = [16, 24, 32, 48, 64, 128, 256];

async function convertToIco() {
  console.log('Convirtiendo icono.png a icon.ico...');
  console.log('Input:', inputPath);
  console.log('Output:', outputPath);

  // Verificar que el archivo de entrada existe
  if (!fs.existsSync(inputPath)) {
    console.error('ERROR: No se encontró icono.png en la raíz del proyecto');
    process.exit(1);
  }

  try {
    // Generar cada tamaño como buffer PNG
    const pngBuffers = await Promise.all(
      sizes.map(async (size) => {
        const buffer = await sharp(inputPath)
          .resize(size, size, { 
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
        console.log(`  ✓ Generado ${size}x${size}`);
        return buffer;
      })
    );

    // Convertir todos los buffers PNG a un único ICO
    const icoBuffer = await toIco(pngBuffers);
    
    // Asegurar que existe el directorio build
    const buildDir = path.dirname(outputPath);
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }

    // Guardar el archivo ICO
    fs.writeFileSync(outputPath, icoBuffer);
    console.log('\n✓ Icono convertido exitosamente!');
    console.log('  Guardado en:', outputPath);
    console.log('  Tamaño:', (fs.statSync(outputPath).size / 1024).toFixed(2), 'KB');

  } catch (error) {
    console.error('ERROR al convertir icono:', error.message);
    process.exit(1);
  }
}

convertToIco();
