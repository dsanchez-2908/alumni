import { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { parseFechaLocal } from '@/lib/date-utils';

export interface TallerConDeuda extends RowDataPacket {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  cdTaller: number;
  nuAnioTaller: number;
  cdTipoTaller: number;
  dsNombreTaller: string;
  nombreProfesor: string;
  snDomingo: number; snLunes: number; snMartes: number; snMiercoles: number;
  snJueves: number; snViernes: number; snSabado: number;
  dsDescripcionHorarios: string | null;
  dsDomingoHoraDesde: string | null; dsDomingoHoraHasta: string | null;
  dsLunesHoraDesde: string | null; dsLunesHoraHasta: string | null;
  dsMartesHoraDesde: string | null; dsMartesHoraHasta: string | null;
  dsMiercolesHoraDesde: string | null; dsMiercolesHoraHasta: string | null;
  dsJuevesHoraDesde: string | null; dsJuevesHoraHasta: string | null;
  dsViernesHoraDesde: string | null; dsViernesHoraHasta: string | null;
  dsSabadoHoraDesde: string | null; dsSabadoHoraHasta: string | null;
  feInscripcion: string;
  feBaja: string | null;
}

export interface PagoRealizado extends RowDataPacket {
  cdAlumno: number;
  cdTaller: number;
  cdTipoTaller: number;
  nuMes: number;
  nuAnio: number;
  nuMonto: string;
}

export interface ItemPendiente {
  cdAlumno: number;
  nombreAlumno: string;
  cdTaller: number;
  nombreTaller: string;
  cdTipoTaller: number;
  nombreProfesor: string;
  diasClase: string;
  horarioClase: string;
  mes: number;
  anio: number;
  precio: any;
  montoCalculado: number;
  tipoPago: 'Efectivo' | 'Transferencia' | 'Excepcion';
  seleccionado: boolean;
  atrasado: boolean;
}

export interface ResumenPeriodo {
  cantidadPagosCompletos: number;
  cantidadPagosDescuento: number;
}

const formatTime = (time: string | null) => (time ? time.substring(0, 5) : null);

function formatearHorario(taller: TallerConDeuda) {
  const diasInfo: { dia: string; desde: string | null; hasta: string | null }[] = [];
  if (taller.snDomingo) diasInfo.push({ dia: 'Dom', desde: formatTime(taller.dsDomingoHoraDesde), hasta: formatTime(taller.dsDomingoHoraHasta) });
  if (taller.snLunes) diasInfo.push({ dia: 'Lun', desde: formatTime(taller.dsLunesHoraDesde), hasta: formatTime(taller.dsLunesHoraHasta) });
  if (taller.snMartes) diasInfo.push({ dia: 'Mar', desde: formatTime(taller.dsMartesHoraDesde), hasta: formatTime(taller.dsMartesHoraHasta) });
  if (taller.snMiercoles) diasInfo.push({ dia: 'Mié', desde: formatTime(taller.dsMiercolesHoraDesde), hasta: formatTime(taller.dsMiercolesHoraHasta) });
  if (taller.snJueves) diasInfo.push({ dia: 'Jue', desde: formatTime(taller.dsJuevesHoraDesde), hasta: formatTime(taller.dsJuevesHoraHasta) });
  if (taller.snViernes) diasInfo.push({ dia: 'Vie', desde: formatTime(taller.dsViernesHoraDesde), hasta: formatTime(taller.dsViernesHoraHasta) });
  if (taller.snSabado) diasInfo.push({ dia: 'Sáb', desde: formatTime(taller.dsSabadoHoraDesde), hasta: formatTime(taller.dsSabadoHoraHasta) });

  return diasInfo
    .map((d) => (d.desde && d.hasta ? `${d.dia} ${d.desde}-${d.hasta}` : d.dia))
    .join(', ');
}

// Trae (con caché por request) el precio vigente de un tipo de taller al último día de un mes/año dado
function crearBuscadorDePrecios() {
  const cache = new Map<string, Promise<any>>();
  return async function precioVigente(cdTipoTaller: number, anio: number, mes: number) {
    const key = `${cdTipoTaller}-${anio}-${mes}`;
    if (!cache.has(key)) {
      const ultimoDiaMes = new Date(anio, mes, 0).getDate();
      const fechaConsulta = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaMes).padStart(2, '0')}`;
      cache.set(
        key,
        pool
          .execute<any[]>(
            `SELECT * FROM TD_PRECIOS_TALLERES
             WHERE cdTipoTaller = ? AND feInicioVigencia <= ? AND cdEstado = 1
             ORDER BY feInicioVigencia DESC LIMIT 1`,
            [cdTipoTaller, fechaConsulta]
          )
          .then(([rows]) => rows[0] || null)
      );
    }
    return cache.get(key)!;
  };
}

function clasificarTipoPrecio(monto: string, precio: any): 'completo' | 'descuento' | 'excepcion' | 'desconocido' {
  if (!precio) return 'desconocido';
  const valor = parseFloat(monto);
  const completoEfectivo = parseFloat(precio.nuPrecioCompletoEfectivo);
  const completoTransferencia = parseFloat(precio.nuPrecioCompletoTransferencia);
  const descuentoEfectivo = parseFloat(precio.nuPrecioDescuentoEfectivo);
  const descuentoTransferencia = parseFloat(precio.nuPrecioDescuentoTransferencia);

  if (Math.abs(valor - completoEfectivo) < 0.01 || Math.abs(valor - completoTransferencia) < 0.01) return 'completo';
  if (Math.abs(valor - descuentoEfectivo) < 0.01 || Math.abs(valor - descuentoTransferencia) < 0.01) return 'descuento';
  return 'excepcion';
}

/**
 * Calcula, para un conjunto de inscripciones (activas o incompletas con deuda),
 * TODOS los períodos pendientes de pago desde la inscripción hasta hoy (o hasta la
 * fecha de baja si el alumno ya no está activo), agrupando la info de pagos previos
 * por período para poder aplicar el descuento familiar mes a mes.
 */
export async function calcularCuotasPendientes(
  talleres: TallerConDeuda[],
  pagosRealizados: PagoRealizado[]
): Promise<{ items: ItemPendiente[]; resumenPorPeriodo: Record<string, ResumenPeriodo> }> {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;

  const precioVigente = crearBuscadorDePrecios();

  // Set de períodos ya pagados: "cdAlumno-cdTaller-mes-anio"
  const pagoSet = new Set(
    pagosRealizados.map((p) => `${p.cdAlumno}-${p.cdTaller}-${p.nuMes}-${p.nuAnio}`)
  );

  // Resumen de pagos por período (para el descuento familiar mes a mes)
  const resumenPorPeriodo: Record<string, ResumenPeriodo> = {};
  for (const pago of pagosRealizados) {
    const precio = await precioVigente(pago.cdTipoTaller, pago.nuAnio, pago.nuMes);
    const tipo = clasificarTipoPrecio(pago.nuMonto, precio);
    const key = `${pago.nuAnio}-${pago.nuMes}`;
    if (!resumenPorPeriodo[key]) resumenPorPeriodo[key] = { cantidadPagosCompletos: 0, cantidadPagosDescuento: 0 };
    if (tipo === 'completo') resumenPorPeriodo[key].cantidadPagosCompletos++;
    if (tipo === 'descuento') resumenPorPeriodo[key].cantidadPagosDescuento++;
  }

  const items: ItemPendiente[] = [];

  for (const taller of talleres) {
    const feInscripcion = parseFechaLocal(taller.feInscripcion);
    let mesFin = mesActual;
    let anioFin = anioActual;

    if (taller.feBaja) {
      const feBaja = parseFechaLocal(taller.feBaja);
      anioFin = feBaja.getFullYear();
      mesFin = feBaja.getMonth() + 1;
    }

    let mes = feInscripcion.getMonth() + 1;
    let anio = feInscripcion.getFullYear();

    const diasClase = formatearHorario(taller);

    while (anio < anioFin || (anio === anioFin && mes <= mesFin)) {
      const key = `${taller.cdAlumno}-${taller.cdTaller}-${mes}-${anio}`;
      if (!pagoSet.has(key)) {
        const precio = await precioVigente(taller.cdTipoTaller, anio, mes);
        if (precio) {
          const atrasado = anio < anioActual || (anio === anioActual && mes < mesActual);
          items.push({
            cdAlumno: taller.cdAlumno,
            nombreAlumno: `${taller.dsApellido}, ${taller.dsNombre}`,
            cdTaller: taller.cdTaller,
            nombreTaller: `${taller.dsNombreTaller} (${taller.nuAnioTaller})`,
            cdTipoTaller: taller.cdTipoTaller,
            nombreProfesor: taller.nombreProfesor,
            diasClase,
            horarioClase: taller.dsDescripcionHorarios || '',
            mes,
            anio,
            precio,
            montoCalculado: 0,
            tipoPago: 'Efectivo',
            seleccionado: true,
            atrasado,
          });
        }
      }

      mes++;
      if (mes > 12) { mes = 1; anio++; }
    }
  }

  // Orden cronológico, de lo más atrasado a lo más reciente
  items.sort((a, b) => (a.anio - b.anio) || (a.mes - b.mes) || a.nombreAlumno.localeCompare(b.nombreAlumno));

  return { items, resumenPorPeriodo };
}
