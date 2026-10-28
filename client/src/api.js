import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API || 'http://localhost:5000/api' });
api.interceptors.request.use(c => { const t = localStorage.getItem('t'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
export const err = e => e.response?.data?.message || 'Something went wrong. Try again.';
