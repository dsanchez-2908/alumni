# Script para convertir nombres de tablas a MAYUSCULAS
# Preserva codificacion UTF-8

$ErrorActionPreference = "Stop"

# Definir todos los nombres de tabla a convertir
$tableNames = @(
    'tr_alumno_taller',
    'tr_alumno_grupo_familiar',
    'tr_inscripcion_alumno',
    'tr_usuario_rol',
    'tr_personal_tipo_taller',
    'td_asistencias',
    'td_tipo_talleres',
    'td_alumnos',
    'td_talleres',
    'td_grupos_familiares',
    'td_estados',
    'td_roles',
    'td_tipo_taller',
    'td_personal',
    'td_usuarios',
    'td_pagos',
    'td_pagos_detalle',
    'td_precios_talleres',
    'td_precios',
    'td_traza',
    'td_parametros',
    'td_novedades_alumno',
    'td_notificaciones_faltas',
    'td_tipos_taller'
)

# Obtener todos los archivos .ts y .tsx en app/api
$files = Get-ChildItem -Path "app\api" -Recurse -Include *.ts,*.tsx

Write-Host "Total de archivos a procesar: $($files.Count)"
Write-Host ""

$filesModified = 0
$totalReplacements = 0

foreach ($file in $files) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $content = [System.IO.File]::ReadAllText($file.FullName, $utf8NoBom)
    $originalContent = $content
    $fileReplacements = 0
    
    # Reemplazar cada tabla
    foreach ($table in $tableNames) {
        $upperTable = $table.ToUpper()
        # Contar cuantas veces aparece la tabla en minusculas
        $matches = ([regex]::Matches($content, [regex]::Escape($table))).Count
        
        if ($matches -gt 0) {
            $content = $content -replace [regex]::Escape($table), $upperTable
            $fileReplacements += $matches
        }
    }
    
    # Si hubo cambios, guardar el archivo
    if ($content -ne $originalContent) {
        [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
        $filesModified++
        $totalReplacements += $fileReplacements
        Write-Host "OK $($file.Name): $fileReplacements reemplazos"
    }
}

Write-Host ""
Write-Host "======================================"
Write-Host "Resumen:"
Write-Host "  Archivos modificados: $filesModified"
Write-Host "  Total de reemplazos: $totalReplacements"
Write-Host "======================================"
