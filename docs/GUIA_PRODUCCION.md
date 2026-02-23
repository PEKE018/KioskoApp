# Guía de Producción - KioskoApp

## Checklist para Release a Producción

### ✅ Antes de Distribuir

- [ ] **Tests pasando**: `npm run test:run`
- [ ] **Build exitoso**: `npm run build`
- [ ] **Sin errores de TypeScript**
- [ ] **Versión actualizada** en `package.json`

### ✅ Seguridad

- [ ] Las credenciales por defecto se generan aleatoriamente
- [ ] Logger configurado (sin console.log en producción)
- [ ] Contraseñas hasheadas con bcrypt

### ✅ Backup

- [ ] Sistema de backup automático funcionando
- [ ] Backups se guardan en `%APPDATA%/KioskoApp/backups`
- [ ] Mantiene los últimos 10 backups

### ✅ Licencias

- [ ] Sistema de licencias configurado
- [ ] Período de prueba: 15 días
- [ ] Generador de licencias disponible

### ✅ Documentación

- [ ] Manual de usuario completo: `docs/MANUAL_USUARIO.md`
- [ ] Guía de firma de código: `docs/FIRMA_DE_CODIGO.md`
- [ ] Arquitectura documentada: `ARCHITECTURE.md`

---

## Proceso de Release

### 1. Actualizar Versión

```json
// package.json
{
  "version": "1.1.0"
}
```

Seguir [SemVer](https://semver.org/):
- **MAJOR** (1.0.0 → 2.0.0): Cambios incompatibles
- **MINOR** (1.0.0 → 1.1.0): Nuevas funcionalidades
- **PATCH** (1.0.0 → 1.0.1): Corrección de bugs

### 2. Compilar

```bash
npm run build
```

### 3. Empaquetar Instalador

```bash
npm run package
```

El instalador se genera en `release/KioskoApp Setup X.X.X.exe`

### 4. Probar Instalador

1. Instalar en una máquina limpia (VM o PC de prueba)
2. Verificar que la app inicia correctamente
3. Verificar credenciales iniciales en el archivo generado
4. Probar funcionalidades principales:
   - Login
   - POS (agregar productos, cobrar)
   - Stock
   - Backup/Restore
   - Cierre de caja

### 5. Firmar (Opcional pero Recomendado)

Ver `docs/FIRMA_DE_CODIGO.md` para instrucciones detalladas.

---

## Distribución

### Opción 1: USB/Pendrive

1. Copiar `KioskoApp Setup X.X.X.exe` al pendrive
2. Agregar archivo `LEAME.txt` con instrucciones básicas
3. Opcional: Agregar el manual de usuario en PDF

### Opción 2: Descarga Web

1. Subir instalador a servidor/hosting
2. Configurar electron-updater para actualizaciones automáticas
3. Crear landing page con link de descarga

### Opción 3: GitHub Releases

1. Crear tag de versión: `git tag v1.0.0`
2. Push del tag: `git push origin v1.0.0`
3. Crear Release en GitHub con el instalador adjunto

---

## Actualizaciones Automáticas

### Configurar Servidor de Actualizaciones

#### GitHub Releases

En `src/main/services/autoUpdater.ts`:

```typescript
setupGitHubReleases('tu-usuario', 'kiosko-app');
```

#### Servidor Propio

```typescript
setUpdateFeedURL('https://tu-servidor.com/updates');
```

### Estructura de Archivos en Servidor

```
/updates/
  ├── latest.yml
  └── KioskoApp Setup 1.1.0.exe
```

Contenido de `latest.yml`:
```yaml
version: 1.1.0
files:
  - url: KioskoApp Setup 1.1.0.exe
    sha512: <hash del archivo>
    size: <tamaño en bytes>
path: KioskoApp Setup 1.1.0.exe
sha512: <hash del archivo>
releaseDate: '2024-01-15T10:00:00.000Z'
```

---

## Licencias - Generación

### Generar Licencia (Node.js)

```javascript
const { generateLicenseKey } = require('./src/main/ipc/licenseHandlers');

// Licencia básica para 1 año
const key = generateLicenseKey(
  'cliente@email.com',
  'basic',
  'ANY',  // ANY = se vincula al primer equipo que la active
  365     // días
);

console.log(key);
```

### Tipos de Licencia

| Tipo | Características | Uso Recomendado |
|------|-----------------|-----------------|
| trial | POS, Stock, Clientes | Evaluación |
| basic | + Backup | Kiosko pequeño |
| pro | + Reportes, Multi-usuario | Kiosko mediano |
| enterprise | + Multi-sucursal, API | Cadena de kioscos |

---

## Soporte Post-Venta

### Información Útil para Diagnóstico

El cliente puede proporcionar:
1. **ID de Máquina**: Configuración > Licencia > Ver ID
2. **Versión**: Configuración > Acerca de
3. **Logs**: `%APPDATA%/KioskoApp/logs/`

### Problemas Comunes

| Problema | Solución |
|----------|----------|
| No inicia | Verificar que no haya otra instancia corriendo |
| Base de datos corrupta | Restaurar desde backup |
| Licencia no válida | Verificar machine ID, generar nueva licencia |
| Escáner no funciona | Configurar escáner en modo teclado |

---

## Registro de Cambios

Mantener un archivo `CHANGELOG.md` con los cambios de cada versión:

```markdown
## [1.1.0] - 2024-01-15

### Agregado
- Sistema de backup automático
- Licencias
- Manual de usuario

### Corregido
- Error en cálculo de vuelto

### Cambiado
- Credenciales ahora se generan aleatoriamente
```

---

## Métricas de Éxito

Después de la venta, considerar:
- Número de instalaciones activas
- Tickets de soporte por versión
- Uso de funcionalidades
- Feedback de usuarios

---

**¡El proyecto está listo para producción!**
