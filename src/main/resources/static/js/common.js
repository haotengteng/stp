/**
 * Common Utilities - 认证、布局注入、工具函数
 */

// ── 认证管理 ──
const Auth = {
  isLoggedIn() {
    const user = localStorage.getItem('stp_user');
    return !!user;
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('stp_user')) || null;
    } catch { return null; }
  },

  setUser(user) {
    localStorage.setItem('stp_user', JSON.stringify(user));
  },

  setToken(token) {
    localStorage.setItem('stp_token', token);
  },

  logout() {
    localStorage.removeItem('stp_user');
    localStorage.removeItem('stp_token');
    window.location.href = '/login.html';
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  }
};

// ── Toast 通知 ──
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(msg, type = 'info', duration = 3000) {
    this.init();
    const icons = {
      success: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.5 4.5L6 12L2.5 8.5" stroke="#2A814B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="#D7312A" stroke-width="2" stroke-linecap="round"/></svg>',
      warning: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2L1 14h14L8 2z" stroke="#BD7E00" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 7v3" stroke="#BD7E00" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="12" r="0.8" fill="#BD7E00"/></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#1664FF" stroke-width="1.5"/><path d="M8 5v4" stroke="#1664FF" stroke-width="2" stroke-linecap="round"/><circle cx="8" cy="11.5" r="0.8" fill="#1664FF"/></svg>',
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || icons.info}<span>${msg}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  warning(msg) { this.show(msg, 'warning'); },
};

// ── 确认对话框 ──
function confirmDialog(message, title = '确认操作') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal" style="width:400px">
        <div class="modal-header">
          <span class="modal-title">${title}</span>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove(); resolve(false);">&times;</button>
        </div>
        <div class="modal-body" style="padding:var(--space-6)">
          <p style="font-size:var(--font-size-md); color:var(--color-text-2); line-height:1.6;">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirmCancel">取消</button>
          <button class="btn btn-primary" id="confirmOk">确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = (result) => { overlay.remove(); resolve(result); };
    overlay.querySelector('#confirmCancel').onclick = () => close(false);
    overlay.querySelector('#confirmOk').onclick = () => close(true);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
  });
}

// ── 工具函数 ──
const Utils = {
  formatDateTime(dt) {
    if (!dt) return '-';
    if (Array.isArray(dt)) {
      const [y, mo, d, h, mi, s] = dt;
      return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}:${String(s||0).padStart(2,'0')}`;
    }
    if (typeof dt === 'string') return dt.replace('T', ' ').slice(0, 19);
    return String(dt);
  },

  formatDate(dt) {
    const full = this.formatDateTime(dt);
    return full.split(' ')[0];
  },

  formatTime(dt) {
    const full = this.formatDateTime(dt);
    return full.split(' ')[1] || '-';
  },

  statusTag(status, type = 'monitor') {
    const maps = {
      monitor: { 0: { cls: 'tag-default', text: '禁用' }, 1: { cls: 'tag-success', text: '启用' } },
      operation: { 0: { cls: 'tag-danger', text: '失败' }, 1: { cls: 'tag-success', text: '成功' } },
      alarm: { 0: { cls: 'tag-danger', text: '未处理' }, 1: { cls: 'tag-success', text: '已处理' } },
    };
    const map = maps[type] || maps.monitor;
    const item = map[status] || { cls: 'tag-default', text: '未知' };
    return `<span class="tag ${item.cls}">${item.text}</span>`;
  },

  escape(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  getInitials(name) {
    if (!name) return 'U';
    return name.slice(0, 1).toUpperCase();
  },
};

// ── 监控点下拉选项加载器 ──
const MonitorOptions = {
  _cache: null,
  _promise: null,

  /**
   * 获取所有监控点列表（带缓存）
   * @returns {Promise<Array<{monitorId, monitorName, deviceId, deviceName}>>}
   */
  load() {
    if (this._cache) return Promise.resolve(this._cache);
    if (this._promise) return this._promise;
    this._promise = API.monitorConfig.cache().then(list => {
      this._cache = (list || []).map(item => ({
        monitorId: item.monitorId,
        monitorName: item.monitorName,
        deviceId: item.deviceId,
        deviceName: item.deviceName,
      }));
      return this._cache;
    }).catch(err => {
      Toast.error('加载监控点列表失败: ' + err.message);
      this._cache = [];
      return [];
    }).finally(() => {
      this._promise = null;
    });
    return this._promise;
  },

  /**
   * 填充 select 下拉框
   * @param {HTMLSelectElement} selectEl - 目标 select 元素
   * @param {string} allLabel - 全部选项的标签，传 null 则不添加全部选项
   * @param {string} valueField - 选项 value 使用的字段: 'monitorId' | 'monitorName'
   */
  async fillSelect(selectEl, allLabel = '监控点', valueField = 'monitorId') {
    if (!selectEl) return;
    const list = await this.load();
    const currentVal = selectEl.value;
    let html = '';
    if (allLabel !== null) {
      html += `<option value="">${allLabel}</option>`;
    }
    html += list.map(m => `<option value="${Utils.escape(m[valueField])}">${Utils.escape(m.monitorName)}</option>`).join('');
    selectEl.innerHTML = html;
    // 尝试恢复之前选中的值
    if (currentVal) selectEl.value = currentVal;
  },

  /** 清除缓存（增删改后调用以刷新下拉数据） */
  refresh() {
    this._cache = null;
  },
};

// ── 布局注入 ──
const Layout = {
  navItems: [
    { section: '监控' },
    { id: 'realtime', href: '/pages/realtime.html', label: '实时监控', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>' },
    { id: 'screen', href: '/pages/screen.html', label: '数据大屏', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>' },
    { section: '管理' },
    { id: 'user', href: '/pages/user.html', label: '用户管理', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>' },
    { id: 'monitor-config', href: '/pages/monitor-config.html', label: '监控点配置', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' },
    { id: 'alarm', href: '/pages/alarm.html', label: '告警管理', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>' },
    { section: '数据' },
    { id: 'monitor-history', href: '/pages/monitor-history.html', label: '监控历史', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 6-6"/></svg>' },
    { id: 'operation', href: '/pages/operation.html', label: '操作记录', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>' },
  ],

  init(activeId, pageTitle) {
    if (!Auth.requireAuth()) return;

    const user = Auth.getUser();
    const initials = Utils.getInitials(user?.username);

    const navHtml = this.navItems.map(item => {
      if (item.section) {
        return `<div class="sidebar-section-label">${item.section}</div>`;
      }
      const active = item.id === activeId ? 'active' : '';
      return `<a href="${item.href}" class="sidebar-nav-item ${active}">
        <span class="nav-icon">${item.icon}</span>
        <span>${item.label}</span>
      </a>`;
    }).join('');

    const html = `
      <div class="app-shell">
        <aside class="sidebar">
          <div class="sidebar-logo">
            <div class="logo-icon">S</div>
            <span class="logo-text">STP 监控平台</span>
          </div>
          <nav class="sidebar-nav">${navHtml}</nav>
          <div class="sidebar-footer">
            <div class="topbar-user" style="width:100%" onclick="Auth.logout()">
              <div class="user-avatar">${initials}</div>
              <div>
                <div style="font-size:var(--font-size-md);font-weight:var(--font-weight-medium)">${Utils.escape(user?.username || '用户')}</div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-3)">退出登录</div>
              </div>
            </div>
          </div>
        </aside>
        <div class="main-area">
          <header class="topbar">
            <div class="topbar-left">
              <h1 class="topbar-title">${pageTitle}</h1>
            </div>
            <div class="topbar-right">
              <div class="topbar-user" onclick="Auth.logout()">
                <div class="user-avatar">${initials}</div>
                <span class="user-name">${Utils.escape(user?.username || '用户')}</span>
              </div>
            </div>
          </header>
          <main class="content-area" id="appContent"></main>
        </div>
      </div>
    `;

    document.body.innerHTML = html;
    Toast.init();
  },
};
