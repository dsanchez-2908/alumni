'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { generarEnlaceWhatsApp } from '@/lib/whatsapp-link';
import { ESTADO_INSCRIPCION } from '@/lib/estados-inscripcion';

export interface InscripcionFormulario {
  cdInscripcion: number;
  cdInscripcionAlumno: number;
  cdEstadoInscripcion: number;
  nuAnio: number;
}

interface Props {
  telefono: string;
  nombreAlumno: string;
  // Inscripción en la que el alumno está pendiente de recibir / completar el formulario (si la hay)
  inscripcionFormulario?: InscripcionFormulario | null;
  onFormularioGenerado?: () => void;
}

/**
 * Abre WhatsApp con el número indicado. Si el alumno tiene el formulario digital pendiente,
 * genera un link exclusivo y lo incluye en el mensaje.
 */
export function BotonWhatsApp({
  telefono,
  nombreAlumno,
  inscripcionFormulario,
  onFormularioGenerado,
}: Props) {
  const { error } = useToast();
  const [confirmarReenvio, setConfirmarReenvio] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const abrirWhatsApp = async () => {
    // La ventana se abre en el clic (los navegadores bloquean las que se abren después de una espera)
    const ventana = window.open('', '_blank');

    try {
      let mensaje = `Hola! 👋\n\nTe escribimos de *Índigo Teatro* respecto de *${nombreAlumno}*.`;

      if (inscripcionFormulario) {
        setEnviando(true);
        const respuesta = await fetch(
          `/api/inscripciones/${inscripcionFormulario.cdInscripcion}/alumnos/${inscripcionFormulario.cdInscripcionAlumno}/formulario`,
          { method: 'POST' }
        );
        const datos = await respuesta.json();
        if (!respuesta.ok) {
          ventana?.close();
          error(datos.error || 'No se pudo generar el link del formulario');
          return;
        }

        const url = `${window.location.origin}/formulario/${datos.token}`;
        mensaje =
          `Ya registramos el pago de la inscripción ${datos.nuAnio} de ${nombreAlumno}\n` +
          `‼️Importante:\n` +
          `1- Para que tu vacante quede reservada, es indispensable completar todos tus datos.\n` +
          `2- Recordá colocar en OBSERVACIONES si presentás alguna discapacidad y/o alguna otra información que consideres importante que sepamos.\n` +
          `3- Al inscribirte aceptas todos los puntos enunciados en el documento de Beneficios e información importante para alumnos de Índigo que podes leer aqui (tene en cuenta leer las 3 páginas) https://canva.link/beneficios-e-info-2027\n\n` +
          `Ahora sí, ya podés completar el formulario digital ingresando a este link:\n` +
          `${url}\n\n` +
          `Vas a necesitar el DNI del alumno para ingresar.`;

        onFormularioGenerado?.();
      }

      const enlace = generarEnlaceWhatsApp(telefono, mensaje);
      if (ventana) {
        ventana.location.href = enlace;
      } else {
        window.location.href = enlace;
      }
    } catch (err) {
      console.error('Error al abrir WhatsApp:', err);
      ventana?.close();
      error('No se pudo abrir WhatsApp');
    } finally {
      setEnviando(false);
    }
  };

  const alHacerClic = () => {
    // Ya se había enviado un link: generar otro anula el anterior, así que se pide confirmación
    if (
      inscripcionFormulario &&
      inscripcionFormulario.cdEstadoInscripcion === ESTADO_INSCRIPCION.PENDIENTE_COMPLETAR_FORMULARIO
    ) {
      setConfirmarReenvio(true);
      return;
    }
    abrirWhatsApp();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={enviando}
        onClick={alHacerClic}
        className="h-7 gap-1 border-green-300 px-2 text-green-700 hover:bg-green-50"
        title={
          inscripcionFormulario
            ? 'Enviar por WhatsApp con el link del formulario de inscripción'
            : 'Abrir WhatsApp'
        }
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </Button>

      <ConfirmDialog
        open={confirmarReenvio}
        onOpenChange={setConfirmarReenvio}
        title="Ya se envió un link del formulario"
        description="Si genera un link nuevo, el que ya se envió dejará de funcionar. ¿Desea continuar?"
        confirmText="Generar nuevo link"
        onConfirm={abrirWhatsApp}
      />
    </>
  );
}
