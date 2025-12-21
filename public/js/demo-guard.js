(function () {
  const params = new URLSearchParams(location.search);
  const demoMode = params.get("demo") === "1";

  function getTokenSafe() {
    try { if (window.ECAuth && typeof ECAuth.getToken === "function") return ECAuth.getToken(); } catch (_) {}
    return localStorage.getItem("ec_token") || localStorage.getItem("equity_token") || "";
  }

  function showBanner() {
    const banner = document.createElement("div");
    banner.style.cssText = `
      position: sticky; top: 0; z-index: 9999;
      background: rgba(7,11,20,.92);
      border-bottom: 1px solid rgba(255,255,255,.12);
      padding: 12px 14px;
      display:flex; align-items:center; justify-content:space-between; gap:10px;
      font-family: Inter, system-ui, sans-serif; color: rgba(255,255,255,.92);
    `;
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <span style="display:inline-flex;align-items:center;justify-content:center;height:28px;width:28px;border-radius:10px;background:rgba(233,116,30,.18);border:1px solid rgba(233,116,30,.35)">
          <i class="fa-solid fa-eye" style="color:#fff"></i>
        </span>
        <div>
          <div style="font-weight:900">Demo (View-only)</div>
          <div style="opacity:.75;font-size:.9rem">Create an account to edit, submit forms, or save changes.</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="/marketplace.html" style="text-decoration:none;color:#fff;font-weight:900;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)">Marketplace</a>
        <a href="/get-started.html" style="text-decoration:none;color:#fff;font-weight:900;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,#e9741e,#b54714)">Create account</a>
        <a href="/login.html" style="text-decoration:none;color:#fff;font-weight:900;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)">Sign in</a>
      </div>
    `;
    document.body.prepend(banner);
  }

  function lockEditing() {
    document.querySelectorAll("form").forEach(form => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        alert("Demo mode: create an account to submit or save changes.");
      });
    });

    const selector = "button, [role='button'], input[type='submit'], input[type='button']";
    document.querySelectorAll(selector).forEach(el => {
      const text = (el.innerText || el.value || "").toLowerCase();
      if (text.includes("create") || text.includes("add") || text.includes("save") || text.includes("update") || text.includes("delete") || text.includes("publish") || text.includes("submit")) {
        el.disabled = true;
        el.style.opacity = "0.6";
        el.style.cursor = "not-allowed";
        el.title = "Demo mode: create an account to edit.";
      }
    });
  }

  function wrapFetchToBlockWrites() {
    const originalFetch = window.fetch;
    window.fetch = async function (input, init = {}) {
      const method = (init.method || "GET").toUpperCase();
      const token = getTokenSafe();
      const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

      if (!token && isWrite) {
        return new Response(JSON.stringify({ message: "Demo mode: please create an account to perform this action." }),
          { status: 401, headers: { "Content-Type": "application/json" } });
      }

      return originalFetch(input, init);
    };
  }

  const token = getTokenSafe();
  if (token) return;

  if (demoMode) {
    showBanner();
    lockEditing();
    wrapFetchToBlockWrites();
  }
})();
