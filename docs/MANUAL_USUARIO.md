# 📖 Manual de Usuario - KioskoApp

## Guía completa para el uso del sistema de gestión de kioscos

---

## Índice

1. [Introducción](#1-introducción)
2. [Instalación](#2-instalación)
3. [Primer Inicio](#3-primer-inicio)
4. [Punto de Venta (POS)](#4-punto-de-venta-pos)
5. [Gestión de Productos](#5-gestión-de-productos)
6. [Control de Stock](#6-control-de-stock)
7. [Categorías](#7-categorías)
8. [Clientes y Fiado](#8-clientes-y-fiado)
9. [Caja Registradora](#9-caja-registradora)
10. [Reportes](#10-reportes)
11. [Usuarios](#11-usuarios)
12. [Configuración](#12-configuración)
13. [Backup y Restauración](#13-backup-y-restauración)
14. [Licencias](#14-licencias)
15. [Atajos de Teclado](#15-atajos-de-teclado)
16. [Solución de Problemas](#16-solución-de-problemas)
17. [Soporte](#17-soporte)

---

## 1. Introducción

KioskoApp es un sistema de gestión diseñado específicamente para kioscos. Permite:
- Realizar ventas rápidas con lector de código de barras
- Controlar el inventario de productos
- Gestionar clientes y ventas fiadas
- Generar reportes de ventas y ganancias
- Administrar múltiples usuarios con diferentes roles

### Requisitos mínimos del sistema
- Windows 10 o superior
- 4 GB de RAM
- 500 MB de espacio en disco
- Resolución mínima: 1024 x 700 píxeles
- Lector de código de barras (opcional pero recomendado)

---

## 2. Instalación

### Paso 1: Ejecutar el instalador
1. Descargue el archivo `KioskoApp Setup X.X.X.exe`
2. Doble clic en el instalador
3. Siga las instrucciones en pantalla
4. Elija la carpeta de instalación (recomendado: dejar la predeterminada)

### Paso 2: Primer inicio
1. El programa creará un acceso directo en el escritorio
2. Doble clic en "KioskoApp" para iniciar
3. La primera vez puede tardar unos segundos mientras configura la base de datos

---

## 3. Primer Inicio

### Credenciales iniciales
Al iniciar por primera vez, use:
- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **PIN rápido:** `0000`

⚠️ **IMPORTANTE:** Cambie la contraseña inmediatamente después del primer inicio por seguridad.

### Cambiar contraseña
1. Vaya a **Configuración** (ícono de engranaje)
2. Seleccione la pestaña **Seguridad**
3. Ingrese su contraseña actual
4. Ingrese y confirme la nueva contraseña
5. Haga clic en **Guardar**

---

## 4. Punto de Venta (POS)

### Realizar una venta

1. **Abrir caja** (si no está abierta)
   - El sistema le pedirá el monto inicial de caja
   
2. **Agregar productos**
   - Escanee el código de barras del producto
   - O busque el producto por nombre (F4)
   - El producto se agrega automáticamente al carrito

3. **Ajustar cantidades**
   - Use los botones `+` y `-` junto a cada producto
   - O presione las teclas `+` y `-` del teclado numérico

4. **Aplicar descuento** (opcional)
   - Ingrese el monto de descuento en el campo correspondiente

5. **Cobrar**
   - Presione **F2** o el botón **Cobrar**
   - Seleccione el método de pago:
     - 💵 Efectivo
     - 💳 Débito
     - 💳 Crédito
     - 📱 MercadoPago
     - 🔄 Transferencia
     - 📋 Fiado (requiere seleccionar cliente)
   - Para efectivo: ingrese el monto recibido para ver el vuelto
   - Confirme la venta

### Producto no encontrado
Si escanea un código nuevo:
1. El sistema le preguntará si desea crear el producto
2. Complete los datos: nombre, precio, categoría
3. El producto se agrega automáticamente y queda registrado

### Cancelar venta
- Presione **F12** o el botón de cancelar
- Se borrarán todos los productos del carrito

---

## 5. Gestión de Productos

### Acceder
- Presione **F3** o seleccione **Productos** en el menú lateral

### Crear producto
1. Clic en **Nuevo Producto**
2. Complete los campos:
   - **Código de barras:** escanee o ingrese manualmente
   - **Nombre:** nombre descriptivo del producto
   - **Precio de venta:** precio al público
   - **Costo:** precio al que usted compra (para calcular ganancias)
   - **Stock actual:** cantidad disponible
   - **Stock mínimo:** cantidad mínima (alerta cuando baje)
   - **Categoría:** para organizar los productos
3. Clic en **Guardar**

### Editar producto
1. Busque el producto en la lista
2. Clic en el ícono de editar (lápiz)
3. Modifique los campos necesarios
4. Clic en **Guardar**

### Buscar productos
- Use la barra de búsqueda para filtrar por nombre o código
- Use los filtros de categoría para ver solo una categoría

### Productos con stock bajo
- Los productos con stock menor al mínimo se muestran con un indicador rojo
- Puede ver todos los productos con stock bajo en la vista dedicada

---

## 6. Control de Stock

### Acceder
- Presione **F5** o seleccione **Stock** en el menú lateral

### Cargar mercadería
1. Seleccione la categoría del producto
2. Escanee el código de barras
3. Ajuste la cantidad si es necesario
4. El stock se incrementa automáticamente

### Ajustar stock manualmente
1. Busque el producto
2. Clic en **Ajustar Stock**
3. Ingrese la nueva cantidad
4. Seleccione el motivo del ajuste:
   - Conteo físico
   - Pérdida/Rotura
   - Devolución
   - Otro
5. Confirme el ajuste

### Ver historial de movimientos
- Cada producto tiene un registro de todos los movimientos de stock
- Incluye: fecha, tipo, cantidad, usuario responsable

---

## 7. Categorías

### Acceder
- Presione **F4** o seleccione **Categorías** en el menú lateral

### Crear categoría
1. Clic en **Nueva Categoría**
2. Ingrese el nombre (ej: "Bebidas", "Golosinas")
3. Seleccione un color para identificarla
4. Clic en **Guardar**

### Ordenar categorías
- Arrastre las categorías para cambiar el orden
- El orden se usa en el menú de carga de stock

---

## 8. Clientes y Fiado

### Crear cliente
1. Vaya a **Clientes** en el menú
2. Clic en **Nuevo Cliente**
3. Complete:
   - Nombre completo
   - Teléfono (opcional)
   - Notas (opcional)
4. Guardar

### Venta fiada
1. En el POS, seleccione **Fiado** como método de pago
2. Busque o seleccione el cliente
3. La venta se registra como deuda del cliente

### Registrar pago
1. Vaya a **Clientes**
2. Seleccione el cliente con deuda
3. Clic en **Registrar Pago**
4. Ingrese el monto pagado
5. El saldo se actualiza automáticamente

### Ver deudas
- En la lista de clientes, verá el saldo de cada uno
- Los clientes con deuda se muestran destacados

---

## 9. Caja Registradora

### Abrir caja
1. Al entrar al POS, el sistema detecta si hay caja abierta
2. Si no hay caja, ingrese el monto inicial
3. Clic en **Abrir Caja**

### Cerrar caja
1. Clic en **Cerrar Caja** en el POS
2. Cuente el dinero en caja
3. Ingrese el monto final
4. El sistema calculará:
   - Total de ventas del día
   - Diferencia (faltante o sobrante)
5. Confirme el cierre

### Historial de cajas
- Vea todos los cierres de caja anteriores
- Incluye: fecha, usuario, monto inicial, ventas, monto final, diferencia

---

## 10. Reportes

### Acceder
- Seleccione **Reportes** en el menú lateral

### Tipos de reportes

#### Ventas por día
- Gráfico con las ventas diarias
- Seleccione el rango de fechas

#### Productos más vendidos
- Lista de los productos con más ventas
- Útil para saber qué reponer

#### Reporte de ganancias
- Muestra:
  - Total de ventas
  - Total de costos
  - Ganancia bruta
  - Margen de ganancia

#### Ventas por categoría
- Desglose de ventas por cada categoría

---

## 11. Usuarios

### Roles
- **Administrador:** acceso completo a todas las funciones
- **Cajero:** solo puede usar el POS y funciones básicas

### Crear usuario
1. Vaya a **Usuarios** (solo administradores)
2. Clic en **Nuevo Usuario**
3. Complete:
   - Nombre de usuario
   - Contraseña
   - PIN (4 dígitos para acceso rápido)
   - Rol
4. Guardar

### Cambio rápido de usuario
- Use el PIN de 4 dígitos para cambiar rápidamente entre usuarios
- Útil cuando hay varios turnos

---

## 12. Configuración

### Datos del negocio
- Nombre del kiosko
- Dirección
- Teléfono
- CUIT

### Tickets
- Encabezado del ticket
- Pie del ticket

### Recargos por transferencia
- Porcentaje de recargo para pagos con transferencia
- Porcentaje especial para cigarrillos

---

## 13. Backup y Restauración

### Crear backup manual
1. Vaya a **Configuración**
2. Seleccione **Base de Datos**
3. Clic en **Crear Backup**

### Exportar backup
- Use **Exportar Backup** para guardar una copia en una ubicación específica (USB, etc.)

### Restaurar backup
1. Clic en **Importar Backup**
2. Seleccione el archivo de backup
3. Confirme la restauración

⚠️ **Nota:** Se creará automáticamente un backup de seguridad antes de restaurar.

### Backup automático
- El sistema crea backups automáticos al cerrar la aplicación
- Se mantienen los últimos 10 backups

---

## 14. Licencias

### Período de prueba
- La aplicación incluye 15 días de prueba gratuita
- Durante este período, todas las funciones están disponibles

### Activar licencia
1. Vaya a **Configuración** > **Licencia**
2. Ingrese su clave de licencia
3. Clic en **Activar**

### Tipos de licencia
- **Basic:** POS, stock, clientes, backup
- **Pro:** Todo lo anterior + reportes, multi-usuario, personalización
- **Enterprise:** Todo + múltiples sucursales, backup en la nube, API

---

## 15. Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| **F1** | Ir a Ventas (POS) |
| **F2** | Cobrar venta / Ir a Stock |
| **F3** | Ir a Productos |
| **F4** | Buscar producto / Ir a Categorías |
| **F5** | Ir a Stock |
| **F12** | Cancelar venta |
| **Esc** | Cerrar modal / Volver |
| **Enter** | Confirmar acción |
| **+** | Aumentar cantidad del ítem seleccionado |
| **-** | Disminuir cantidad del ítem seleccionado |

---

## 16. Solución de Problemas

### La aplicación no inicia
1. Verifique que no haya otra instancia ejecutándose
2. Reinicie el equipo
3. Si persiste, reinstale la aplicación

### El escáner no funciona
1. Verifique que el escáner esté configurado en modo "teclado"
2. Asegúrese de que el cursor esté en el campo de escaneo
3. Pruebe el escáner en un bloc de notas

### La base de datos está corrupta
1. Restaure desde un backup reciente
2. Los backups están en la carpeta de datos de la aplicación

### Olvidé la contraseña de administrador
1. Contacte al soporte técnico
2. Se le proporcionará un procedimiento de recuperación

### La aplicación está lenta
1. Cierre otras aplicaciones
2. Verifique el espacio en disco
3. Reinicie la aplicación

---

## 17. Soporte

### Contacto
- **Email:** soporte@kioskoapp.com
- **Teléfono:** (011) XXXX-XXXX
- **WhatsApp:** +54 9 11 XXXX-XXXX

### Horario de atención
- Lunes a Viernes: 9:00 a 18:00
- Sábados: 9:00 a 13:00

### Información para soporte
Cuando contacte al soporte, tenga a mano:
1. ID de máquina (Configuración > Licencia > Ver ID)
2. Versión de la aplicación (Configuración > Acerca de)
3. Descripción detallada del problema
4. Captura de pantalla si es posible

---

## Actualizaciones

La aplicación busca actualizaciones automáticamente. Cuando hay una disponible:
1. Se le notificará con un mensaje
2. Puede elegir descargar e instalar
3. La actualización se aplica al reiniciar la aplicación

---

**© 2024 KioskoApp - Todos los derechos reservados**
