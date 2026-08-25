import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BellRing,
  Activity,
  FileText,
  Wallet,
  BarChart3,
  LogOut,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/lib/auth-store';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/recalls', icon: BellRing, label: 'Rappels' },
  { to: '/treatments', icon: Activity, label: 'Soins' },
  { to: '/prescriptions', icon: FileText, label: 'Ordonnances' },
  { to: '/finance', icon: Wallet, label: 'Facturation' },
  { to: '/stats', icon: BarChart3, label: 'Statistiques' },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">
      {/* SIDEBAR */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-primary-900 text-slate-200">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-accent-500 to-primary-500">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5.5c-1.074-.586-2.583-1.5-4.5-1.5C5.5 4 4 5.5 4 8c0 1.5.5 3 1 4.5C5.5 14 6 16 6.5 18c.5 2 1 3 2 3 1.5 0 1.5-3 3.5-3s2 3 3.5 3c1 0 1.5-1 2-3 .5-2 1-4 1.5-5.5.5-1.5 1-3 1-4.5 0-2.5-1.5-4-3.5-4-1.917 0-3.426.914-4.5 1.5z" />
              </svg>
            </div>
            <div>
              <div className="font-display text-white font-semibold text-lg leading-none">
                ClinikDent
              </div>
              <div className="text-[10px] text-white/50 mt-1 tracking-widest uppercase">
                v 1.0
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-500/0 text-white shadow-[inset_3px_0_0_#14b8a6]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                )
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all mb-2"
          >
            <Settings size={16} />
            Paramètres
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center text-white text-xs font-semibold">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-medium truncate">
                {user?.email}
              </div>
              <div className="text-white/50 text-[11px]">Médecin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
