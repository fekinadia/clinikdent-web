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
  Receipt,
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
  KeyRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/lib/auth-store';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';

// Masqué temporairement dans le menu en attendant la validation Meta Tech Provider (Nadia, 2026-08-29).
// Repasser à true une fois la connexion WhatsApp par cabinet prête (Phase 3).
const AUTOMATISATION_MENU_VISIBLE = false;

// Masqué temporairement (Nadia, 2026-08-29) : paiement Konnect pas encore configuré / en pause.
const ABONNEMENT_MENU_VISIBLE = false;

// Masqué temporairement (Nadia, 2026-08-29) : backend prêt (créer un soin, encaisser un acte,
// schéma dentaire) mais jamais branché côté interface, et catalogue d'actes du cabinet sans
// aucune gestion — à construire plus tard.
const SOINS_MENU_VISIBLE = false;

// Réactivé (Nadia, 2026-09-21) : l'onglet Ordonnances avait été masqué le
// 2026-08-29 à la demande de Nadia. Il est remis en place à l'occasion du
// chantier Documents, qui réunit les ordonnances avec les 4 autres types de
// documents dans une vue combinée (voir DocumentsPage.tsx).
const ORDONNANCES_MENU_VISIBLE = true;

// Masqué temporairement (Nadia, 2026-08-29) : la page Paramètres n'est encore qu'un
// placeholder "Bientôt disponible" (configuration du cabinet, catalogue d'actes, types
// de RDV, utilisateurs et préférences) — retirée du menu à la demande de Nadia.
const PARAMETRES_MENU_VISIBLE = false;

// Masqué temporairement (Nadia, 2026-08-30) : à la demande de Nadia, en attendant de
// régler la question du statut professionnel (patente / auto-entrepreneur) avant de
// continuer à mettre en avant les relances patients. Fonctionnalité et données intactes,
// juste retirée du menu.
const RECALLS_MENU_VISIBLE = false;

type NavItem = { to: string; icon: LucideIcon; label: string; end?: boolean };

// Navigation regroupée par section (style "ambiance Dentalis" : sidebar sombre,
// items groupés, icônes dans des pastilles).
const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Vue d'ensemble",
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Tableau de bord', end: true },
      { to: '/patients', icon: Users, label: 'Patients' },
      { to: '/agenda', icon: Calendar, label: 'Agenda' },
      { to: '/recalls', icon: BellRing, label: 'Patients à réactiver' },
    ],
  },
  {
    label: 'Soins & suivi',
    items: [
      { to: '/treatments', icon: Activity, label: 'Soins' },
      { to: '/prescriptions', icon: FileText, label: 'Ordonnances' },
      { to: '/documents', icon: FileText, label: 'Documents' },
      { to: '/finance', icon: Wallet, label: 'Facturation' },
      { to: '/expenses', icon: Receipt, label: 'Dépenses' },
      { to: '/stats', icon: BarChart3, label: 'Statistiques' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { to: '/parametres/abonnement', icon: CreditCard, label: 'Abonnement' },
    ],
  },
];

const automationNavItems = [
  { to: '/automatisation', icon: Gauge, label: "Vue d'ensemble", end: true },
  { to: '/automatisation/rappels', icon: BellRing, label: 'Rappels' },
  { to: '/automatisation/no-shows', icon: Clock, label: 'No-Shows' },
  { to: '/automatisation/recalls', icon: RotateCcw, label: 'Recalls' },
  { to: '/automatisation/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { to: '/automatisation/historique', icon: History, label: 'Historique' },
];

function navLinkClasses(isActive: boolean) {
  return clsx(
    'group relative flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[13.5px] transition-all',
    isActive
      ? 'bg-white/[0.08] text-white font-semibold before:absolute before:-left-3 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-[18px] before:rounded-r-full before:bg-accent-400'
      : 'text-slate-400 font-medium hover:bg-white/[0.04] hover:text-white'
  );
}

function IconBox({ Icon, active }: { Icon: LucideIcon; active: boolean }) {
  return (
    <span
      className={clsx(
        'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all',
        active
          ? 'bg-gradient-to-br from-accent-400 to-primary-500 text-white shadow-[0_4px_10px_rgba(45,212,191,0.35)]'
          : 'bg-white/5 text-slate-400 group-hover:text-white'
      )}
    >
      <Icon size={15} />
    </span>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-2.5 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#4b6079]">
      {children}
    </div>
  );
}

function NavGroup({
  icon: Icon,
  label,
  items,
  onNavigate,
}: {
  icon: LucideIcon;
  label: string;
  items: NavItem[];
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
          'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-all',
          isGroupActive ? 'text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
        )}
      >
        <IconBox Icon={Icon} active={isGroupActive} />
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
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              {({ isActive }) => (
                <>
                  <IconBox Icon={item.icon} active={isActive} />
                  {item.label}
                </>
              )}
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
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => ABONNEMENT_MENU_VISIBLE || item.to !== '/parametres/abonnement')
        .filter((item) => SOINS_MENU_VISIBLE || item.to !== '/treatments')
        .filter((item) => ORDONNANCES_MENU_VISIBLE || item.to !== '/prescriptions')
        .filter((item) => RECALLS_MENU_VISIBLE || item.to !== '/recalls'),
    }))
    .filter((section) => section.items.length > 0);

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
          'fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 flex flex-col text-slate-200 transition-transform duration-200 md:static md:translate-x-0',
          'bg-[linear-gradient(180deg,#0c1526_0%,#0a1220_60%,#080e1a_100%)]',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] rounded-[13px] flex items-center justify-center bg-gradient-to-br from-accent-400 to-primary-500 shadow-[0_6px_16px_rgba(20,184,166,0.35)]">
                <svg
                  width="21"
                  height="21"
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
                <div className="font-display text-white font-extrabold text-lg leading-none tracking-tight">
                  ClinikDent
                </div>
                <div className="text-[10.5px] text-accent-300 mt-1 font-semibold tracking-wider uppercase">
                  Cabinet dentaire
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

        <nav className="flex-1 px-3.5 pb-2 overflow-y-auto">
          {visibleSections.map((section) => (
            <div key={section.label}>
              <SectionLabel>{section.label}</SectionLabel>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => navLinkClasses(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        <IconBox Icon={item.icon} active={isActive} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          {AUTOMATISATION_MENU_VISIBLE && (
            <>
              <SectionLabel>Automatisation</SectionLabel>
              <NavGroup
                icon={Zap}
                label="Automatisation Patients"
                items={automationNavItems}
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </>
          )}
        </nav>

        <div className="px-3.5 pb-3 pt-2 border-t border-white/[0.06] space-y-0.5">
          <NavLink
            to="/guide"
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) => navLinkClasses(isActive)}
          >
            {({ isActive }) => (
              <>
                <IconBox Icon={BookOpen} active={isActive} />
                Guide d'utilisation
              </>
            )}
          </NavLink>
          {PARAMETRES_MENU_VISIBLE && (
            <NavLink
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              {({ isActive }) => (
                <>
                  <IconBox Icon={Settings} active={isActive} />
                  Paramètres
                </>
              )}
            </NavLink>
          )}
          {user?.isPlatformAdmin && (
            <>
              <NavLink
                to="/admin/demo-accounts"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <IconBox Icon={UserPlus} active={isActive} />
                    Comptes démo
                  </>
                )}
              </NavLink>
              <NavLink
                to="/admin/accounts"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => navLinkClasses(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <IconBox Icon={Building2} active={isActive} />
                    Tous les comptes
                  </>
                )}
              </NavLink>
            </>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[13.5px] font-medium text-slate-400 hover:bg-white/[0.04] hover:text-white transition-all"
          >
            <IconBox Icon={LogOut} active={false} />
            Déconnexion
          </button>
        </div>

        <div className="p-3.5">
          <button
            type="button"
            onClick={() => setChangePasswordOpen(true)}
            title="Changer le mot de passe"
            className="w-full flex items-center gap-2.5 bg-white/5 border border-white/[0.07] rounded-2xl px-3 py-2.5 hover:bg-white/[0.08] transition-colors text-left"
          >
            <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-accent-400 to-primary-500 flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white text-[12px] font-semibold truncate">
                {user?.email}
              </div>
              <div className="text-[#5b7186] text-[10.5px]">Médecin</div>
            </div>
            <KeyRound size={14} className="text-[#5b7186] flex-shrink-0" />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center gap-3 bg-[#0a1220] text-white px-4 py-3 flex-shrink-0">
          <button onClick={() => setMobileMenuOpen(true)} className="text-white/80 hover:text-white">
            <Menu size={22} />
          </button>
          <span className="font-display font-semibold">ClinikDent</span>
        </div>
        <Outlet />
      </main>

      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </div>
  );
}
