import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BellRing,
  Activity,
  FileText,
  Wallet,
  BarChart3,
  CreditCard,
  LogOut,
  Settings,
  Menu,
  X,
  Zap,
  Gauge,
  Clock,
  RotateCcw,
  MessageCircle,
  History,
  UserPlus, Building2,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/lib/auth-store';

// Masqué temporairement dans le menu en attendant la validation Meta Tech Provider (Nadia, 2026-08-29).
// Repasser à true une fois la connexion WhatsApp par cabinet prête (Phase 3).
const AUTOMATISATION_MENU_VISIBLE = false;

// Masqué temporairement (Nadia, 2026-08-29) : paiement Konnect pas encore configuré / en pause.
const ABONNEMENT_MENU_VISIBLE = false;

// Masqué temporairement (Nadia, 2026-08-29) : backend prêt (créer un soin, encaisser un acte,
// schéma dentaire) mais jamais branché côté interface, et catalogue d'actes du cabinet sans
// aucune gestion — à construire plus tard.
const SOINS_MENU_VISIBLE = false;

// Masqué temporairement (Nadia, 2026-08-29) : à la demande de Nadia, l'onglet Ordonnances
// est retiré du menu et de la fiche patient. Fonctionnalité et données intactes.
const ORDONNANCES_MENU_VISIBLE = false;

// Masqué temporairement (Nadia, 2026-08-29) : la page Paramètres n'est encore qu'un
// placeholder "Bientôt disponible" (configuration du cabinet, catalogue d'actes, types
// de RDV, utilisateurs et préférences) — retirée du menu à la demande de Nadia.
const PARAMETRES_MENU_VISIBLE = false;

// Masqué temporairement (Nadia, 2026-08-30) : à la demande de Nadia, en attendant de
// régler la question du statut professionnel (patente / auto-entrepreneur) avant de
// continuer à mettre en avant les relances patients. Fonctionnalité et données intactes,
// juste retirée du menu.
const RECALLS_MENU_VISIBLE = false;

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/agenda', icon: Calendar, label: 'Agenda' },
  { to: '/recalls', icon: BellRing, label: 'Patients à réactiver' },
  { to: '/treatments', icon: Activity, label: 'Soins' },
  { to: '/prescriptions', icon: FileText, label: 'Ordonnances' },
  { to: '/finance', icon: Wallet, label: 'Facturation' },
  { to: '/stats', icon: BarChart3, label: 'Statistiques' },
  { to: '/parametres/abonnement', icon: CreditCard, label: 'Abonnement' },
];

const automationNavItems = [
  { to: '/automatisation', icon: Gauge, label: "Vue d'ensemble", end: true },
  { to: '/automatisation/rappels', icon: BellRing, label: 'Rappels' },
  { to: '/automatisation/no-shows', icon: Clock, label: 'No-Shows' },
  { to: '/automatisation/recalls', icon: RotateCcw, label: 'Recalls' },
  { to: '/automatisation/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { to: '/automatisation/historique', icon: History, label: 'Historique' },
];

function NavGroup({
  icon: Icon,
  label,
  items,
  onNavigate,
}: {
  icon: LucideIcon;
  label: string;
  items: { to: string; icon: LucideIcon; label: string; end?: boolean }[];
  onNavigate: () => void;
}) {
  const location = useLocation();
  const isGroupActive = items.some((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const [isOpen, setIsOpen] = useState(isGroupActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all',
          isGroupActive ? 'text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
        )}
      >
        <Icon size={16} />
        <span className="flex-1 text-left">{label}</span>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {isOpen && (
        <div className="mt-0.5 ml-4 pl-3 border-l border-white/10 space-y-0.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all',
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
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-60 flex-shrink-0 flex flex-col bg-primary-900 text-slate-200 transition-transform duration-200 md:static md:translate-x-0',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
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
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-white/60 hover:text-white p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems
            .filter((item) => ABONNEMENT_MENU_VISIBLE || item.to !== '/parametres/abonnement')
            .filter((item) => SOINS_MENU_VISIBLE || item.to !== '/treatments')
            .filter((item) => ORDONNANCES_MENU_VISIBLE || item.to !== '/prescriptions')
            .filter((item) => RECALLS_MENU_VISIBLE || item.to !== '/recalls')
            .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileMenuOpen(false)}
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
          {AUTOMATISATION_MENU_VISIBLE && (
            <NavGroup
              icon={Zap}
              label="Automatisation Patients"
              items={automationNavItems}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          )}
        </nav>

        <div className="p-3 border-t border-white/10">
          <NavLink
            to="/guide"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all mb-2',
                isActive
                  ? 'bg-gradient-to-r from-primary-500 to-primary-500/0 text-white shadow-[inset_3px_0_0_#14b8a6]'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              )
            }
          >
            <BookOpen size={16} />
            Guide d'utilisation
          </NavLink>
          {PARAMETRES_MENU_VISIBLE && (
            <NavLink
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all mb-2"
            >
              <Settings size={16} />
              Paramètres
            </NavLink>
          )}
          {user?.isPlatformAdmin && (
          <>
            <NavLink
              to="/admin/demo-accounts"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all mb-2"
            >
              <UserPlus size={16} />
              Comptes démo
            </NavLink>
            <NavLink
              to="/admin/accounts"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-all mb-2"
            >
              <Building2 size={16} />
              Tous les comptes
            </NavLink>
          </>
        )}
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
        <div className="md:hidden flex items-center gap-3 bg-primary-900 text-white px-4 py-3 flex-shrink-0">
          <button onClick={() => setMobileMenuOpen(true)} className="text-white/80 hover:text-white">
            <Menu size={22} />
          </button>
          <span className="font-display font-semibold">ClinikDent</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
