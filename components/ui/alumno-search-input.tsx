'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { X, Search } from 'lucide-react';

interface Alumno {
  cdAlumno: number;
  nombreCompleto: string;
}

interface AlumnoSearchInputProps {
  alumnos: Alumno[];
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function AlumnoSearchInput({
  alumnos,
  value,
  onValueChange,
  label = 'Alumno',
  placeholder = 'Buscar alumno...',
}: AlumnoSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredAlumnos, setFilteredAlumnos] = useState<Alumno[]>([]);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Inicializar el alumno seleccionado si hay un value
  useEffect(() => {
    if (value && value !== 'todos') {
      const alumno = alumnos.find((a) => a.cdAlumno.toString() === value);
      if (alumno) {
        setSelectedAlumno(alumno);
        setSearchTerm(alumno.nombreCompleto);
      }
    } else {
      setSelectedAlumno(null);
      setSearchTerm('');
    }
  }, [value, alumnos]);

  // Filtrar alumnos cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredAlumnos(alumnos.slice(0, 50)); // Mostrar solo los primeros 50 si no hay búsqueda
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = alumnos.filter((alumno) =>
        alumno.nombreCompleto.toLowerCase().includes(term)
      );
      setFilteredAlumnos(filtered.slice(0, 50)); // Limitar a 50 resultados
    }
  }, [searchTerm, alumnos]);

  // Cerrar el dropdown cuando se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // Si se borra el texto, resetear la selección
    if (newValue === '') {
      setSelectedAlumno(null);
      onValueChange('todos');
    }
  };

  const handleSelectAlumno = (alumno: Alumno) => {
    setSelectedAlumno(alumno);
    setSearchTerm(alumno.nombreCompleto);
    onValueChange(alumno.cdAlumno.toString());
    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedAlumno(null);
    onValueChange('todos');
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <Label htmlFor="alumno-search">{label}</Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="alumno-search"
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            className="pl-10 pr-10"
          />
          {(searchTerm || selectedAlumno) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isOpen && filteredAlumnos.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-y-auto">
            {filteredAlumnos.map((alumno) => (
              <button
                key={alumno.cdAlumno}
                type="button"
                className={`w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm ${
                  selectedAlumno?.cdAlumno === alumno.cdAlumno ? 'bg-accent' : ''
                }`}
                onClick={() => handleSelectAlumno(alumno)}
              >
                {alumno.nombreCompleto}
              </button>
            ))}
            {filteredAlumnos.length === 50 && (
              <div className="px-3 py-2 text-xs text-muted-foreground border-t">
                Mostrando primeros 50 resultados. Refina tu búsqueda para encontrar más.
              </div>
            )}
          </div>
        )}

        {isOpen && searchTerm && filteredAlumnos.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg">
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No se encontraron alumnos que coincidan con "{searchTerm}"
            </div>
          </div>
        )}

        {selectedAlumno && (
          <div className="mt-1 text-xs text-muted-foreground">
            Alumno seleccionado: {selectedAlumno.nombreCompleto}
          </div>
        )}
      </div>
    </div>
  );
}
