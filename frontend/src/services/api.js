import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth
export const login = (username, password) =>
  api.post('/auth/token/', { username, password });
export const register = (data) => api.post('/auth/register/', data);
export const getMe = () => api.get('/auth/me/');

// ── Incidents
export const getIncidents = (params) => api.get('/incidents/', { params });
export const getIncident = (id) => api.get(`/incidents/${id}/`);
export const getIncidentTimeline = (id) => api.get(`/incidents/${id}/timeline/`);
export const approveIncident = (id, resourceIds) =>
  api.post(`/incidents/${id}/approve/`, { resource_ids: resourceIds });
export const closeIncident = (id, data = {}) => api.post(`/incidents/${id}/close/`, data);

// ── Reports
export const submitReport = (formData) =>
  api.post('/reports/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getMyReports = () => api.get('/reports/mine/');
export const getAllReports = (params) => api.get('/reports/all/', { params });
export const securityApproveReport = (reportId, data) =>
  api.post(`/reports/${reportId}/security-approve/`, data);
export const updateReportStatus = (reportId, data) =>
  api.patch(`/reports/${reportId}/status/`, data);

// ── Separation & Containment Tasks
export const getSeparationTasks = (incidentId) =>
  api.get(`/incidents/${incidentId}/separation-tasks/`);
export const getAllSeparationTasks = (params) =>
  api.get('/separation-tasks/', { params });
export const createSeparationTask = (incidentId, data) =>
  api.post(`/incidents/${incidentId}/separation-tasks/`, data);
export const updateSeparationTaskStatus = (taskId, data) =>
  api.patch(`/separation-tasks/${taskId}/status/`, data);


// ── Cameras
export const getCameras = () => api.get('/cameras/');
export const getIncidentCameras = (id) => api.get(`/incidents/${id}/cameras/`);
export const getCctvEvents = () => api.get('/cameras/events/');
export const createCctvEvent = (data) => api.post('/cameras/events/create/', data);

// ── Resources
export const getResources = () => api.get('/resources/');
export const getRecommendation = (incidentId) =>
  api.get(`/incidents/${incidentId}/recommendation/`);
export const assignResource = (incidentId, data) =>
  api.post(`/incidents/${incidentId}/assign/`, data);
export const revokeAssignment = (assignmentId, data = {}) =>
  api.post(`/assignments/${assignmentId}/revoke/`, data);
export const completeAssignment = (assignmentId, data) =>
  api.post(`/assignments/${assignmentId}/complete/`, data);
export const updateAssignmentStatus = (assignmentId, data) =>
  api.patch(`/assignments/${assignmentId}/status/`, data);

// ── Analytics
export const getAnalyticsSummary = (params) => api.get('/analytics/summary/', { params });

export default api;


