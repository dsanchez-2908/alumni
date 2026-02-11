import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Calcular cuotas pendientes para un grupo familiar
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdGrupoFamiliar = parseInt(params.id);

    // Obtener todos los talleres activos del grupo familiar
    const [talleres] = await pool.execute<any[]>(
      `SELECT 
        at.cdAlumno,
        a.dsNombre,
        a.dsApellido,
        at.cdTaller,
        t.nuAnioTaller,
        tt.cdTipoTaller,
        tt.dsNombreTaller
      FROM TR_ALUMNO_GRUPO_FAMILIAR agf
      INNER JOIN TD_ALUMNOS a ON agf.cdAlumno = a.cdAlumno
      INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE agf.cdGrupoFamiliar = ?
        AND at.feBaja IS NULL
        AND t.cdEstado IN (1, 2)
      ORDER BY a.dsApellido, a.dsNombre, tt.dsNombreTaller`,
      [cdGrupoFamiliar]
    );

    if (talleres.length === 0) {
      return NextResponse.json({
        grupoFamiliar: cdGrupoFamiliar,
        talleres: [],
        mensaje: 'No hay talleres activos para este grupo familiar',
      });
    }

    // Obtener precios vigentes para cada tipo de taller
    const tiposTaller = [...new Set(talleres.map((t: any) => t.cdTipoTaller))];
    
    const preciosPromises = tiposTaller.map(async (cdTipoTaller) => {
      const [precios] = await pool.execute<any[]>(
        `SELECT *
         FROM TD_PRECIOS_TALLERES
         WHERE cdTipoTaller = ?
           AND feInicioVigencia <= CURDATE()
           AND cdEstado = 1
         ORDER BY feInicioVigencia DESC
         LIMIT 1`,
        [cdTipoTaller]
      );
      return { cdTipoTaller, precio: precios[0] || null };
    });

    const preciosData = await Promise.all(preciosPromises);
    const preciosMap = new Map(preciosData.map((p) => [p.cdTipoTaller, p.precio]));

    // Verificar que todos los talleres tengan precio
    const sinPrecio = talleres.filter(
      (t: any) => !preciosMap.get(t.cdTipoTaller)
    );

    if (sinPrecio.length > 0) {
      return NextResponse.json({
        error: 'Algunos talleres no tienen precio vigente',
        talleresSinPrecio: sinPrecio,
      }, { status: 400 });
    }

    // Calcular qué mes(es) debe pagar cada alumno
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const anioActual = fechaActual.getFullYear();

    // Obtener pagos ya realizados para este grupo familiar en el mes/año actual
    // con información detallada de montos para determinar si fue precio completo o descuento
    const [pagosRealizados] = await pool.execute<any[]>(
      `SELECT 
         pd.cdAlumno, 
         pd.cdTaller,
         pd.nuMonto,
         pd.cdPagoDetalle,
         tt.cdTipoTaller
       FROM TD_PAGOS p
       INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
       INNER JOIN TD_TALLERES t ON pd.cdTaller = t.cdTaller
       INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
       WHERE p.cdGrupoFamiliar = ?
         AND p.nuMes = ?
         AND p.nuAnio = ?`,
      [cdGrupoFamiliar, mesActual, anioActual]
    );

    // Analizar pagos previos: determinar cuántos fueron con precio completo
    const pagosPreviosConTipoInfo = pagosRealizados.map((pago: any) => {
      const precio = preciosMap.get(pago.cdTipoTaller);
      let tipoPrecio = 'desconocido';
      
      if (precio) {
        const monto = parseFloat(pago.nuMonto);
        const precioCompletoEfectivo = parseFloat(precio.nuPrecioCompletoEfectivo);
        const precioCompletoTransferencia = parseFloat(precio.nuPrecioCompletoTransferencia);
        const precioDescuentoEfectivo = parseFloat(precio.nuPrecioDescuentoEfectivo);
        const precioDescuentoTransferencia = parseFloat(precio.nuPrecioDescuentoTransferencia);
        
        // Determinar si fue precio completo o descuento (con tolerancia de 0.01 por redondeos)
        if (Math.abs(monto - precioCompletoEfectivo) < 0.01 || Math.abs(monto - precioCompletoTransferencia) < 0.01) {
          tipoPrecio = 'completo';
        } else if (Math.abs(monto - precioDescuentoEfectivo) < 0.01 || Math.abs(monto - precioDescuentoTransferencia) < 0.01) {
          tipoPrecio = 'descuento';
        } else {
          tipoPrecio = 'excepcion';
        }
      }
      
      return {
        cdAlumno: pago.cdAlumno,
        cdTaller: pago.cdTaller,
        cdTipoTaller: pago.cdTipoTaller,
        nuMonto: pago.nuMonto,
        tipoPrecio
      };
    });

    // Contar cuántos pagos previos fueron con precio completo
    const cantidadPagosCompletos = pagosPreviosConTipoInfo.filter(
      (p: any) => p.tipoPrecio === 'completo'
    ).length;

    // Crear un Set para búsqueda rápida
    const pagoSet = new Set(
      pagosRealizados.map((p: any) => `${p.cdAlumno}-${p.cdTaller}`)
    );
    
    // Filtrar solo los items que NO han sido pagados
    const items = talleres
      .filter((taller: any) => {
        const key = `${taller.cdAlumno}-${taller.cdTaller}`;
        return !pagoSet.has(key);
      })
      .map((taller: any) => {
        const precio = preciosMap.get(taller.cdTipoTaller);
        
        return {
          cdAlumno: taller.cdAlumno,
          nombreAlumno: `${taller.dsApellido}, ${taller.dsNombre}`,
          cdTaller: taller.cdTaller,
          nombreTaller: `${taller.dsNombreTaller} (${taller.nuAnioTaller})`,
          cdTipoTaller: taller.cdTipoTaller,
          mes: mesActual,
          anio: anioActual,
          precio,
          // Estos valores se calcularán en el frontend según la lógica de descuentos
          montoCalculado: 0,
          tipoPago: 'Efectivo',
          seleccionado: true,
        };
      });

    // Verificar si hay items pendientes después del filtro
    if (items.length === 0) {
      return NextResponse.json({
        grupoFamiliar: cdGrupoFamiliar,
        items: [],
        cantidadTalleres: 0,
        mensaje: 'No hay cuotas pendientes. Todos los pagos del mes actual ya fueron realizados.',
      });
    }

    return NextResponse.json({
      grupoFamiliar: cdGrupoFamiliar,
      items,
      cantidadTalleres: talleres.length, // Total de talleres incluyendo pagados
      pagosPrevios: pagosPreviosConTipoInfo, // Pagos ya realizados este mes con tipo
      cantidadPagosCompletos, // Cuántos pagos previos fueron con precio completo
      cantidadPagosDescuento: pagosPreviosConTipoInfo.filter((p: any) => p.tipoPrecio === 'descuento').length,
    });
  } catch (error: any) {
    console.error('Error al calcular cuotas:', error);
    return NextResponse.json(
      { error: 'Error al calcular cuotas', details: error.message },
      { status: 500 }
    );
  }
}
