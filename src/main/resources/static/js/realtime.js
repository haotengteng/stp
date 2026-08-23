/**
 * 实时监控页面逻辑
 * - 自动刷新开关 + 间隔选择器
 * - 最新监控值卡片网格
 * - 实时数据流表格（带新行动画）
 */
(function () {
  'use strict';

  // ── State ──
  const state = {
    autoRefresh: true,
    interval: 10,          // seconds
    timerId: null,
    lastUpdateTime: null,
    previousIds: new Set(), // track previous history IDs for highlight
    previousValues: {},     // track previous monitor latest values for flash
  };

  const STREAM_SIZE = 50;

  // ── Init ──
  document.addEventListener('DOMContentLoaded', function () {
    Layout.init('realtime', '实时监控');
    if (!Auth.isLoggedIn()) return;
    Toast.init();
    renderPageStructure();
    loadAllData();
    startAutoRefresh();
  });

  // ── Page Structure ──
  function renderPageStructure() {
    const content = document.getElementById('appContent');
    content.innerHTML = `
      <!-- Toolbar -->
      <div class="realtime-toolbar">
        <div class="realtime-toolbar-left">
          <label class="switch">
            <input type="checkbox" id="autoRefreshToggle" checked>
            <span class="switch-track"></span>
            <span class="switch-label">自动刷新</span>
          </label>
          <select class="interval-select" id="intervalSelect">
            <option value="5">5 秒</option>
            <option value="10" selected>10 秒</option>
            <option value="30">30 秒</option>
          </select>
          <span class="refresh-indicator" id="refreshIndicator">
            <span class="dot"></span>
            <span id="refreshStatus">运行中</span>
          </span>
        </div>
        <div class="realtime-toolbar-right">
          <span>最后更新:</span>
          <span class="last-update" id="lastUpdateTime">--:--:--</span>
          <button class="btn btn-secondary btn-sm" id="manualRefreshBtn">立即刷新</button>
        </div>
      </div>

      <!-- Latest Monitor Values Grid -->
      <h2 class="section-title">最新监控值</h2>
      <div class="monitor-grid" id="monitorGrid">
        ${renderSkeletonCards(4)}
      </div>

      <!-- Real-time Data Stream Table -->
      <div class="stream-table-wrap">
        <div class="card-header">
          <span class="card-title">实时数据流</span>
          <span class="text-muted" style="font-size:var(--font-size-sm)">最近 ${STREAM_SIZE} 条记录</span>
        </div>
        <div class="stream-table-container">
          <table class="stream-table">
            <thead>
              <tr>
                <th>监控点ID</th>
                <th>监控点名称</th>
                <th>监控值</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody id="streamTableBody">
              <tr><td colspan="4" style="text-align:center;padding:var(--space-8);color:var(--color-text-3)">
                <span class="loading-spinner"></span> 加载中...
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('autoRefreshToggle').addEventListener('change', onToggleAutoRefresh);
    document.getElementById('intervalSelect').addEventListener('change', onIntervalChange);
    document.getElementById('manualRefreshBtn').addEventListener('click', manualRefresh);
  }

  // ── Data Loading ──
  async function loadAllData() {
    await Promise.all([
      loadOverview(),
      loadRealtimeStream(),
    ]);
    updateLastUpdateTime();
  }

  async function loadOverview() {
    try {
      const data = await API.dashboard.overview();
      renderMonitorGrid(data.latestMonitorValues || []);
    } catch (err) {
      Toast.error('加载监控数据失败: ' + err.message);
      document.getElementById('monitorGrid').innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:var(--space-10);color:var(--color-danger)">数据加载失败</div>';
    }
  }

  async function loadRealtimeStream() {
    try {
      const list = await API.dashboard.realtime(STREAM_SIZE);
      renderStreamTable(list || []);
    } catch (err) {
      Toast.error('加载实时数据流失败: ' + err.message);
      document.getElementById('streamTableBody').innerHTML =
        '<tr><td colspan="4" style="text-align:center;padding:var(--space-8);color:var(--color-danger)">数据加载失败</td></tr>';
    }
  }

  // ── Render: Monitor Grid ──
  function renderSkeletonCards(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton-line" style="width:60%;height:16px;margin-bottom:12px"></div>
          <div class="skeleton-line" style="width:80%;height:28px;margin-bottom:8px"></div>
          <div class="skeleton-line" style="width:40%;height:12px"></div>
        </div>
      `;
    }
    return html;
  }

  function renderMonitorGrid(monitors) {
    const grid = document.getElementById('monitorGrid');
    if (!monitors || monitors.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1" class="empty-state">
          <div class="empty-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div class="empty-text">暂无监控数据</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = monitors.map(m => {
      const hasValue = m.latestValue !== null && m.latestValue !== undefined && m.latestValue !== '';
      const valueChanged = state.previousValues[m.monitorId] && state.previousValues[m.monitorId] !== m.latestValue;
      const flashClass = valueChanged ? 'value-updated' : '';
      state.previousValues[m.monitorId] = m.latestValue;

      return `
        <div class="monitor-card" data-monitor-id="${Utils.escape(m.monitorId)}">
          <div class="monitor-card-header">
            <span class="monitor-card-name">${Utils.escape(m.monitorName || m.monitorId)}</span>
            <span class="monitor-card-device">${Utils.escape(m.deviceName || m.deviceId || '未知设备')}</span>
          </div>
          <div class="monitor-card-value ${hasValue ? flashClass : 'no-data'}">
            ${hasValue ? Utils.escape(m.latestValue) : '暂无数据'}
          </div>
          <div class="monitor-card-time">
            ${m.updateTime ? Utils.formatDateTime(m.updateTime) : '--'}
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Render: Stream Table ──
  function renderStreamTable(records) {
    const tbody = document.getElementById('streamTableBody');
    if (!records || records.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="4" style="text-align:center;padding:var(--space-8);color:var(--color-text-3)">
          暂无实时数据
        </td></tr>
      `;
      return;
    }

    // Determine new rows (IDs not seen in previous render)
    const currentIds = new Set(records.map(r => r.id));
    const newIds = new Set();
    for (const id of currentIds) {
      if (!state.previousIds.has(id)) newIds.add(id);
    }
    state.previousIds = currentIds;

    tbody.innerHTML = records.map(r => {
      const isNew = newIds.has(r.id);
      return `
        <tr class="${isNew ? 'row-new' : ''}">
          <td class="col-id">${Utils.escape(r.monitorId)}</td>
          <td>${Utils.escape(r.monitorName)}</td>
          <td class="col-value">${Utils.escape(r.monitorValue)}</td>
          <td class="col-time">${Utils.formatDateTime(r.createTime)}</td>
        </tr>
      `;
    }).join('');
  }

  // ── Auto Refresh ──
  function startAutoRefresh() {
    stopAutoRefresh();
    if (state.autoRefresh) {
      state.timerId = setInterval(() => {
        loadAllData();
      }, state.interval * 1000);
    }
  }

  function stopAutoRefresh() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function onToggleAutoRefresh(e) {
    state.autoRefresh = e.target.checked;
    const indicator = document.getElementById('refreshIndicator');
    const statusText = document.getElementById('refreshStatus');
    if (state.autoRefresh) {
      startAutoRefresh();
      indicator.classList.remove('paused');
      statusText.textContent = '运行中';
    } else {
      stopAutoRefresh();
      indicator.classList.add('paused');
      statusText.textContent = '已暂停';
    }
  }

  function onIntervalChange(e) {
    state.interval = parseInt(e.target.value, 10);
    if (state.autoRefresh) {
      startAutoRefresh();
      Toast.success('刷新间隔已设置为 ' + state.interval + ' 秒');
    }
  }

  function manualRefresh() {
    loadAllData();
    Toast.success('数据已刷新');
  }

  function updateLastUpdateTime() {
    state.lastUpdateTime = new Date();
    const el = document.getElementById('lastUpdateTime');
    if (el) {
      const h = String(state.lastUpdateTime.getHours()).padStart(2, '0');
      const m = String(state.lastUpdateTime.getMinutes()).padStart(2, '0');
      const s = String(state.lastUpdateTime.getSeconds()).padStart(2, '0');
      el.textContent = `${h}:${m}:${s}`;
    }
  }
})();
