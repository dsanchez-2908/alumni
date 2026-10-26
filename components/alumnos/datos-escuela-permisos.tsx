'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TURNOS_ESCUELA } from '@/lib/alumno-campos';

interface Valores {
  dsEscuela: string;
  dsTurnoEscuela: string;
  snPermisoUsoImagen: string;
  snPermisoRetiroSolo: string;
}

interface Props {
  valores: Valores;
  esMenor: boolean;
  onChange: (campo: keyof Valores, valor: string) => void;
  // 'card' arma tarjetas (alta de alumno); 'section' arma secciones con título (diálogos y formulario público)
  variante?: 'card' | 'section';
  idPrefijo?: string;
  // Permite mostrar solo una de las dos secciones
  secciones?: 'escuela' | 'permisos' | 'ambas';
}

function Bloque({
  variante,
  titulo,
  descripcion,
  children,
}: {
  variante: 'card' | 'section';
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  if (variante === 'card') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
          {descripcion && <CardDescription>{descripcion}</CardDescription>}
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</CardContent>
      </Card>
    );
  }
  return (
    <div className="border-b pb-4">
      <h3 className="font-semibold text-lg mb-1">{titulo}</h3>
      {descripcion && <p className="text-sm text-gray-500">{descripcion}</p>}
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function SiNo({
  id,
  valor,
  onChange,
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Seleccionar" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="SI">Sí</SelectItem>
        <SelectItem value="NO">No</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function DatosEscuelaPermisos({
  valores,
  esMenor,
  onChange,
  variante = 'section',
  idPrefijo = '',
  secciones = 'ambas',
}: Props) {
  const verEscuela = secciones !== 'permisos';
  const verPermisos = secciones !== 'escuela';

  return (
    <>
      {verEscuela && esMenor && (
        <Bloque
          variante={variante}
          titulo="Datos de Escuela"
          descripcion="Aplica a menores de edad"
        >
          <div>
            <Label htmlFor={`${idPrefijo}dsEscuela`}>Escuela</Label>
            <Input
              id={`${idPrefijo}dsEscuela`}
              value={valores.dsEscuela}
              maxLength={150}
              onChange={(e) => onChange('dsEscuela', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefijo}dsTurnoEscuela`}>Turno</Label>
            <Select
              value={valores.dsTurnoEscuela}
              onValueChange={(valor) => onChange('dsTurnoEscuela', valor)}
            >
              <SelectTrigger id={`${idPrefijo}dsTurnoEscuela`}>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {TURNOS_ESCUELA.map((turno) => (
                  <SelectItem key={turno} value={turno}>
                    {turno}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Bloque>
      )}

      {verPermisos && (
      <Bloque variante={variante} titulo="Permisos">
        <div>
          <Label htmlFor={`${idPrefijo}snPermisoUsoImagen`}>Permiso de Uso de Imagen *</Label>
          <SiNo
            id={`${idPrefijo}snPermisoUsoImagen`}
            valor={valores.snPermisoUsoImagen}
            onChange={(valor) => onChange('snPermisoUsoImagen', valor)}
          />
        </div>
        {esMenor && (
          <div>
            <Label htmlFor={`${idPrefijo}snPermisoRetiroSolo`}>Permiso de Retiro Solo *</Label>
            <SiNo
              id={`${idPrefijo}snPermisoRetiroSolo`}
              valor={valores.snPermisoRetiroSolo}
              onChange={(valor) => onChange('snPermisoRetiroSolo', valor)}
            />
          </div>
        )}
      </Bloque>
      )}
    </>
  );
}
