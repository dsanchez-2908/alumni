import { RowDataPacket } from 'mysql2';

// =============================================
// INTERFACES DE BASE DE DATOS
// =============================================

export interface Usuario extends RowDataPacket {
  cdUsuario: number;
  dsNombreCompleto: string;
  dsUsuario: string;
  dsClave: string;
  cdPersonal: number | null;
  cdEstado: number;
  feAlta: Date;
  feModificacion: Date;
}

export interface Rol extends RowDataPacket {
  cdRol: number;
  dsRol: string;
  dsDescripcion: string;
  feCreacion: Date;
}

export interface UsuarioRol extends RowDataPacket {
  id: number;
  cdUsuario: number;
  cdRol: number;
  feAsignacion: Date;
}

export interface Estado extends RowDataPacket {
  cdEstado: number;
  dsEstado: string;
  dsDescripcion: string;
  feCreacion: Date;
}

export interface Personal extends RowDataPacket {
  cdPersonal: number;
  dsNombreCompleto: string;
  dsTipoPersonal: 'Profesor' | 'Auxiliar';
  dsDescripcionPuesto: string | null;
  dsDomicilio: string;
  dsTelefono: string;
  dsMail: string;
  cdEstado: number;
  feCreacion: Date;
  feModificacion: Date;
}

export interface Alumno extends RowDataPacket {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  dsSexo: 'Masculino' | 'Femenino';
  dsMail: string;
  feNacimiento: Date;
  dsDomicilio: string;
  dsTelefonoCelular: string;
  dsTelefonoFijo: string;
  dsTelefonoContacto1: string;
  dsParentesco1: string;
  dsTelefonoContacto2: string;
  dsParentesco2: string;
  cdEstado: number;
  feAlta: Date;
  feModificacion: Date;
}

export interface TipoTaller extends RowDataPacket {
  cdTipoTaller: number;
  dsNombreTaller: string;
  dsDescripcionTaller: string;
  nuEdadDesde: number;
  nuEdadHasta: number;
  cdEstado: number;
  feCreacion: Date;
  feModificacion: Date;
}

export interface Taller extends RowDataPacket {
  cdTaller: number;
  nuAnioTaller: number;
  cdTipoTaller: number;
  cdPersonal: number;
  feInicioTaller: Date;
  dsDescripcionHorarios: string;
  snLunes: boolean;
  dsLunesHoraDesde: string | null;
  dsLunesHoraHasta: string | null;
  snMartes: boolean;
  dsMartesHoraDesde: string | null;
  dsMartesHoraHasta: string | null;
  snMiercoles: boolean;
  dsMiercolesHoraDesde: string | null;
  dsMiercolesHoraHasta: string | null;
  snJueves: boolean;
  dsJuevesHoraDesde: string | null;
  dsJuevesHoraHasta: string | null;
  snViernes: boolean;
  dsViernesHoraDesde: string | null;
  dsViernesHoraHasta: string | null;
  snSabado: boolean;
  dsSabadoHoraDesde: string | null;
  dsSabadoHoraHasta: string | null;
  snDomingo: boolean;
  dsDomingoHoraDesde: string | null;
  dsDomingoHoraHasta: string | null;
  cdEstado: number;
  feCreacion: Date;
  feModificacion: Date;
}

// =============================================
// TIPOS DE SESIÓN Y AUTENTICACIÓN
// =============================================

export interface SessionUser {
  cdUsuario: number;
  dsUsuario: string;
  dsNombreCompleto: string;
  roles: string[];
  cdPersonal: number | null;
}

// =============================================
// TIPOS DE FORMULARIOS
// =============================================

export interface UsuarioFormData {
  dsNombreCompleto: string;
  dsUsuario: string;
  dsClave?: string;
  cdPersonal?: number | null;
  roles: number[];
  cdEstado: number;
}

export interface AlumnoFormData {
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  dsSexo: 'Masculino' | 'Femenino';
  dsMail?: string;
  feNacimiento: string;
  dsDomicilio?: string;
  dsTelefonoCelular?: string;
  dsTelefonoFijo?: string;
  dsTelefonoContacto1?: string;
  dsParentesco1?: string;
  dsTelefonoContacto2?: string;
  dsParentesco2?: string;
  cdEstado: number;
}
