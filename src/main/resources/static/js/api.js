/**
 * API Client - 统一请求封装
 * 基于 fetch API，统一处理认证、错误、分页
 */
const API = {
  baseUrl: '',

  getToken() {
    return localStorage.getItem('stp_token') || '';
  },

  async request(method, url, params, body) {
    const headers = {};
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let fullUrl = this.baseUrl + url;
    if (params) {
      const search = new URLSearchParams(params).toString();
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + search;
    }

    const options = { method, headers, credentials: 'same-origin' };
    if (body !== undefined && body !== null) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    try {
      const resp = await fetch(fullUrl, options);
      const data = await resp.json();
      if (data.code === 200) return data.data;
      throw new Error(data.msg || '请求失败');
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.message === 'NetworkError') {
        throw new Error('网络连接失败，请检查后端服务是否启动');
      }
      throw err;
    }
  },

  get(url, params) { return this.request('GET', url, params); },
  post(url, body) { return this.request('POST', url, null, body); },
  put(url, body) { return this.request('PUT', url, null, body); },
  delete(url) { return this.request('DELETE', url); },

  // 登录接口使用 @RequestParam
  async login(username, password) {
    const params = new URLSearchParams({ username, password });
    const resp = await fetch(this.baseUrl + '/api/user/login?' + params.toString(), {
      method: 'POST',
      credentials: 'same-origin'
    });
    const data = await resp.json();
    if (data.code === 200) return data.data;
    throw new Error(data.msg || '登录失败');
  },

  // ── User API ──
  user: {
    page: (pageNum, pageSize) => API.get('/api/user/page', { pageNum, pageSize }),
    get: (id) => API.get(`/api/user/${id}`),
    save: (data) => API.post('/api/user', data),
    update: (id, data) => API.put(`/api/user/${id}`, data),
    delete: (id) => API.delete(`/api/user/${id}`),
  },

  // ── Device API ──
  device: {
    page: (pageNum, pageSize) => API.get('/api/device/page', { pageNum, pageSize }),
    get: (id) => API.get(`/api/device/${id}`),
    save: (data) => API.post('/api/device', data),
    update: (id, data) => API.put(`/api/device/${id}`, data),
    delete: (id) => API.delete(`/api/device/${id}`),
  },

  // ── Monitor Config API ──
  monitorConfig: {
    page: (pageNum, pageSize) => API.get('/api/monitor-config/page', { pageNum, pageSize }),
    get: (id) => API.get(`/api/monitor-config/${id}`),
    save: (data) => API.post('/api/monitor-config', data),
    update: (id, data) => API.put(`/api/monitor-config/${id}`, data),
    delete: (id) => API.delete(`/api/monitor-config/${id}`),
    // switchStatus 使用 @RequestParam status；monitorId 含 # 等字符，需 URL 编码
    switchStatus: (monitorId, status) => API.post(`/api/monitor-config/${encodeURIComponent(monitorId)}/switch?status=${status}`),
    reload: () => API.post('/api/monitor-config/reload'),
    // 获取所有监控点缓存（用于下拉选择）
    cache: () => API.get('/api/monitor-config/cache'),
  },

  // ── Monitor History API ──
  monitorHistory: {
    page: (pageNum, pageSize, filters) => API.get('/api/monitor-history/page', { pageNum, pageSize, ...(filters || {}) }),
    latest: (monitorId) => API.get('/api/monitor-history/latest', { monitorId }),
    chart: (monitorId, hours) => API.get('/api/monitor-history/chart', { monitorId, hours: hours || 24 }),
    save: (data) => API.post('/api/monitor-history', data),
    delete: (id) => API.delete(`/api/monitor-history/${id}`),
  },

  // ── Monitor Operation API ──
  monitorOperation: {
    page: (pageNum, pageSize) => API.get('/api/monitor-operation/page', { pageNum, pageSize }),
    get: (id) => API.get(`/api/monitor-operation/${id}`),
    save: (data) => API.post('/api/monitor-operation', data),
    delete: (id) => API.delete(`/api/monitor-operation/${id}`),
  },

  // ── Alarm Record API ──
  alarm: {
    page: (pageNum, pageSize) => API.get('/api/alarm/page', { pageNum, pageSize }),
    get: (id) => API.get(`/api/alarm/${id}`),
    save: (data) => API.post('/api/alarm', data),
    update: (id, data) => API.put(`/api/alarm/${id}`, data),
    delete: (id) => API.delete(`/api/alarm/${id}`),
    // process 使用 @RequestParam status
    process: (id, status) => API.post(`/api/alarm/${id}/process?status=${status}`),
    statistics: () => API.get('/api/alarm/statistics'),
    todayCount: () => API.get('/api/alarm/today-count'),
  },

  // ── Dashboard API ──
  dashboard: {
    overview: () => API.get('/api/dashboard/overview'),
    realtime: (size) => API.get('/api/dashboard/realtime', { size: size || 50 }),
    alarms: (size) => API.get('/api/dashboard/alarms', { size: size || 20 }),
  },

  // ── MQTT API ──
  mqtt: {
    publish: (monitorId, value) => API.post('/api/mqtt/publish', { monitorId, value }),
  },
};
