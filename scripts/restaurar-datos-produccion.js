// Vacía la base de datos de desarrollo y la reemplaza con el dump de datos de producción
// (scripts/20260905_Alumni_Datos_v2.sql, solo INSERTs, sin schema).
//
// Producción difiere de dev en 3 tablas:
//  - TD_NOVEDADES_ALUMNO: prod tiene 1 columna extra al final (feModificacion), se descarta.
//  - TD_PRECIOS_TALLERES: prod tiene 1 columna extra (feModificacion) y además `feAlta`
//    está en otra posición; se remapea con columnas explícitas.
//  - TD_PERSONAL: mismas columnas pero en otro orden físico; se remapea con columnas explícitas.
//  - TD_PRECIOS_TALLERES_backup_20260805: tabla que no existe en dev, se omite por completo.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DUMP_FILE = path.join(__dirname, '20260905_Alumni_Datos_v2.sql');

const TABLAS_A_OMITIR = ['TD_PRECIOS_TALLERES_backup_20260805'];

// Tablas cuyo orden de columnas en el dump difiere del de dev y se remapean a mano.
// `columnasDump`: orden real de las columnas tal como vienen en el INSERT de producción.
// `columnasUsar`: subconjunto/orden de esas columnas que se van a insertar en dev.
const TABLAS_REMAPEADAS = {
  TD_NOVEDADES_ALUMNO: {
    columnasDump: ['cdNovedad', 'cdAlumno', 'cdFalta', 'dsNovedad', 'cdUsuario', 'feAlta', 'cdEstado', 'feModificacion'],
    columnasUsar: ['cdNovedad', 'cdAlumno', 'cdFalta', 'dsNovedad', 'cdUsuario', 'feAlta', 'cdEstado'],
  },
  TD_PRECIOS_TALLERES: {
    columnasDump: ['cdPrecio', 'cdUsuarioAlta', 'feInicioVigencia', 'cdTipoTaller', 'nuPrecioCompletoEfectivo', 'nuPrecioCompletoTransferencia', 'nuPrecioDescuentoEfectivo', 'nuPrecioDescuentoTransferencia', 'cdEstado', 'feAlta', 'feModificacion'],
    columnasUsar: ['cdPrecio', 'cdUsuarioAlta', 'feInicioVigencia', 'cdTipoTaller', 'nuPrecioCompletoEfectivo', 'nuPrecioCompletoTransferencia', 'nuPrecioDescuentoEfectivo', 'nuPrecioDescuentoTransferencia', 'cdEstado', 'feAlta'],
  },
  TD_PERSONAL: {
    columnasDump: ['cdPersonal', 'dsNombreCompleto', 'dsTipoPersonal', 'dsDescripcionPuesto', 'dsDomicilio', 'dsTelefono', 'dsMail', 'feNacimiento', 'dsDni', 'dsCuil', 'dsEntidad', 'dsCbuCvu', 'dsObservaciones', 'cdEstado', 'feCreacion', 'feModificacion'],
    columnasUsar: ['cdPersonal', 'dsNombreCompleto', 'dsTipoPersonal', 'dsDescripcionPuesto', 'dsDomicilio', 'dsTelefono', 'dsMail', 'feNacimiento', 'dsDni', 'dsCuil', 'dsEntidad', 'dsCbuCvu', 'dsObservaciones', 'cdEstado', 'feCreacion', 'feModificacion'],
  },
};

const TABLAS_DEV = [
  'TD_ALUMNOS', 'TD_ASISTENCIAS', 'TD_ESTADOS', 'TD_GRUPOS_FAMILIARES',
  'TD_NOTIFICACIONES_FALTAS', 'TD_NOVEDADES_ALUMNO', 'TD_PAGOS', 'TD_PAGOS_DETALLE',
  'TD_PARAMETROS', 'TD_PERSONAL', 'TD_PRECIOS', 'TD_PRECIOS_TALLERES', 'TD_ROLES',
  'TD_TALLERES', 'TD_TIPO_TALLERES', 'TD_TRAZA', 'TD_USUARIOS',
  'TR_ALUMNO_GRUPO_FAMILIAR', 'TR_ALUMNO_TALLER', 'TR_INSCRIPCION_ALUMNO',
  'TR_PERSONAL_TIPO_TALLER', 'TR_USUARIO_ROL',
];

// Extrae todas las tuplas de valores de "INSERT INTO `tabla` VALUES (...),(...);"
function extraerFilas(dump, tabla) {
  const marker = `INSERT INTO \`${tabla}\` VALUES `;
  const idx = dump.indexOf(marker);
  if (idx === -1) return [];
  const s = dump.slice(idx + marker.length);

  let i = 0, depth = 0, inQuote = false, cur = '', curTupla = [], filas = [];
  for (; i < s.length; i++) {
    const ch = s[i];
    if (inQuote) {
      if (ch === '\\') { cur += ch + s[i + 1]; i++; continue; }
      if (ch === "'") {
        if (s[i + 1] === "'") { cur += "''"; i++; continue; }
        inQuote = false; cur += ch; continue;
      }
      cur += ch; continue;
    }
    if (ch === "'") { inQuote = true; cur += ch; continue; }
    if (ch === '(') {
      depth++;
      if (depth === 1) { curTupla = []; cur = ''; continue; }
      cur += ch; continue;
    }
    if (ch === ')') {
      depth--;
      if (depth === 0) { curTupla.push(cur); filas.push(curTupla); cur = ''; continue; }
      cur += ch; continue;
    }
    if (ch === ',' && depth === 1) { curTupla.push(cur); cur = ''; continue; }
    if (ch === ';' && depth === 0) { break; }
    cur += ch;
  }
  return filas;
}

// Quita del dump los bloques "-- Dumping data ... UNLOCK TABLES;" de las tablas dadas
function quitarBloques(sql, tablas) {
  let resultado = sql;
  for (const tabla of tablas) {
    const regex = new RegExp(
      `--\\n-- Dumping data for table \`${tabla}\`\\n--\\n\\nLOCK TABLES \`${tabla}\` WRITE;[\\s\\S]*?UNLOCK TABLES;\\n`,
      'm'
    );
    resultado = resultado.replace(regex, '');
  }
  return resultado;
}

// Construye un INSERT explícito por columnas para una tabla remapeada
function construirInsertRemapeado(dump, tabla, config) {
  const filas = extraerFilas(dump, tabla);
  if (filas.length === 0) return null;

  const indices = config.columnasUsar.map((col) => config.columnasDump.indexOf(col));
  const tuplas = filas.map((fila) => '(' + indices.map((i) => fila[i]).join(',') + ')');

  return `INSERT INTO \`${tabla}\` (\`${config.columnasUsar.join('`,`')}\`) VALUES ${tuplas.join(',')};`;
}

async function backupDev(connection) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, `backup-dev-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  for (const tabla of TABLAS_DEV) {
    const [rows] = await connection.query(`SELECT * FROM ${tabla}`);
    fs.writeFileSync(
      path.join(backupDir, `${tabla}.json`),
      JSON.stringify(rows, null, 2)
    );
  }

  return backupDir;
}

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'admin',
    database: 'alumni',
    multipleStatements: true,
  });

  try {
    console.log('1) Respaldando datos actuales de desarrollo...');
    const backupDir = await backupDev(connection);
    console.log(`   Backup guardado en: ${backupDir}`);

    console.log('2) Vaciando tablas de desarrollo...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const tabla of TABLAS_DEV) {
      await connection.query(`TRUNCATE TABLE ${tabla}`);
    }

    console.log('3) Preparando datos de producción...');
    const dumpOriginal = fs.readFileSync(DUMP_FILE, 'utf8').replace(/\r\n/g, '\n');

    const tablasRemapeadas = Object.keys(TABLAS_REMAPEADAS);
    const dumpLimpio = quitarBloques(dumpOriginal, [...TABLAS_A_OMITIR, ...tablasRemapeadas]);

    console.log('4) Cargando tablas con orden de columnas estándar...');
    await connection.query(dumpLimpio);

    console.log('5) Cargando tablas remapeadas (orden de columnas distinto en producción)...');
    for (const tabla of tablasRemapeadas) {
      const insert = construirInsertRemapeado(dumpOriginal, tabla, TABLAS_REMAPEADAS[tabla]);
      if (!insert) {
        console.log(`   ${tabla}: sin datos en el dump, se omite`);
        continue;
      }
      await connection.query(insert);
      console.log(`   ${tabla}: cargada`);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('6) Verificando cantidad de filas por tabla:');
    for (const tabla of TABLAS_DEV) {
      const [[{ total }]] = await connection.query(`SELECT COUNT(*) as total FROM ${tabla}`);
      console.log(`   ${tabla}: ${total}`);
    }

    console.log('\n✅ Base de datos de desarrollo actualizada con datos de producción.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Error al restaurar datos:', err);
  process.exit(1);
});
