import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { User } from '@Supabase/supabase-js';
import { supabase } from './supabase';

type AuthContextType = {
  user: User | null;
  roles: string[];
  loading: boolean;
  rolesLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  roles: [],
  loading: true,
  rolesLoading: true,
});

/*
 * Normalize role values returned by Supabase.
 *
 * Supported RPC response formats:
 *   [{ role: 'client' }]
 *   [{ role: 'connector' }]
 *   ['client']
 *   ['connector']
 */
function normalizeRoles(
  roleValues: unknown
): string[] {
  if (!Array.isArray(roleValues)) {
    return [];
  }

  const normalized = roleValues
    .map((item: unknown) => {
      if (
        typeof item === 'object' &&
        item !== null &&
        'role' in item
      ) {
        const role = (
          item as { role?: unknown }
        ).role;

        return typeof role === 'string'
          ? role.trim().toLowerCase()
          : '';
      }

      if (typeof item === 'string') {
        return item.trim().toLowerCase();
      }

      return '';
    })
    .filter(
      (role): role is string =>
        typeof role === 'string' &&
        role.length > 0
    );

  return Array.from(
    new Set(normalized)
  );
}

/*
 * Determine the portal the authenticated user
 * should enter immediately after login.
 *
 * IMPORTANT:
 *
 * This function does NOT merge roles.
 * It does NOT grant permissions.
 * It does NOT change database roles.
 *
 * It only determines the user's landing portal.
 *
 * Role-specific dashboards remain completely
 * separated elsewhere in the application.
 *
 * Priority:
 *
 * 1. Owner
 * 2. Admin
 * 3. Connector
 * 4. Operator
 * 5. Client
 *
 * This means that if an account legitimately
 * has multiple roles, the highest-priority
 * portal becomes the initial landing point.
 *
 * The user can still only access other
 * role-specific routes when ProtectedRoute
 * explicitly permits that role.
 */
export function getPrimaryPortalRole(
  roles: string[]
): string | null {
  const normalizedRoles =
    normalizeRoles(roles);

  const priority = [
    'owner',
    'admin',
    'connector',
    'operator',
    'client',
  ];

  return (
    priority.find((role) =>
      normalizedRoles.includes(role)
    ) ?? null
  );
}

/*
 * Convert a portal role into its landing route.
 *
 * There is intentionally no role-selection
 * screen.
 *
 * The authenticated user's role determines
 * the destination automatically.
 */
export function getPortalPathForRole(
  role: string | null
): string {
  switch (
    String(role ?? '')
      .trim()
      .toLowerCase()
  ) {
    case 'owner':
      return '/portal/owner';

    case 'admin':
      return '/portal/admin';

    case 'connector':
      return '/portal/connector';

    case 'operator':
      return '/portal/operator';

    case 'client':
    default:
      return '/portal';
  }
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [roles, setRoles] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [rolesLoading, setRolesLoading] =
    useState(true);

  const mountedRef =
    useRef(true);

  const rolesRequestRef =
    useRef(0);

  /*
   * Load the current user's Avelixa roles
   * directly from Supabase.
   */
  const fetchRoles = async () => {
    const requestId =
      ++rolesRequestRef.current;

    if (!mountedRef.current) {
      return;
    }

    setRolesLoading(true);

    try {
      const {
        data: {
          user: currentUser,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!currentUser) {
        if (
          mountedRef.current &&
          requestId ===
            rolesRequestRef.current
        ) {
          setRoles([]);
        }

        return;
      }

      /*
       * get_my_roles is the authoritative
       * source for Avelixa portal roles.
       */
      const {
        data,
        error,
      } = await supabase.rpc(
        'get_my_roles'
      );

      if (error) {
        throw error;
      }

      if (
        !mountedRef.current ||
        requestId !==
          rolesRequestRef.current
      ) {
        return;
      }

      const loadedRoles =
        normalizeRoles(data);

      setRoles(loadedRoles);
    } catch (error) {
      console.error(
        'Error loading user roles:',
        error
      );

      if (
        mountedRef.current &&
        requestId ===
          rolesRequestRef.current
      ) {
        setRoles([]);
      }
    } finally {
      if (
        mountedRef.current &&
        requestId ===
          rolesRequestRef.current
      ) {
        setRolesLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;

    /*
     * Initialize the authentication state
     * from the existing Supabase session.
     */
    const initialize =
      async () => {
        try {
          const {
            data: {
              session,
            },
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          if (
            cancelled ||
            !mountedRef.current
          ) {
            return;
          }

          const currentUser =
            session?.user ?? null;

          setUser(currentUser);
          setLoading(false);

          if (currentUser) {
            await fetchRoles();
          } else {
            setRoles([]);
            setRolesLoading(false);
          }
        } catch (error) {
          console.error(
            'Authentication initialization error:',
            error
          );

          if (
            !cancelled &&
            mountedRef.current
          ) {
            setUser(null);
            setRoles([]);
            setLoading(false);
            setRolesLoading(false);
          }
        }
      };

    void initialize();

    /*
     * Keep authentication and role state
     * synchronized with Supabase Auth.
     */
    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (
            cancelled ||
            !mountedRef.current
          ) {
            return;
          }

          const currentUser =
            session?.user ?? null;

          setUser(currentUser);
          setLoading(false);

          /*
           * Logged out:
           * clear all role information.
           */
          if (!currentUser) {
            setRoles([]);
            setRolesLoading(false);
            return;
          }

          /*
           * Refresh roles whenever the
           * authenticated session changes.
           */
          if (
            event === 'SIGNED_IN' ||
            event ===
              'INITIAL_SESSION' ||
            event ===
              'TOKEN_REFRESHED' ||
            event ===
              'USER_UPDATED'
          ) {
            setTimeout(() => {
              if (
                !cancelled &&
                mountedRef.current
              ) {
                void fetchRoles();
              }
            }, 0);
          }
        }
      );

    return () => {
      cancelled = true;
      mountedRef.current = false;

      rolesRequestRef.current += 1;

      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        loading,
        rolesLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () =>
  useContext(AuthContext);