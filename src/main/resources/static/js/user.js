/**
 * User Management - 用户管理
 *
 * Features:
 *  - Paginated user list (server-side paging via Spring Data Page)
 *  - Client-side username search filter
 *  - Add / Edit modal with validation
 *  - Delete with confirmation
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
    keyword: '',
    editing: null, // user object when editing, null when adding
  };

  // ── Init ───────────────────────────────────────────────────────
  async function init() {
    if (!(await Auth.requireAuth())) return;
    Layout.init('user', '用户管理');
    renderSkeleton();
    bindEvents();
    loadData();
  }

  function renderSkeleton() {
    document.getElementById('appContent').innerHTML =
      '<div class="search-bar">' +
        '<input type="text" class="form-input" id="searchInput" placeholder="搜索用户名..." />' +
        '<button class="btn btn-secondary" id="searchBtn">搜索</button>' +
        '<button class="btn btn-primary" id="addBtn" style="margin-left:auto">' +
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '新增用户' +
        '</button>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card-body" id="tableContainer"></div>' +
      '</div>' +
      '<div id="paginationContainer"></div>';
  }

  function bindEvents() {
    var searchInput = document.getElementById('searchInput');
    var debouncedSearch = Utils.debounce(function () {
      state.keyword = searchInput.value.trim();
      renderTable();
    }, 300);

    searchInput.addEventListener('input', debouncedSearch);
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        state.keyword = searchInput.value.trim();
        renderTable();
      }
    });

    document.getElementById('searchBtn').addEventListener('click', function () {
      state.keyword = searchInput.value.trim();
      renderTable();
    });

    document.getElementById('addBtn').addEventListener('click', function () {
      openModal(null);
    });

    document.getElementById('tableContainer').addEventListener('click', onTableClick);
    document.getElementById('paginationContainer').addEventListener('click', onPaginationClick);
  }

  // ── Data Loading ──────────────────────────────────────────────
  async function loadData() {
    state.loading = true;
    renderTable();
    try {
      var res = await API.user.page(state.pageNum, PAGE_SIZE);
      state.list = (res && res.content) || [];
      state.total = (res && res.totalElements) || 0;
      state.totalPages = (res && res.totalPages) || 0;
    } catch (err) {
      Toast.error(err.message || '加载用户列表失败');
      state.list = [];
      state.total = 0;
      state.totalPages = 0;
    }
    state.loading = false;

    // If the current page falls out of range (e.g. after a delete), clamp and reload.
    if (state.totalPages > 0 && state.pageNum > state.totalPages) {
      state.pageNum = state.totalPages;
      return loadData();
    }
    renderTable();
    renderPagination();
  }

  function getFilteredList() {
    if (!state.keyword) return state.list;
    var kw = state.keyword.toLowerCase();
    return state.list.filter(function (u) {
      return (u.username || '').toLowerCase().indexOf(kw) !== -1;
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
      container.innerHTML = renderEmpty(
        state.keyword ? '没有匹配的用户' : '暂无用户数据'
      );
      return;
    }

    container.innerHTML =
      '<div style="overflow-x:auto">' +
      '<table class="data-table">' +
        '<thead><tr>' +
          '<th>ID</th><th>用户ID</th><th>用户名</th>' +
          '<th>创建时间</th><th>更新时间</th><th>操作</th>' +
        '</tr></thead>' +
        '<tbody>' +
          list.map(function (u) {
            return '<tr>' +
              '<td>' + Utils.escape(u.id) + '</td>' +
              '<td>' + Utils.escape(u.userId) + '</td>' +
              '<td>' + Utils.escape(u.username) + '</td>' +
              '<td>' + Utils.formatDateTime(u.createTime) + '</td>' +
              '<td>' + Utils.formatDateTime(u.updateTime) + '</td>' +
              '<td style="white-space:nowrap">' +
                '<button class="btn btn-ghost btn-sm" data-action="edit" data-id="' + Utils.escape(u.id) + '">编辑</button>' +
                '<button class="btn btn-ghost btn-sm" data-action="delete" data-id="' + Utils.escape(u.id) + '" style="color:var(--color-danger)">删除</button>' +
              '</td>' +
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

  function onTableClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var id = btn.dataset.id;
    var action = btn.dataset.action;
    var user = null;
    for (var i = 0; i < state.list.length; i++) {
      if (String(state.list[i].id) === String(id)) { user = state.list[i]; break; }
    }
    if (!user) return;
    if (action === 'edit') openModal(user);
    else if (action === 'delete') handleDelete(user);
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

  // ── Add / Edit Modal ───────────────────────────────────────────
  function openModal(user) {
    state.editing = user || null;
    var isEdit = !!user;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.id = 'userModal';
    overlay.innerHTML =
      '<div class="modal">' +
        '<div class="modal-header">' +
          '<span class="modal-title">' + (isEdit ? '编辑用户' : '新增用户') + '</span>' +
          '<button class="modal-close" id="modalCloseBtn">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="form-group">' +
            '<label class="form-label">用户ID<span class="required">*</span></label>' +
            '<input type="text" class="form-input" id="formUserId" placeholder="请输入用户ID" value="' + (isEdit ? Utils.escape(user.userId) : '') + '" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">用户名<span class="required">*</span></label>' +
            '<input type="text" class="form-input" id="formUsername" placeholder="请输入用户名" value="' + (isEdit ? Utils.escape(user.username) : '') + '" />' +
          '</div>' +
          '<div class="form-group">' +
            '<label class="form-label">密码' + (isEdit ? '' : '<span class="required">*</span>') + '</label>' +
            '<input type="password" class="form-input" id="formPassword" placeholder="' + (isEdit ? '留空则不修改' : '请输入密码') + '" />' +
          '</div>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" id="modalCancelBtn">取消</button>' +
          '<button class="btn btn-primary" id="modalSaveBtn">保存</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector('#modalCloseBtn').addEventListener('click', closeModal);
    overlay.querySelector('#modalCancelBtn').addEventListener('click', closeModal);
    overlay.querySelector('#modalSaveBtn').addEventListener('click', submitForm);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    // Focus the first empty field
    var userIdField = overlay.querySelector('#formUserId');
    if (isEdit) {
      overlay.querySelector('#formUsername').focus();
    } else {
      userIdField.focus();
    }
  }

  function closeModal() {
    var overlay = document.getElementById('userModal');
    if (overlay) overlay.remove();
    state.editing = null;
  }

  async function submitForm() {
    var userId = document.getElementById('formUserId').value.trim();
    var username = document.getElementById('formUsername').value.trim();
    var password = document.getElementById('formPassword').value;
    var isEdit = !!state.editing;

    if (!userId) { Toast.warning('请输入用户ID'); return; }
    if (!username) { Toast.warning('请输入用户名'); return; }
    if (!isEdit && !password) { Toast.warning('请输入密码'); return; }

    var data = { userId: userId, username: username, password: password };
    var saveBtn = document.getElementById('modalSaveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = '保存中...';

    try {
      if (isEdit) {
        await API.user.update(state.editing.id, data);
        Toast.success('用户更新成功');
      } else {
        await API.user.save(data);
        Toast.success('用户创建成功');
      }
      closeModal();
      loadData();
    } catch (err) {
      Toast.error(err.message || '操作失败');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '保存';
    }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete(user) {
    var ok = await confirmDialog(
      '确定要删除用户「' + Utils.escape(user.username) + '」吗？此操作不可恢复。',
      '删除用户'
    );
    if (!ok) return;

    try {
      await API.user.delete(user.id);
      Toast.success('删除成功');
      // If the last row on the current page was removed, step back a page.
      if (state.list.length === 1 && state.pageNum > 1) {
        state.pageNum--;
      }
      loadData();
    } catch (err) {
      Toast.error(err.message || '删除失败');
    }
  }

  // ── Boot ──────────────────────────────────────────────────────
  init();
})();
