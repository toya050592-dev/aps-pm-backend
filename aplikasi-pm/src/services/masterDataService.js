import { api } from './api';

export const masterDataService = {
    getByType: async (type) => await api.get(`/api/master-data?type=${type}`)
};
