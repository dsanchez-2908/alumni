const mysql = require('mysql2/promise');

async function createPreciosTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Creando tabla TD_PRECIOS_TALLERES...\n');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS TD_PRECIOS_TALLERES (
        cdPrecio INT AUTO_INCREMENT PRIMARY KEY,
        feAlta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cdUsuarioAlta INT NOT NULL,
        feInicioVigencia DATE NOT NULL,
        cdTipoTaller INT NOT NULL,
        
        -- Precio Completo
        nuPrecioCompletoEfectivo DECIMAL(10,2) NOT NULL,
        nuPrecioCompletoTransferencia DECIMAL(10,2) NOT NULL,
        
        -- Precio con Descuento (para segundos talleres)
        nuPrecioDescuentoEfectivo DECIMAL(10,2) NOT NULL,
        nuPrecioDescuentoTransferencia DECIMAL(10,2) NOT NULL,
        
        cdEstado INT NOT NULL DEFAULT 1,
        
        FOREIGN KEY (cdUsuarioAlta) REFERENCES TD_USUARIOS(cdUsuario),
        FOREIGN KEY (cdTipoTaller) REFERENCES td_tipo_talleres(cdTipoTaller),
        FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado),
        
        INDEX idx_tipo_vigencia (cdTipoTaller, feInicioVigencia)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✓ Tabla TD_PRECIOS_TALLERES creada exitosamente\n');

    // Verificar estructura
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM TD_PRECIOS_TALLERES"
    );
    
    console.log('Estructura de TD_PRECIOS_TALLERES:');
    console.log('='.repeat(80));
    columns.forEach(col => {
      console.log(`${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}${col.Key ? ' - ' + col.Key : ''}`);
    });

  } finally {
    await connection.end();
  }
}

createPreciosTable().catch(console.error);
