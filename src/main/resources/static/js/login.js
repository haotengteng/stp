/**
 * Login Page Logic
 * - Auth redirect check on load
 * - Form submit with API.login()
 * - Password visibility toggle
 * - Loading state management
 * - Error display
 */
(function () {
  'use strict';

  // Redirect to realtime page if already logged in
  if (Auth.isLoggedIn()) {
    window.location.href = '/pages/realtime.html';
    return;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Initialize toast notification system
    Toast.init();

    // DOM references
    var form = document.getElementById('loginForm');
    var usernameInput = document.getElementById('username');
    var passwordInput = document.getElementById('password');
    var passwordToggle = document.getElementById('passwordToggle');
    var loginBtn = document.getElementById('loginBtn');
    var errorArea = document.getElementById('loginError');
    var forgotLink = document.getElementById('forgotPassword');

    var isLoading = false;

    // ── Password visibility toggle ──
    passwordToggle.addEventListener('click', function () {
      var isHidden = passwordInput.type === 'password';
      passwordInput.type = isHidden ? 'text' : 'password';
      passwordToggle.classList.toggle('active');
    });

    // ── Error helpers ──
    var ERROR_ICON =
      '<svg viewBox="0 0 16 16" fill="none">' +
      '<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M8 5v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="8" cy="11.5" r="0.8" fill="currentColor"/></svg>';

    function showError(message) {
      errorArea.innerHTML = ERROR_ICON + '<span>' + Utils.escape(message) + '</span>';
      errorArea.classList.add('show');
    }

    function hideError() {
      errorArea.classList.remove('show');
    }

    // ── Loading state ──
    function setLoading(loading) {
      isLoading = loading;
      loginBtn.disabled = loading;
      if (loading) {
        loginBtn.classList.add('loading');
      } else {
        loginBtn.classList.remove('loading');
      }
    }

    // ── Login handler ──
    async function handleLogin() {
      if (isLoading) return;

      hideError();

      var username = usernameInput.value.trim();
      var password = passwordInput.value;

      // Validation
      if (!username) {
        showError('请输入用户名');
        usernameInput.focus();
        return;
      }

      if (!password) {
        showError('请输入密码');
        passwordInput.focus();
        return;
      }

      setLoading(true);

      try {
        var data = await API.login(username, password);
        Auth.setUser(data);
        Auth.setToken(data.userId);
        Toast.success('登录成功，正在跳转...');
        setTimeout(function () {
          window.location.href = '/pages/realtime.html';
        }, 600);
      } catch (err) {
        showError(err.message || '登录失败，请重试');
      } finally {
        setLoading(false);
      }
    }

    // ── Form submit ──
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleLogin();
    });

    // ── Login button click ──
    loginBtn.addEventListener('click', function (e) {
      e.preventDefault();
      handleLogin();
    });

    // ── Enter key on username: jump to password or submit ──
    usernameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!passwordInput.value) {
          passwordInput.focus();
        } else {
          handleLogin();
        }
      }
    });

    // ── Enter key on password: submit ──
    passwordInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin();
      }
    });

    // ── Clear error when user starts typing ──
    usernameInput.addEventListener('input', hideError);
    passwordInput.addEventListener('input', hideError);

    // ── Forgot password placeholder ──
    forgotLink.addEventListener('click', function (e) {
      e.preventDefault();
      Toast.warning('忘记密码功能暂未开放，请联系系统管理员');
    });

    // ── Focus username on load ──
    usernameInput.focus();
  });
})();
