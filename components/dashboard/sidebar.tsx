'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  UserCheck, 
  DollarSign, 
  FileText,
  Settings,
  ChevronRight,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Usuarios',
    href: '/dashboard/usuarios',
    icon: <Users className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor'],
  },
  {
    title: 'Personal',
    href: '/dashboard/personal',
    icon: <GraduationCap className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador'],
  },
  {
    title: 'Tipo de Talleres',
    href: '/dashboard/tipo-talleres',
    icon: <BookOpen className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador'],
  },
  {
    title: 'Talleres',
    href: '/dashboard/talleres',
    icon: <BookOpen className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador', 'Profesor'],
  },
  {
    title: 'Alumnos',
    href: '/dashboard/alumnos',
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: 'Grupos Familiares',
    href: '/dashboard/grupos-familiares',
    icon: <Users className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador'],
  },
  {
    title: 'Registro Asistencia',
    href: '/dashboard/registro-asistencia',
    icon: <UserCheck className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador', 'Profesor'],
  },
  {
    title: 'Consulta Faltas',
    href: '/dashboard/faltas',
    icon: <UserCheck className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador', 'Profesor'],
  },
  {
    title: 'Pagos',
    href: '/dashboard/pagos',
    icon: <DollarSign className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador'],
  },
  {
    title: 'Reportes',
    href: '/dashboard/reportes',
    icon: <FileText className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor'],
  },
];

export function DashboardSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const userRoles = session?.user?.roles || [];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.some(role => userRoles.includes(role));
  });

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-indigo-100">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
          Alumni
        </h1>
        <p className="text-sm text-gray-600 mt-1">Gestión de Talleres</p>
      </div>

      {/* Usuario info */}
      <div className="p-4 border-b border-indigo-100 bg-indigo-50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-semibold">
            {session?.user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {session?.user?.name}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {userRoles.join(', ')}
            </p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              {item.icon}
              <span className="flex-1 font-medium">{item.title}</span>
              {isActive && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-indigo-100">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full justify-start gap-3 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-5 w-5" />
          Cerrar Sesión
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-indigo-200"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-indigo-600" />
        ) : (
          <Menu className="h-6 w-6 text-indigo-600" />
        )}
      </button>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-40 h-full w-72 bg-white border-r border-indigo-100 shadow-xl transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <SidebarContent />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col h-full w-72 bg-white border-r border-indigo-100 shadow-lg">
        <SidebarContent />
      </aside>
    </>
  );
}
