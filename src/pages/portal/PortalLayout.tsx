import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {
  useNavigate,
  Outlet,
  Link,
  useLocation,
} from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  Users,
  FolderKanban,
  ReceiptText,
  FileText,
  BellRing,
  Settings,
  Menu,
  X,
  Sparkles,
  Link as ConnectorIcon,
  ShieldCheck,
  Plus,
  MessageSquare,
  ArrowLeftRight,
  Scale,
  Wallet,
  UserCog,
  Crown,
  UserRoundCog,
} from 'lucide-react';
import { useState } from 'react';

type NavItem = {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
};

type PortalSection =
  | 'owner'
  | 'admin'
  | 'connector'
  | 'operator'
  | 'client'
  | 'general';

const ACTIVE_WORKSPACE_KEY =
  'avelixa_active_workspace';

export default function PortalLayout() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const normalizedRoles = roles.map((role) =>
    role.toLowerCase()
  );

  const canAccessOwner =
    normalizedRoles.includes('owner');

  const canAccessAdmin =
    normalizedRoles.includes('admin');

  const canAccessConnector =
    normalizedRoles.includes('connector');

  const canAccessOperator =
    normalizedRoles.includes('operator');

  const canAccessClient =
    normalizedRoles.includes('client');

  /*
   * ============================================================
   * ACTIVE WORKSPACE
   * ============================================================
   *
   * Multi-role accounts can use shared URLs such as:
   *
   * /portal
   * /portal/projects
   * /portal/documents
   * /portal/invoices
   * /portal/settings
   *
   * Those URLs alone cannot tell us whether the user is currently
   * working as a Client or Connector.
   *
   * Therefore we persist the workspace explicitly selected by the
   * user in sessionStorage.
   *
   * Role-specific URLs still have absolute priority:
   *
   * /portal/owner     -> Owner
   * /portal/admin     -> Admin
   * /portal/connector -> Connector
   * /portal/operator  -> Operator
   *
   * Shared URLs use the explicitly selected workspace.
   */

  const getSavedWorkspace = (): PortalSection | null => {
    try {
      const saved =
        sessionStorage.getItem(
          ACTIVE_WORKSPACE_KEY
        );

      if (
        saved === 'owner' ||
        saved === 'admin' ||
        saved === 'connector' ||
        saved === 'operator' ||
        saved === 'client'
      ) {
        return saved;
      }

      return null;
    } catch {
      return null;
    }
  };

  const hasAccessToWorkspace = (
    workspace: PortalSection
  ) => {
    switch (workspace) {
      case 'owner':
        return canAccessOwner;

      case 'admin':
        return canAccessAdmin;

      case 'connector':
        return canAccessConnector;

      case 'operator':
        return canAccessOperator;

      case 'client':
        return canAccessClient;

      default:
        return false;
    }
  };

  const getPortalSection = (): PortalSection => {
    const pathname = location.pathname;

    /*
     * Explicit workspace routes always win.
     */
    if (pathname.startsWith('/portal/owner')) {
      return 'owner';
    }

    if (pathname.startsWith('/portal/admin')) {
      return 'admin';
    }

    if (pathname.startsWith('/portal/connector')) {
      return 'connector';
    }

    if (pathname.startsWith('/portal/operator')) {
      return 'operator';
    }

    /*
     * Shared routes:
     *
     * Respect the workspace the user explicitly selected.
     */
    const savedWorkspace =
      getSavedWorkspace();

    if (
      savedWorkspace &&
      hasAccessToWorkspace(savedWorkspace)
    ) {
      return savedWorkspace;
    }

    /*
     * If there is no saved workspace, choose a sensible
     * default based on the available roles.
     *
     * Client takes priority for /portal when the account has
     * Client access.
     */
    if (canAccessClient) {
      return 'client';
    }

    if (canAccessConnector) {
      return 'connector';
    }

    if (canAccessOperator) {
      return 'operator';
    }

    if (canAccessAdmin) {
      return 'admin';
    }

    if (canAccessOwner) {
      return 'owner';
    }

    return 'general';
  };

  const portalSection = getPortalSection();

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem(
        ACTIVE_WORKSPACE_KEY
      );
    } catch {
      // Ignore sessionStorage errors.
    }

    await supabase.auth.signOut();

    navigate('/login');
  };

  /*
   * ============================================================
   * OWNER NAVIGATION
   * ============================================================
   */

  const ownerNavItems: NavItem[] = [
    {
      name: 'Owner Dashboard',
      path: '/portal/owner',
      icon: Crown,
    },
    {
      name: 'Clients',
      path: '/portal/clients',
      icon: Users,
    },
    {
      name: 'Projects',
      path: '/portal/owner/projects',
      icon: FolderKanban,
    },
    {
      name: 'Finance',
      path: '/portal/owner/finance',
      icon: Wallet,
    },
    {
      name: 'User Management',
      path: '/portal/owner/users',
      icon: UserRoundCog,
    },
    {
      name: 'Team Management',
      path: '/portal/owner/team',
      icon: UserCog,
    },
    {
      name: 'Team Payouts',
      path: '/portal/owner/team/payouts',
      icon: Wallet,
    },
    {
      name: 'Messages',
      path: '/portal/messages',
      icon: MessageSquare,
    },
    {
      name: 'Settings',
      path: '/portal/settings',
      icon: Settings,
    },
  ];

  /*
   * ============================================================
   * ADMIN NAVIGATION
   * ============================================================
   */

  const adminNavItems: NavItem[] = [
    {
      name: 'Admin Dashboard',
      path: '/portal/admin',
      icon: ShieldCheck,
    },
    {
      name: 'Clients',
      path: '/portal/clients',
      icon: Users,
    },
    {
      name: 'Projects',
      path: '/portal/admin/projects',
      icon: FolderKanban,
    },
    {
      name: 'Team Management',
      path: '/portal/admin/team',
      icon: UserCog,
    },
    {
      name: 'Team Payouts',
      path: '/portal/admin/team/payouts',
      icon: Wallet,
    },
    {
      name: 'Messages',
      path: '/portal/messages',
      icon: MessageSquare,
    },
    {
      name: 'Settings',
      path: '/portal/settings',
      icon: Settings,
    },
  ];

  /*
   * ============================================================
   * CONNECTOR NAVIGATION
   * ============================================================
   */

  const connectorNavItems: NavItem[] = [
    {
      name: 'Connector Dashboard',
      path: '/portal/connector',
      icon: ConnectorIcon,
    },
    {
      name: 'My Leads',
      path: '/portal/connector/leads',
      icon: FolderKanban,
    },
    {
      name: 'Submit Lead',
      path: '/portal/leads/new',
      icon: Plus,
    },
    {
      name: 'Rules & Regulations',
      path: '/portal/connector/rules',
      icon: Scale,
    },
    {
      name: 'Settings',
      path: '/portal/settings',
      icon: Settings,
    },
  ];

  /*
   * ============================================================
   * OPERATOR NAVIGATION
   * ============================================================
   */

  const operatorNavItems: NavItem[] = [
    {
      name: 'Operator Dashboard',
      path: '/portal/operator',
      icon: LayoutDashboard,
    },
    {
      name: 'Projects',
      path: '/portal/projects',
      icon: FolderKanban,
    },
    {
      name: 'Documents',
      path: '/portal/documents',
      icon: FileText,
    },
    {
      name: 'Messages',
      path: '/portal/messages',
      icon: MessageSquare,
    },
    {
      name: 'Settings',
      path: '/portal/settings',
      icon: Settings,
    },
  ];

  /*
   * ============================================================
   * CLIENT NAVIGATION
   * ============================================================
   */

  const clientNavItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/portal',
      icon: LayoutDashboard,
    },
    {
      name: 'Projects',
      path: '/portal/projects',
      icon: FolderKanban,
    },
    {
      name: 'Invoices',
      path: '/portal/invoices',
      icon: ReceiptText,
    },
    {
      name: 'Documents',
      path: '/portal/documents',
      icon: FileText,
    },
    {
      name: 'Activity',
      path: '/portal/activity',
      icon: BellRing,
    },
    {
      name: 'Settings',
      path: '/portal/settings',
      icon: Settings,
    },
  ];

  const generalNavItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/portal',
      icon: LayoutDashboard,
    },
    {
      name: 'Projects',
      path: '/portal/projects',
      icon: FolderKanban,
    },
    {
      name: 'Documents',
      path: '/portal/documents',
      icon: FileText,
    },
    {
      name: 'Activity',
      path: '/portal/activity',
      icon: BellRing,
    },
    {
      name: 'Settings',
      path: '/portal/settings',
      icon: Settings,
    },
  ];

  const getNavItems = (): NavItem[] => {
    switch (portalSection) {
      case 'owner':
        return ownerNavItems;

      case 'admin':
        return adminNavItems;

      case 'connector':
        return connectorNavItems;

      case 'operator':
        return operatorNavItems;

      case 'client':
        return clientNavItems;

      default:
        return generalNavItems;
    }
  };

  const visibleNavItems = getNavItems();

  /*
   * ============================================================
   * WORKSPACE COUNT
   * ============================================================
   */

  const workspaceCount = [
    canAccessOwner,
    canAccessAdmin,
    canAccessConnector,
    canAccessOperator,
    canAccessClient,
  ].filter(Boolean).length;

  const hasMultipleWorkspaces =
    workspaceCount > 1;

  /*
   * ============================================================
   * SECTION LABEL
   * ============================================================
   */

  const getSectionLabel = () => {
    switch (portalSection) {
      case 'owner':
        return 'Owner Portal';

      case 'admin':
        return 'Admin Portal';

      case 'connector':
        return 'Connector Portal';

      case 'operator':
        return 'Operator Portal';

      case 'client':
        return 'Client Portal';

      default:
        return 'Avelixa Portal';
    }
  };

  /*
   * ============================================================
   * ACTIVE NAVIGATION
   * ============================================================
   */

  const isActive = (path: string) => {
    if (path === '/portal') {
      return location.pathname === '/portal';
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  /*
   * ============================================================
   * WORKSPACE SWITCHING
   * ============================================================
   *
   * The workspace is stored BEFORE navigation.
   * This is the critical fix for accounts that have multiple roles.
   */

  const switchWorkspace = (
    workspace: Exclude<
      PortalSection,
      'general'
    >,
    path: string
  ) => {
    try {
      sessionStorage.setItem(
        ACTIVE_WORKSPACE_KEY,
        workspace
      );
    } catch {
      // Ignore sessionStorage errors.
    }

    setSidebarOpen(false);

    navigate(path);
  };

  /*
   * ============================================================
   * SIDEBAR
   * ============================================================
   */

  const SidebarContent = ({
    mobile = false,
  }: {
    mobile?: boolean;
  }) => (
    <>
      <div
        className={`h-20 flex items-center ${
          mobile
            ? 'justify-between px-6'
            : 'px-6'
        } border-b border-ink-800/50 shrink-0`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-600 flex items-center justify-center rotate-3">
            <Sparkles
              className="w-4 h-4 text-white"
              strokeWidth={2.5}
            />
          </div>

          <div>
            <div className="font-medium tracking-tight text-white text-lg">
              Avelixa
            </div>

            <div className="text-[10px] uppercase tracking-[0.2em] text-accent-500">
              {getSectionLabel()}
            </div>
          </div>
        </div>

        {mobile && (
          <button
            onClick={() =>
              setSidebarOpen(false)
            }
            className="text-gray-400"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => {
                  if (mobile) {
                    setSidebarOpen(false);
                  }
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'text-accent-400 bg-white/5'
                    : 'text-gray-400 hover:text-accent-400 hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {hasMultipleWorkspaces && (
          <div className="mt-8">
            <div className="px-4 mb-3 text-[10px] uppercase tracking-[0.25em] text-gray-500">
              Switch workspace
            </div>

            <div className="space-y-1">
              {canAccessOwner && (
                <button
                  type="button"
                  onClick={() =>
                    switchWorkspace(
                      'owner',
                      '/portal/owner'
                    )
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    portalSection === 'owner'
                      ? 'text-accent-400 bg-white/5'
                      : 'text-gray-400 hover:text-accent-400 hover:bg-white/5'
                  }`}
                >
                  <Crown className="w-5 h-5" />
                  Owner Portal
                </button>
              )}

              {canAccessAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    switchWorkspace(
                      'admin',
                      '/portal/admin'
                    )
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    portalSection === 'admin'
                      ? 'text-accent-400 bg-white/5'
                      : 'text-gray-400 hover:text-accent-400 hover:bg-white/5'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  Admin Portal
                </button>
              )}

              {canAccessConnector && (
                <button
                  type="button"
                  onClick={() =>
                    switchWorkspace(
                      'connector',
                      '/portal/connector'
                    )
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    portalSection === 'connector'
                      ? 'text-accent-400 bg-white/5'
                      : 'text-gray-400 hover:text-accent-400 hover:bg-white/5'
                  }`}
                >
                  <ConnectorIcon className="w-5 h-5" />
                  Connector Portal
                </button>
              )}

              {canAccessOperator && (
                <button
                  type="button"
                  onClick={() =>
                    switchWorkspace(
                      'operator',
                      '/portal/operator'
                    )
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    portalSection === 'operator'
                      ? 'text-accent-400 bg-white/5'
                      : 'text-gray-400 hover:text-accent-400 hover:bg-white/5'
                  }`}
                >
                  <ArrowLeftRight className="w-5 h-5" />
                  Operator Portal
                </button>
              )}

              {canAccessClient && (
                <button
                  type="button"
                  onClick={() =>
                    switchWorkspace(
                      'client',
                      '/portal'
                    )
                  }
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    portalSection === 'client'
                      ? 'text-accent-400 bg-white/5'
                      : 'text-gray-400 hover:text-accent-400 hover:bg-white/5'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  Client Portal
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-ink-800/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-ink-800 flex items-center justify-center text-white font-medium uppercase shrink-0">
            {user?.email?.charAt(0) || 'U'}
          </div>

          <div className="overflow-hidden">
            <div className="text-sm font-medium text-white truncate">
              {user?.email}
            </div>

            <div className="text-xs text-accent-500 uppercase tracking-widest">
              {roles.length > 0
                ? roles.join(', ')
                : 'User'}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-2 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-ink-950 flex overflow-hidden">
      <aside className="hidden md:flex w-64 flex-col border-r border-ink-800/50 bg-ink-950 z-20">
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 -left-32 w-[500px] h-[500px] rounded-full bg-accent-500/5 blur-[120px] pointer-events-none" />

        <header className="h-20 flex items-center justify-between px-6 border-b border-ink-800/50 md:hidden bg-ink-950/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-600 flex items-center justify-center rotate-3">
              <Sparkles
                className="w-4 h-4 text-white"
                strokeWidth={2.5}
              />
            </div>

            <div>
              <span className="font-medium tracking-tight text-white text-lg">
                Avelixa
              </span>

              <div className="text-[10px] uppercase tracking-[0.2em] text-accent-500">
                {getSectionLabel()}
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              setSidebarOpen(true)
            }
            className="text-white p-2"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 z-10">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() =>
              setSidebarOpen(false)
            }
          />

          <div className="relative w-64 max-w-sm bg-ink-900 h-full flex flex-col border-r border-ink-800/50">
            <SidebarContent mobile />
          </div>
        </div>
      )}
    </div>
  );
}