import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const loadFromStorage = () => {
  const token = localStorage.getItem('clinikdent_token');
  const userStr = localStorage.getItem('clinikdent_user');
  return {
    token,
    user: userStr ? (JSON.parse(userStr) as User) : null,
  };
};

export const useAuthStore = create<AuthState>((set) => {
  const initial = loadFromStorage();
  return {
    user: initial.user,
    token: initial.token,
    isAuthenticated: !!initial.token,
    login: (token, user) => {
      localStorage.setItem('clinikdent_token', token);
      localStorage.setItem('clinikdent_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('clinikdent_token');
      localStorage.removeItem('clinikdent_user');
      set({ token: null, user: null, isAuthenticated: false });
    },
  };
});
