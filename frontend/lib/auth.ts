import api from './api';

export interface User {
  user_id: string;
  email: string;
  name: string;
  org_id: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  async register(email: string, password: string, name: string, orgName: string) {
    const response = await api.post('/auth/register', { email, password, name, orgName });
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

