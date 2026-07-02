/* =========================================================
   Restu frontend — vanilla JS, no build step.
   Talks to the FastAPI backend described in README.md.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------- state ---------------- */
  const state = {
    apiBase: localStorage.getItem("restu_api_base") || "http://localhost:8000",
    token: localStorage.getItem("restu_token") || null,
    user: null, // { id, full_name, email, role, is_active, created_at }
    menuItems: [],
    editingItemId: null,
  };

  /* ---------------- element refs ---------------- */
  const $ = (id) => document.getElementById(id);

  const els = {
    tabnav: $("tabnav"),
    authZone: $("authZone"),
    userZone: $("userZone"),
    userName: $("userName"),
    userRoleDot: $("userRoleDot"),
    statusBar: $("statusBar"),
    toastStack: $("toastStack"),

    btnShowLogin: $("btnShowLogin"),
    btnShowRegister: $("btnShowRegister"),
    btnLogout: $("btnLogout"),
    btnSettings: $("btnSettings"),

    authModalBackdrop: $("authModalBackdrop"),
    authModalClose: $("authModalClose"),
    modalTabLogin: $("modalTabLogin"),
    modalTabRegister: $("modalTabRegister"),
    loginForm: $("loginForm"),
    registerForm: $("registerForm"),
    loginError: $("loginError"),
    registerError: $("registerError"),

    settingsModalBackdrop: $("settingsModalBackdrop"),
    settingsModalClose: $("settingsModalClose"),
    settingsForm: $("settingsForm"),
    apiBaseInput: $("apiBaseInput"),

    categoryFilter: $("categoryFilter"),
    menuGrid: $("menuGrid"),
    menuEmpty: $("menuEmpty"),
    btnNewItem: $("btnNewItem"),

    itemModalBackdrop: $("itemModalBackdrop"),
    itemModalClose: $("itemModalClose"),
    itemModalTitle: $("itemModalTitle"),
    itemForm: $("itemForm"),
    itemId: $("itemId"),
    itemName: $("itemName"),
    itemCategory: $("itemCategory"),
    categoryList: $("categoryList"),
    itemDescription: $("itemDescription"),
    itemPrice: $("itemPrice"),
    itemRating: $("itemRating"),
    itemAvailable: $("itemAvailable"),
    itemError: $("itemError"),
    btnDeleteItem: $("btnDeleteItem"),

    recommendForm: $("recommendForm"),
    recommendInput: $("recommendInput"),
    recommendResults: $("recommendResults"),

    reservationForm: $("reservationForm"),
    reservationInput: $("reservationInput"),
    reservationResults: $("reservationResults"),
    reservationHistory: $("reservationHistory"),
    btnRefreshReservations: $("btnRefreshReservations"),

    feedbackForm: $("feedbackForm"),
    feedbackInput: $("feedbackInput"),
    feedbackResults: $("feedbackResults"),
    feedbackHistory: $("feedbackHistory"),
    btnRefreshFeedback: $("btnRefreshFeedback"),

    statRow: $("statRow"),
    allFeedbackList: $("allFeedbackList"),
    userList: $("userList"),
    btnRefreshAllFeedback: $("btnRefreshAllFeedback"),
    btnRefreshUsers: $("btnRefreshUsers"),
  };

  /* ---------------- helpers ---------------- */

  function toast(message, kind) {
    const t = document.createElement("div");
    t.className = "toast" + (kind ? " toast-" + kind : "");
    t.textContent = message;
    els.toastStack.appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }

  function setStatus(message, kind) {
    els.statusBar.innerHTML = "";
    if (!message) return;
    const d = document.createElement("div");
    d.className = "status-msg" + (kind ? " status-" + kind : "");
    d.textContent = message;
    els.statusBar.appendChild(d);
  }

  function fmtMoney(n) {
    const num = Number(n);
    return "$" + num.toFixed(2);
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return iso || "";
    }
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function api(path, { method = "GET", body, auth = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      if (!state.token) throw new ApiError("Log in to do that.", 401);
      headers.Authorization = "Bearer " + state.token;
    }
    let res;
    try {
      res = await fetch(state.apiBase.replace(/\/+$/, "") + path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new ApiError(
        "Can't reach the backend at " + state.apiBase + ". Check it's running and CORS allows this origin.",
        0
      );
    }

    if (res.status === 204) return null;

    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch (e) { data = null; }
    }

    if (!res.ok) {
      let detail = (data && (data.detail || data.message)) || res.statusText || "Request failed.";
      if (Array.isArray(detail)) {
        detail = detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
      }
      if (res.status === 401 && auth) {
        // token invalid/expired
        clearSession();
        renderAuthState();
      }
      throw new ApiError(detail, res.status);
    }
    return data;
  }

  function ApiError(message, status) {
    this.message = message;
    this.status = status;
  }
  ApiError.prototype = Object.create(Error.prototype);

  function isAdmin() {
    return state.user && state.user.role === "admin";
  }

  /* ---------------- session ---------------- */

  function saveSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem("restu_token", token);
  }

  function clearSession() {
    state.token = null;
    state.user = null;
    localStorage.removeItem("restu_token");
  }

  async function bootstrapSession() {
    if (!state.token) {
      renderAuthState();
      return;
    }
    try {
      const user = await api("/api/auth/me", { auth: true });
      state.user = user;
      renderAuthState();
    } catch (e) {
      clearSession();
      renderAuthState();
    }
  }

  function renderAuthState() {
    const loggedIn = !!state.user;
    els.authZone.classList.toggle("hidden", loggedIn);
    els.userZone.classList.toggle("hidden", !loggedIn);
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.classList.toggle("hidden", !(loggedIn && isAdmin()));
    });
    if (loggedIn) {
      els.userName.textContent = state.user.full_name + (isAdmin() ? " · admin" : "");
      els.userRoleDot.classList.toggle("role-admin", isAdmin());
    }
    // if on admin tab but no longer admin, bounce to menu
    const activeTab = document.querySelector(".tab-btn.active");
    if (activeTab && activeTab.dataset.tab === "admin" && !(loggedIn && isAdmin())) {
      switchTab("menu");
    }
    loadMenu();
  }

  /* ---------------- tabs ---------------- */

  function switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + tab));
    setStatus("");
    if (tab === "reservations" && state.user) loadReservationHistory();
    if (tab === "feedback" && state.user) loadFeedbackHistory();
    if (tab === "admin" && isAdmin()) loadAdminData();
  }

  els.tabnav.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    if (btn.classList.contains("hidden")) return;
    if (["recommend", "reservations", "feedback", "admin"].includes(btn.dataset.tab) && !state.user) {
      toast("Log in first.", "error");
      openAuthModal("login");
      return;
    }
    switchTab(btn.dataset.tab);
  });

  /* ---------------- auth modal ---------------- */

  function openAuthModal(mode) {
    els.authModalBackdrop.classList.remove("hidden");
    setAuthModalMode(mode || "login");
    els.loginError.textContent = "";
    els.registerError.textContent = "";
  }
  function closeAuthModal() {
    els.authModalBackdrop.classList.add("hidden");
    els.loginForm.reset();
    els.registerForm.reset();
  }
  function setAuthModalMode(mode) {
    const isLogin = mode === "login";
    els.modalTabLogin.classList.toggle("active", isLogin);
    els.modalTabRegister.classList.toggle("active", !isLogin);
    els.loginForm.classList.toggle("hidden", !isLogin);
    els.registerForm.classList.toggle("hidden", isLogin);
  }

  els.btnShowLogin.addEventListener("click", () => openAuthModal("login"));
  els.btnShowRegister.addEventListener("click", () => openAuthModal("register"));
  els.authModalClose.addEventListener("click", closeAuthModal);
  els.authModalBackdrop.addEventListener("click", (e) => { if (e.target === els.authModalBackdrop) closeAuthModal(); });
  els.modalTabLogin.addEventListener("click", () => setAuthModalMode("login"));
  els.modalTabRegister.addEventListener("click", () => setAuthModalMode("register"));

  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.loginError.textContent = "";
    const btn = els.loginForm.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { email: $("loginEmail").value.trim(), password: $("loginPassword").value },
      });
      saveSession(data.access_token, data.user);
      closeAuthModal();
      renderAuthState();
      toast("Welcome back, " + data.user.full_name.split(" ")[0] + ".", "success");
    } catch (err) {
      els.loginError.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  els.registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.registerError.textContent = "";
    const btn = els.registerForm.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: {
          full_name: $("registerName").value.trim(),
          email: $("registerEmail").value.trim(),
          password: $("registerPassword").value,
        },
      });
      saveSession(data.access_token, data.user);
      closeAuthModal();
      renderAuthState();
      toast("Account created. You're in.", "success");
    } catch (err) {
      els.registerError.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  els.btnLogout.addEventListener("click", () => {
    clearSession();
    renderAuthState();
    switchTab("menu");
    toast("Logged out.");
  });

  /* ---------------- settings modal ---------------- */

  function openSettingsModal() {
    els.apiBaseInput.value = state.apiBase;
    els.settingsModalBackdrop.classList.remove("hidden");
  }
  function closeSettingsModal() { els.settingsModalBackdrop.classList.add("hidden"); }

  els.btnSettings.addEventListener("click", openSettingsModal);
  els.settingsModalClose.addEventListener("click", closeSettingsModal);
  els.settingsModalBackdrop.addEventListener("click", (e) => { if (e.target === els.settingsModalBackdrop) closeSettingsModal(); });

  els.settingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = els.apiBaseInput.value.trim() || "http://localhost:8000";
    state.apiBase = val;
    localStorage.setItem("restu_api_base", val);
    closeSettingsModal();
    toast("API base saved: " + val, "success");
    bootstrapSession();
  });

  /* ---------------- menu ---------------- */

  async function loadMenu() {
    try {
      const category = els.categoryFilter.value;
      const path = "/api/menu" + (category ? "?category=" + encodeURIComponent(category) : "");
      const items = state.user
        ? await api(path, { auth: true })
        : []; // menu read requires auth per API; show prompt instead
      state.menuItems = items;
      renderCategoryOptions(items);
      renderMenuGrid(items);
      if (!state.user) {
        els.menuEmpty.textContent = "Log in to see the board — menu reads require an account.";
        els.menuEmpty.classList.remove("hidden");
      }
    } catch (err) {
      setStatus(err.message, "error");
    }
  }

  function renderCategoryOptions(items) {
    const current = els.categoryFilter.value;
    const cats = Array.from(new Set(items.map((i) => i.category))).sort();
    els.categoryFilter.innerHTML = '<option value="">All categories</option>' +
      cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    els.categoryFilter.value = cats.includes(current) ? current : "";
    els.categoryList.innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");
  }

  function renderMenuGrid(items) {
    els.menuGrid.innerHTML = "";
    if (!items.length) {
      if (state.user) {
        els.menuEmpty.textContent = "Nothing on the board yet." + (isAdmin() ? " Add the first dish." : " Check back soon.");
        els.menuEmpty.classList.remove("hidden");
      }
      return;
    }
    els.menuEmpty.classList.add("hidden");
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "dish-card" + (item.is_available ? "" : " unavailable");
      card.innerHTML = `
        <div class="dish-top">
          <div>
            <div class="dish-category">${escapeHtml(item.category)}</div>
            <div class="dish-name">${escapeHtml(item.name)}</div>
          </div>
          <div class="dish-price">${fmtMoney(item.price)}</div>
        </div>
        <div class="dish-desc">${escapeHtml(item.description || "")}</div>
        ${!item.is_available ? '<span class="tag-unavailable">Unavailable</span>' : ""}
        <div class="dish-bottom">
          <div class="dish-rating">★ ${Number(item.rating).toFixed(1)}</div>
          <div class="dish-actions admin-only ${isAdmin() ? "" : "hidden"}">
            <button class="icon-btn" data-edit="${item.id}">Edit</button>
          </div>
        </div>
      `;
      els.menuGrid.appendChild(card);
    });
  }

  els.categoryFilter.addEventListener("change", loadMenu);

  els.menuGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-edit]");
    if (!btn) return;
    const item = state.menuItems.find((i) => i.id === btn.dataset.edit);
    if (item) openItemModal(item);
  });

  els.btnNewItem.addEventListener("click", () => openItemModal(null));

  function openItemModal(item) {
    state.editingItemId = item ? item.id : null;
    els.itemModalTitle.textContent = item ? "Edit item" : "New item";
    els.itemId.value = item ? item.id : "";
    els.itemName.value = item ? item.name : "";
    els.itemCategory.value = item ? item.category : "";
    els.itemDescription.value = item ? (item.description || "") : "";
    els.itemPrice.value = item ? item.price : "";
    els.itemRating.value = item ? item.rating : 0;
    els.itemAvailable.checked = item ? item.is_available : true;
    els.itemError.textContent = "";
    els.btnDeleteItem.classList.toggle("hidden", !item);
    els.itemModalBackdrop.classList.remove("hidden");
  }
  function closeItemModal() {
    els.itemModalBackdrop.classList.add("hidden");
    els.itemForm.reset();
    state.editingItemId = null;
  }
  els.itemModalClose.addEventListener("click", closeItemModal);
  els.itemModalBackdrop.addEventListener("click", (e) => { if (e.target === els.itemModalBackdrop) closeItemModal(); });

  els.itemForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.itemError.textContent = "";
    const payload = {
      name: els.itemName.value.trim(),
      category: els.itemCategory.value.trim(),
      description: els.itemDescription.value.trim(),
      price: parseFloat(els.itemPrice.value),
      rating: parseFloat(els.itemRating.value || "0"),
      is_available: els.itemAvailable.checked,
    };
    const btn = els.itemForm.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      if (state.editingItemId) {
        await api("/api/menu/" + state.editingItemId, { method: "PUT", body: payload, auth: true });
        toast("Item updated.", "success");
      } else {
        await api("/api/menu", { method: "POST", body: payload, auth: true });
        toast("Item added to the board.", "success");
      }
      closeItemModal();
      loadMenu();
    } catch (err) {
      els.itemError.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  els.btnDeleteItem.addEventListener("click", async () => {
    if (!state.editingItemId) return;
    if (!confirm("Remove this item from the board? This can't be undone.")) return;
    try {
      await api("/api/menu/" + state.editingItemId, { method: "DELETE", auth: true });
      toast("Item deleted.", "success");
      closeItemModal();
      loadMenu();
    } catch (err) {
      els.itemError.textContent = err.message;
    }
  });

  /* ---------------- recommendations ---------------- */

  els.recommendForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = els.recommendInput.value.trim();
    if (!query) return;
    const btn = els.recommendForm.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const data = await api("/api/recommendations", { method: "POST", body: { query }, auth: true });
      const ticket = document.createElement("div");
      ticket.className = "ai-ticket";
      ticket.innerHTML = `<span class="ticket-label">You asked: ${escapeHtml(data.query)}</span>${escapeHtml(data.recommendation)}`;
      els.recommendResults.prepend(ticket);
      els.recommendInput.value = "";
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  /* ---------------- reservations ---------------- */

  els.reservationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = els.reservationInput.value.trim();
    if (!text) return;
    const btn = els.reservationForm.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const data = await api("/api/reservations", { method: "POST", body: { text }, auth: true });
      renderReservationTicket(data, els.reservationResults, true);
      els.reservationInput.value = "";
      loadReservationHistory();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  function renderReservationTicket(r, container, prepend) {
    const ticket = document.createElement("div");
    ticket.className = "ai-ticket";
    ticket.innerHTML = `
      <span class="ticket-label">Parsed request</span>
      "${escapeHtml(r.raw_text)}"
      <div class="ticket-meta">
        <span>Intent: <b>${escapeHtml(r.intent || "—")}</b></span>
        <span>Day: <b>${escapeHtml(r.extracted_day || "—")}</b></span>
        <span>Time: <b>${escapeHtml(r.extracted_time || "—")}</b></span>
        <span>Party: <b>${escapeHtml(r.party_size || "—")}</b></span>
      </div>
    `;
    if (prepend) container.prepend(ticket); else container.appendChild(ticket);
  }

  async function loadReservationHistory() {
    els.reservationHistory.innerHTML = '<p class="list-empty">Loading…</p>';
    try {
      const items = await api("/api/reservations/my", { auth: true });
      if (!items.length) {
        els.reservationHistory.innerHTML = '<p class="list-empty">No reservation requests yet.</p>';
        return;
      }
      els.reservationHistory.innerHTML = "";
      items.forEach((r) => {
        const row = document.createElement("div");
        row.className = "history-item";
        row.innerHTML = `
          <div class="hi-top"><span>${fmtDate(r.created_at)}</span></div>
          <div class="hi-text">${escapeHtml(r.raw_text)}</div>
          <div class="hi-badges">
            <span class="badge badge-brass">${escapeHtml(r.intent || "unknown")}</span>
            ${r.extracted_day ? `<span class="badge">${escapeHtml(r.extracted_day)}</span>` : ""}
            ${r.extracted_time ? `<span class="badge">${escapeHtml(r.extracted_time)}</span>` : ""}
            ${r.party_size ? `<span class="badge">party of ${escapeHtml(r.party_size)}</span>` : ""}
          </div>
        `;
        els.reservationHistory.appendChild(row);
      });
    } catch (err) {
      els.reservationHistory.innerHTML = `<p class="list-empty">${escapeHtml(err.message)}</p>`;
    }
  }
  els.btnRefreshReservations.addEventListener("click", loadReservationHistory);

  /* ---------------- feedback ---------------- */

  els.feedbackForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const review_text = els.feedbackInput.value.trim();
    if (!review_text) return;
    const btn = els.feedbackForm.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      const data = await api("/api/feedback", { method: "POST", body: { review_text }, auth: true });
      renderFeedbackTicket(data, els.feedbackResults, true);
      els.feedbackInput.value = "";
      loadFeedbackHistory();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

  function sentimentClass(s) {
    if (!s) return "";
    const l = s.toLowerCase();
    if (l.includes("pos")) return "sentiment-positive";
    if (l.includes("neg")) return "sentiment-negative";
    return "";
  }
  function sentimentBadgeClass(s) {
    if (!s) return "";
    const l = s.toLowerCase();
    if (l.includes("pos")) return "badge-sage";
    if (l.includes("neg")) return "badge-wine";
    return "badge-brass";
  }

  function renderFeedbackTicket(f, container, prepend) {
    const ticket = document.createElement("div");
    ticket.className = "ai-ticket " + sentimentClass(f.sentiment);
    const issues = (f.issues || []).map((i) => `<span class="badge">${escapeHtml(i)}</span>`).join(" ");
    ticket.innerHTML = `
      <span class="ticket-label">Read back: ${escapeHtml(f.sentiment || "unscored")}</span>
      ${escapeHtml(f.summary || f.review_text)}
      ${issues ? `<div class="ticket-meta">${issues}</div>` : ""}
    `;
    if (prepend) container.prepend(ticket); else container.appendChild(ticket);
  }

  async function loadFeedbackHistory() {
    els.feedbackHistory.innerHTML = '<p class="list-empty">Loading…</p>';
    try {
      const items = await api("/api/feedback/my", { auth: true });
      if (!items.length) {
        els.feedbackHistory.innerHTML = '<p class="list-empty">No feedback submitted yet.</p>';
        return;
      }
      els.feedbackHistory.innerHTML = "";
      items.forEach((f) => {
        const row = document.createElement("div");
        row.className = "history-item";
        row.innerHTML = `
          <div class="hi-top"><span>${fmtDate(f.created_at)}</span></div>
          <div class="hi-text">${escapeHtml(f.review_text)}</div>
          <div class="hi-badges">
            <span class="badge ${sentimentBadgeClass(f.sentiment)}">${escapeHtml(f.sentiment || "unscored")}</span>
            ${(f.issues || []).map((i) => `<span class="badge">${escapeHtml(i)}</span>`).join("")}
          </div>
        `;
        els.feedbackHistory.appendChild(row);
      });
    } catch (err) {
      els.feedbackHistory.innerHTML = `<p class="list-empty">${escapeHtml(err.message)}</p>`;
    }
  }
  els.btnRefreshFeedback.addEventListener("click", loadFeedbackHistory);

  /* ---------------- admin ---------------- */

  async function loadAdminData() {
    await Promise.all([loadStats(), loadAllFeedback(), loadUsers()]);
  }

  async function loadStats() {
    els.statRow.innerHTML = "";
    try {
      const s = await api("/api/admin/stats", { auth: true });
      const cards = [
        ["Total users", s.total_users],
        ["Menu items", s.total_menu_items],
        ["Feedback logged", s.total_feedback],
      ];
      cards.forEach(([label, num]) => {
        const c = document.createElement("div");
        c.className = "stat-card";
        c.innerHTML = `<div class="stat-num">${num}</div><div class="stat-label">${escapeHtml(label)}</div>`;
        els.statRow.appendChild(c);
      });
      Object.entries(s.sentiment_breakdown || {}).forEach(([sentiment, count]) => {
        const c = document.createElement("div");
        c.className = "stat-card";
        c.innerHTML = `<div class="stat-num">${count}</div><div class="stat-label">${escapeHtml(sentiment)} reviews</div>`;
        els.statRow.appendChild(c);
      });
    } catch (err) {
      setStatus(err.message, "error");
    }
  }

  async function loadAllFeedback() {
    els.allFeedbackList.innerHTML = '<p class="list-empty">Loading…</p>';
    try {
      const items = await api("/api/feedback/all", { auth: true });
      if (!items.length) {
        els.allFeedbackList.innerHTML = '<p class="list-empty">No feedback logged yet.</p>';
        return;
      }
      els.allFeedbackList.innerHTML = "";
      items.forEach((f) => {
        const row = document.createElement("div");
        row.className = "history-item";
        row.innerHTML = `
          <div class="hi-top"><span>${escapeHtml(f.user_full_name || "Unknown")} · ${escapeHtml(f.user_email || "")}</span><span>${fmtDate(f.created_at)}</span></div>
          <div class="hi-text">${escapeHtml(f.review_text)}</div>
          <div class="hi-badges">
            <span class="badge ${sentimentBadgeClass(f.sentiment)}">${escapeHtml(f.sentiment || "unscored")}</span>
            ${(f.issues || []).map((i) => `<span class="badge">${escapeHtml(i)}</span>`).join("")}
          </div>
        `;
        els.allFeedbackList.appendChild(row);
      });
    } catch (err) {
      els.allFeedbackList.innerHTML = `<p class="list-empty">${escapeHtml(err.message)}</p>`;
    }
  }

  async function loadUsers() {
    els.userList.innerHTML = '<p class="list-empty">Loading…</p>';
    try {
      const users = await api("/api/admin/users", { auth: true });
      if (!users.length) {
        els.userList.innerHTML = '<p class="list-empty">No users yet.</p>';
        return;
      }
      els.userList.innerHTML = "";
      users.forEach((u) => {
        const row = document.createElement("div");
        row.className = "history-item";
        row.innerHTML = `
          <div class="hi-top"><span>${fmtDate(u.created_at)}</span></div>
          <div class="hi-text">${escapeHtml(u.full_name)} · ${escapeHtml(u.email)}</div>
          <div class="hi-badges">
            <span class="badge ${u.role === "admin" ? "badge-wine" : "badge-brass"}">${escapeHtml(u.role)}</span>
            <span class="badge ${u.is_active ? "badge-sage" : ""}">${u.is_active ? "active" : "deactivated"}</span>
          </div>
        `;
        els.userList.appendChild(row);
      });
    } catch (err) {
      els.userList.innerHTML = `<p class="list-empty">${escapeHtml(err.message)}</p>`;
    }
  }

  els.btnRefreshAllFeedback.addEventListener("click", loadAllFeedback);
  els.btnRefreshUsers.addEventListener("click", loadUsers);

  /* ---------------- init ---------------- */

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAuthModal();
      closeItemModal();
      closeSettingsModal();
    }
  });

  bootstrapSession();
})();
