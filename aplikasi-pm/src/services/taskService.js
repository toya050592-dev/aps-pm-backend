import { api, API_URL } from './api';

export const taskService = {
    // Ambil daftar tugas berdasarkan ID Project
    getTasksByProjectId: async (projectId) => {
        return await api.get(`/api/tasks/${projectId}`);
    },

    // Buat tugas baru
    createTask: async (taskData) => {
        return await api.post('/api/tasks', taskData);
    },

    // Update tugas
    updateTask: async (taskId, taskData) => {
        return await api.put(`/api/tasks/${taskId}`, taskData);
    },

    // Hapus tugas
    deleteTask: async (taskId) => {
        return await api.delete(`/api/tasks/${taskId}`);
    },

    // Import WBS (FormData)
    importWbs: async (projectId, formData) => {
        return await api.post(`/api/projects/${projectId}/import-wbs`, formData);
    },

    // Export WBS ke Excel (Membutuhkan penanganan Blob khusus)
    exportWbs: async (projectId) => {
        const response = await fetch(`${API_URL}/api/projects/${projectId}/export-wbs`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) throw new Error('Gagal mengunduh Excel');
        return await response.blob();
    }
};
