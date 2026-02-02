const mysql = require('mysql2/promise');

async function testCumpleanos() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Probando query de cumpleaños...\n');
    
    const [rows] = await connection.execute(`
      (SELECT 
        'Alumno' as tipo,
        CONCAT(dsNombre, ' ', dsApellido) as nombre,
        feNacimiento,
        DATE_FORMAT(feNacimiento, '%d/%m') as fechaCumple,
        CASE 
          WHEN DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(feNacimiento, '%m-%d') THEN 0
          WHEN DATE_FORMAT(feNacimiento, '%m-%d') > DATE_FORMAT(CURDATE(), '%m-%d') THEN 
            DATEDIFF(
              DATE(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(feNacimiento, '%m-%d'))),
              CURDATE()
            )
          ELSE 
            DATEDIFF(
              DATE(CONCAT(YEAR(CURDATE()) + 1, '-', DATE_FORMAT(feNacimiento, '%m-%d'))),
              CURDATE()
            )
        END as diasFaltantes,
        CASE WHEN DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(feNacimiento, '%m-%d') THEN 1 ELSE 0 END as esHoy
      FROM TD_ALUMNOS 
      WHERE cdEstado = 1 AND feNacimiento IS NOT NULL)
      UNION ALL
      (SELECT 
        'Profesor' as tipo,
        dsNombreCompleto as nombre,
        feNacimiento,
        DATE_FORMAT(feNacimiento, '%d/%m') as fechaCumple,
        CASE 
          WHEN DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(feNacimiento, '%m-%d') THEN 0
          WHEN DATE_FORMAT(feNacimiento, '%m-%d') > DATE_FORMAT(CURDATE(), '%m-%d') THEN 
            DATEDIFF(
              DATE(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(feNacimiento, '%m-%d'))),
              CURDATE()
            )
          ELSE 
            DATEDIFF(
              DATE(CONCAT(YEAR(CURDATE()) + 1, '-', DATE_FORMAT(feNacimiento, '%m-%d'))),
              CURDATE()
            )
        END as diasFaltantes,
        CASE WHEN DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(feNacimiento, '%m-%d') THEN 1 ELSE 0 END as esHoy
      FROM TD_PERSONAL 
      WHERE cdEstado = 1 AND dsTipoPersonal = 'Profesor' AND feNacimiento IS NOT NULL)
      ORDER BY diasFaltantes ASC, nombre ASC
      LIMIT 5
    `);

    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.nombre}`);
      console.log(`   Tipo: ${row.tipo}`);
      console.log(`   Fecha: ${row.fechaCumple}`);
      console.log(`   Días faltantes: ${row.diasFaltantes}`);
      console.log(`   Es hoy: ${row.esHoy}`);
      console.log(`   Tipo de nombre: ${typeof row.nombre}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

testCumpleanos();
