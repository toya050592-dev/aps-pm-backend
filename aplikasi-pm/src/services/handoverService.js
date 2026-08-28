import { api } from './api';

export const handoverService = {
    getHistoryByDocId: async (docId) => await api.get(`/api/handovers/${docId}`),
    create: async (data) => await api.post('/api/handovers', data),
    receive: async (id, data) => await api.put(`/api/handovers/${id}/receive`, data)
};
