/**
 * 监控历史数据 - Monitor History Page
 * - 趋势图表：监控点ID + 时间范围（预设/自定义）
 * - 历史数据表格：监控点ID + 时间范围筛选 + 分页
 */
document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;
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
    // Table state
    pageNum: 1,
    pageSize: 10,
    searchMonitorId: '',
    tableStartTime: '',           // ISO string
    tableEndTime: '',             // ISO string
    list: [],
    total: 0,
    totalPages: 0,
    loading: false,
  },

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
    this.loadTable();
    this.initChart();
  },

  // 加载设备+监控点级联下拉（图表和表格各一组）
  async loadMonitorOptions() {
    await Promise.all([
      MonitorOptions.setupCascade('chartDeviceId', 'chartMonitorId', {
        allDeviceLabel: '全部设备',
        monitorValueField: 'monitorId',
      }),
      MonitorOptions.setupCascade('tableDeviceId', 'tableSearchMonitorId', {
        allDeviceLabel: '全部设备',
        monitorValueField: 'monitorId',
      }),
    ]);
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
              <div class="empty-text">输入监控点ID并查询以查看趋势图</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Data Table Section -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">历史数据</span>
        </div>
        <div class="card-body">
          <div class="search-bar">
            <select class="form-select" id="tableDeviceId" style="width:120px;flex-shrink:0"><option value="">全部设备</option></select>
            <select class="form-select" id="tableSearchMonitorId" style="width:130px;flex-shrink:0" disabled><option value="">选择设备</option></select>
            <input type="datetime-local" class="form-input" id="tableStartDate" value="${this.state.tableStartTime}" style="width:160px;flex-shrink:0" title="开始时间">
            <span class="date-separator" style="flex-shrink:0">至</span>
            <input type="datetime-local" class="form-input" id="tableEndDate" value="${this.state.tableEndTime}" style="width:160px;flex-shrink:0" title="结束时间">
            <button class="btn btn-primary btn-sm" id="btnTableSearch" style="flex-shrink:0">搜索</button>
            <button class="btn btn-secondary btn-sm" id="btnTableReset" style="flex-shrink:0">重置</button>
          </div>
          <div style="overflow-x:auto">
            <div id="tableContainer">
              <div class="table-loading"><span class="loading-spinner"></span></div>
            </div>
          </div>
        </div>
      </div>
      <div id="paginationBar"></div>
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

    // ── Table search ──
    document.getElementById('btnTableSearch').addEventListener('click', () => {
      this.state.searchMonitorId = document.getElementById('tableSearchMonitorId').value;
      this.state.tableStartTime = document.getElementById('tableStartDate').value;
      this.state.tableEndTime = document.getElementById('tableEndDate').value;
      this.state.pageNum = 1;
      this.loadTable();
    });

    document.getElementById('btnTableReset').addEventListener('click', () => {
      this.state.searchMonitorId = '';
      this.state.tableStartTime = '';
      this.state.tableEndTime = '';
      this.state.pageNum = 1;
      document.getElementById('tableDeviceId').value = '';
      document.getElementById('tableDeviceId').dispatchEvent(new Event('change'));
      document.getElementById('tableStartDate').value = '';
      document.getElementById('tableEndDate').value = '';
      this.loadTable();
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
      if (mode === 'preset') {
        data = await API.monitorHistory.chart(monitorId, hours);
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
      }
      this.renderChart(data || []);
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

  renderChart(data) {
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

    const values = chartData.map(d => d[1]).filter(v => v !== null);

    if (chartData.length === 0 || values.length === 0) {
      this.state.chartInstance.hideLoading();
      this.state.chartInstance.setOption(this.getChartOption([]), true);
      document.getElementById('chartSummary').style.display = 'none';
      return;
    }

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

  // ── Table ──
  buildFilters() {
    const filters = {};
    if (this.state.searchMonitorId) filters.monitorId = this.state.searchMonitorId;
    if (this.state.tableStartTime) filters.startTime = this.state.tableStartTime;
    if (this.state.tableEndTime) filters.endTime = this.state.tableEndTime;
    return Object.keys(filters).length > 0 ? filters : null;
  },

  async loadTable() {
    this.state.loading = true;
    this.renderTableLoading();
    try {
      const filters = this.buildFilters();
      const res = await API.monitorHistory.page(this.state.pageNum, this.state.pageSize, filters);
      this.state.list = res.content || [];
      this.state.total = res.totalElements || 0;
      this.state.totalPages = res.totalPages || 0;
    } catch (err) {
      Toast.error(err.message || '加载数据失败');
      this.state.list = [];
      this.state.total = 0;
      this.state.totalPages = 0;
    } finally {
      this.state.loading = false;
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
              <path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 6-6"/>
            </svg>
          </div>
          <div class="empty-text">暂无历史数据</div>
        </div>
      `;
      this.renderPagination();
      return;
    }

    const rows = this.state.list.map(item => `
      <tr>
        <td>${Utils.escape(item.id)}</td>
        <td style="font-family:var(--font-mono)">${Utils.escape(item.monitorId)}</td>
        <td>${Utils.escape(item.monitorName)}</td>
        <td style="font-family:var(--font-mono);font-weight:var(--font-weight-medium)">${Utils.escape(item.monitorValue)}</td>
        <td style="white-space:nowrap">${Utils.formatDateTime(item.createTime)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost btn-sm text-danger" onclick="MonitorHistoryPage.remove(${item.id})">删除</button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>监控点ID</th>
            <th>监控点名称</th>
            <th>监控值</th>
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
    const pagBar = document.getElementById('paginationBar');
    if (!pagBar) return;

    if (this.state.total === 0) { pagBar.innerHTML = ''; return; }

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
      return `<button class="page-btn ${p === current ? 'active' : ''}" onclick="MonitorHistoryPage.goToPage(${p})">${p}</button>`;
    }).join('');

    pagBar.innerHTML = `
      <div class="card-body" style="padding:var(--space-4) var(--space-6) var(--space-6)">
        <div class="pagination">
          <span class="page-info">共 ${this.state.total} 条，显示 ${start}-${end}</span>
          <button class="page-btn" ${current <= 1 ? 'disabled' : ''} onclick="MonitorHistoryPage.goToPage(${current - 1})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          ${pageBtns}
          <button class="page-btn" ${current >= total ? 'disabled' : ''} onclick="MonitorHistoryPage.goToPage(${current + 1})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
    `;
  },

  goToPage(page) {
    if (page < 1 || page > this.state.totalPages || page === this.state.pageNum) return;
    this.state.pageNum = page;
    this.loadTable();
  },

  async remove(id) {
    const ok = await confirmDialog('确定要删除该历史记录吗？删除后不可恢复。', '删除确认');
    if (!ok) return;
    try {
      await API.monitorHistory.delete(id);
      Toast.success('删除成功');
      if (this.state.list.length === 1 && this.state.pageNum > 1) this.state.pageNum--;
      this.loadTable();
    } catch (err) {
      Toast.error(err.message || '删除失败');
    }
  },
};
