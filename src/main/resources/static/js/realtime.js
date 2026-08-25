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
    collapsedMap: {},       // deviceName -> whether its accordion is collapsed
  };

  const STREAM_SIZE = 50;
  let monitorConfigMap = {}; // monitorId -> {valueType, valueDesc}
  let monitorsCache = [];    // 最近一次 overview 监控点数据，用于开关切换后局部更新

  // ── Init ──
  document.addEventListener('DOMContentLoaded', function () {
    Layout.init('realtime', '实时监控');
    if (!Auth.isLoggedIn()) return;
    Toast.init();
    renderPageStructure();
    loadAllData();
    startAutoRefresh();
    // 预加载监控点配置，用于实时数据流按值显示描述
    MonitorOptions.loadMonitors().then(list => {
      monitorConfigMap = {};
      (list || []).forEach(m => { monitorConfigMap[m.monitorId] = m; });
    });
    // 开关点击：可写(权限非 r)的开关可直接切换，写历史记录同步数据库
    document.addEventListener('click', function (e) {
      const sw = e.target.closest('.monitor-switch.editable');
      if (!sw) return;
      const card = sw.closest('.monitor-card');
      if (!card) return;
      if (card.dataset.switching === '1') return;
      const monitorId = card.getAttribute('data-monitor-id');
      const monitorName = card.getAttribute('data-monitor-name');
      const current = sw.getAttribute('data-value');
      if (current !== '1' && current !== '0') return;
      toggleSwitch(card, monitorId, monitorName, current === '1' ? '0' : '1');
    });
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
    monitorsCache = monitors || [];
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

    // Group monitors by device
    const groups = new Map();
    for (const m of monitors) {
      const deviceName = m.deviceName || m.deviceId || '未知设备';
      if (!groups.has(deviceName)) groups.set(deviceName, []);
      groups.get(deviceName).push(m);
    }

    const renderCard = (m) => {
      const hasValue = m.latestValue !== null && m.latestValue !== undefined && m.latestValue !== '';
      const valueChanged = state.previousValues[m.monitorId] && state.previousValues[m.monitorId] !== m.latestValue;
      const flashClass = valueChanged ? 'value-updated' : '';
      state.previousValues[m.monitorId] = m.latestValue;

      const raw = m.latestValue;
      const desc = hasValue ? Utils.renderMonitorValue(raw, m.valueType, m.valueDesc) : '';

      let valueHtml = '暂无数据';
      if (hasValue) {
        // show_type = LIGHT：monitor_value 为 1 显示红灯，为 0 显示绿灯
        if (m.showType === 'LIGHT' && (raw === '1' || raw === '0')) {
          const isOn = raw === '1';
          valueHtml = `<span class="monitor-lamp ${isOn ? 'red' : 'green'}">` +
            `<svg class="lamp" viewBox="0 0 24 24" fill="currentColor"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.79 3.09-2.15 4.1z"/></svg>` +
            `<span class="lamp-text">${Utils.escape(desc || raw)}</span></span>`;
        }
        // show_type = SWITCH：monitor_value 为 1 开关打开，为 0 开关关闭
        else if (m.showType === 'SWITCH' && (raw === '1' || raw === '0')) {
          const isOn = raw === '1';
          // 权限 r-只读(蒙层禁止更改)；其他(rw/w)可点击切换
          const editable = m.permission !== 'r';
          // 左右两侧固定显示 value_desc 的描述（与 monitor_value 无关）：
          // 左标签固定显示 1 对应的描述，右标签固定显示 0 对应的描述
          let leftLabel = '';
          let rightLabel = '';
          if (m.valueType === 'INT' && m.valueDesc) {
            try {
              const descMap = typeof m.valueDesc === 'string' ? JSON.parse(m.valueDesc) : m.valueDesc;
              const d1 = descMap && descMap['1'];
              const d0 = descMap && descMap['0'];
              leftLabel = (d1 !== undefined && d1 !== null) ? d1 : '';
              rightLabel = (d0 !== undefined && d0 !== null) ? d0 : '';
            } catch (e) { /* 忽略解析失败 */ }
          }
          if (!leftLabel) leftLabel = '1';
          if (!rightLabel) rightLabel = '0';
          const mask = editable ? '' :
            `<span class="switch-mask" title="只读，不可更改"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>`;
          valueHtml = `<span class="monitor-switch ${isOn ? 'on' : 'off'} ${editable ? 'editable' : 'readonly'}" data-value="${raw}" title="${editable ? '点击切换' : '只读，不可更改'}">` +
            `${leftLabel ? `<span class="switch-side-label left">${Utils.escape(leftLabel)}</span>` : ''}` +
            `<span class="switch-track-sm">${mask}</span>` +
            `${rightLabel ? `<span class="switch-side-label right">${Utils.escape(rightLabel)}</span>` : ''}</span>`;
        }
        // 其他情况：按当前方式直接展示 monitor_value
        else {
          valueHtml = desc;
        }
      }

      return `
        <div class="monitor-card" data-monitor-id="${Utils.escape(m.monitorId)}" data-monitor-name="${Utils.escape(m.monitorName || m.monitorId)}" data-permission="${Utils.escape(m.permission || '')}">
          <div class="monitor-card-header">
            <span class="monitor-card-name" title="${Utils.escape(m.monitorName || m.monitorId)}">${Utils.escape(m.monitorName || m.monitorId)}</span>
            <span class="monitor-card-device">${Utils.escape(m.deviceName || '')}</span>
          </div>
          <div class="monitor-card-value ${hasValue ? flashClass : 'no-data'}">
            ${valueHtml}
          </div>
          <div class="monitor-card-time">
            ${m.updateTime ? Utils.formatDateTime(m.updateTime) : '--'}
          </div>
        </div>
      `;
    };

    const renderCardHtml = (list) =>
      `<div class="monitor-grid">${list.map(renderCard).join('')}</div>`;

    grid.innerHTML = Array.from(groups.entries()).map(([deviceName, list], idx) => {
      // Preserve user's previous expand/collapse choice across auto-refresh.
      // Default: first device expanded, the rest collapsed (only on first load).
      let collapsed = state.collapsedMap[deviceName];
      if (collapsed === undefined) collapsed = idx === 0 ? false : true;
      const collapsedClass = collapsed ? ' collapsed' : '';
      return `
        <div class="device-accordion${collapsedClass}" data-device="${Utils.escape(deviceName)}" style="grid-column:1/-1">
          <div class="device-accordion-header">
            <span class="device-accordion-title">${Utils.escape(deviceName)}</span>
            <span class="device-accordion-count">${list.length} 个监控点</span>
            <svg class="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="device-accordion-body">${renderCardHtml(list)}</div>
        </div>
      `;
    }).join('');

    // Click to toggle collapse (remember the chosen state so refresh keeps it)
    grid.querySelectorAll('.device-accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const accordion = header.closest('.device-accordion');
        const deviceName = accordion.getAttribute('data-device');
        const isCollapsed = accordion.classList.toggle('collapsed');
        state.collapsedMap[deviceName] = isCollapsed;
      });
    });
  }

  // ── Switch Toggle (rw) ──
  async function toggleSwitch(card, monitorId, monitorName, next) {
    card.dataset.switching = '1';
    const sw = card.querySelector('.monitor-switch');
    const prev = sw.getAttribute('data-value');
    // 乐观更新 UI
    applySwitchState(sw, next);
    state.previousValues[monitorId] = next;
    const m = monitorsCache.find(x => x.monitorId === monitorId);
    if (m) m.latestValue = next;
    try {
      await API.monitorHistory.save({ monitorId, monitorName, monitorValue: next });
      Toast.success(`${monitorName} 已切换为 ${next}`);
    } catch (err) {
      // 失败回滚
      applySwitchState(sw, prev);
      state.previousValues[monitorId] = prev;
      if (m) m.latestValue = prev;
      Toast.error('切换失败: ' + err.message);
    } finally {
      delete card.dataset.switching;
    }
  }

  function applySwitchState(sw, value) {
    sw.setAttribute('data-value', value);
    sw.classList.toggle('on', value === '1');
    sw.classList.toggle('off', value !== '1');
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
      const cfg = monitorConfigMap[r.monitorId];
      return `
        <tr class="${isNew ? 'row-new' : ''}">
          <td class="col-id">${Utils.escape(r.monitorId)}</td>
          <td>${Utils.escape(r.monitorName)}</td>
          <td class="col-value">${Utils.renderMonitorValue(r.monitorValue, cfg && cfg.valueType, cfg && cfg.valueDesc)}</td>
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
