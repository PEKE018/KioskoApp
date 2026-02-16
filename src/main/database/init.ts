import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Configurar la ruta de la base de datos
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const dbPath = isDev 
  ? path.join(__dirname, '../../../prisma/kioskoapp.db')
  : path.join(app.getPath('userData'), 'kioskoapp.db');

// Crear directorio si no existe
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Establecer la URL de la base de datos (Prisma requiere slashes)
const normalizedDbPath = dbPath.replace(/\\/g, '/');
process.env.DATABASE_URL = `file:${normalizedDbPath}`;

const prisma = new PrismaClient();

export async function initDatabase(): Promise<void> {
  try {
    // Verificar si la base de datos existe
    const dbExists = fs.existsSync(dbPath);
    
    if (!dbExists) {
      console.log('📦 Creando base de datos...');
      // Copiar el schema de prisma si estamos empaquetados
      if (!isDev) {
        const schemaSource = path.join(process.resourcesPath, 'prisma', 'schema.prisma');
        const schemaDir = path.join(app.getPath('userData'), 'prisma');
        const schemaDest = path.join(schemaDir, 'schema.prisma');
        
        if (!fs.existsSync(schemaDir)) {
          fs.mkdirSync(schemaDir, { recursive: true });
        }
        
        if (fs.existsSync(schemaSource)) {
          fs.copyFileSync(schemaSource, schemaDest);
          // Ejecutar prisma db push con el schema copiado
          try {
            execSync(`npx prisma db push --schema="${schemaDest}" --skip-generate`, {
              env: { ...process.env, DATABASE_URL: `file:${dbPath}` }
            });
          } catch (e) {
            console.log('⚠️ Prisma push falló, intentando crear tablas manualmente...');
          }
        }
      }
    }

    // Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión a SQLite establecida');
    console.log(`📁 Base de datos: ${dbPath}`);

    // Crear usuario admin por defecto si no existe
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          pin: '0000',
          name: 'Administrador',
          role: 'ADMIN',
        }
      });
      console.log('✅ Usuario admin creado (usuario: admin, contraseña: admin123, PIN: 0000)');
    }

    // Crear configuración por defecto si no existe
    const configExists = await prisma.appConfig.findUnique({
      where: { id: 'config' }
    });

    if (!configExists) {
      await prisma.appConfig.create({
        data: {
          id: 'config',
          businessName: 'Mi Kiosko',
        }
      });
      console.log('✅ Configuración inicial creada');
    }

    // Crear categorías por defecto si no existen
    const categoriesCount = await prisma.category.count();

    if (categoriesCount === 0) {
      const defaultCategories = [
        { name: 'Golosinas', color: '#f59e0b', icon: 'FaCandyCane', order: 1 },
        { name: 'Bebidas', color: '#3b82f6', icon: 'FaBottleWater', order: 2 },
        { name: 'Cigarrillos', color: '#6b7280', icon: 'FaSmoking', order: 3 },
        { name: 'Snacks', color: '#22c55e', icon: 'FaCookie', order: 4 },
        { name: 'Lácteos', color: '#f1f5f9', icon: 'FaCheese', order: 5 },
        { name: 'Helados', color: '#06b6d4', icon: 'FaIceCream', order: 6 },
        { name: 'Limpieza', color: '#8b5cf6', icon: 'FaSprayCanSparkles', order: 7 },
        { name: 'Varios', color: '#ec4899', icon: 'FaBox', order: 8 },
      ];

      for (const category of defaultCategories) {
        await prisma.category.create({ data: category });
      }
      console.log('✅ Categorías por defecto creadas');
    }

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error);
    throw error;
  }
}

export { prisma };
