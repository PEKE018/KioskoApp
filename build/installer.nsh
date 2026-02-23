; KioskoApp Custom NSIS Installer Script
; Solo textos personalizados - las funciones las maneja electron-builder

; =============================================
; INCLUDES NECESARIOS
; =============================================
!include "LogicLib.nsh"

; =============================================
; TEXTOS PERSONALIZADOS EN ESPAÑOL
; =============================================

; Textos de bienvenida
!define MUI_WELCOMEPAGE_TITLE "¡Bienvenido a KioskoApp!"
!define MUI_WELCOMEPAGE_TEXT "Este asistente le guiará a través de la instalación de KioskoApp.$\r$\n$\r$\nKioskoApp es un sistema completo de gestión para kioscos que incluye:$\r$\n$\r$\n  • Punto de Venta (POS) intuitivo$\r$\n  • Control de inventario y stock$\r$\n  • Gestión de clientes y fiado$\r$\n  • Reportes y estadísticas$\r$\n  • Sistema de caja registradora$\r$\n$\r$\nSe recomienda cerrar todas las demás aplicaciones antes de continuar.$\r$\n$\r$\nHaga clic en Siguiente para continuar."

; Texto de directorio
!define MUI_DIRECTORYPAGE_TEXT_TOP "KioskoApp será instalado en la siguiente carpeta.$\r$\nHaga clic en Siguiente para continuar o en Examinar para seleccionar otra ubicación."

; Textos de finalización
!define MUI_FINISHPAGE_TITLE "¡Instalación Completada!"
!define MUI_FINISHPAGE_TEXT "KioskoApp ha sido instalado correctamente en su equipo.$\r$\n$\r$\nSus credenciales iniciales se encuentran en:$\r$\n%APPDATA%\\kiosko-app\\CREDENCIALES_INICIALES.txt$\r$\n$\r$\nIMPORTANTE: Cambie la contraseña en el primer inicio.$\r$\n$\r$\nHaga clic en Finalizar para cerrar el asistente."

!define MUI_FINISHPAGE_RUN_TEXT "Ejecutar KioskoApp ahora"

; Texto del desinstalador
!define MUI_UNCONFIRMPAGE_TEXT_TOP "KioskoApp será desinstalado de su equipo.$\r$\nSus datos y configuraciones se mantendrán en la carpeta de usuario."

; =============================================
; VERIFICACIÓN E INSTALACIÓN DE VC++ REDISTRIBUTABLE
; =============================================

; Función para verificar si VC++ Redistributable está instalado
!macro CheckVCRedist
  ; Verificar en el registro si VC++ 2015-2022 x64 está instalado
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != 1
    ; No está instalado, mostrar mensaje e instalarlo
    DetailPrint "Visual C++ Redistributable no detectado. Instalando..."
    MessageBox MB_ICONINFORMATION|MB_OK "Se instalará Microsoft Visual C++ Redistributable.$\r$\n$\r$\nEsto es necesario para que KioskoApp funcione correctamente.$\r$\nPor favor espere mientras se completa la instalación."
    
    ; Ejecutar VC++ Redistributable desde recursos incluidos (modo visible)
    DetailPrint "Instalando Visual C++ Redistributable..."
    ExecWait '"$INSTDIR\resources\vc_redist.x64.exe" /install /passive /norestart' $1
    ${If} $1 == 0
      DetailPrint "Visual C++ Redistributable instalado correctamente"
      MessageBox MB_ICONINFORMATION|MB_OK "Visual C++ Redistributable se instaló correctamente."
    ${ElseIf} $1 == 1638
      ; 1638 = Ya hay una versión instalada
      DetailPrint "Visual C++ Redistributable ya está instalado (otra versión)"
    ${ElseIf} $1 == 3010
      ; 3010 = Éxito pero requiere reinicio
      DetailPrint "Visual C++ Redistributable instalado. Se recomienda reiniciar."
      MessageBox MB_ICONINFORMATION|MB_OK "Visual C++ Redistributable instalado.$\r$\n$\r$\nSe recomienda reiniciar el equipo después de la instalación."
    ${Else}
      DetailPrint "VC++ Redistributable retornó código: $1"
      MessageBox MB_ICONEXCLAMATION|MB_OK "Visual C++ Redistributable retornó código: $1$\r$\n$\r$\nSi la aplicación no inicia después de la instalación, reinicie el equipo o instale VC++ manualmente."
    ${EndIf}
  ${Else}
    DetailPrint "Visual C++ Redistributable ya está instalado"
  ${EndIf}
!macroend

; Callback personalizado después de la instalación
!macro customInstall
  ; Verificar e instalar VC++ Redistributable si es necesario
  !insertmacro CheckVCRedist
  
  ; Mensaje en el log de instalación
  DetailPrint "Instalación de KioskoApp completada"
  DetailPrint "Credenciales guardadas en: $APPDATA\kiosko-app"
!macroend
