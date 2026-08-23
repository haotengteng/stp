/**
 * 数据大屏页面逻辑
 * - 全屏暗色主题数据可视化
 * - 自动时钟、数据刷新
 * - ECharts 趋势图 + 状态分布饼图
 */
(function () {
  'use strict';

  // ── Chart color variables (matching design tokens) ──
  const CHART_COLORS = [
    '#1664FF', // chart-1 primary blue
    '#2A814B', // chart-2 green
    '#BD7E00', // chart-3 warning
    '#D7312A', // chart-4 danger
    '#6E4C9F', // violet-6 (substitute for chart-5)
    '#24758E', // teal-6
    '#97BCFF', // primary-3
    '#7CCD94', // success-3
  ];

  // ── State ──
  const state = {
    trendChart: null,
    statusChart: null,
    clockTimer: null,
    dataTimer: null,
    overviewData: null,
    alarmStatsData: null,
    trendData: {},   // monitorId -> { name, values: [{time, value}] }
    maxTrendPoints: 15,
  };

  // ── Init ──
  document.addEventListener('DOMContentLoaded', function () {
    if (!Auth.requireAuth()) return;
    Toast.init();

    // Set user name
    const user = Auth.getUser();
    const nameEl = document.getElementById('screenUserName');
    if (nameEl && user) {
      nameEl.textContent = user.username || '管理员';
    }

    // Logout button
    const logoutBtn = document.getElementById('screenLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        Auth.logout();
      });
    }

    // Initialize charts
    initCharts();

    // Start clock
    startClock();

    // Load initial data
    loadAllData();

    // Start auto-refresh (every 10 seconds)
    startAutoRefresh();

    // Handle resize
    window.addEventListener('resize', debounceResize);
  });

  // ── Chart Initialization ──
  function initCharts() {
    const trendEl = document.getElementById('trendChart');
    const statusEl = document.getElementById('statusChart');

    if (typeof echarts === 'undefined') {
      console.error('ECharts not loaded');
      return;
    }

    if (trendEl) {
      state.trendChart = echarts.init(trendEl);
      renderTrendChart();
    }

    if (statusEl) {
      state.statusChart = echarts.init(statusEl);
      renderStatusChart(0, 0);
    }
  }

  // ── Data Loading ──
  async function loadAllData() {
    await Promise.all([
      loadOverview(),
      loadAlarmStatistics(),
      loadAlarms(),
      loadRealtimeStream(),
    ]);
  }

  async function loadOverview() {
    try {
      const data = await API.dashboard.overview();
      state.overviewData = data;
      renderOverview(data);
      renderLatestValuesTable(data.latestMonitorValues || []);
      updateTrendData(data.latestMonitorValues || []);
      renderTrendChart();
      renderStatusChart(data.enabledMonitors || 0, data.disabledMonitors || 0);
    } catch (err) {
      Toast.error('加载数据失败: ' + err.message);
    }
  }

  async function loadAlarmStatistics() {
    try {
      const data = await API.alarm.statistics();
      state.alarmStatsData = data;
      renderAlarmStatistics(data);
    } catch (err) {
      Toast.error('加载告警统计失败: ' + err.message);
    }
  }

  async function loadAlarms() {
    try {
      const list = await API.dashboard.alarms(20);
      renderAlarmList(list || []);
    } catch (err) {
      Toast.error('加载告警列表失败: ' + err.message);
    }
  }

  async function loadRealtimeStream() {
    try {
      const list = await API.dashboard.realtime(30);
      renderDataStream(list || []);
    } catch (err) {
      Toast.error('加载实时数据流失败: ' + err.message);
    }
  }

  // ── Render: Overview ──
  function renderOverview(data) {
    if (!data) return;
    setNumber('totalDevices', data.totalDevices || 0);
    setNumber('totalMonitors', data.totalMonitors || 0);
    setNumber('enabledMonitors', data.enabledMonitors || 0);
    setNumber('alarmCountToday', data.alarmCountToday || 0);
  }

  // ── Render: Alarm Statistics ──
  function renderAlarmStatistics(data) {
    if (!data) return;
    setNumber('alarmTotal', data.total || 0);
    setNumber('alarmUnhandled', data.unhandled || 0);
    setNumber('alarmProcessed', data.processed || 0);
  }

  // ── Render: Alarm List ──
  function renderAlarmList(list) {
    const body = document.getElementById('alarmListBody');
    if (!list || list.length === 0) {
      body.innerHTML = '<div class="screen-empty-text">暂无告警记录</div>';
      return;
    }

    body.innerHTML = list.map(item => {
      const statusMap = {
        0: { cls: 'tag-0', text: '未处理' },
        1: { cls: 'tag-1', text: '已处理' },
      };
      const st = statusMap[item.status] || statusMap[0];

      return `
        <div class="alarm-item status-${item.status}">
          <div class="alarm-item-content">
            <div class="alarm-item-name">${Utils.escape(item.monitorName)}</div>
            <div class="alarm-item-msg">${Utils.escape(item.message)}</div>
          </div>
          <span class="alarm-status-tag ${st.cls}">${st.text}</span>
          <span class="alarm-item-time">${Utils.formatTime(item.createTime)}</span>
        </div>
      `;
    }).join('');
  }

  // ── Render: Latest Values Table ──
  function renderLatestValuesTable(monitors) {
    const body = document.getElementById('latestValuesBody');
    if (!monitors || monitors.length === 0) {
      body.innerHTML = '<div class="screen-empty-text">暂无监控数据</div>';
      return;
    }

    // Split into two columns for better space usage
    const half = Math.ceil(monitors.length / 2);
    const left = monitors.slice(0, half);
    const right = monitors.slice(half);

    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;overflow-y:auto;height:100%">
        ${renderValueTableColumn(left)}
        ${renderValueTableColumn(right)}
      </div>
    `;
  }

  function renderValueTableColumn(monitors) {
    let rows = monitors.map(m => {
      const hasValue = m.latestValue !== null && m.latestValue !== undefined && m.latestValue !== '';
      return `
        <tr>
          <td class="col-monitor-name">${Utils.escape(m.monitorName || m.monitorId)}</td>
          <td class="col-device">${Utils.escape(m.deviceName || '')}</td>
          <td class="col-value">${hasValue ? Utils.escape(m.latestValue) : '--'}</td>
          <td class="col-time">${m.updateTime ? Utils.formatTime(m.updateTime) : '--'}</td>
        </tr>
      `;
    }).join('');

    if (!rows) {
      rows = '<tr><td colspan="4" class="screen-empty-text">无数据</td></tr>';
    }

    return `
      <table class="latest-table">
        <thead>
          <tr>
            <th>监控点</th>
            <th>设备</th>
            <th>当前值</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // ── Render: Data Stream ──
  function renderDataStream(list) {
    const body = document.getElementById('streamBody');
    if (!list || list.length === 0) {
      body.innerHTML = '<div class="screen-empty-text">暂无实时数据</div>';
      return;
    }

    body.innerHTML = list.map(item => {
      return `
        <div class="stream-item">
          <span class="stream-item-name">${Utils.escape(item.monitorName)}</span>
          <span class="stream-item-value">${Utils.escape(item.monitorValue)}</span>
          <span class="stream-item-time">${Utils.formatTime(item.createTime)}</span>
        </div>
      `;
    }).join('');
  }

  // ── ECharts: Trend Chart ──
  function updateTrendData(monitors) {
    const now = new Date();
    const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    monitors.forEach((m, idx) => {
      const hasValue = m.latestValue !== null && m.latestValue !== undefined && m.latestValue !== '';
      const parsed = hasValue ? parseFloat(m.latestValue) : NaN;
      const numVal = !isNaN(parsed) ? parsed : null;

      if (!state.trendData[m.monitorId]) {
        state.trendData[m.monitorId] = {
          name: m.monitorName || m.monitorId,
          color: CHART_COLORS[idx % CHART_COLORS.length],
          values: [],
        };
      }

      const entry = state.trendData[m.monitorId];
      entry.values.push({ time: timeLabel, value: numVal });

      // Keep max points
      if (entry.values.length > state.maxTrendPoints) {
        entry.values.shift();
      }
    });
  }

  function renderTrendChart() {
    if (!state.trendChart) return;

    const monitorIds = Object.keys(state.trendData);
    if (monitorIds.length === 0) {
      state.trendChart.setOption(getEmptyTrendOption(), true);
      return;
    }

    // Collect all time labels
    let allTimes = [];
    monitorIds.forEach(id => {
      state.trendData[id].values.forEach(v => {
        if (allTimes.indexOf(v.time) === -1) {
          allTimes.push(v.time);
        }
      });
    });
    allTimes.sort();

    // Build series
    const series = monitorIds.map(id => {
      const entry = state.trendData[id];
      const dataMap = {};
      entry.values.forEach(v => {
        dataMap[v.time] = v.value;
      });

      const data = allTimes.map(t => {
        const val = dataMap[t];
        return val === undefined ? null : val;
      });

      return {
        name: entry.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: {
          width: 2,
          color: entry.color,
          shadowBlur: 8,
          shadowColor: entry.color,
        },
        itemStyle: {
          color: entry.color,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: hexToRgba(entry.color, 0.25) },
              { offset: 1, color: hexToRgba(entry.color, 0.02) },
            ],
          },
        },
        data: data,
      };
    });

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(13, 17, 23, 0.9)',
        borderColor: 'rgba(22, 100, 255, 0.3)',
        borderWidth: 1,
        textStyle: {
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: 12,
        },
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'rgba(22, 100, 255, 0.4)',
            type: 'dashed',
          },
        },
      },
      legend: {
        data: monitorIds.map(id => state.trendData[id].name),
        textStyle: {
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: 11,
        },
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 4,
        top: 0,
        right: 10,
        type: 'scroll',
      },
      grid: {
        top: 35,
        left: 50,
        right: 20,
        bottom: 25,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allTimes,
        axisLine: {
          lineStyle: { color: 'rgba(255, 255, 255, 0.2)' },
        },
        axisTick: { show: false },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: 10,
          fontFamily: 'monospace',
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.05)',
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: 10,
          fontFamily: 'monospace',
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
      series: series,
      animation: true,
      animationDuration: 800,
      animationEasingUpdate: 'cubicOut',
    };

    state.trendChart.setOption(option, true);
  }

  function getEmptyTrendOption() {
    return {
      backgroundColor: 'transparent',
      title: {
        text: '等待数据...',
        left: 'center',
        top: 'center',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.3)',
          fontSize: 14,
          fontWeight: 'normal',
        },
      },
    };
  }

  // ── ECharts: Status Distribution (Donut) ──
  function renderStatusChart(enabled, disabled) {
    if (!state.statusChart) return;

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(13, 17, 23, 0.9)',
        borderColor: 'rgba(22, 100, 255, 0.3)',
        borderWidth: 1,
        textStyle: {
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: 12,
        },
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'horizontal',
        bottom: 10,
        textStyle: {
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: 12,
        },
        itemWidth: 10,
        itemHeight: 10,
        icon: 'circle',
      },
      series: [
        {
          name: '监控点状态',
          type: 'pie',
          radius: ['45%', '65%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderColor: 'rgba(13, 17, 23, 0.8)',
            borderWidth: 2,
          },
          label: {
            show: true,
            position: 'center',
            formatter: function () {
              return '{total|' + (enabled + disabled) + '}\n{label|监控点总数}';
            },
            rich: {
              total: {
                fontSize: 28,
                fontWeight: 'bold',
                color: '#1664FF',
                textShadowColor: 'rgba(22, 100, 255, 0.5)',
                textShadowBlur: 10,
                lineHeight: 36,
              },
              label: {
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.5)',
                lineHeight: 16,
              },
            },
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
            },
            itemStyle: {
              shadowBlur: 20,
              shadowColor: 'rgba(22, 100, 255, 0.4)',
            },
          },
          data: [
            {
              value: enabled,
              name: '启用',
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 1,
                  colorStops: [
                    { offset: 0, color: '#2A814B' },
                    { offset: 1, color: '#5CAE77' },
                  ],
                },
                shadowBlur: 10,
                shadowColor: 'rgba(42, 129, 75, 0.4)',
              },
            },
            {
              value: disabled,
              name: '禁用',
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 1,
                  colorStops: [
                    { offset: 0, color: '#4E5969' },
                    { offset: 1, color: '#737A87' },
                  ],
                },
                shadowBlur: 10,
                shadowColor: 'rgba(78, 89, 105, 0.3)',
              },
            },
          ],
        },
      ],
      animation: true,
      animationDuration: 800,
    };

    state.statusChart.setOption(option, true);
  }

  // ── Clock ──
  function startClock() {
    updateClock();
    state.clockTimer = setInterval(updateClock, 1000);
  }

  function updateClock() {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const el = document.getElementById('screenDateTime');
    if (el) {
      el.textContent = `${y}-${mo}-${d} ${h}:${mi}:${s}`;
    }
  }

  // ── Auto Refresh ──
  function startAutoRefresh() {
    state.dataTimer = setInterval(loadAllData, 10000);
  }

  // ── Number animation ──
  function setNumber(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const current = parseInt(el.textContent, 10) || 0;
    const target = parseInt(targetValue, 10) || 0;

    if (current === target) {
      el.textContent = target;
      return;
    }

    // Simple count-up animation
    const duration = 600;
    const startTime = performance.now();
    const startValue = current;
    const diff = target - startValue;

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(startValue + diff * eased);
      el.textContent = value;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(animate);
  }

  // ── Utility: hex to rgba ──
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ── Utility: debounce resize ──
  let resizeTimer = null;
  function debounceResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (state.trendChart) state.trendChart.resize();
      if (state.statusChart) state.statusChart.resize();
    }, 200);
  }
})();
