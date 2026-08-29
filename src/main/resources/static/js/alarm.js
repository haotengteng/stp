/**
 * 告警管理页面逻辑
 * - 告警统计卡片
 * - 告警列表（分页 + 状态筛选 + 搜索）
 * - 处理告警操作
 */
(function () {
  'use strict';

  // ── 状态 ──
  const state = {
    pageNum: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    loading: false,
    list: [],
    filterStatus: '',       // '' 全部, 0 未处理, 1 已处理
    searchMonitorName: '',
    stats: { total: 0, unhandled: 0, processed: 0 },
  };

  // ── 初始化 ──
  document.addEventListener('DOMContentLoaded', async function () {
    if (!(await Auth.requireAuth())) return;
    Layout.init('alarm', '告警管理');
    Toast.init();
    renderShell();
    loadMonitorOptions();
    loadStats();
    loadList();
    bindEvents();
  });

  // ── 加载设备+监控点级联下拉 ──
  async function loadMonitorOptions() {
    await MonitorOptions.setupCascade('deviceSelect', 'searchMonitorSelect', {
      allDeviceLabel: '全部设备',
      monitorValueField: 'monitorName',
    });
  }

  // ── 页面结构 ──
  function renderShell() {
    document.getElementById('appContent').innerHTML = `
      <!-- 统计卡片 -->
      <div class="grid grid-cols-3 gap-4 mb-6" id="statsRow">
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--primary-2);color:var(--color-primary)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </div>
          <div class="stat-label">总告警</div>
          <div class="stat-value" id="statTotal">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--danger-2);color:var(--color-danger)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div class="stat-label">未处理</div>
          <div class="stat-value" id="statUnhandled" style="color:var(--color-danger)">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:var(--success-2);color:var(--color-success)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-label">已处理</div>
          <div class="stat-value" id="statProcessed" style="color:var(--color-success)">0</div>
        </div>
      </div>

      <!-- 告警列表 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">告警列表</span>
          <button class="btn btn-secondary btn-sm" id="refreshBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            <span>刷新</span>
          </button>
        </div>
        <div class="card-body">
          <!-- 搜索栏 -->
          <div class="search-bar" style="flex-wrap:nowrap;white-space:nowrap">
            <select class="form-select" id="deviceSelect" style="width:120px;flex-shrink:0"><option value="">全部设备</option></select>
            <select class="form-select" id="searchMonitorSelect" style="width:130px;flex-shrink:0" disabled><option value="">选择设备</option></select>
            <select class="form-select" id="statusFilter" style="width:90px;flex-shrink:0">
              <option value="">状态</option>
              <option value="0">未处理</option>
              <option value="1">已处理</option>
            </select>
            <button class="btn btn-primary btn-sm" id="searchBtn" style="flex-shrink:0">搜索</button>
            <button class="btn btn-ghost btn-sm" id="resetBtn" style="flex-shrink:0">重置</button>
          </div>

          <!-- 表格 -->
          <div style="overflow-x:auto">
            <table class="data-table" id="alarmTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>监控点ID</th>
                  <th>监控点名称</th>
                  <th>告警消息</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="alarmTbody">
                <tr><td colspan="7" class="table-loading"><span class="loading-spinner"></span></td></tr>
              </tbody>
            </table>
          </div>

          <!-- 分页 -->
          <div class="pagination" id="pagination"></div>
        </div>
      </div>
    `;
  }

  // ── 加载统计 ──
  async function loadStats() {
    try {
      const data = await API.alarm.statistics();
      state.stats = data || { total: 0, unhandled: 0, processed: 0 };
      document.getElementById('statTotal').textContent = state.stats.total || 0;
      document.getElementById('statUnhandled').textContent = state.stats.unhandled || 0;
      document.getElementById('statProcessed').textContent = state.stats.processed || 0;
    } catch (err) {
      Toast.error('加载统计失败: ' + err.message);
    }
  }

  // ── 加载列表 ──
  async function loadList() {
    state.loading = true;
    const tbody = document.getElementById('alarmTbody');
    tbody.innerHTML = '<tr><td colspan="7" class="table-loading"><span class="loading-spinner"></span></td></tr>';

    try {
      const result = await API.alarm.page(state.pageNum, state.pageSize);
      state.list = result.content || [];
      state.total = result.totalElements || 0;
      state.totalPages = result.totalPages || 0;

      // 客户端过滤
      let filtered = state.list;
      if (state.filterStatus !== '') {
        const fs = parseInt(state.filterStatus);
        filtered = filtered.filter(function (item) { return item.status === fs; });
      }
      if (state.searchMonitorName) {
        const kw = state.searchMonitorName.toLowerCase();
        filtered = filtered.filter(function (item) {
          return (item.monitorName || '').toLowerCase().includes(kw);
        });
      }

      renderTable(filtered);
      renderPagination();
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-text">加载失败: ' + Utils.escape(err.message) + '</div></td></tr>';
      Toast.error('加载告警列表失败: ' + err.message);
    } finally {
      state.loading = false;
    }
  }

  // ── 渲染表格 ──
  function renderTable(list) {
    const tbody = document.getElementById('alarmTbody');
    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="7">
          <div class="empty-state">
            <div class="empty-icon"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg></div>
            <div class="empty-text">暂无告警记录</div>
          </div>
        </td></tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(function (item) {
      const isUnhandled = item.status === 0;
      return `
        <tr style="${isUnhandled ? 'background:var(--danger-1)' : ''}">
          <td>${item.id}</td>
          <td style="font-family:var(--font-mono);font-size:var(--font-size-sm)">${Utils.escape(item.monitorId)}</td>
          <td>${Utils.escape(item.monitorName)}</td>
          <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${Utils.escape(item.message || '')}">${Utils.escape(item.message || '-')}</td>
          <td>${Utils.statusTag(item.status, 'alarm')}</td>
          <td style="font-size:var(--font-size-sm);white-space:nowrap">${Utils.formatDateTime(item.createTime)}</td>
          <td>
            <div class="flex gap-2">
              ${isUnhandled ? `
                <button class="btn btn-sm btn-primary" onclick="processAlarm(${item.id}, 1)">处理</button>
              ` : `
                <span class="text-muted" style="font-size:var(--font-size-sm)">已处理</span>
              `}
              <button class="btn btn-sm btn-danger" onclick="deleteAlarm(${item.id})">删除</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ── 渲染分页 ──
  function renderPagination() {
    const el = document.getElementById('pagination');
    if (state.total === 0) { el.innerHTML = ''; return; }

    const start = (state.pageNum - 1) * state.pageSize + 1;
    const end = Math.min(state.pageNum * state.pageSize, state.total);

    let pages = '';
    const maxVisible = 7;
    let startPage = Math.max(1, state.pageNum - 3);
    let endPage = Math.min(state.totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

    pages += `<span class="page-info">共 ${state.total} 条，第 ${start}-${end} 条</span>`;
    pages += `<button class="page-btn" ${state.pageNum <= 1 ? 'disabled' : ''} onclick="goToPage(${state.pageNum - 1})">上一页</button>`;

    if (startPage > 1) {
      pages += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
      if (startPage > 2) pages += '<span style="padding:0 4px;color:var(--color-text-3)">···</span>';
    }
    for (let i = startPage; i <= endPage; i++) {
      pages += `<button class="page-btn ${i === state.pageNum ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    if (endPage < state.totalPages) {
      if (endPage < state.totalPages - 1) pages += '<span style="padding:0 4px;color:var(--color-text-3)">···</span>';
      pages += `<button class="page-btn" onclick="goToPage(${state.totalPages})">${state.totalPages}</button>`;
    }

    pages += `<button class="page-btn" ${state.pageNum >= state.totalPages ? 'disabled' : ''} onclick="goToPage(${state.pageNum + 1})">下一页</button>`;
    el.innerHTML = pages;
  }

  // ── 事件绑定 ──
  function bindEvents() {
    document.getElementById('refreshBtn').addEventListener('click', function () {
      loadStats();
      loadList();
    });

    document.getElementById('searchBtn').addEventListener('click', function () {
      state.searchMonitorName = document.getElementById('searchMonitorSelect').value;
      state.filterStatus = document.getElementById('statusFilter').value;
      state.pageNum = 1;
      loadList();
    });

    document.getElementById('resetBtn').addEventListener('click', function () {
      document.getElementById('deviceSelect').value = '';
      document.getElementById('deviceSelect').dispatchEvent(new Event('change'));
      document.getElementById('statusFilter').value = '';
      state.searchMonitorName = '';
      state.filterStatus = '';
      state.pageNum = 1;
      loadList();
    });

    document.getElementById('searchMonitorSelect').addEventListener('change', function () {
      state.searchMonitorName = this.value;
      state.pageNum = 1;
      loadList();
    });

    document.getElementById('statusFilter').addEventListener('change', function () {
      state.filterStatus = this.value;
      state.pageNum = 1;
      loadList();
    });
  }

  // ── 全局方法 ──
  window.processAlarm = async function (id, status) {
    const ok = await confirmDialog('确认将此告警标记为"已处理"吗？', '确认操作');
    if (!ok) return;

    try {
      await API.alarm.process(id, status);
      Toast.success('处理成功');
      loadStats();
      loadList();
    } catch (err) {
      Toast.error(label + '失败: ' + err.message);
    }
  };

  window.deleteAlarm = async function (id) {
    const ok = await confirmDialog('确认删除此告警记录吗？此操作不可恢复。', '删除确认');
    if (!ok) return;

    try {
      await API.alarm.delete(id);
      Toast.success('删除成功');

      // 如果当前页只剩一条且不是第一页，回退一页
      const remaining = state.list.length - 1;
      if (remaining === 0 && state.pageNum > 1) state.pageNum--;

      loadStats();
      loadList();
    } catch (err) {
      Toast.error('删除失败: ' + err.message);
    }
  };

  window.goToPage = function (page) {
    if (page < 1 || page > state.totalPages || page === state.pageNum) return;
    state.pageNum = page;
    loadList();
  };
})();
