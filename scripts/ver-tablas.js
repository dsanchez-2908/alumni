const mysql = require('mysql2/promise');

async function verTablas() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'alumni'
  });

  try {
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tablas en la base de datos:');
    const nombresTablas = tables.map(t => Object.values(t)[0]);
    
    const relacionadas = nombresTablas.filter(t => 
      t.toLowerCase().includes('falta') || 
      t.toLowerCase().includes('asisten')
    );
    
    console.log('\nTablas relacionadas con faltas/asistencias:');
    console.log(relacionadas);

    if (relacionadas.length > 0) {
      console.log('\nEstructura de la tabla:');
      const [estructura] = await connection.execute(`DESCRIBE ${relacionadas[0]}`);
      console.table(estructura);
    }

  } finally {
    await connection.end();
  }
}

verTablas().catch(console.error);
