import { api } from './api';

export const userService = {
    getAllUsers: async () => await api.get('/api/users'),
};
