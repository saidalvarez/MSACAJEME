@echo off
title MSA Cajeme - Servidor Backend
:inicio
echo [%time%] Iniciando Servidor de Base de Datos y API...
cd server
npm run dev
if %errorlevel% equ 0 (
    echo.
    echo Reiniciando servidor por cambio de configuracion...
    timeout /t 2
    goto inicio
)
if %errorlevel% neq 0 (
    echo.
    echo Error: El servidor se detuvo inesperadamente.
    echo Verifica la conexion a la base de datos o el archivo .env.
    pause
    goto inicio
)
