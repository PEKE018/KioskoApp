# 🏪 KioskoApp

Sistema de gestión de stock y ventas diseñado específicamente para kioscos. Ultra rápido, simple y eficiente.

![Versión](https://img.shields.io/badge/versión-1.0.0-blue)
![Stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20PostgreSQL-green)

## ✨ Características

- **Punto de Venta Ultra Rápido**: Escanear → Sumar → Cobrar en segundos
- **Carga de Stock por Categorías**: Pensado como trabaja el kiosquero
- **Alta Automática de Productos**: Escanea un código nuevo y créalo al instante
- **Control de Inventario en Tiempo Real**: Alertas visuales de stock bajo
- **Reportes de Ventas**: Análisis diario, semanal y mensual
- **Multi-usuario**: Roles de Administrador y Cajero
- **Modo Oscuro**: Diseñado para uso intensivo, menos fatiga visual

## 🚀 Instalación

### Requisitos Previos

1. **Node.js** (v18 o superior): https://nodejs.org/
2. **PostgreSQL** (v14 o superior): https://www.postgresql.org/download/

### Pasos de Instalación

```bash
# 1. Clonar o descargar el proyecto
cd StockApp

# 2. Instalar dependencias
npm install

# 3. Configurar base de datos
# Copiar el archivo de ejemplo y configurar
copy .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# 4. Crear la base de datos en PostgreSQL
# Abrir pgAdmin o psql y ejecutar:
# CREATE DATABASE kioskoapp;

# 5. Ejecutar migraciones
npm run db:migrate

# 6. Generar cliente Prisma
npm run db:generate

# 7. Iniciar en modo desarrollo
npm run dev

# En otra terminal:
npm run electron:dev
```

### Construcción para Producción

```bash
# Construir la aplicación
npm run build

# Empaquetar como instalador
npm run package
```

El instalador se generará en la carpeta `release/`.

## 📖 Uso

### Login

- **Usuario por defecto**: `admin`
- **Contraseña**: `admin123`
- **PIN rápido**: `0000`

### Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| F1 | Ir a Ventas (POS) |
| F2 | Cobrar venta / Ir a Carga de Stock |
| F3 | Ir a Productos |
| F4 | Buscar producto / Ir a Categorías |
| F5 | Ir a Stock |
| F12 | Cancelar venta |
| Esc | Cerrar modal / Volver |
| Enter | Confirmar acción |
| +/- | Aumentar/disminuir cantidad |

### Flujo de Trabajo Típico

#### 1. Cargar Mercadería
1. Ir a **Cargar Stock** (F2)
2. Seleccionar categoría (ej: Golosinas)
3. Escanear productos
4. Ajustar cantidad si es necesario
5. Los productos nuevos se crean automáticamente

#### 2. Vender
1. Ir a **Ventas** (F1)
2. Escanear productos o buscar con F4
3. Presionar **Cobrar** (F2)
4. Seleccionar método de pago
5. Confirmar

#### 3. Control de Stock
- El stock se descuenta automáticamente con cada venta
- Ver alertas de stock bajo en **Stock** (F5)
- Los productos críticos se muestran en rojo

## 🗂 Estructura del Proyecto

```
StockApp/
├── src/
│   ├── main/           # Proceso principal Electron
│   │   ├── database/   # Conexión PostgreSQL
│   │   └── ipc/        # Handlers IPC
│   │
│   ├── renderer/       # Aplicación React
│   │   ├── components/ # Componentes UI
│   │   ├── pages/      # Vistas principales
│   │   └── stores/     # Estado global (Zustand)
│   │
│   └── shared/         # Código compartido
│
├── prisma/
│   └── schema.prisma   # Esquema de base de datos
│
└── package.json
```

## 🔧 Configuración

### Base de Datos

Editar el archivo `.env`:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/kioskoapp"
```

### Esquema de Base de Datos

```prisma
# Entidades principales:
- User (usuarios del sistema)
- Category (categorías de productos)
- Product (productos con código de barras)
- Sale (ventas realizadas)
- SaleItem (items de cada venta)
- StockMovement (historial de movimientos)
- CashRegister (apertura/cierre de caja)
```

## 🛠 Desarrollo

```bash
# Servidor de desarrollo React
npm run dev:renderer

# Compilar Electron en modo watch
npm run dev:main

# Abrir Prisma Studio (ver base de datos)
npm run db:studio
```

## 📊 Diferencial vs. Sistemas Genéricos

| Característica | KioskoApp | Sistemas Genéricos |
|---------------|-----------|-------------------|
| Carga de stock | Por categorías, ultra rápido | Por producto, lento |
| Alta de productos | Al escanear | Formulario largo |
| Punto de venta | Optimizado para lector | Genérico |
| Curva de aprendizaje | 5 minutos | Días/Semanas |
| Recursos del sistema | Ligero | Pesado |

## 🔐 Seguridad

- Contraseñas hasheadas con bcrypt
- PIN de 4 dígitos para cambio rápido de usuario
- Logs de todos los movimientos de stock
- Permisos diferenciados Admin/Cajero

## 📝 Próximas Funcionalidades

- [ ] Impresión de tickets (impresora térmica)
- [ ] Facturación electrónica (AFIP)
- [ ] Backup automático en la nube
- [ ] Modo offline con sincronización
- [ ] App móvil para consulta de stock

## 🤝 Soporte

Para reportar bugs o solicitar funcionalidades, contactar al desarrollador.

---

**KioskoApp** - Desarrollado con ❤️ para kiosqueros
