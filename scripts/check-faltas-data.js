const mysql = require('mysql2/promise');

async function verificarFaltas() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    console.log('Verificando faltas registradas...\n');

    // Contar faltas
    const [count] = await connection.execute(
      'SELECT COUNT(*) as total FROM TD_FALTAS'
    );
    console.log(`Total de faltas registradas: ${count[0].total}\n`);

    if (count[0].total > 0) {
      // Mostrar faltas
      const [faltas] = await connection.execute(`
        SELECT 
          f.cdFalta,
          f.feFalta,
          f.dsObservacion,
          a.dsNombre,
          a.dsApellido,
          t.nuAnioTaller,
          tt.dsNombreTaller,
          u.dsNombre as nombreUsuario,
          u.dsApellido as apellidoUsuario,
          f.feRegistro
        FROM TD_FALTAS f
        INNER JOIN TD_ALUMNOS a ON f.cdAlumno = a.cdAlumno
        INNER JOIN TD_TALLERES t ON f.cdTaller = t.cdTaller
        INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
        LEFT JOIN TD_USUARIOS u ON f.cdUsuarioRegistro = u.cdUsuario
        ORDER BY f.feFalta DESC
      `);

      console.log('Faltas registradas:');
      console.log('='.repeat(100));
      faltas.forEach(falta => {
        console.log(`Fecha: ${falta.feFalta.toISOString().split('T')[0]}`);
        console.log(`Alumno: ${falta.dsApellido}, ${falta.dsNombre}`);
        console.log(`Taller: ${falta.dsNombreTaller} (${falta.nuAnioTaller})`);
        console.log(`Observación: ${falta.dsObservacion || 'Sin observación'}`);
        console.log(`Registrado por: ${falta.nombreUsuario} ${falta.apellidoUsuario}`);
        console.log(`Fecha registro: ${falta.feRegistro}`);
        console.log('-'.repeat(100));
      });
    }

  } finally {
    await connection.end();
  }
}

verificarFaltas().catch(console.error);
