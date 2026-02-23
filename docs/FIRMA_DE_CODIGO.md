# Guía de Firma de Código para KioskoApp

## ¿Por qué firmar el código?

Windows SmartScreen muestra advertencias cuando se intenta ejecutar aplicaciones no firmadas. Firmar el código:
- Elimina las advertencias de seguridad
- Aumenta la confianza del usuario
- Es obligatorio para algunas tiendas de aplicaciones

## Requisitos

### 1. Obtener un Certificado de Firma de Código

Opciones:
- **DigiCert** (~$500/año): https://www.digicert.com/signing/code-signing-certificates
- **Sectigo/Comodo** (~$300/año): https://sectigo.com/ssl-certificates-tls/code-signing
- **SSL.com** (~$400/año): https://www.ssl.com/certificates/code-signing/

Para pruebas, puedes crear un certificado auto-firmado (no recomendado para producción).

### 2. Configurar electron-builder

Actualizar `package.json` con la configuración de firma:

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "${env.WIN_CSC_KEY_PASSWORD}",
      "signingHashAlgorithms": ["sha256"],
      "target": "nsis"
    }
  }
}
```

### 3. Variables de Entorno

Configurar las siguientes variables de entorno antes de compilar:

```powershell
$env:WIN_CSC_LINK = "path/to/certificate.pfx"
$env:WIN_CSC_KEY_PASSWORD = "tu_password_del_certificado"
```

### 4. Compilar y Firmar

```bash
npm run package
```

El instalador se generará firmado en la carpeta `release/`.

## Certificado Auto-Firmado (Solo para Desarrollo)

⚠️ **ADVERTENCIA:** Los certificados auto-firmados no eliminarán las advertencias de SmartScreen. Solo usar para desarrollo.

```powershell
# Generar certificado auto-firmado
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=KioskoApp Dev" -CertStoreLocation Cert:\CurrentUser\My

# Exportar a PFX
$password = ConvertTo-SecureString -String "password123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath ".\dev-cert.pfx" -Password $password
```

## Verificar Firma

Después de compilar, verificar que el ejecutable está firmado:

```powershell
Get-AuthenticodeSignature ".\release\win-unpacked\KioskoApp.exe"
```

## Costos y Alternativas

| Opción | Costo | Elimina Advertencias |
|--------|-------|---------------------|
| Certificado EV (Extended Validation) | ~$500/año | ✅ Sí (inmediato) |
| Certificado Standard | ~$300/año | ⚠️ Parcialmente (necesita reputación) |
| Auto-firmado | Gratis | ❌ No |
| Sin firma | Gratis | ❌ No |

## Recomendación

Para distribución comercial, recomendamos:
1. Obtener un certificado EV (Extended Validation)
2. Este tipo de certificado elimina inmediatamente las advertencias de SmartScreen
3. Aumenta significativamente la confianza del usuario

## Recursos

- [Documentación de electron-builder](https://www.electron.build/code-signing)
- [Windows SmartScreen FAQ](https://docs.microsoft.com/en-us/windows/security/threat-protection/microsoft-defender-smartscreen/)
