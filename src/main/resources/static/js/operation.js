/**
 * Operation Records - 操作记录
 *
 * Features:
 *  - Paginated operation history list (server-side paging via Spring Data Page)
 *  - Client-side filter by monitor name (dropdown) + status
 *  - Status rendered via Utils.statusTag(status, 'operation')
 *  - Delete with confirmation (read-mostly view, no add/edit)
 */
(function () {
  'use strict';

  var PAGE_SIZE = 10;

  var state = {
    pageNum: 1,
    list: [],
    total: 0,
    totalPages: 0,
    loading: false,
    filterDeviceId: '',   // selected device id
    filterMonitorName: '', // selected monitor name from dropdown
    statusFilter: '',    // '' = all, '1' = success, '0' = fail
  };

  var monitorValueMap = {}; // monitorId -> {valueType, valueDesc}

  // ── Init ───────────────────────────────────────────────────────
  async function init() {
    if (!(await Auth.requireAuth())) return;
    Layout.init('operation', '操作记录');
    renderSkeleton();
    bindEvents();
    loadMonitorOptions();
    await loadValueDescMap(); // 先加载值描述映射，再加载数据渲染表格
    loadData();
  }

  async function loadValueDescMap() {
    try {
      var list = await MonitorOptions.loadMonitors();
      monitorValueMap = {};
      (list || []).forEach(function (m) {
        monitorValueMap[m.monitorId] = { valueType: m.valueType, valueDesc: m.valueDesc };
      });
    } catch (e) {
      monitorValueMap = {};
    }
  }

  function renderSkeleton() {
    document.getElementById('appContent').innerHTML =
      '<div class="card">' +
        '<div class="card-header">' +
          '<span class="card-title">操作记录</span>' +
          '<button class="btn btn-secondary btn-sm" id="refreshBtn">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>' +
            '<span>刷新</span>' +
          '</button>' +
        '</div>' +
        '<div class="card-body">' +
          '<div class="search-bar" style="flex-wrap:nowrap;white-space:nowrap">' +
            '<select class="form-select" id="deviceSelect" style="width:120px;flex-shrink:0"><option value="">全部设备</option></select>' +
            '<select class="form-select" id="monitorSelect" style="width:130px;flex-shrink:0" disabled><option value="">选择设备</option></select>' +
            '<select class="form-select" id="statusSelect" style="width:90px;flex-shrink:0">' +
              '<option value="">状态</option>' +
              '<option value="1">成功</option>' +
              '<option value="0">失败</option>' +
            '</select>' +
            '<button class="btn btn-primary btn-sm" id="searchBtn" style="flex-shrink:0">搜索</button>' +
            '<button class="btn btn-ghost btn-sm" id="resetBtn" style="flex-shrink:0">重置</button>' +
          '</div>' +
          '<div id="tableContainer"></div>' +
        '</div>' +
      '</div>' +
      '<div id="paginationContainer"></div>';
  }

  async function loadMonitorOptions() {
    await MonitorOptions.setupCascade('deviceSelect', 'monitorSelect', {
      allDeviceLabel: '全部设备',
      monitorValueField: 'monitorName',
    });
  }

  function bindEvents() {
    document.getElementById('searchBtn').addEventListener('click', function () {
      state.filterDeviceId = document.getElementById('deviceSelect').value;
      state.filterMonitorName = document.getElementById('monitorSelect').value;
      state.statusFilter = document.getElementById('statusSelect').value;
      renderTable();
    });

    document.getElementById('resetBtn').addEventListener('click', function () {
      document.getElementById('deviceSelect').value = '';
      document.getElementById('deviceSelect').dispatchEvent(new Event('change'));
      document.getElementById('statusSelect').value = '';
      state.filterDeviceId = '';
      state.filterMonitorName = '';
      state.statusFilter = '';
      renderTable();
    });

    document.getElementById('monitorSelect').addEventListener('change', function () {
      state.filterMonitorName = this.value;
      renderTable();
    });

    document.getElementById('statusSelect').addEventListener('change', function () {
      state.statusFilter = this.value;
      renderTable();
    });

    document.getElementById('refreshBtn').addEventListener('click', function () {
      loadData();
    });

    document.getElementById('paginationContainer').addEventListener('click', onPaginationClick);
  }

  // ── Data Loading ──────────────────────────────────────────────
  async function loadData() {
    state.loading = true;
    renderTable();
    try {
      var res = await API.monitorOperation.page(state.pageNum, PAGE_SIZE);
      state.list = (res && res.content) || [];
      state.total = (res && res.totalElements) || 0;
      state.totalPages = (res && res.totalPages) || 0;
    } catch (err) {
      Toast.error(err.message || '加载操作记录失败');
      state.list = [];
      state.total = 0;
      state.totalPages = 0;
    }
    state.loading = false;

    if (state.totalPages > 0 && state.pageNum > state.totalPages) {
      state.pageNum = state.totalPages;
      return loadData();
    }
    renderTable();
    renderPagination();
  }

  function getFilteredList() {
    var mn = state.filterMonitorName;
    var sf = state.statusFilter;
    return state.list.filter(function (o) {
      var matchName = !mn || (o.monitorName || '') === mn;
      var matchStatus = sf === '' || String(o.status) === sf;
      return matchName && matchStatus;
    });
  }

  // ── Render Table ──────────────────────────────────────────────
  function renderTable() {
    var container = document.getElementById('tableContainer');
    if (!container) return;

    if (state.loading) {
      container.innerHTML =
        '<div class="table-loading"><span class="loading-spinner"></span>' +
        '<span style="margin-left:8px">加载中...</span></div>';
      return;
    }

    var list = getFilteredList();
    if (!list.length) {
      var emptyText = state.filterMonitorName || state.statusFilter !== ''
        ? '没有匹配的操作记录'
        : '暂无操作记录';
      container.innerHTML = renderEmpty(emptyText);
      return;
    }

    container.innerHTML =
      '<div style="overflow-x:auto">' +
      '<table class="data-table">' +
        '<thead><tr>' +
          '<th>ID</th><th>监控点ID</th><th>监控点名称</th>' +
          '<th>操作前值</th><th>操作后值</th><th>状态</th>' +
          '<th>操作人</th><th>操作流水号</th><th>创建时间</th>' +
        '</tr></thead>' +
        '<tbody>' +
          list.map(function (o) {
            var cfg = monitorValueMap[o.monitorId] || {};
            return '<tr>' +
              '<td>' + Utils.escape(o.id) + '</td>' +
              '<td>' + Utils.escape(o.monitorId) + '</td>' +
              '<td>' + Utils.escape(o.monitorName) + '</td>' +
              '<td>' + Utils.renderMonitorValue(o.preValue, cfg.valueType, cfg.valueDesc) + '</td>' +
              '<td>' + Utils.renderMonitorValue(o.value, cfg.valueType, cfg.valueDesc) + '</td>' +
              '<td>' + Utils.statusTag(o.status, 'operation') + '</td>' +
              '<td>' + Utils.escape(o.operator) + '</td>' +
              '<td>' + Utils.escape(o.operationId) + '</td>' +
              '<td>' + Utils.formatDateTime(o.createTime) + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
      '</div>';
  }

  function renderEmpty(text) {
    return '' +
      '<div class="empty-state">' +
        '<svg class="empty-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2">' +
          '<rect x="8" y="16" width="48" height="36" rx="4"/>' +
          '<path d="M8 28h48"/>' +
          '<path d="M24 42h16"/>' +
        '</svg>' +
        '<div class="empty-text">' + text + '</div>' +
      '</div>';
  }

  // ── Render Pagination ─────────────────────────────────────────
  function renderPagination() {
    var container = document.getElementById('paginationContainer');
    if (!container) return;
    if (state.total === 0) { container.innerHTML = ''; return; }

    var current = state.pageNum;
    var total = state.totalPages;
    var pages = getPageNumbers(current, total);
    var start = (current - 1) * PAGE_SIZE + 1;
    var end = Math.min(current * PAGE_SIZE, state.total);

    container.innerHTML =
      '<div class="card-body" style="padding:var(--space-4) var(--space-6) var(--space-6)">' +
      '<div class="pagination">' +
        '<span class="page-info">共 ' + state.total + ' 条，第 ' + start + '-' + end + ' 条</span>' +
        '<button class="page-btn" data-page="prev" ' + (current <= 1 ? 'disabled' : '') + '>上一页</button>' +
        pages.map(function (p) {
          if (p === '...') {
            return '<span class="page-btn" style="border:none;background:none;cursor:default">...</span>';
          }
          return '<button class="page-btn ' + (p === current ? 'active' : '') + '" data-page="' + p + '">' + p + '</button>';
        }).join('') +
        '<button class="page-btn" data-page="next" ' + (current >= total ? 'disabled' : '') + '>下一页</button>' +
      '</div>' +
      '</div>';
  }

  function getPageNumbers(current, total) {
    var pages = [];
    if (total <= 7) {
      for (var i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (current > 4) pages.push('...');
    var start = Math.max(2, current - 1);
    var end = Math.min(total - 1, current + 1);
    for (var j = start; j <= end; j++) pages.push(j);
    if (current < total - 3) pages.push('...');
    pages.push(total);
    return pages;
  }

  function onPaginationClick(e) {
    var btn = e.target.closest('[data-page]');
    if (!btn || btn.disabled) return;
    var page = btn.dataset.page;
    if (page === 'prev') state.pageNum--;
    else if (page === 'next') state.pageNum++;
    else state.pageNum = parseInt(page, 10);
    loadData();
  }

  // ── Boot ──────────────────────────────────────────────────────
  init();
})();
