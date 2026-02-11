/**
 * Script para eliminar precios duplicados en TD_PRECIOS_TALLERES
 * y agregar constraint UNIQUE
 * 
 * Uso: node scripts/fix-precios-duplicados.js
 */

const mysql = require('mysql2/promise');

// Usar las mismas variables que lib/db.ts
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'alumni',
};

async function main() {
  let connection;
  
  try {
    console.log('🔌 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida\n');

    // PASO 1: Identificar duplicados
    console.log('📊 PASO 1: Identificando duplicados...');
    console.log('═'.repeat(60));
    
    const [duplicados] = await connection.execute(`
      SELECT 
        p.cdPrecio,
        p.cdTipoTaller,
        tt.dsNombreTaller,
        DATE_FORMAT(p.feInicioVigencia, '%Y-%m-%d') as feInicioVigencia,
        DATE_FORMAT(p.feAlta, '%Y-%m-%d %H:%i:%s') as feAlta,
        p.nuPrecioCompletoEfectivo,
        u.dsNombreCompleto as usuarioAlta
      FROM TD_PRECIOS_TALLERES p
      INNER JOIN TD_TIPO_TALLERES tt ON p.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TD_USUARIOS u ON p.cdUsuarioAlta = u.cdUsuario
      INNER JOIN (
        SELECT cdTipoTaller, DATE(feInicioVigencia) as fecha
        FROM TD_PRECIOS_TALLERES
        WHERE cdEstado = 1
        GROUP BY cdTipoTaller, DATE(feInicioVigencia)
        HAVING COUNT(*) > 1
      ) dup ON p.cdTipoTaller = dup.cdTipoTaller 
           AND DATE(p.feInicioVigencia) = dup.fecha
      WHERE p.cdEstado = 1
      ORDER BY p.cdTipoTaller, p.feInicioVigencia, p.feAlta
    `);

    if (duplicados.length === 0) {
      console.log('✅ No se encontraron precios duplicados');
      console.log('💡 Procediendo a agregar el constraint UNIQUE...\n');
    } else {
      console.log(`⚠️  Se encontraron ${duplicados.length} registros duplicados:\n`);
      
      // Agrupar por fecha y taller para mejor visualización
      const grupos = {};
      duplicados.forEach(dup => {
        const key = `${dup.dsNombreTaller} - ${dup.feInicioVigencia}`;
        if (!grupos[key]) {
          grupos[key] = [];
        }
        grupos[key].push(dup);
      });

      Object.entries(grupos).forEach(([key, registros]) => {
        console.log(`\n📌 ${key}`);
        registros.forEach((reg, idx) => {
          console.log(`   ${idx + 1}. ID: ${reg.cdPrecio} | Precio: $${reg.nuPrecioCompletoEfectivo} | Alta: ${reg.feAlta} | Por: ${reg.usuarioAlta}`);
        });
      });

      // PASO 2: Obtener IDs a conservar (los más recientes)
      console.log('\n📊 PASO 2: Determinando registros a conservar...');
      console.log('═'.repeat(60));
      
      const [conservar] = await connection.execute(`
        SELECT 
          cdTipoTaller,
          DATE(feInicioVigencia) as fecha,
          MAX(cdPrecio) as cdPrecioConservar
        FROM TD_PRECIOS_TALLERES
        WHERE cdEstado = 1
        GROUP BY cdTipoTaller, DATE(feInicioVigencia)
        HAVING COUNT(*) > 1
      `);

      console.log(`✅ Se conservarán ${conservar.length} registros (los más recientes)`);
      
      // Calcular cuántos se van a eliminar
      const [countEliminar] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM TD_PRECIOS_TALLERES p
        INNER JOIN (
          SELECT cdTipoTaller, DATE(feInicioVigencia) as fecha
          FROM TD_PRECIOS_TALLERES
          WHERE cdEstado = 1
          GROUP BY cdTipoTaller, DATE(feInicioVigencia)
          HAVING COUNT(*) > 1
        ) dup ON p.cdTipoTaller = dup.cdTipoTaller 
             AND DATE(p.feInicioVigencia) = dup.fecha
        WHERE p.cdEstado = 1
          AND p.cdPrecio NOT IN (
            SELECT MAX(cdPrecio)
            FROM TD_PRECIOS_TALLERES
            WHERE cdEstado = 1
            GROUP BY cdTipoTaller, DATE(feInicioVigencia)
          )
      `);

      const totalEliminar = countEliminar[0].total;
      console.log(`⚠️  Se eliminarán ${totalEliminar} registros duplicados\n`);

      // PASO 3: Confirmar eliminación
      console.log('🔄 PASO 3: Eliminando duplicados...');
      console.log('═'.repeat(60));
      
      const [result] = await connection.execute(`
        DELETE p FROM TD_PRECIOS_TALLERES p
        INNER JOIN (
          SELECT cdTipoTaller, DATE(feInicioVigencia) as fecha
          FROM TD_PRECIOS_TALLERES
          WHERE cdEstado = 1
          GROUP BY cdTipoTaller, DATE(feInicioVigencia)
          HAVING COUNT(*) > 1
        ) dup ON p.cdTipoTaller = dup.cdTipoTaller 
             AND DATE(p.feInicioVigencia) = dup.fecha
        WHERE p.cdEstado = 1
          AND p.cdPrecio NOT IN (
            SELECT cdPrecio FROM (
              SELECT MAX(cdPrecio) as cdPrecio
              FROM TD_PRECIOS_TALLERES
              WHERE cdEstado = 1
              GROUP BY cdTipoTaller, DATE(feInicioVigencia)
            ) as temp
          )
      `);

      console.log(`✅ ${result.affectedRows} registros eliminados correctamente\n`);
    }

    // PASO 4: Agregar constraint UNIQUE
    console.log('🔒 PASO 4: Agregando constraint UNIQUE...');
    console.log('═'.repeat(60));
    
    try {
      await connection.execute(`
        ALTER TABLE TD_PRECIOS_TALLERES
        ADD CONSTRAINT UK_Precio_Taller_Vigencia 
        UNIQUE KEY (cdTipoTaller, feInicioVigencia, cdEstado)
      `);
      console.log('✅ Constraint UNIQUE agregado exitosamente\n');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  El constraint UNIQUE ya existe\n');
      } else {
        throw error;
      }
    }

    // PASO 5: Verificación final
    console.log('🔍 PASO 5: Verificación final...');
    console.log('═'.repeat(60));
    
    const [verificacion] = await connection.execute(`
      SELECT 
        cdTipoTaller,
        DATE(feInicioVigencia) as fecha,
        COUNT(*) as cantidad
      FROM TD_PRECIOS_TALLERES
      WHERE cdEstado = 1
      GROUP BY cdTipoTaller, DATE(feInicioVigencia)
      HAVING COUNT(*) > 1
    `);

    if (verificacion.length === 0) {
      console.log('✅ Verificación exitosa: No quedan duplicados');
      console.log('✅ La base de datos está lista\n');
    } else {
      console.log('❌ ADVERTENCIA: Todavía hay duplicados:');
      console.table(verificacion);
    }

    console.log('═'.repeat(60));
    console.log('🎉 Proceso completado exitosamente');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

main();
