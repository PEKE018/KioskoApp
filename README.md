# 🏪 StockPOS

> **Vendé más rápido. Controlá tu stock. Cerrá caja sin errores.**

Sistema de gestión completo para comercios minoristas: punto de venta, stock, caja registradora, fiado de clientes e impresión de tickets — todo en una sola app, sin internet, sin cuotas.

![Versión](https://img.shields.io/badge/versión-2.5.0-blue)
![Plataforma](https://img.shields.io/badge/plataforma-Windows-lightgrey?logo=windows)
![Stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TypeScript-61dafb?logo=react)
![DB](https://img.shields.io/badge/base%20de%20datos-SQLite-003B57?logo=sqlite)
![Licencia](https://img.shields.io/badge/licencia-privada-red)

---

## 📋 Tabla de contenidos

- [¿Qué es StockPOS?](#-qué-es-stockpos)
- [Público objetivo](#-público-objetivo)
- [Módulos del sistema](#-módulos-del-sistema)
- [Funcionalidades completas](#-funcionalidades-completas)
- [Capturas de pantalla](#-capturas-de-pantalla)
- [Características técnicas](#-características-técnicas)
- [Instalación y uso](#-instalación-y-uso)
- [Atajos de teclado](#-atajos-de-teclado)
- [Licencia y activación](#-licencia-y-activación)

---

## 🎯 ¿Qué es StockPOS?

**StockPOS** es una aplicación de escritorio para Windows diseñada para el comercio minorista argentino. Centraliza en una sola pantalla todas las operaciones del negocio: ventas con código de barras, control de stock, apertura y cierre de caja, sistema de fiado para clientes y reportes de ventas.

Funciona **100% offline** — todos los datos se guardan localmente con backup automático. No requiere internet para operar, no cobra cuotas mensuales y se instala una sola vez.

---

## 🏪 Público objetivo

| Comercio | Compatible |
|----------|:----------:|
| Kioscos y almacenes | ✅ |
| Verdulerías y fruterías | ✅ |
| Carnicerías y panaderías | ✅ |
| Ferreterías y librerías | ✅ |
| Farmacias y perfumerías | ✅ |
| Bares y restaurantes | ✅ |
| Cualquier comercio minorista | ✅ |

---

## 📦 Módulos del sistema

| N° | Módulo | Descripción |
|----|--------|-------------|
| 1 | **Punto de Venta (POS)** | Venta con código de barras, búsqueda, carrito, descuentos |
| 2 | **Caja Registradora** | Apertura/cierre de turno, diferencia automática, historial por cajero |
| 3 | **Control de Stock** | Inventario en tiempo real, movimientos, alertas de stock mínimo |
| 4 | **Productos** | CRUD completo, combos/promociones, precio de costo |
| 5 | **Categorías** | Organización visual con colores y reordenamiento |
| 6 | **Clientes / Fiado** | Crédito a clientes, historial de deuda y registro de pagos |
| 7 | **Reportes** | Ventas diarias, productos más vendidos, por cajero, por categoría |
| 8 | **Impresión de Tickets** | Recibo al cliente y comanda para cocina/barra |
| 9 | **Usuarios** | Alta/baja/edición de empleados, roles, PIN de acceso rápido |
| 10 | **Configuración** | Datos del negocio, impresora, apariencia, sesión |
| 11 | **Backup** | Copias automáticas y manuales, exportar e importar |
| 12 | **Actualizaciones** | Sistema de actualización automática integrado |
| 13 | **Licencias** | Trial de 15 días gratuito, activación por clave de máquina |

---

## ✅ Funcionalidades completas

| Función | Disponible | Descripción |
|---------|:----------:|-------------|
| Venta con código de barras | ✅ | Lectura instantánea con cualquier lector USB |
| Búsqueda de productos por nombre | ✅ | Búsqueda en tiempo real desde el POS |
| Pago en efectivo con vuelto | ✅ | Calcula el vuelto automáticamente |
| Pago con débito / crédito | ✅ | Registro del método de pago |
| Pago con transferencia + recargo | ✅ | Porcentaje configurable por tipo de producto |
| Pago mixto (2 métodos) | ✅ | División exacta entre dos métodos de pago |
| Sistema de fiado (crédito) | ✅ | Deuda por cliente con historial y pagos |
| Control de stock en tiempo real | ✅ | Se descuenta automáticamente en cada venta |
| Alertas de stock mínimo | ✅ | Configurable individualmente por producto |
| Combos / Promociones | ✅ | Descuenta stock de los componentes automáticamente |
| Historial de movimientos de stock | ✅ | Cada entrada y salida queda registrada con usuario y fecha |
| Apertura y cierre de caja | ✅ | Con monto inicial, final y diferencia calculada |
| Historial de cierres de caja | ✅ | Desglose por método de pago y por cajero |
| Caja separada por rubro | ✅ | Productos con caja independiente configurable |
| Múltiples cajeros / usuarios | ✅ | Cada venta queda asociada al cajero |
| Roles (Admin / Cajero) | ✅ | Permisos diferenciados por rol |
| PIN de acceso rápido | ✅ | 4 dígitos para cambio rápido de turno |
| Impresión de ticket al cliente | ✅ | Impresora térmica 58mm o 80mm |
| Impresión de comanda (barra/cocina) | ✅ | Formato simplificado con identificador de mesa |
| Logo del negocio en ticket | ✅ | Imagen PNG/JPG cargada desde configuración |
| Datos del negocio en ticket | ✅ | Nombre, dirección, teléfono, encabezado y pie |
| Reportes de ventas diarias | ✅ | Total, cantidad y desglose por método de pago |
| Reporte de productos más vendidos | ✅ | Top N con filtro de rango de fechas |
| Reporte por cajero / turno | ✅ | Performance individual por empleado |
| Reporte por categoría | ✅ | Ventas agrupadas por categoría |
| Backup automático | ✅ | Se ejecuta al iniciar la aplicación |
| Backup manual | ✅ | Desde configuración en cualquier momento |
| Exportar / Importar backup | ✅ | Copiar a USB o restaurar desde archivo |
| Actualizaciones automáticas | ✅ | Descarga e instala nuevas versiones sin reinstalar |
| Modo fullscreen en POS | ✅ | Toda la pantalla disponible para la caja |
| Atajos de teclado completos | ✅ | Manejo completo sin mouse |
| Reconocimiento de voz | ✅ | Búsqueda de productos por voz |
| Modo Bar / Restaurante | ✅ | Identificador de mesa en comanda |
| Creación de producto desde el POS | ✅ | Si el código no existe, se crea al instante |
| Modo oscuro / claro / automático | ✅ | Configurable desde ajustes |
| Color de acento personalizable | ✅ | Personalización visual del sistema |
| Funciona sin internet | ✅ | 100% offline, datos guardados en la PC |
| Trial gratuito 15 días | ✅ | Sin tarjeta, sin datos, sin compromiso |

---

## ⌨️ Atajos de teclado

| Tecla | Acción |
|-------|--------|
| `F2` | Abrir modal de pago |
| `F4` | Buscar producto |
| `F11` | Pantalla completa |
| `F12` | Limpiar carrito |
| `F1` | Panel de atajos |
| `↑` `↓` | Navegar en listas y modales |
| `←` `→` | Cambiar método de pago |
| `Enter` | Confirmar selección |
| `Esc` | Cerrar modal / cancelar |
| `+` / `-` | Aumentar / reducir cantidad del ítem seleccionado |
| `Supr` | Eliminar ítem seleccionado del carrito |

---

## 🛠 Características técnicas

| Componente | Tecnología |
|-----------|-----------|
| Plataforma | Windows (escritorio nativo) |
| Framework | Electron 28+ |
| UI | React 18 + TypeScript |
| Estilos | Tailwind CSS |
| Base de datos | SQLite (Prisma ORM) |
| Estado global | Zustand |
| Build tool | Vite |
| Empaquetado | electron-builder |
| Actualización | electron-updater |
| Internacionalización | i18next (ES-AR) |

---

## 🚀 Instalación y uso

### Para usuarios finales

1. Descargá el instalador desde la sección [Releases](../../releases)
2. Ejecutá `StockPOS Setup x.x.x.exe`
3. Seguí el asistente de configuración inicial
4. Ingresá con las credenciales iniciales (se muestran al finalizar la instalación)

> El sistema incluye **15 días de prueba gratuita** sin necesidad de registrarse.

### Para desarrollo

```bash
# Clonar el repositorio
git clone <repo-url>
cd StockApp/apps/kiosco

# Instalar dependencias
npm install

# Generar cliente Prisma
npm run db:generate

# Iniciar en modo desarrollo
npm run dev

# Compilar para producción
npm run package
```

---

## 🔑 Licencia y activación

El sistema incluye un **período de prueba gratuito de 15 días** con todas las funciones disponibles.

Para activar una licencia permanente se requiere la **clave de máquina** (generada automáticamente en `Configuración → Licencia`). La licencia queda vinculada al hardware del equipo.

| Tipo | Incluye |
|------|---------|
| **Trial** | POS, Stock, Clientes — 15 días |
| **Básica** | Todo el trial + Backup, Reportes, Multiusuario |
| **Pro** | Todo lo anterior + Reportes avanzados y personalización |
| **Enterprise** | Todo Pro + Multi-sucursal, API |

---

## 💬 Contacto y soporte

¿Querés instalar StockPOS en tu negocio o tenés alguna consulta?

📩 Escribinos por [WhatsApp](#) o por [email](#)

---

<div align="center">

**StockPOS** — Hecho para comerciantes argentinos 🇦🇷

*Sin internet. Sin cuotas. Tuyo de por vida.*

</div>
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

Al primer inicio, las credenciales se generan automáticamente y se guardan en un archivo:
- **Windows:** `%APPDATA%/KioskoApp/CREDENCIALES_INICIALES.txt`
- **Desarrollo:** En la raíz del proyecto

⚠️ **IMPORTANTE:** Cambie las credenciales inmediatamente después del primer inicio.

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
