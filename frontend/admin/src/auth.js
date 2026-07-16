const TOKEN_KEY = 'lingda_admin_token';
const USER_KEY = 'lingda_admin_user';

export const adminAuth = {
  token: () => localStorage.getItem(TOKEN_KEY) || '',
  user: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  save: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
