@echo off
chcp 65001 >nul
echo ========================================
echo    DIAGNÓSTICO DE KIOSKOAPP
echo ========================================
echo.

echo [1] Verificando sistema operativo...
systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type"
echo.

echo [2] Verificando Visual C++ Redistributable...
reg query "HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" /v Installed 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo    [ERROR] Visual C++ Redistributable NO está instalado
    echo    Ejecutando instalador de VC++...
    if exist "%~dp0..\resources\vc_redist.x64.exe" (
        "%~dp0..\resources\vc_redist.x64.exe" /install /passive /norestart
        echo    VC++ instalado. Por favor reinicie el equipo.
    ) else (
        echo    [ERROR] No se encontró vc_redist.x64.exe
    )
) else (
    echo    [OK] Visual C++ Redistributable instalado
)
echo.

echo [3] Verificando instalación de KioskoApp...
if exist "%~dp0..\KioskoApp.exe" (
    echo    [OK] KioskoApp.exe encontrado
) else (
    echo    [ERROR] KioskoApp.exe NO encontrado
)
echo.

echo [4] Verificando archivos de Prisma...
if exist "%~dp0..\resources\prisma\schema.prisma" (
    echo    [OK] schema.prisma encontrado
) else (
    echo    [ADVERTENCIA] schema.prisma no encontrado
)
echo.

echo [5] Verificando permisos de AppData...
set APPDATA_PATH=%APPDATA%\kiosko-app
if not exist "%APPDATA_PATH%" (
    mkdir "%APPDATA_PATH%" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo    [ERROR] No se puede crear carpeta en AppData
    ) else (
        echo    [OK] Carpeta AppData creada
    )
) else (
    echo    [OK] Carpeta AppData existe
)
echo.

echo [6] Verificando logs de crash...
if exist "%APPDATA_PATH%\crash-log.txt" (
    echo    [!] Se encontró log de crash:
    echo    --------------------------------
    type "%APPDATA_PATH%\crash-log.txt"
    echo    --------------------------------
) else (
    echo    [OK] No hay logs de crash
)
echo.

echo [7] Intentando ejecutar KioskoApp con log...
echo    Ejecutando... (espere unos segundos)
cd /d "%~dp0.."
KioskoApp.exe > "%APPDATA_PATH%\startup-log.txt" 2>&1

echo.
echo ========================================
echo    DIAGNÓSTICO COMPLETADO
echo ========================================
echo.
echo Si la aplicación no abrió, revise:
echo    %APPDATA_PATH%\crash-log.txt
echo    %APPDATA_PATH%\startup-log.txt
echo.
echo Presione cualquier tecla para cerrar...
pause >nul
