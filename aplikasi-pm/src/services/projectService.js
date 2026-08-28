import { api, API_URL } from './api';

export const projectService = {
    getProjects: async () => await api.get('/api/projects'),
    
    getProjectById: async (id) => await api.get(`/api/projects/${id}`),

    createProject: async (data) => await api.post('/api/projects', data),

    updateProject: async (id, data) => await api.put(`/api/projects/${id}`, data),

    deleteProject: async (id) => await api.delete(`/api/projects/${id}`),

    importProjects: async (formData) => await api.post('/api/projects/import', formData),

    uploadBast: async (id, formData) => await api.post(`/api/projects/${id}/bast`, formData),

    exportTemplate: async () => {
        const response = await fetch(`${API_URL}/api/projects/export-template`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Gagal mengunduh template');
        return await response.blob();
    },

    downloadImportErrors: async (errors) => {
        const response = await fetch(`${API_URL}/api/projects/import-errors-excel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ errors })
        });
        if (!response.ok) throw new Error('Gagal mengunduh log error');
        return await response.blob();
    }
};
