/**
 * 监控点配置 - Monitor Config Page
 */
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await Auth.requireAuth())) return;
  Layout.init('monitor-config', '监控点配置');
  MonitorConfigPage.init();
});

const MonitorConfigPage = {
  state: {
    pageNum: 1,
    pageSize: 10,
    searchDeviceId: '',
    searchMonitorId: '',
    searchStatus: '',
    editingId: null,
    rawList: [],
    list: [],
    total: 0,
    totalPages: 0,
    loading: false,
  },

  init() {
    this.renderShell();
    this.loadMonitorOptions();
    this.bindEvents();
    this.loadTable();
  },

  async loadMonitorOptions() {
    await MonitorOptions.setupCascade('searchDeviceId', 'searchMonitorId', {
      allDeviceLabel: '全部设备',
      monitorValueField: 'monitorId',
    });
  },

  renderShell() {
    const app = document.getElementById('appContent');
    app.innerHTML = `
      <div class="search-bar">
        <select class="form-select" id="searchDeviceId" style="width:120px;flex-shrink:0"><option value="">全部设备</option></select>
        <select class="form-select" id="searchMonitorId" style="width:130px;flex-shrink:0" disabled><option value="">选择设备</option></select>
        <select class="form-select" id="searchStatus" style="width:90px;flex-shrink:0">
          <option value="">状态</option>
          <option value="ON">启用</option>
          <option value="OFF">禁用</option>
        </select>
        <button class="btn btn-primary" id="btnSearch">搜索</button>
        <button class="btn btn-secondary" id="btnReset">重置</button>
        <button class="btn btn-primary" id="btnAdd" style="margin-left:auto">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          新增监控点
        </button>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0;overflow-x:auto">
          <div id="tableContainer">
            <div class="table-loading"><span class="loading-spinner"></span></div>
          </div>
        </div>
      </div>
      <div id="modalContainer"></div>
    `;
    // Restore select value after render
    const sel = document.getElementById('searchStatus');
    if (sel) sel.value = this.state.searchStatus;
  },

  bindEvents() {
    // Search
    document.getElementById('btnSearch').addEventListener('click', () => {
      this.state.searchDeviceId = document.getElementById('searchDeviceId').value;
      this.state.searchMonitorId = document.getElementById('searchMonitorId').value;
      this.state.searchStatus = document.getElementById('searchStatus').value;
      this.state.pageNum = 1;
      this.loadTable();
    });

    // Monitor change auto-search
    document.getElementById('searchMonitorId').addEventListener('change', () => {
      this.state.searchMonitorId = document.getElementById('searchMonitorId').value;
      this.state.pageNum = 1;
      this.loadTable();
    });

    // Reset
    document.getElementById('btnReset').addEventListener('click', () => {
      this.state.searchDeviceId = '';
      this.state.searchMonitorId = '';
      this.state.searchStatus = '';
      this.state.pageNum = 1;
      document.getElementById('searchDeviceId').value = '';
      document.getElementById('searchDeviceId').dispatchEvent(new Event('change'));
      document.getElementById('searchStatus').value = '';
      this.loadTable();
    });

    // Add
    document.getElementById('btnAdd').addEventListener('click', () => {
      this.openModal('add');
    });
  },

  async loadTable() {
    this.state.loading = true;
    this.renderTableLoading();
    try {
      const hasFilter = this.state.searchDeviceId || this.state.searchMonitorId || this.state.searchStatus !== '';
      if (hasFilter) {
        // 有筛选条件时加载全量数据，确保跨页筛选准确
        const allData = await API.monitorConfig.cache();
        this.state.rawList = allData || [];
      } else {
        const res = await API.monitorConfig.page(this.state.pageNum, this.state.pageSize);
        this.state.rawList = res.content || [];
        this.state.total = res.totalElements || 0;
        this.state.totalPages = res.totalPages || 0;
      }
    } catch (err) {
      Toast.error(err.message || '加载数据失败');
      this.state.rawList = [];
      this.state.total = 0;
      this.state.totalPages = 0;
    } finally {
      this.state.loading = false;
    }
    this.applyFilter();
  },

  applyFilter() {
    let list = [...this.state.rawList];

    // Client-side filter by device ID
    if (this.state.searchDeviceId) {
      list = list.filter(item => item.deviceId === this.state.searchDeviceId);
    }

    // Client-side filter by monitor ID
    if (this.state.searchMonitorId) {
      list = list.filter(item => item.monitorId === this.state.searchMonitorId);
    }

    // Client-side filter by status
    if (this.state.searchStatus !== '') {
      const st = this.state.searchStatus;
      list = list.filter(item => item.status === st);
    }

    // 有筛选条件时，基于全量数据重新计算分页
    const hasFilter = this.state.searchDeviceId || this.state.searchMonitorId || this.state.searchStatus !== '';
    if (hasFilter) {
      this.state.total = list.length;
      this.state.totalPages = Math.ceil(list.length / this.state.pageSize) || 1;
      // 客户端分页：截取当前页
      const start = (this.state.pageNum - 1) * this.state.pageSize;
      this.state.list = list.slice(start, start + this.state.pageSize);
    } else {
      this.state.list = list;
    }

    this.renderTable();
  },

  renderTableLoading() {
    const c = document.getElementById('tableContainer');
    if (c) c.innerHTML = '<div class="table-loading"><span class="loading-spinner"></span></div>';
  },

  renderTable() {
    const container = document.getElementById('tableContainer');
    if (!container) return;

    if (this.state.loading) return;

    if (!this.state.list || this.state.list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </div>
          <div class="empty-text">暂无监控点数据</div>
        </div>
      `;
      this.renderPagination();
      return;
    }

    const rows = this.state.list.map(item => {
      const statusTag = Utils.statusTag(item.status, 'monitor');
      const valueTypeTag = item.valueType === 'FLOAT'
        ? '<span class="tag tag-info">浮点型</span>'
        : '<span class="tag tag-default">布尔型</span>';
      const permissionTag = item.permission === 'r'
        ? '<span class="tag tag-default">只读</span>'
        : '<span class="tag tag-info">读写</span>';
      const isEnabled = item.status === 'ON';
      const switchBtn = isEnabled
        ? `<button class="btn btn-ghost btn-sm text-warning" onclick="MonitorConfigPage.switchStatus('${Utils.escape(item.monitorId)}', 'OFF')">禁用</button>`
        : `<button class="btn btn-ghost btn-sm text-success" onclick="MonitorConfigPage.switchStatus('${Utils.escape(item.monitorId)}', 'ON')">启用</button>`;

      return `
        <tr>
          <td>${Utils.escape(item.id)}</td>
          <td style="font-family:var(--font-mono)">${Utils.escape(item.monitorId)}</td>
          <td>${Utils.escape(item.monitorName)}</td>
          <td style="font-family:var(--font-mono)">${Utils.escape(item.deviceId)}</td>
          <td>${Utils.escape(item.deviceName)}</td>
          <td>${valueTypeTag}</td>
          <td>${permissionTag}</td>
          <td>${statusTag}</td>
          <td style="white-space:nowrap">${Utils.formatDateTime(item.createTime)}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-ghost btn-sm" onclick="MonitorConfigPage.openModal('edit', ${item.id})">编辑</button>
            ${switchBtn}
            <button class="btn btn-ghost btn-sm text-danger" onclick="MonitorConfigPage.remove(${item.id})">删除</button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>监控点ID</th>
            <th>监控点名称</th>
            <th>设备ID</th>
            <th>设备名称</th>
            <th>数值类型</th>
            <th>权限控制</th>
            <th>状态</th>
            <th>创建时间</th>
            <th style="white-space:nowrap">操作</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    this.renderPagination();
  },

  renderPagination() {
    let pagBar = document.getElementById('paginationBar');
    if (!pagBar) {
      pagBar = document.createElement('div');
      pagBar.id = 'paginationBar';
      pagBar.className = 'card-body';
      pagBar.style.paddingTop = '0';
      const card = document.querySelector('.card');
      if (card) card.appendChild(pagBar);
    }

    if (this.state.total === 0) {
      pagBar.innerHTML = '';
      return;
    }

    const current = this.state.pageNum;
    const total = this.state.totalPages;
    const start = (current - 1) * this.state.pageSize + 1;
    const end = Math.min(current * this.state.pageSize, this.state.total);

    let pages = [];
    const maxVisible = 7;
    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 4) pages.push('...');
      const s = Math.max(2, current - 2);
      const e = Math.min(total - 1, current + 2);
      for (let i = s; i <= e; i++) pages.push(i);
      if (current < total - 3) pages.push('...');
      pages.push(total);
    }

    const pageBtns = pages.map(p => {
      if (p === '...') return '<span class="page-btn" style="border:none;background:none;cursor:default">...</span>';
      return `<button class="page-btn ${p === current ? 'active' : ''}" onclick="MonitorConfigPage.goToPage(${p})">${p}</button>`;
    }).join('');

    pagBar.innerHTML = `
      <div class="pagination">
        <span class="page-info">共 ${this.state.total} 条，显示 ${start}-${end}</span>
        <button class="page-btn" ${current <= 1 ? 'disabled' : ''} onclick="MonitorConfigPage.goToPage(${current - 1})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        ${pageBtns}
        <button class="page-btn" ${current >= total ? 'disabled' : ''} onclick="MonitorConfigPage.goToPage(${current + 1})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    `;
  },

  goToPage(page) {
    if (page < 1 || page > this.state.totalPages || page === this.state.pageNum) return;
    this.state.pageNum = page;
    this.loadTable();
  },

  // ── Modal ──
  openModal(mode, id) {
    this.state.editingId = mode === 'edit' ? id : null;
    const isEdit = mode === 'edit';
    const item = isEdit ? this.state.rawList.find(i => i.id === id) : null;

    const container = document.getElementById('modalContainer');
    container.innerHTML = `
      <div class="modal-overlay show" id="configModal">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">${isEdit ? '编辑监控点' : '新增监控点'}</span>
            <button class="modal-close" onclick="MonitorConfigPage.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">监控点ID <span class="required">*</span></label>
              <input type="text" class="form-input" id="modalMonitorId" placeholder="请输入监控点ID" value="${isEdit ? Utils.attr(item.monitorId) : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">监控点名称 <span class="required">*</span></label>
              <input type="text" class="form-input" id="modalMonitorName" placeholder="请输入监控点名称" value="${isEdit ? Utils.attr(item.monitorName) : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">设备ID <span class="required">*</span></label>
              <input type="text" class="form-input" id="modalDeviceId" placeholder="请输入设备ID" value="${isEdit ? Utils.attr(item.deviceId) : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">设备名称 <span class="required">*</span></label>
              <input type="text" class="form-input" id="modalDeviceName" placeholder="请输入设备名称" value="${isEdit ? Utils.attr(item.deviceName) : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">权限控制</label>
              <select class="form-select" id="modalPermission">
                <option value="rw" ${isEdit && item.permission === 'rw' ? 'selected' : !isEdit ? 'selected' : ''}>读写</option>
                <option value="r" ${isEdit && item.permission === 'r' ? 'selected' : ''}>只读</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select class="form-select" id="modalStatus">
                <option value="ON" ${isEdit && item.status === 'ON' ? 'selected' : !isEdit ? 'selected' : ''}>启用</option>
                <option value="OFF" ${isEdit && item.status === 'OFF' ? 'selected' : ''}>禁用</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">数值类型</label>
              <select class="form-select" id="modalValueType">
                <option value="INT" ${isEdit && item.valueType === 'INT' ? 'selected' : !isEdit ? 'selected' : ''}>布尔型</option>
                <option value="FLOAT" ${isEdit && item.valueType === 'FLOAT' ? 'selected' : ''}>浮点型</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">值描述(JSON)</label>
              <input type="text" class="form-input" id="modalValueDesc" placeholder='如 {"1":"故障","0":"正常"}' value="${isEdit && item.valueDesc ? Utils.attr(item.valueDesc) : ''}">
              <span style="font-size:var(--font-size-xs);color:var(--color-text-3)">仅布尔型(INT)有效，key 为取值，value 为对应描述</span>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label">显示方式</label>
              <select class="form-select" id="modalShowType">
                <option value="" ${!isEdit || !item.showType ? 'selected' : ''}>默认(直接显示值)</option>
                <option value="LIGHT" ${isEdit && item.showType === 'LIGHT' ? 'selected' : ''}>指示灯</option>
                <option value="SWITCH" ${isEdit && item.showType === 'SWITCH' ? 'selected' : ''}>开关</option>
              </select>
              <span style="font-size:var(--font-size-xs);color:var(--color-text-3)">指示灯/开关仅对取值 1/0 生效</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="MonitorConfigPage.closeModal()">取消</button>
            <button class="btn btn-primary" id="btnSave">保存</button>
          </div>
        </div>
      </div>
    `;

    // Bind modal events
    const overlay = document.getElementById('configModal');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });
    document.getElementById('btnSave').addEventListener('click', () => this.save());
  },

  closeModal() {
    const modal = document.getElementById('configModal');
    if (modal) modal.remove();
    this.state.editingId = null;
  },

  async save() {
    const data = {
      monitorId: document.getElementById('modalMonitorId').value.trim(),
      monitorName: document.getElementById('modalMonitorName').value.trim(),
      deviceId: document.getElementById('modalDeviceId').value.trim(),
      deviceName: document.getElementById('modalDeviceName').value.trim(),
      permission: document.getElementById('modalPermission').value,
      status: document.getElementById('modalStatus').value,
      valueType: document.getElementById('modalValueType').value,
      valueDesc: document.getElementById('modalValueDesc').value.trim(),
      showType: document.getElementById('modalShowType').value,
    };

    // Validation
    if (!data.monitorId) { Toast.warning('请输入监控点ID'); return; }
    if (!data.monitorName) { Toast.warning('请输入监控点名称'); return; }
    if (!data.deviceId) { Toast.warning('请输入设备ID'); return; }
    if (!data.deviceName) { Toast.warning('请输入设备名称'); return; }

    const saveBtn = document.getElementById('btnSave');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      if (this.state.editingId) {
        await API.monitorConfig.update(this.state.editingId, data);
        Toast.success('监控点更新成功');
      } else {
        await API.monitorConfig.save(data);
        Toast.success('监控点创建成功');
      }
      this.closeModal();
      this.loadTable();
    } catch (err) {
      Toast.error(err.message || '保存失败');
      saveBtn.disabled = false;
      saveBtn.textContent = '保存';
    }
  },

  async switchStatus(monitorId, status) {
    try {
      await API.monitorConfig.switchStatus(monitorId, status);
      Toast.success(status === 'ON' ? '已启用' : '已禁用');
      this.loadTable();
    } catch (err) {
      Toast.error(err.message || '状态切换失败');
    }
  },

  async remove(id) {
    const ok = await confirmDialog('确定要删除该监控点吗？删除后不可恢复。', '删除确认');
    if (!ok) return;
    try {
      await API.monitorConfig.delete(id);
      Toast.success('删除成功');
      // If deleting last item on current page, go to previous page
      if (this.state.list.length === 1 && this.state.pageNum > 1) {
        this.state.pageNum--;
      }
      this.loadTable();
    } catch (err) {
      Toast.error(err.message || '删除失败');
    }
  },
};
