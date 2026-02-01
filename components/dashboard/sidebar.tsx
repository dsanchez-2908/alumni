'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  ChevronDown,
  LogOut,
  Menu,
  X,
  UsersRound
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface SubMenuItem {
  title: string;
  href: string;
  roles?: string[];
}

interface MenuCategory {
  title: string;
  icon: React.ReactNode;
  href?: string;
  roles?: string[];
  subItems?: SubMenuItem[];
}

const menuCategories: MenuCategory[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Configuración',
    icon: <Settings className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador'],
    subItems: [
      {
        title: 'Usuarios',
        href: '/dashboard/usuarios',
        roles: ['Administrador', 'Supervisor'],
      },
      {
        title: 'Tipo de Talleres',
        href: '/dashboard/tipo-talleres',
        roles: ['Administrador', 'Supervisor', 'Operador'],
      },
      {
        title: 'Personal',
        href: '/dashboard/personal',
        roles: ['Administrador', 'Supervisor', 'Operador'],
      },
      {
        title: 'Talleres',
        href: '/dashboard/talleres',
        roles: ['Administrador', 'Supervisor', 'Operador', 'Profesor'],
      },
      {
        title: 'Registro de Precios',
        href: '/dashboard/precios',
        roles: ['Administrador', 'Supervisor'],
      },
    ],
  },
  {
    title: 'Alumnos',
    icon: <UsersRound className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador'],
    subItems: [
      {
        title: 'Nuevo Alumno',
        href: '/dashboard/alumnos/nuevo',
      },
      {
        title: 'Consulta de Alumnos',
        href: '/dashboard/alumnos',
      },
      {
        title: 'Grupos Familiares',
        href: '/dashboard/grupos-familiares',
        roles: ['Administrador', 'Supervisor', 'Operador'],
      },
    ],
  },
  {
    title: 'Asistencia',
    icon: <UserCheck className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador', 'Profesor'],
    subItems: [
      {
        title: 'Registro Asistencia',
        href: '/dashboard/registro-asistencia',
        roles: ['Administrador', 'Supervisor', 'Operador', 'Profesor'],
      },
      {
        title: 'Consulta de Asistencia',
        href: '/dashboard/consulta-asistencia',
        roles: ['Administrador', 'Supervisor', 'Operador', 'Profesor'],
      },
      {
        title: 'Historial de Asistencia',
        href: '/dashboard/faltas',
        roles: ['Administrador', 'Supervisor', 'Operador', 'Profesor'],
      },
    ],
  },
  {
    title: 'Pagos',
    icon: <DollarSign className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor', 'Operador'],
    subItems: [
      {
        title: 'Registro de Pagos',
        href: '/dashboard/registro-pagos',
        roles: ['Administrador', 'Supervisor', 'Operador'],
      },
      {
        title: 'Consulta de Pagos',
        href: '/dashboard/pagos',
        roles: ['Administrador', 'Supervisor', 'Operador'],
      },
    ],
  },
  {
    title: 'Reportes',
    icon: <FileText className="h-5 w-5" />,
    roles: ['Administrador', 'Supervisor'],
    subItems: [
      {
        title: 'Asistencia por Taller',
        href: '/dashboard/reportes/asistencia-por-taller',
        roles: ['Administrador', 'Supervisor'],
      },
      {
        title: 'Seguimiento de Faltas',
        href: '/dashboard/reportes/alumnos-con-faltas',
        roles: ['Administrador', 'Supervisor', 'Operador'],
      },
    ],
  },
];

export function DashboardSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const userRoles = session?.user?.roles || [];

  const hasAccess = (roles?: string[]) => {
    if (!roles) return true;
    return roles.some(role => userRoles.includes(role));
  };

  const toggleCategory = (title: string) => {
    setExpandedCategories(prev =>
      prev.includes(title)
        ? prev.filter(cat => cat !== title)
        : [...prev, title]
    );
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-indigo-100">
        <div className="flex items-center justify-center mb-2">
          <Image
            src="/images/logo-indigo.png"
            alt="Indigo Teatro"
            width={140}
            height={70}
            priority
            className="drop-shadow-md"
          />
        </div>
        <p className="text-sm text-gray-600 mt-1 text-center">Gestión de Talleres</p>
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
        {menuCategories.map((category) => {
          if (!hasAccess(category.roles)) return null;

          // Si es un item simple (sin subItems), mostrar como antes
          if (!category.subItems) {
            const isActive = pathname === category.href;
            return (
              <Link
                key={category.title}
                href={category.href || '#'}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                {category.icon}
                <span className="flex-1 font-medium">{category.title}</span>
                {isActive && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          }

          // Si tiene subItems, mostrar categoría colapsable
          const isExpanded = expandedCategories.includes(category.title);
          const hasActiveChild = category.subItems.some(item => pathname === item.href);
          
          return (
            <div key={category.title} className="space-y-1">
              <button
                onClick={() => toggleCategory(category.title)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  hasActiveChild
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                }`}
              >
                {category.icon}
                <span className="flex-1 font-medium text-left">{category.title}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {isExpanded && (
                <div className="ml-4 space-y-1">
                  {category.subItems
                    .filter(subItem => hasAccess(subItem.roles))
                    .map((subItem) => {
                      const isActive = pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                              : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                          }`}
                        >
                          <span className="flex-1">{subItem.title}</span>
                          {isActive && <ChevronRight className="h-4 w-4" />}
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
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
