import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { localSignIn, localSignUp, setLocalAccountActive } from '../auth/localAuth';

interface User {
  id: string | number;
  name: string;
  email: string;
  role?: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string, expectedRole?: 'user' | 'admin') => Promise<boolean | string>;
  signUp: (name: string, email: string, password: string, role?: 'user' | 'admin') => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persistSession(userData: User) {
  localStorage.setItem('healthfinder_user', JSON.stringify(userData));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  /** When unset, auth uses browser storage only (works on static hosting). Set in `.env` to use `server.js` + Postgres. */
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';

  useEffect(() => {
    const storedUser = localStorage.getItem('healthfinder_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('healthfinder_user');
      }
    }
  }, []);

  const signIn = async (email: string, password: string, expectedRole?: 'user' | 'admin'): Promise<boolean | string> => {
    const tryLocal = (): boolean | string => {
      const result = localSignIn(email, password);
      if (!result.ok) return false;
      if (expectedRole && result.user.role !== expectedRole) {
        return 'invalid_role';
      }
      setUser(result.user);
      persistSession(result.user);
      setLocalAccountActive(result.user.email, true);
      return true;
    };

    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          const userData: User = await response.json();
          if (!userData.role) userData.role = 'user';
          if (expectedRole && userData.role !== expectedRole) {
            return 'invalid_role';
          }
          setUser(userData);
          persistSession(userData);
          setLocalAccountActive(userData.email, true);
          return true;
        }
      } catch (error) {
        console.warn('API sign-in unavailable, using local account if present:', error);
      }
    }

    return tryLocal();
  };

  const signUp = async (name: string, email: string, password: string, role: 'user' | 'admin' = 'user'): Promise<boolean> => {
    if (apiBaseUrl) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, password, role }),
        });

        if (response.ok) {
          const userData: User = await response.json();
          if (!userData.role) userData.role = 'user';
          setUser(userData);
          persistSession(userData);
          setLocalAccountActive(userData.email, true);
          return true;
        }

        if (response.status === 400 || response.status === 409) {
          return false;
        }
      } catch (error) {
        console.warn('API sign-up unavailable, creating local account:', error);
      }
    }

    const result = localSignUp(name, email, password, role);
    if (!result.ok) {
      return false;
    }
    setUser(result.user);
    persistSession(result.user);
    setLocalAccountActive(result.user.email, true);
    return true;
  };

  const signOut = () => {
    if (user?.email) {
      setLocalAccountActive(user.email, false);
    }
    setUser(null);
    localStorage.removeItem('healthfinder_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
