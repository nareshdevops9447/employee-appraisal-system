import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getManagers: () => api.get('/users/managers'),
  getHR: () => api.get('/users/hr'),
  getTeam: () => api.get('/users/team'),
  getMyEmployees: () => api.get('/users/my-employees'),
  updateProfile: (data) => api.put('/users/profile', data),
};

// Departments API
export const departmentsAPI = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// Appraisal Periods API
export const periodsAPI = {
  getAll: () => api.get('/periods'),
  getActive: () => api.get('/periods/active'),
  create: (data) => api.post('/periods', data),
  delete: (id) => api.delete(`/periods/${id}`),
};

// Rating Criteria API
export const criteriaAPI = {
  getAll: (userType) => api.get('/criteria', { params: { userType } }),
};

// Appraisals API
export const appraisalsAPI = {
  getAll: (params) => api.get('/appraisals', { params }),
  getOne: (id) => api.get(`/appraisals/${id}`),
  create: () => api.post('/appraisals'),
  update: (id, data) => api.put(`/appraisals/${id}`, data),
  delete: (id) => api.delete(`/appraisals/${id}`),
  saveRatings: (id, data) => api.post(`/appraisals/${id}/ratings`, data),
  submit: (id) => api.post(`/appraisals/${id}/submit`),
  review: (id, data) => api.post(`/appraisals/${id}/review`, data),
  addComment: (id, comment) => api.post(`/appraisals/${id}/comments`, { comment }),
};

// Goals API
export const goalsAPI = {
  getAll: (params) => api.get('/goals', { params }),
  getOne: (id) => api.get(`/goals/${id}`),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  accept: (id) => api.post(`/goals/${id}/accept`),
  reject: (id, data) => api.post(`/goals/${id}/reject`, data),
  requestModification: (id, data) => api.post(`/goals/${id}/request-modification`, data),
  approveModification: (id, data) => api.post(`/goals/${id}/approve-modification`, data),
  complete: (id) => api.post(`/goals/${id}/complete`),
  getComments: (id) => api.get(`/goals/${id}/comments`),
  addComment: (id, data) => api.post(`/goals/${id}/comments`, data),
  getTeamSummary: () => api.get('/goals/team-summary'),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export default api;
