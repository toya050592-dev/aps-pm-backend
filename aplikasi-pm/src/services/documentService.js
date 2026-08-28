import { api } from './api';

export const documentService = {
    getAll: async () => await api.get('/api/document-tracking'),
    create: async (formData) => await api.post('/api/document-tracking', formData),
    update: async (id, formData) => await api.put(`/api/document-tracking/${id}`, formData),
    delete: async (id) => await api.delete(`/api/document-tracking/${id}`),
    updateKeterangan: async (id, data) => await api.put(`/api/document-tracking/${id}/keterangan`, data)
};
