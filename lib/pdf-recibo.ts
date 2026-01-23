import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DetallePago {
  nombreAlumno: string;
  nombreTaller: string;
  mes: string;
  anio: number;
  monto: number;
  tipoPago: string;
}

interface DatosRecibo {
  cdPago: number;
  fePago: string;
  nombreCliente: string;
  dniCliente?: string;
  detalles: DetallePago[];
  total: number;
  observacion?: string;
}

/**
 * Genera un PDF de recibo de pago
 */
export function generarPDFRecibo(datos: DatosRecibo): Buffer {
  const doc = new jsPDF() as any;

  // Configuración de colores
  const colorPrimario = [99, 102, 241]; // Indigo
  const colorSecundario = [139, 92, 246]; // Violet

  // Encabezado
  doc.setFillColor(...colorPrimario);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ÍNDIGO TEATRO', 105, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Recibo de Pago', 105, 25, { align: 'center' });

  // Número de recibo y fecha
  doc.setFontSize(10);
  doc.text(`Recibo N° ${datos.cdPago.toString().padStart(6, '0')}`, 105, 32, {
    align: 'center',
  });

  // Información del cliente
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', 20, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nombre: ${datos.nombreCliente}`, 20, 58);
  if (datos.dniCliente) {
    doc.text(`DNI: ${datos.dniCliente}`, 20, 65);
  }
  doc.text(`Fecha de Pago: ${datos.fePago}`, 20, datos.dniCliente ? 72 : 65);

  // Detalle de pagos
  const startY = datos.dniCliente ? 82 : 75;
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DE PAGOS', 20, startY);

  // Tabla de detalles
  const tableData = datos.detalles.map((detalle) => [
    detalle.nombreAlumno,
    detalle.nombreTaller,
    `${detalle.mes}/${detalle.anio}`,
    detalle.tipoPago,
    `$${detalle.monto.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: startY + 5,
    head: [['Alumno', 'Taller', 'Período', 'Forma de Pago', 'Monto']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: colorPrimario,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 50 },
      2: { cellWidth: 25 },
      3: { cellWidth: 35 },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
  });

  // Total
  const finalY = ((doc as any).lastAutoTable?.finalY || startY + 50) + 10;
  doc.setFillColor(245, 245, 245);
  doc.rect(130, finalY, 60, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', 135, finalY + 7);
  doc.text(`$${datos.total.toFixed(2)}`, 185, finalY + 7, { align: 'right' });

  // Observaciones
  if (datos.observacion && datos.observacion.trim() !== '') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Observaciones:', 20, finalY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitObservacion = doc.splitTextToSize(datos.observacion, 170);
    doc.text(splitObservacion, 20, finalY + 27);
  }

  // Pie de página
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(...colorSecundario);
  doc.rect(0, pageHeight - 25, 210, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Gracias por confiar en nosotros', 105, pageHeight - 15, {
    align: 'center',
  });
  doc.text('contacto@indigoteatro.com.ar', 105, pageHeight - 9, {
    align: 'center',
  });

  // Convertir a Buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

/**
 * Formatea el nombre del mes
 */
export function getNombreMes(mes: number): string {
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return meses[mes - 1] || 'Mes inválido';
}
