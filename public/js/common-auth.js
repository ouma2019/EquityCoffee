/**
 * Common auth + API helper for Equity Coffee
 * Exposed as window.ECAuth
 *
 * - Stores auth in localStorage keys: ec_token, ec_user
 * - apiFetch supports same-origin by default, with optional backend base fallback:
 *     ECAuth.setApiBase("https://your-backend.onrender.com")
 */
(function (global) {
  const TOKEN_KEY = 'ec_token';
  const USER_KEY = 'ec_user';
  const API_BASE_KEY = 'ec_api_base';

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function getToken() { return safeGet(TOKEN_KEY) || null; }

  function setAuth(token, user) {
    if (token) safeSet(TOKEN_KEY, token);
    if (user) safeSet(USER_KEY, JSON.stringify(user));
  }

  function clearAuth() {
    safeRemove(TOKEN_KEY);
    safeRemove(USER_KEY);
    safeRemove('ec_demo_mode');
    safeRemove('ec_demo_role');
    safeRemove('ec_demo_user_email');
  }

  function getUser() {
    try {
      const raw = safeGet(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setApiBase(baseUrl) {
    if (!baseUrl) {
      safeRemove(API_BASE_KEY);
      return;
    }
    const cleaned = String(baseUrl).replace(/\/$/, '');
    safeSet(API_BASE_KEY, cleaned);
  }

  function getApiBase() {
    const b = safeGet(API_BASE_KEY);
    return b ? String(b).replace(/\/$/, '') : '';
  }

  function requireAuth(options) {
    const opts = options || {};
    const redirectTo = opts.redirectTo || '/login.html';
    const token = getToken();
    if (!token) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  async function doFetch(url, options) {
    const res = await fetch(url, options);
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      const message = (data && data.message) || ('Request failed with status ' + res.status);
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function apiFetch(path, options) {
    const opts = options || {};
    const headers = opts.headers ? Object.assign({}, opts.headers) : {};
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    if (opts.body && !(opts.body instanceof FormData)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const fetchOpts = Object.assign({}, opts, { headers });
    if (fetchOpts.body && !(fetchOpts.body instanceof FormData) && typeof fetchOpts.body === 'object') {
      fetchOpts.body = JSON.stringify(fetchOpts.body);
    }

    // Try same-origin first, then optional saved API base
    const bases = Array.from(new Set(['', getApiBase()].map(b => (b || '').replace(/\/$/, ''))));
    let lastErr = null;

    for (const base of bases) {
      const url = base ? (base + path) : path;
      try {
        return await doFetch(url, fetchOpts);
      } catch (err) {
        lastErr = err;
        // If it's an auth error (401/403), don't keep trying other bases
        if (err && (err.status === 401 || err.status === 403)) throw err;
      }
    }
    throw lastErr || new Error('Request failed');
  }

  function logoutAndRedirect(redirectTo) {
    clearAuth();
    window.location.href = redirectTo || '/login.html';
  }

  global.ECAuth = {
    getToken,
    setAuth,
    clearAuth,
    getUser,
    requireAuth,
    apiFetch,
    logoutAndRedirect,
    setApiBase,
    getApiBase
  };
})(window);
