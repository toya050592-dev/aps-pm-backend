import { api } from './api';

export const authService = {
    checkAuth: async () => await api.get('/api/auth/check'),
    logout: async () => await api.post('/api/logout')
};
