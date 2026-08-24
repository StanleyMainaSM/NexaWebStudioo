import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { User } from '@supabase/supabase-js';
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

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);

  const mountedRef = useRef(true);
  const rolesRequestRef = useRef(0);

  const fetchRoles = async () => {
    const requestId = ++rolesRequestRef.current;

    if (!mountedRef.current) return;

    setRolesLoading(true);

    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!currentUser) {
        if (
          mountedRef.current &&
          requestId === rolesRequestRef.current
        ) {
          setRoles([]);
        }

        return;
      }

      const { data, error } = await supabase.rpc(
        'get_my_roles'
      );

      if (error) {
        throw error;
      }

      if (
        !mountedRef.current ||
        requestId !== rolesRequestRef.current
      ) {
        return;
      }

      const loadedRoles = Array.isArray(data)
        ? data
            .map((item: { role?: string }) =>
              item?.role?.toLowerCase()
            )
            .filter(
              (role): role is string =>
                typeof role === 'string' &&
                role.length > 0
            )
        : [];

      setRoles(
        Array.from(new Set(loadedRoles))
      );
    } catch (error) {
      console.error(
        'Error loading user roles:',
        error
      );

      if (
        mountedRef.current &&
        requestId === rolesRequestRef.current
      ) {
        setRoles([]);
      }
    } finally {
      if (
        mountedRef.current &&
        requestId === rolesRequestRef.current
      ) {
        setRolesLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;

    const initialize = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (cancelled || !mountedRef.current) {
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
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

        if (!currentUser) {
          setRoles([]);
          setRolesLoading(false);
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
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
