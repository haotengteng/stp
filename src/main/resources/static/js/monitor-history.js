/**
 * 监控历史数据 - Monitor History Page
 * - 趋势图表：监控点ID + 时间范围（预设/自定义）
 *   - value_type = FLOAT：折线趋势图
 *   - value_type = INT（0/1）：甘特图风格的状态时间线
 */
document.addEventListener('DOMContentLoaded', async () => {
  if (!(await Auth.requireAuth())) return;
  Layout.init('monitor-history', '监控历史');
  MonitorHistoryPage.init();
});

const MonitorHistoryPage = {
  state: {
    // Chart state
    chartMonitorId: '',
    chartTimeMode: 'preset',     // 'preset' | 'custom'
    chartHours: 1,
    chartStartTime: '',           // ISO string yyyy-MM-ddTHH:mm
    chartEndTime: '',
    chartInstance: null,
    chartLoading: false,
    chartEndBoundary: Date.now(), // 图表查询的结束边界，用于 INT 状态条延伸
  },

  monitorConfigMap: {}, // monitorId -> {valueType, valueDesc}

  // 时间预设选项
  timeRanges: [
    { label: '最近1小时', hours: 1 },
    { label: '最近6小时', hours: 6 },
    { label: '最近24小时', hours: 24 },
    { label: '最近7天', hours: 168 },
  ],

  init() {
    this.renderShell();
    this.bindEvents();
    this.loadMonitorOptions();
    this.initChart();
    // 预加载监控点配置，用于图表按 valueType/valueDesc 渲染
    MonitorOptions.loadMonitors().then(list => {
      this.monitorConfigMap = {};
      (list || []).forEach(m => { this.monitorConfigMap[m.monitorId] = m; });
    });
  },

  // 加载设备+监控点级联下拉
  async loadMonitorOptions() {
    await MonitorOptions.setupCascade('chartDeviceId', 'chartMonitorId', {
      allDeviceLabel: '全部设备',
      monitorValueField: 'monitorId',
    });
  },

  renderShell() {
    const app = document.getElementById('appContent');
    app.innerHTML = `
      <!-- Chart Section -->
      <div class="card chart-card">
        <div class="card-header">
          <span class="card-title">趋势图表</span>
        </div>
        <div class="card-body">
          <div class="search-bar" style="flex-wrap:nowrap;white-space:nowrap">
            <select class="form-select" id="chartDeviceId" style="width:120px;flex-shrink:0"><option value="">全部设备</option></select>
            <select class="form-select" id="chartMonitorId" style="width:130px;flex-shrink:0" disabled><option value="">选择设备</option></select>
            <select class="form-select" id="chartTimeMode" style="width:100px;flex-shrink:0">
              <option value="preset">预设范围</option>
              <option value="custom">自定义时间</option>
            </select>
            <select class="form-select" id="chartTimeRange" style="width:100px;flex-shrink:0;${this.state.chartTimeMode === 'preset' ? '' : 'display:none'}">
              ${this.timeRanges.map(r => `<option value="${r.hours}" ${r.hours === this.state.chartHours ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select>
            <div id="chartCustomRange" class="date-range-group" style="${this.state.chartTimeMode === 'custom' ? '' : 'display:none'}">
              <input type="datetime-local" class="form-input" id="chartStartDate" value="${this.state.chartStartTime}" style="width:160px;flex-shrink:0">
              <span class="date-separator" style="flex-shrink:0">至</span>
              <input type="datetime-local" class="form-input" id="chartEndDate" value="${this.state.chartEndTime}" style="width:160px;flex-shrink:0">
            </div>
            <button class="btn btn-primary btn-sm" id="btnQueryChart" style="flex-shrink:0">查询图表</button>
          </div>
          <div class="chart-summary" id="chartSummary" style="display:none"></div>
          <div id="chartContainer">
            <div class="chart-empty">
              <div class="empty-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 6-6"/>
                </svg>
              </div>
              <div class="empty-text">选择监控点并查询以查看趋势图</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    // ── Chart: toggle preset/custom time mode ──
    document.getElementById('chartTimeMode').addEventListener('change', (e) => {
      const mode = e.target.value;
      this.state.chartTimeMode = mode;
      document.getElementById('chartTimeRange').style.display = mode === 'preset' ? '' : 'none';
      document.getElementById('chartCustomRange').style.display = mode === 'custom' ? '' : 'none';
    });

    // ── Chart query ──
    document.getElementById('btnQueryChart').addEventListener('click', () => this.loadChart());

    document.getElementById('chartMonitorId').addEventListener('change', () => {
      // 选择监控点后自动查询图表
      if (document.getElementById('chartMonitorId').value) {
        document.getElementById('btnQueryChart').click();
      }
    });

    // ── Window resize ──
    window.addEventListener('resize', Utils.debounce(() => {
      if (this.state.chartInstance) this.state.chartInstance.resize();
    }, 200));
  },

  // ── Chart ──
  initChart() {
    const container = document.getElementById('chartContainer');
    if (!container) return;

    container.innerHTML = '<div id="echart" style="width:100%;height:350px"></div>';

    if (typeof echarts === 'undefined') {
      container.innerHTML = '<div class="chart-empty"><div class="empty-text">ECharts 加载失败，请检查网络连接</div></div>';
      return;
    }

    this.state.chartInstance = echarts.init(document.getElementById('echart'));
    this.state.chartInstance.setOption(this.getChartOption([]));
  },

  async loadChart() {
    const monitorId = document.getElementById('chartMonitorId').value;
    if (!monitorId) {
      Toast.warning('请选择监控点');
      return;
    }

    if (!this.state.chartInstance) {
      this.initChart();
      if (!this.state.chartInstance) return;
    }

    this.state.chartMonitorId = monitorId;
    const mode = document.getElementById('chartTimeMode').value;
    this.state.chartTimeMode = mode;

    let startTime = null, endTime = null, hours = 24;

    if (mode === 'preset') {
      hours = parseInt(document.getElementById('chartTimeRange').value);
      this.state.chartHours = hours;
    } else {
      startTime = document.getElementById('chartStartDate').value;
      endTime = document.getElementById('chartEndDate').value;
      if (!startTime || !endTime) {
        Toast.warning('请选择开始和结束时间');
        return;
      }
      if (startTime >= endTime) {
        Toast.warning('开始时间需早于结束时间');
        return;
      }
      this.state.chartStartTime = startTime;
      this.state.chartEndTime = endTime;
    }

    this.state.chartLoading = true;
    this.state.chartInstance.showLoading({
      text: '加载中...', color: '#1664FF', textColor: '#737A87',
      maskColor: 'rgba(255, 255, 255, 0.9)', fontSize: 13,
    });

    try {
      let data;
      let boundary;
      if (mode === 'preset') {
        data = await API.monitorHistory.chart(monitorId, hours);
        boundary = Date.now();
      } else {
        // 自定义时间范围：调用 chart 接口拿全部数据后前端按时间范围过滤
        // 计算小时差传给后端，取超出范围的数据再前端截取
        const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
        const diffHours = Math.ceil(diffMs / 3600000);
        // 多取一些确保覆盖，后端按 hours 往前查
        const rawHours = Math.max(diffHours, 1);
        const raw = await API.monitorHistory.chart(monitorId, rawHours);
        const startTs = new Date(startTime).getTime();
        const endTs = new Date(endTime).getTime();
        data = (raw || []).filter(item => {
          const ts = this.parseTimeToTimestamp(item.createTime);
          return ts >= startTs && ts <= endTs;
        });
        boundary = endTs;
      }
      this.state.chartEndBoundary = boundary;
      // 根据监控点 value_type 决定图表展示方式
      const cfg = this.monitorConfigMap[monitorId] || {};
      const valueType = cfg.valueType || 'FLOAT';
      this.renderChart(data || [], valueType);
    } catch (err) {
      this.state.chartInstance.hideLoading();
      Toast.error(err.message || '图表数据加载失败');
      const container = document.getElementById('chartContainer');
      container.innerHTML = `
        <div class="chart-empty">
          <div class="empty-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 6-6"/>
            </svg>
          </div>
          <div class="empty-text">${Utils.escape(err.message || '图表数据加载失败')}</div>
        </div>
      `;
      this.state.chartInstance = null;
    } finally {
      this.state.chartLoading = false;
    }
  },

  renderChart(data, valueType) {
    const container = document.getElementById('chartContainer');

    if (!this.state.chartInstance) {
      container.innerHTML = '<div id="echart" style="width:100%;height:350px"></div>';
      this.state.chartInstance = echarts.init(document.getElementById('echart'));
    }

    // 构建时间序列数据对 [timestamp, value]，按时间升序排列
    const chartData = (data || []).map(item => {
      const ts = this.parseTimeToTimestamp(item.createTime);
      const val = parseFloat(item.monitorValue);
      return [ts, isNaN(val) ? null : val];
    }).sort((a, b) => a[0] - b[0]);

    const hasData = chartData.some(d => d[1] !== null);

    if (chartData.length === 0 || !hasData) {
      this.state.chartInstance.hideLoading();
      this.state.chartInstance.setOption(this.getChartOption([]), true);
      document.getElementById('chartSummary').style.display = 'none';
      return;
    }

    // INT 类型（0/1）走甘特图风格的状态时间线
    if (valueType === 'INT') {
      this.renderIntChart(chartData);
    } else {
      this.renderFloatChart(chartData);
    }
  },

  // FLOAT：折线趋势图 + 统计摘要
  renderFloatChart(chartData) {
    const values = chartData.map(d => d[1]).filter(v => v !== null);

    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
    const latest = values[values.length - 1];
    const summaryEl = document.getElementById('chartSummary');
    summaryEl.style.display = 'flex';
    summaryEl.innerHTML = `
      <div class="chart-summary-item">
        <span class="summary-label">最新值</span>
        <span class="summary-value">${latest}</span>
      </div>
      <div class="chart-summary-item">
        <span class="summary-label">最大值</span>
        <span class="summary-value">${max}</span>
      </div>
      <div class="chart-summary-item">
        <span class="summary-label">最小值</span>
        <span class="summary-value">${min}</span>
      </div>
      <div class="chart-summary-item">
        <span class="summary-label">平均值</span>
        <span class="summary-value">${avg}</span>
      </div>
      <div class="chart-summary-item">
        <span class="summary-label">数据点数</span>
        <span class="summary-value">${values.length}</span>
      </div>
    `;

    this.state.chartInstance.hideLoading();
    this.state.chartInstance.setOption(this.getChartOption(chartData), true);
  },

  // INT（0/1）：甘特图风格的状态时间线 + 状态统计摘要
  renderIntChart(chartData) {
    const points = chartData.filter(d => d[1] !== null);
    const cfg = this.monitorConfigMap[this.state.chartMonitorId] || {};
    const valueDesc = cfg.valueDesc;
    let descMap = null;
    if (valueDesc) {
      try { descMap = typeof valueDesc === 'string' ? JSON.parse(valueDesc) : valueDesc; } catch (e) { /* 解析失败则显示原始值 */ }
    }
    // 状态显示标签：优先 value_desc，其次原始值
    const stateLabel = (v) => {
      const key = String(v).trim();
      if (descMap && Object.prototype.hasOwnProperty.call(descMap, key)) return String(descMap[key]);
      return key;
    };

    const values = points.map(d => d[1]);
    const latest = values[values.length - 1];
    // 汇总统计
    const segments = this.buildSegments(points, this.state.chartEndBoundary);
    const totalDur = segments.reduce((a, s) => a + (s.end - s.start), 0) || 1;
    const durOf = (v) => segments.filter(s => s.value === v).reduce((a, s) => a + (s.end - s.start), 0);
    const pctOf = (v) => ((durOf(v) / totalDur) * 100).toFixed(1);
    const switches = Math.max(0, segments.length - 1);

    const summaryEl = document.getElementById('chartSummary');
    summaryEl.style.display = 'flex';
    summaryEl.innerHTML = `
      <div class="chart-summary-item">
        <span class="summary-label">最新状态</span>
        <span class="summary-value" style="color:${latest === 1 ? '#F5222D' : '#52C41A'}">${stateLabel(latest)}</span>
      </div>
      <div class="chart-summary-item">
        <span class="summary-label">${stateLabel(1)}占比</span>
        <span class="summary-value">${pctOf(1)}%</span>
      </div>
      <div class="chart-summary-item">
        <span class="summary-label">${stateLabel(0)}占比</span>
        <span class="summary-value">${pctOf(0)}%</span>
      </div>
      <div class="chart-summary-item">
        <span class="summary-label">状态切换</span>
        <span class="summary-value">${switches} 次</span>
      </div>
      <div class="chart-summary-item">
        <span class="summary-label">数据点数</span>
        <span class="summary-value">${values.length}</span>
      </div>
    `;

    this.state.chartInstance.hideLoading();
    this.state.chartInstance.setOption(this.getIntChartOption(segments, stateLabel), true);
  },

  // 将点序列转换为持续区间，并合并连续相同状态
  buildSegments(chartData, endBoundary) {
    const segments = [];
    for (let i = 0; i < chartData.length; i++) {
      const start = chartData[i][0];
      const end = i < chartData.length - 1 ? chartData[i + 1][0] : (endBoundary || start);
      segments.push({ start, end: Math.max(end, start + 1), value: chartData[i][1] });
    }
    const merged = [];
    for (const seg of segments) {
      const last = merged[merged.length - 1];
      if (last && last.value === seg.value) {
        last.end = seg.end;
      } else {
        merged.push({ ...seg });
      }
    }
    return merged;
  },

  // INT：甘特图风格的状态时间线配置
  getIntChartOption(segments, stateLabel) {
    // 状态泳道：0 在上，1 在下
    const present = [...new Set(segments.map(s => s.value))].sort((a, b) => a - b);
    const laneKeys = present.length >= 2 ? [0, 1] : present;
    const laneColor = (v) => v === 1 ? '#F5222D' : '#52C41A';

    const data = segments.map(seg => ({
      value: [seg.start, laneKeys.indexOf(seg.value), seg.end, seg.value],
      itemStyle: { color: laneColor(seg.value) },
    }));

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#DDE2E9', borderWidth: 1,
        textStyle: { color: '#0C0D0E', fontSize: 12 },
        formatter: (params) => {
          const v = params.data && params.data.value;
          if (!v) return '';
          const [startTs, , endTs, value] = v;
          const color = laneColor(value);
          return `<div style="font-size:12px;line-height:1.6">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color}"></span>
              状态: <strong>${stateLabel(value)}</strong>
            </div>
            <div style="color:#737A87">${this.formatDateTime(new Date(startTs))} → ${this.formatDateTime(new Date(endTs))}</div>
            <div style="color:#737A87">持续: <strong>${this.formatDuration(endTs - startTs)}</strong></div>
          </div>`;
        },
      },
      grid: { left: 60, right: 24, top: 24, bottom: 48, containLabel: true },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#DDE2E9' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#737A87', fontSize: 11,
          // 根据时间跨度自动选择合适的格式
          formatter: (val) => this.formatTimeLabel(val),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: laneKeys.map(k => stateLabel(k)),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#737A87', fontSize: 12 },
        splitLine: { show: false },
      },
      series: [{
        name: '状态',
        type: 'custom',
        encode: { x: [0, 2], y: 1 },
        data,
        renderItem: (params, api) => {
          const start = api.coord([api.value(0), api.value(1)]);
          const end = api.coord([api.value(2), api.value(1)]);
          const bandHeight = api.size([0, 1])[1] || 0;
          const barHeight = Math.max(10, bandHeight * 0.6);
          const rect = {
            x: start[0],
            y: start[1] - barHeight / 2,
            width: Math.max(1, end[0] - start[0]),
            height: barHeight,
          };
          const clipped = echarts.graphic.clipRectByRect(rect, {
            x: params.coordSys.x,
            y: params.coordSys.y,
            width: params.coordSys.width,
            height: params.coordSys.height,
          });
          return clipped && {
            type: 'rect',
            shape: clipped,
            style: api.style(),
          };
        },
      }],
    };
  },

  formatDuration(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return `${s} 秒`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} 分 ${s % 60} 秒`;
    const h = Math.floor(m / 60);
    return `${h} 时 ${m % 60} 分`;
  },

  getChartOption(chartData) {
    const chartColor = '#1664FF';
    const isEmpty = !chartData || chartData.length === 0;

    return {
      title: isEmpty ? {
        text: '暂无数据', left: 'center', top: 'center',
        textStyle: { color: '#737A87', fontSize: 14, fontWeight: 'normal' },
      } : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderColor: '#DDE2E9', borderWidth: 1,
        textStyle: { color: '#0C0D0E', fontSize: 12 },
        formatter: (params) => {
          const p = params[0];
          if (!p) return '';
          const ts = typeof p.value === 'object' && Array.isArray(p.value) ? p.value[0] : p.axisValue;
          const date = new Date(ts);
          const timeStr = this.formatDateTime(date);
          const val = typeof p.value === 'object' && Array.isArray(p.value) ? p.value[1] : p.value;
          return `<div style="font-size:12px;line-height:1.6">
            <div style="color:#737A87;margin-bottom:2px">${timeStr}</div>
            <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${chartColor};margin-right:6px"></span>监控值: <strong>${val}</strong></div>
          </div>`;
        },
      },
      grid: { left: 60, right: 24, top: 24, bottom: 48, containLabel: true },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#DDE2E9' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#737A87', fontSize: 11,
          // 根据时间跨度自动选择合适的格式
          formatter: (val) => this.formatTimeLabel(val),
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#737A87', fontSize: 11 },
        splitLine: { lineStyle: { color: '#EAEDF1', type: 'dashed' } },
      },
      series: [{
        name: '监控值', type: 'line', data: chartData || [],
        smooth: true, symbol: 'circle', symbolSize: 5, showSymbol: false,
        lineStyle: { color: chartColor, width: 2 },
        itemStyle: { color: chartColor },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 100, 255, 0.25)' },
              { offset: 1, color: 'rgba(22, 100, 255, 0.02)' },
            ],
          },
        },
        emphasis: { focus: 'series', itemStyle: { borderWidth: 2, borderColor: '#fff' } },
      }],
    };
  },

  // 格式化时间标签 — 根据数据跨度自动选择精度
  formatTimeLabel(val) {
    const date = new Date(val);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  },

  // 格式化完整时间用于 tooltip
  formatDateTime(date) {
    const y = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  },

  parseTimeToTimestamp(dt) {
    if (!dt) return Date.now();
    if (Array.isArray(dt)) {
      const [y, mo, d, h, mi, s] = dt;
      return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, s || 0).getTime();
    }
    if (typeof dt === 'string') return new Date(dt.replace(' ', 'T')).getTime();
    return Date.now();
  },
};
