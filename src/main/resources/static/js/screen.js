(() => {
  'use strict';

  // 大屏页面入口（鉴权在底部 init 前统一异步校验）
  const state = {
    isRunning: true,
    monitors: [],
    deviceStatus: { running: 0, fault: 0, unknown: 0 },
    alarms: [],
    deviceCategories: [],
    updateTimer: null,
    statsTimer: null,
    clockTimer: null,
    charts: {},
  };

  const defaultColors = ['#00d4ff', '#00ccff', '#0099ff', '#0066cc', '#5b8ff9', '#5ad8a6'];

  const els = {
    systemStatus: document.getElementById('systemStatus'),
    dangerCount: document.getElementById('dangerCount'),
    dangerBadge: document.getElementById('dangerBadge'),
    timeDisplay: document.getElementById('timeDisplay'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    runningDevices: document.getElementById('runningDevices'),
    faultDevices: document.getElementById('faultDevices'),
    statsLeft: document.getElementById('statsLeft'),
    statsRight: document.getElementById('statsRight'),
    totalDevices: document.getElementById('totalDevices'),
    monitorGrid: document.getElementById('monitorGrid'),
    alarmTable: document.querySelector('#alarmTable tbody'),
    noAlarm: document.getElementById('noAlarm'),
    inflowSelect: document.getElementById('inflowSelect'),
    chlorineSelect: document.getElementById('chlorineSelect'),
    inflowChartToggle: document.getElementById('inflowChartToggle'),
    inflowChartOptions: document.getElementById('inflowChartOptions'),
    chlorineChartToggle: document.getElementById('chlorineChartToggle'),
    chlorineChartOptions: document.getElementById('chlorineChartOptions'),
    inflowTitleText: document.getElementById('inflowTitleText'),
    chlorineTitleText: document.getElementById('chlorineTitleText'),
    inflowAxisLabel: document.getElementById('inflowAxisLabel'),
    chlorineAxisLabel: document.getElementById('chlorineAxisLabel'),
  };

  /* ========== 初始化 ========== */
  function init() {
    bindEvents();
    startClock();
    loadAll();
    startTimers();
    initCharts();
  }

  function bindEvents() {
    els.systemStatus.addEventListener('click', toggleRunning);
    els.fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenBtn);
    document.addEventListener('webkitfullscreenchange', updateFullscreenBtn);
    document.addEventListener('mozfullscreenchange', updateFullscreenBtn);
    document.addEventListener('MSFullscreenChange', updateFullscreenBtn);
    window.addEventListener('resize', () => Object.values(state.charts).forEach(c => c && c.resize()));
    // 图表监控点选择：切换后刷新对应折线图（近3小时）
    if (els.inflowSelect) els.inflowSelect.addEventListener('change', () => { if (state.isRunning) updateChart('inflow'); });
    if (els.chlorineSelect) els.chlorineSelect.addEventListener('change', () => { if (state.isRunning) updateChart('chlorine'); });
    bindChartDropdowns();
    // 开关切换：仅可写（权限非 r）的开关可点击切换
    els.monitorGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.switch-toggle.editable');
      if (!btn) return;
      const card = btn.closest('.switch-card');
      if (!card || card.dataset.switching === '1') return;
      const current = btn.dataset.value;
      if (current !== '1' && current !== '0') return;
      toggleSwitch(card, card.dataset.monitorId, card.dataset.monitorName, current === '1' ? '0' : '1');
    });
  }

  /* ========== 图表监控点自定义下拉 ========== */
  function bindChartDropdowns() {
    const groups = [
      { select: els.inflowSelect, toggle: els.inflowChartToggle, menu: els.inflowChartOptions, key: 'inflow' },
      { select: els.chlorineSelect, toggle: els.chlorineChartToggle, menu: els.chlorineChartOptions, key: 'chlorine' },
    ];
    groups.forEach((g) => {
      if (!g.toggle || !g.menu) return;
      g.toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.chart-options.open').forEach((m) => { if (m !== g.menu) m.classList.remove('open'); });
        const isOpen = g.menu.classList.toggle('open');
        if (isOpen) renderChartOptions(g);
      });
      g.menu.addEventListener('click', (e) => {
        const opt = e.target.closest('.chart-option');
        if (!opt) return;
        if (g.select.value !== opt.dataset.value) {
          g.select.value = opt.dataset.value;
          if (state.isRunning) updateChart(g.key);
        }
        g.menu.classList.remove('open');
      });
    });
    // 点击空白处关闭所有下拉
    document.addEventListener('click', () => {
      document.querySelectorAll('.chart-options.open').forEach((m) => m.classList.remove('open'));
    });
    // 提供刷新选中态钩子（监控点选项集合变化后调用）
    state.refreshChartDropdowns = () => groups.forEach((g) => {
      if (g.menu.classList.contains('open')) renderChartOptions(g);
    });
  }

  function renderChartOptions(g) {
    g.menu.innerHTML = '';
    Array.from(g.select.options || []).forEach((opt) => {
      const div = document.createElement('div');
      div.className = 'chart-option' + (opt.value === g.select.value ? ' active' : '');
      div.dataset.value = opt.value;
      div.textContent = opt.textContent;
      g.menu.appendChild(div);
    });
  }

  function toggleRunning() {
    state.isRunning = !state.isRunning;
    els.systemStatus.classList.toggle('running', state.isRunning);
    els.systemStatus.classList.toggle('paused', !state.isRunning);
    els.systemStatus.querySelector('.status-text').textContent = state.isRunning ? '系统运行中' : '系统已暂停';
    if (state.isRunning) {
      loadAll();
      startTimers();
    } else {
      stopTimers();
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  function updateFullscreenBtn() {
    els.fullscreenBtn.textContent = document.fullscreenElement ? '退出' : '全屏';
  }

  function startClock() {
    updateTime();
    state.clockTimer = setInterval(updateTime, 1000);
  }

  function updateTime() {
    const now = new Date();
    els.timeDisplay.textContent = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function startTimers() {
    stopTimers();
    state.updateTimer = setInterval(() => {
      if (state.isRunning) loadCoreData();
    }, 2000);
    state.statsTimer = setInterval(() => {
      if (state.isRunning) loadStatsData();
    }, 5000);
  }

  function stopTimers() {
    if (state.updateTimer) { clearInterval(state.updateTimer); state.updateTimer = null; }
    if (state.statsTimer) { clearInterval(state.statsTimer); state.statsTimer = null; }
  }

  /* ========== 数据加载 ========== */
  async function loadAll() {
    if (!state.isRunning) return;
    await loadMonitors();
    await Promise.all([
      loadAlarms(),
      loadStatsData(),
    ]);
    renderAll();
  }

  async function loadCoreData() {
    if (!state.isRunning) return;
    await Promise.all([
      loadMonitors(),
      loadAlarms(),
    ]);
    renderAlarms();
  }

  async function loadStatsData() {
    if (!state.isRunning) return;
    await Promise.all([
      loadDeviceStatus(),
    ]);
    renderStats();
    renderMonitorGrid();
    await updateCharts();
  }

  async function loadMonitors() {
    try {
      state.monitors = await API.monitorConfig.cache();
    } catch (e) {
      console.error('loadMonitors failed', e);
      state.monitors = [];
    }
    syncChartSelects();
  }

  // 后端 startTime/endTime 要求 yyyy-MM-dd'T'HH:mm 格式
  function toBackendTime(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // 运行/故障统计：后端按 show_type=LIGHT 的监控点 + MonitorConfigCache.monitorValue 统计
  async function loadDeviceStatus() {
    try {
      state.deviceStatus = await API.dashboard.deviceStatus();
    } catch (e) {
      console.error('loadDeviceStatus failed', e);
    }
  }

  async function loadAlarms() {
    try {
      const res = await API.alarm.page(1, 20);
      state.alarms = res.content || [];
    } catch (e) {
      console.error('loadAlarms failed', e);
      state.alarms = [];
    }
  }

  /* ========== 渲染 ========== */
  function renderAll() {
    renderStats();
    renderMonitorGrid();
    renderAlarms();
  }

  function renderStats() {
    // 运行/故障统计：仅展示 LIGHT 监控点中 monitorValue=1(故障) 与 =0(正常运行) 的数量
    const running = state.deviceStatus.running || 0;
    const fault = state.deviceStatus.fault || 0;
    els.runningDevices.innerHTML = String(running).padStart(3, '0').split('').map(d => `<span class="flip-digit">${d}</span>`).join('');
    els.faultDevices.innerHTML = String(fault).padStart(3, '0').split('').map(d => `<span class="flip-digit fault">${d}</span>`).join('');

    // 设备统计：设备总数 = 正常运行 + 故障数量；正常运行+故障监控点按 device_id 分组展示各组数量
    state.deviceCategories = (state.deviceStatus.groups || [])
      .slice(0, 4)
      .map((g, i) => ({ name: g.deviceName || g.deviceId, value: g.count, color: defaultColors[i % defaultColors.length] }));
    els.totalDevices.textContent = running + fault;

    const left = state.deviceCategories.slice(0, 2);
    const right = state.deviceCategories.slice(2);
    els.statsLeft.innerHTML = left.map(item => statItemHTML(item, 'left')).join('');
    els.statsRight.innerHTML = right.map(item => statItemHTML(item, 'right')).join('');

    updateStatsChart();
  }

  function statItemHTML(item, side) {
    return `
      <div class="stat-item ${side}" style="--item-color:${item.color}">
        <div class="stat-value">
          <span class="num">${item.value}</span>
          <span class="unit">台</span>
        </div>
        <div class="stat-name">
          ${side === 'left' ? '<span class="name-dot"></span>' : ''}
          ${escapeHtml(item.name)}
          ${side === 'right' ? '<span class="name-dot"></span>' : ''}
        </div>
      </div>
    `;
  }

  function renderMonitorGrid() {
    const container = els.monitorGrid;
    container.innerHTML = '';
    // 仅展示 monitor_config 中 show_type=SWITCH 且 permission=rw 的记录，作为开关控制面板
    const switches = state.monitors.filter(m => m.showType === 'SWITCH' && m.permission === 'rw');

    if (switches.length === 0) {
      container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#4a6fa5;font-size:12px;padding-top:20px">暂无开关设备</div>';
      return;
    }

    switches.forEach(item => {
      const raw = item.monitorValue;
      const isOn = String(raw) === '1';
      const div = document.createElement('div');
      div.className = 'switch-card';
      div.dataset.monitorId = item.monitorId;
      div.dataset.monitorName = item.monitorName || item.monitorId;
      // hover 提示：monitor_name + 权限（当前仅展示 rw 可操作开关）
      div.title = `${item.monitorName || item.monitorId}（权限：读写）`;
      div.innerHTML = `
        <div class="switch-icon ${isOn ? 'on' : 'off'}">
          <svg class="icon-ring ring-a" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="currentColor" stroke-opacity="0.3" stroke-width="1" stroke-linecap="round" stroke-dasharray="3 6"/>
          </svg>
          <svg class="icon-ring ring-b" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="15" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="1.5 8"/>
          </svg>
          <svg class="icon-ring" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="currentColor" stroke-opacity="0.18" stroke-width="1.5"/>
          </svg>
          <span class="icon-core">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${switchIconPath(item.monitorName || '')}</svg>
          </span>
        </div>
        <div class="switch-name" title="${escapeHtml(item.monitorName || item.monitorId)}">${escapeHtml(shortLabel(item.monitorName || item.monitorId))}</div>
        <button class="switch-toggle ${isOn ? 'on' : 'off'} editable" data-value="${String(raw) === '0' ? '0' : '1'}" title="点击切换">
          <span class="toggle-track"><span class="toggle-knob"></span></span>
          <span class="toggle-text">${isOn ? '开' : '关'}</span>
        </button>
      `;
      container.appendChild(div);
    });
  }

  // ── SWITCH 图标：按 monitor_name 关键词匹配贴近描述的形状 ──
  const SWITCH_ICONS = {
    pump: '<path d="M12 3c-3.4 4.2-6 6.9-6 10a6 6 0 0 0 12 0c0-3.1-2.6-5.8-6-10z"/><path d="M12 8.5V13"/>',
    grille: '<path d="M4 3h16M4 3v18M8 3v18M12 3v18M16 3v18M20 3v18"/>',
    mixer: '<circle cx="12" cy="12" r="2.6"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M18.5 5.5l-2.8 2.8M8.3 15.7l-2.8 2.8"/>',
    flow: '<path d="M4 14h13M13 9l5 5-5 5"/><path d="M6 4v5M3 6.5 6 4l3 2.5"/>',
    conveyor: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 6h8M6 12h12M4 18h16"/>',
    press: '<path d="M5 3v18M19 3v18M5 6h14M5 10h14M5 14h14M5 18h14"/>',
    gate: '<path d="M4 21V3M20 21V3M4 6h16M4 10h16M4 14h16M4 18h16M4 21h16"/>',
    auto: '<path d="M12 2v7"/><path d="M5.8 5.8a8 8 0 1 0 12.4 0"/>',
    motor: '<circle cx="12" cy="13" r="4.6"/><path d="M12 3v4M8.5 2h7"/>',
    power: '<path d="M12 3v9"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/>',
  };

  function switchIconPath(name) {
    if (/泵/.test(name)) return SWITCH_ICONS.pump;
    if (/格栅/.test(name)) return SWITCH_ICONS.grille;
    if (/搅拌/.test(name)) return SWITCH_ICONS.mixer;
    if (/推流/.test(name)) return SWITCH_ICONS.flow;
    if (/输送/.test(name)) return SWITCH_ICONS.conveyor;
    if (/压榨/.test(name)) return SWITCH_ICONS.press;
    if (/启闭/.test(name)) return SWITCH_ICONS.gate;
    if (/系统|一键|自动/.test(name)) return SWITCH_ICONS.auto;
    if (/主机|运行/.test(name)) return SWITCH_ICONS.motor;
    return SWITCH_ICONS.power;
  }

  // ── SWITCH 切换：可写（权限非 r）时点击切换，通过 /api/monitor-operation 提交新值 ──
  async function toggleSwitch(card, monitorId, monitorName, next) {
    card.dataset.switching = '1';
    const btn = card.querySelector('.switch-toggle');
    const prev = btn.dataset.value;
    applySwitch(card, btn, next);
    try {
      const user = (typeof Auth.getUser === 'function' && Auth.getUser()) || {};
      await API.monitorOperation.save({ monitorId, monitorName, preValue: prev, value: next, status: 1, operator: user.username || '' });
    } catch (err) {
      applySwitch(card, btn, prev);
      console.error('开关切换失败', err);
    } finally {
      delete card.dataset.switching;
    }
  }

  function applySwitch(card, btn, value) {
    const on = String(value) === '1';
    btn.dataset.value = on ? '1' : '0';
    btn.classList.toggle('on', on);
    btn.classList.toggle('off', !on);
    btn.querySelector('.toggle-text').textContent = on ? '开' : '关';
    const icon = card.querySelector('.switch-icon');
    icon.classList.toggle('on', on);
    icon.classList.toggle('off', !on);
  }

  function renderAlarms() {
    const tbody = els.alarmTable;
    tbody.innerHTML = '';
    const list = state.alarms.slice(0, 8);
    if (list.length === 0) {
      els.noAlarm.style.display = 'flex';
      return;
    }
    els.noAlarm.style.display = 'none';
    list.forEach((alarm, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${formatAlarmTime(alarm.createTime)}</td>
        <td>${escapeHtml(alarm.monitorName)}</td>
        <td>${escapeHtml(alarm.message || '设备异常')}</td>
        <td><span class="status-tag status-pending">待处理</span></td>
      `;
      tbody.appendChild(tr);
    });
    els.dangerCount.textContent = state.alarms.filter(a => a.status === 0).length;
  }

  /* ========== 图表 ========== */
  function initCharts() {
    state.charts.stats = echarts.init(document.getElementById('statsChart'));
    state.charts.inflow = echarts.init(document.getElementById('inflowChart'));
    state.charts.chlorine = echarts.init(document.getElementById('chlorineChart'));
  }

  function updateStatsChart() {
    const chart = state.charts.stats;
    if (!chart) return;
    const data = state.deviceCategories.map(item => ({
      name: item.name,
      value: item.value,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
          { offset: 0, color: item.color },
          { offset: 1, color: item.color + '88' },
        ]),
        borderRadius: 4,
        shadowBlur: 10,
        shadowColor: item.color + '44',
      },
    }));
    chart.setOption({
      tooltip: {
        show: true,
        trigger: 'item',
        confine: true,
        backgroundColor: 'rgba(9, 18, 38, 0.96)',
        borderColor: 'rgba(0, 212, 255, 0.4)',
        borderWidth: 1,
        textStyle: { color: '#eaffff', fontSize: 12 },
        padding: [6, 10],
        extraCssText: 'box-shadow:0 6px 18px rgba(0,0,0,.5),0 0 12px rgba(0,212,255,.15);border-radius:6px;',
        formatter: (p) => `${p.marker}${p.name}<br/>数量：<b>${p.value} 台</b>`,
      },
      series: [
        {
          type: 'pie',
          radius: ['82%', '86%'],
          center: ['50%', '50%'],
          silent: true,
          label: { show: false },
          data: [{ value: 1, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: 'rgba(0, 212, 255, 0.1)' }, { offset: 0.5, color: 'rgba(0, 212, 255, 0.4)' }, { offset: 1, color: 'rgba(0, 212, 255, 0.1)' }] } } }],
        },
        {
          type: 'pie',
          radius: ['78%', '80%'],
          center: ['50%', '50%'],
          silent: true,
          label: { show: false },
          data: Array.from({ length: 60 }, (_, i) => ({ value: i % 5 === 0 ? 1 : 0.3, itemStyle: { color: i % 5 === 0 ? 'rgba(0, 212, 255, 0.6)' : 'rgba(0, 212, 255, 0.15)' } })),
          startAngle: 90,
        },
        {
          type: 'pie',
          radius: ['62%', '76%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            scale: true,
            scaleSize: 10,
            itemStyle: {
              shadowBlur: 24,
              shadowColor: 'rgba(0, 212, 255, 0.45)',
            },
          },
          data,
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDuration: 1500,
        },
        {
          type: 'pie',
          radius: ['56%', '58%'],
          center: ['50%', '50%'],
          silent: true,
          label: { show: false },
          data: [{ value: 1, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0, 212, 255, 0.3)' }, { offset: 1, color: 'rgba(0, 102, 204, 0.1)' }] } } }],
        },
        {
          type: 'pie',
          radius: ['0%', '52%'],
          center: ['50%', '50%'],
          silent: true,
          label: { show: false },
          data: [{ value: 1, itemStyle: { color: { type: 'radial', x: 0.5, y: 0.5, r: 0.5, colorStops: [{ offset: 0, color: 'rgba(0, 50, 100, 0.8)' }, { offset: 0.7, color: 'rgba(0, 30, 60, 0.6)' }, { offset: 1, color: 'rgba(0, 20, 40, 0.4)' }] } } }],
        },
      ],
    }, true);
  }

  /* ========== 底部折线图：可选的 FLOAT 监控点，展示近 3 小时 ========== */
  function syncChartSelects() {
    const list = floatMonitors();
    const signature = list.map(m => m.monitorId).join(',');
    const build = (select, preferKeywords) => {
      if (!select) return;
      // 选项集合未变化时保留用户已选监控点
      if (select.dataset.signature === signature) return;
      const current = select.value;
      const selected = list.find(m => m.monitorId === current)
        || list.find(m => preferKeywords.some(k => m.monitorName.includes(k)))
        || list[0];
      select.innerHTML = list
        .map(m => `<option value="${escapeHtml(m.monitorId)}">${escapeHtml(m.monitorName || m.monitorId)}</option>`)
        .join('');
      select.dataset.signature = signature;
      select.value = selected ? selected.monitorId : '';
    };
    build(els.inflowSelect, ['流量', '进水', '入水']);
    build(els.chlorineSelect, ['氯', '余氯', '消毒']);
    // 若下拉当前处于展开状态，同步选中态
    if (state.refreshChartDropdowns) state.refreshChartDropdowns();
  }

  function floatMonitors() {
    return state.monitors.filter(m => m.valueType === 'FLOAT');
  }

  async function updateCharts() {
    await Promise.all([updateChart('inflow'), updateChart('chlorine')]);
  }

  async function updateChart(key) {
    const isInflow = key === 'inflow';
    const select = isInflow ? els.inflowSelect : els.chlorineSelect;
    const chart = state.charts[key];
    if (!chart || !select || !select.value) return;
    const monitor = state.monitors.find(m => m.monitorId === select.value);
    if (!monitor) return;
    const color = isInflow ? '#00d4ff' : '#10b981';
    const data = await fetchHistoryData(monitor.monitorId, 3);
    const name = monitor.monitorName || (isInflow ? '入口流量' : '余氯余量');
    renderLineChart(chart, data, name, color);
    const label = shortLabel(name);
    const titleText = isInflow ? els.inflowTitleText : els.chlorineTitleText;
    const axisLabel = isInflow ? els.inflowAxisLabel : els.chlorineAxisLabel;
    if (titleText) titleText.textContent = label;
    if (axisLabel) axisLabel.textContent = label;
  }

  async function fetchHistoryData(monitorId, hours = 3) {
    try {
      const end = new Date();
      const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
      const res = await API.monitorHistory.page(1, 200, {
        monitorId,
        startTime: toBackendTime(start),
        endTime: toBackendTime(end),
      });
      return (res.content || [])
        .map(item => [new Date(item.createTime), parseFloat(item.monitorValue) || 0])
        .sort((a, b) => a[0] - b[0]);
    } catch (e) {
      console.error('fetchHistoryData failed', e);
      return [];
    }
  }

  function renderLineChart(chart, data, name, color) {
    if (!chart) return;
    chart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10, 18, 38, 0.9)',
        borderColor: color + '44',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        axisPointer: { type: 'cross', crossStyle: { color: color + '88' }, lineStyle: { color: color + '88' } },
        formatter: params => {
          const item = params[0];
          const t = Utils.formatDateTime(new Date(item.value[0]));
          return `${t}<br/>${name}: ${item.value[1]}`;
        },
      },
      grid: { top: 24, right: 10, bottom: 24, left: 40 },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: 'rgba(30, 58, 95, 0.4)' } },
        axisTick: { show: false },
        axisLabel: { color: '#4a6fa5', fontSize: 9, formatter: '{HH}:{mm}' },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#4a6fa5', fontSize: 9 },
        splitLine: { lineStyle: { color: 'rgba(30, 58, 95, 0.25)', type: 'solid' } },
      },
      series: [{
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: color + '99', width: 1.5 },
        itemStyle: { color: color + '99' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: color + '26' },
            { offset: 0.5, color: color + '0D' },
            { offset: 1, color: color + '03' },
          ]),
        },
      }],
    }, true);
  }

  /* ========== 工具函数 ========== */
  function shortLabel(name) {
    return name.replace(/监控点|传感器|在线/g, '').slice(0, 6);
  }

  function formatAlarmTime(timeStr) {
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return Utils.formatDateTime(date).slice(5, 16);
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.addEventListener('beforeunload', () => {
    stopTimers();
    clearInterval(state.clockTimer);
    Object.values(state.charts).forEach(c => c && c.dispose());
  });

  // 服务端校验登录态通过后再初始化大屏
  (async () => {
    if (await Auth.requireAuth()) {
      init();
    }
  })();
})();
