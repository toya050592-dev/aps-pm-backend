import { api, API_URL } from './api';

export const overtimeService = {
    getAll: async () => await api.get('/api/overtime'),
    create: async (data) => await api.post('/api/overtime', data),
    approve: async (id, data) => await api.put(`/api/overtime/${id}/approve`, data),
    delete: async (id) => await api.delete(`/api/overtime/${id}`)
};
