# 🏪 KioskoApp - Arquitectura del Sistema

## Visión General

Sistema de gestión de stock y ventas **especializado para kioscos**, diseñado para máxima velocidad y mínima fricción en la operatoria diaria.

## Stack Tecnológico

| Componente | Tecnología | Justificación |
|------------|------------|---------------|
| Frontend | React 18 + TypeScript | UI reactiva, componentes reutilizables |
| Desktop | Electron | App nativa Windows, acceso a hardware |
| Backend | Node.js (en Electron main process) | Integración directa con DB |
| Base de Datos | PostgreSQL | Robustez, consultas complejas |
| ORM | Prisma | Type-safe, migraciones automáticas |
| UI Components | Tailwind CSS | Diseño rápido, consistente |
| Estado | Zustand | Ligero, simple, performante |

## Estructura de Carpetas

```
StockApp/
├── src/
│   ├── main/                    # Proceso principal Electron
│   │   ├── index.ts             # Entry point Electron
│   │   ├── database/            # Conexión y queries PostgreSQL
│   │   ├── services/            # Lógica de negocio
│   │   └── ipc/                 # Handlers IPC (comunicación con renderer)
│   │
│   ├── renderer/                # Proceso renderer (React)
│   │   ├── App.tsx
│   │   ├── components/          # Componentes reutilizables
│   │   │   ├── ui/              # Botones, inputs, modales
│   │   │   ├── pos/             # Componentes del punto de venta
│   │   │   ├── stock/           # Componentes de stock
│   │   │   └── products/        # Componentes de productos
│   │   ├── pages/               # Vistas principales
│   │   │   ├── POS.tsx          # Punto de venta
│   │   │   ├── Stock.tsx        # Control de stock
│   │   │   ├── Products.tsx     # Gestión de productos
│   │   │   ├── Categories.tsx   # Categorías
│   │   │   ├── Reports.tsx      # Reportes
│   │   │   └── Settings.tsx     # Configuración
│   │   ├── hooks/               # Custom hooks
│   │   ├── stores/              # Estado global (Zustand)
│   │   ├── services/            # Llamadas IPC al main process
│   │   └── utils/               # Utilidades
│   │
│   └── shared/                  # Código compartido
│       ├── types/               # TypeScript types
│       └── constants/           # Constantes
│
├── prisma/
│   └── schema.prisma            # Esquema de base de datos
│
├── public/                      # Assets estáticos
├── electron-builder.json        # Config de build
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Modelo de Datos

### Entidades Principales

```
┌─────────────────┐     ┌─────────────────┐
│    Category     │────<│     Product     │
├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │
│ name            │     │ barcode (único) │
│ color           │     │ name            │
│ icon            │     │ price           │
│ order           │     │ cost            │
└─────────────────┘     │ stock           │
                        │ minStock        │
                        │ unitsPerBox     │
                        │ categoryId      │
                        └─────────────────┘
                                │
                                │
┌─────────────────┐     ┌───────┴─────────┐
│      User       │     │    SaleItem     │
├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │
│ username        │     │ quantity        │
│ password (hash) │     │ unitPrice       │
│ role            │     │ productId       │
│ pin (4 dígitos) │     │ saleId          │
└─────────────────┘     └─────────────────┘
        │                       │
        │               ┌───────┴─────────┐
        └──────────────>│      Sale       │
                        ├─────────────────┤
                        │ id              │
                        │ total           │
                        │ paymentMethod   │
                        │ userId          │
                        │ createdAt       │
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  StockMovement  │     │   CashRegister  │
├─────────────────┤     ├─────────────────┤
│ id              │     │ id              │
│ type (IN/OUT)   │     │ openedAt        │
│ quantity        │     │ closedAt        │
│ reason          │     │ initialAmount   │
│ productId       │     │ finalAmount     │
│ userId          │     │ userId          │
│ createdAt       │     │ salesTotal      │
└─────────────────┘     └─────────────────┘
```

## Flujos de Usuario Optimizados

### 1. Carga de Mercadería (< 3 segundos por producto)

```
[Seleccionar Categoría] → [Escanear] → [Ingresar Cantidad] → [Enter]
         ↓                    ↓              ↓                  ↓
    1 clic/tecla         Automático      Solo números      Confirma
```

**Atajos de teclado:**
- `F1-F12`: Acceso rápido a categorías favoritas
- `+/-`: Incrementar/decrementar cantidad
- `Enter`: Confirmar y siguiente
- `Esc`: Cancelar

### 2. Venta Rápida (POS)

```
[Escanear] → [Auto-suma] → [F2: Cobrar] → [Método pago] → [Ticket]
     ↓            ↓             ↓              ↓             ↓
  Producto    Al carrito    Total listo    Efectivo/MP    Imprime
   + beep     + precio                     tarjeta        (opcional)
```

**Sin escaneo:** Búsqueda por nombre con autocompletado (3 letras mínimo)

### 3. Control de Stock

```
Vista tipo semáforo:
🔴 Crítico (stock < minStock)
🟡 Bajo (stock < minStock * 2)  
🟢 OK (stock >= minStock * 2)
```

## Principios de UX

### Menos Clics
- Acciones principales con 1 clic
- Atajos de teclado para todo
- Auto-foco inteligente en inputs

### Velocidad
- Caché local de productos frecuentes
- Pre-carga de categorías
- Debounce en búsquedas (150ms)
- Transiciones CSS mínimas

### Claridad Visual
- Tipografía grande para precios
- Colores consistentes por acción
- Iconos + texto en acciones principales
- Modo oscuro por defecto (menos fatiga)

## Seguridad

- Passwords hasheados con bcrypt
- PIN de 4 dígitos para cambio rápido de usuario
- Sesiones con timeout configurable
- Logs de todas las operaciones de stock
- Backup automático cada cierre de caja

## Consideraciones Técnicas

### Performance
- Índices en: barcode, categoryId, createdAt
- Paginación en listados (50 items default)
- Lazy loading de reportes

### Offline First (Futuro)
- SQLite como caché local
- Sincronización cuando hay conexión

### Escalabilidad
- Preparado para multi-sucursal (futuro)
- Separación clara de responsabilidades
