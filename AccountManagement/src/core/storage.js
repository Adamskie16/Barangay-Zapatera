// AccountManagement/src/core/storage.js
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEYS = {
  USERS: 'zapatera_super_admins_db',
  SESSION: 'zapatera_account_mgmt_session',
  LOGS: 'zapatera_logs_db',
};

export const StorageService = {
  getUsers: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    } catch {
      return [];
    }
  },

  getUsersAsync: async () => {
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // fallback
    }
    return StorageService.getUsers();
  },

  saveUser: (user) => {
    const users = StorageService.getUsers();
    const index = users.findIndex((u) => u.id === user.id || u.email === user.email);
    let updated;
    if (index >= 0) {
      users[index] = { ...users[index], ...user, updated_at: new Date().toISOString() };
      updated = users[index];
    } else {
      updated = {
        ...user,
        id: user.id || `usr-${Date.now()}`,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      users.unshift(updated);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return updated;
  },

  deleteUser: (userId) => {
    const users = StorageService.getUsers().filter((u) => u.id !== userId && u.email !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getCurrentUser: () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION) || 'null');
    } catch {
      return null;
    }
  },

  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  },
};
