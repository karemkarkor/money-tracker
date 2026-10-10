const API = "/api";
const COLORS = [
  "#729c7a",
  "#e4a49c",
  "#d7bd7d",
  "#88aebe",
  "#ba9dc6",
  "#e5c490",
  "#83b7a9",
  "#d68f7c",
  "#9da9d8",
  "#b5bf8d",
  "#d89ba8",
];
const CATEGORY_ICONS = {
  "Food & dining": "◌",
  Transport: "↗",
  Shopping: "◇",
  Housing: "⌂",
  Health: "✳",
  Entertainment: "♫",
  "Bills & utilities": "⌁",
  Education: "▤",
  Salary: "↙",
  Freelance: "✦",
  Other: "•",
};
let token = localStorage.getItem("pocketwise_token");
let user = JSON.parse(localStorage.getItem("pocketwise_user") || "null");
let categoryChart;
let trendChart;
let registerMode = false;
let toastTimer;
const $ = (selector) => document.querySelector(selector);
const money = (amount, compact = false) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: compact ? 0 : 2,
  }).format(Number(amount || 0));
const api = async (path, options = {}) => { 
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && token) {
    signOut(false);
    throw new Error("Your session expired. Please sign in again.");
  }
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw new Error(
      data  ?.details?.[0]?.message || data?.error || "Something went wrong.",
    );
  return data;
};
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function setAuthMode(register) {
  registerMode = register;
  $("#authTitle").textContent = register
    ? "Make room for clarity."
    : "Welcome back.";
  $("#authSubtitle").textContent = register
    ? "Start seeing your money a little differently."
    : "Sign in to pick up where you left off.";
  $("#authSubmit").textContent = register ? "Create my account" : "Sign in";
  $("#nameField").classList.toggle("hidden", !register);
  $("#nameField input").required = register;
  $("#authSwitchText").textContent = register
    ? "Already have an account?"
    : "New to Pocketwise?";
  $("#authSwitch").textContent = register ? "Sign in" : "Create an account";
  $("#authError").textContent = "";
  $('input[name="password"]').autocomplete = register
    ? "new-password"
    : "current-password";
}
function renderAuth() {
  $("#appView").classList.add("hidden");
  $("#authView").classList.remove("hidden");
  setAuthMode(false);
}
function renderApp() {
  if (!token || !user) return renderAuth();
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  $("#userName").textContent = user.name;
  $("#helloName").textContent = user.name.split(" ")[0];
  $("#userEmail").textContent = user.email;
  $("#avatar").textContent = user.name.trim().charAt(0).toUpperCase();
  $("#todayDate").textContent = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  loadDashboard();
}
function signOut(showMessage = true) {
  token = null;
  user = null;
  localStorage.removeItem("pocketwise_token");
  localStorage.removeItem("pocketwise_user");
  renderAuth();
  if (showMessage) showToast("You’ve signed out. See you soon.");
}
function currentFilters() {
  const params = new URLSearchParams();
  if ($("#fromDate").value) params.set("from", $("#fromDate").value);
  if ($("#toDate").value) params.set("to", $("#toDate").value);
  if ($("#categoryFilter").value)
    params.set("category", $("#categoryFilter").value);
  return params.toString();
}
async function loadDashboard() {
  if (!token) return;
  const query = currentFilters();
  try {
    const [summary, list, allList] = await Promise.all([
      api(`/transactions/summary${query ? `?${query}` : ""}`),
      api(`/transactions${query ? `?${query}` : ""}`),
      api("/transactions?limit=100"),
    ]);
    $("#balanceValue").textContent = money(summary.balance);
    $("#incomeValue").textContent = money(summary.income);
    $("#expenseValue").textContent = money(summary.expense);
    $("#donutTotal").textContent = money(summary.expense, true);
    renderCategory(summary.byCategory);
    renderTrend(allList.items);
    renderTransactions(list.items);
  } catch (error) {
    if (token) showToast(error.message);
  }
}
function renderCategory(data) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const ctx = $("#categoryChart");
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: entries.map(([key]) => key),
      datasets: [
        {
          data: entries.length ? entries.map(([, value]) => value) : [1],
          backgroundColor: entries.length
            ? entries.map((_, i) => COLORS[i % COLORS.length])
            : ["#edf1ed"],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      cutout: "76%",
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: entries.length > 0,
          callbacks: { label: (item) => ` ${item.label}: ${money(item.raw)}` },
        },
      },
      maintainAspectRatio: false,
    },
  });
  $("#categoryLegend").innerHTML = entries.length
    ? entries
        .map(
          ([name, value], i) =>
            `<div class="legend-row"><i class="legend-swatch" style="background:${COLORS[i % COLORS.length]}"></i><span class="legend-name">${escapeHtml(name)}</span><strong class="legend-amount">${money(value)}</strong></div>`,
        )
        .join("")
    : '<p class="empty-hint">Add expenses to see your breakdown.</p>';
}
function renderTrend(items) {
  const now = new Date();
  const months = [];
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(
        date,
      ),
      income: 0,
      expense: 0,
    });
  }
  for (const item of items) {
    const month = months.find(
      (entry) => entry.key === String(item.date).slice(0, 7),
    );
    if (month) month[item.type] += Number(item.amount);
  }
  if (trendChart) trendChart.destroy();
  trendChart = new Chart($("#trendChart"), {
    type: "bar",
    data: {
      labels: months.map((m) => m.label),
      datasets: [
        {
          label: "Income",
          data: months.map((m) => m.income),
          backgroundColor: "#79a182",
          borderRadius: 4,
          barPercentage: 0.68,
          categoryPercentage: 0.64,
        },
        {
          label: "Spending",
          data: months.map((m) => m.expense),
          backgroundColor: "#e5a8a0",
          borderRadius: 4,
          barPercentage: 0.68,
          categoryPercentage: 0.64,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${money(item.raw)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#9ba39d", font: { family: "DM Sans", size: 9 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: "#f0f2ef", drawTicks: false },
          border: { display: false, dash: [3, 4] },
          ticks: {
            color: "#a4aba5",
            font: { family: "DM Sans", size: 8 },
            padding: 8,
            callback: (value) =>
              value >= 1000 ? `$${value / 1000}k` : `$${value}`,
          },
        },
      },
    },
  });
}
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}
function renderTransactions(items) {
  const rows = $("#transactionRows");
  $("#emptyState").classList.toggle("hidden", items.length !== 0);
  rows.innerHTML = items
    .map((item) => {
      const expense = item.type === "expense";
      const date = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(item.date));
      return `<tr><td><div class="transaction-name"><span class="transaction-icon ${expense ? "expense" : ""}">${CATEGORY_ICONS[item.category] || "•"}</span><span>${escapeHtml(item.description || item.category)}</span></div></td><td><span class="category-tag">${escapeHtml(item.category)}</span></td><td>${date}</td><td class="amount-cell">${expense ? "−" : "+"}${money(item.amount)}</td><td><div class="row-actions"><button data-delete="${item.id}" title="Delete transaction" aria-label="Delete transaction">×</button></div></td></tr>`;
    })
    .join("");
}
function openModal() {
  $("#transactionError").textContent = "";
  $("#transactionForm").reset();
  $('#transactionForm [name="date"]').value = new Date()
    .toISOString()
    .slice(0, 10);
  setTransactionType("expense");
  $("#transactionModal").classList.remove("hidden");
  $('#transactionForm [name="amount"]').focus();
}
function closeModal() {
  $("#transactionModal").classList.add("hidden");
}
function setTransactionType(type) {
  $('#transactionForm [name="type"]').value = type;
  document
    .querySelectorAll(".type-option")
    .forEach((button) =>
      button.classList.toggle("selected", button.dataset.type === type),
    );
}

$("#authSwitch").addEventListener("click", () => setAuthMode(!registerMode));
$("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#authError").textContent = "";
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  try {
    const result = await api(`/auth/${registerMode ? "register" : "login"}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    token = result.token;
    user = result.user;
    localStorage.setItem("pocketwise_token", token);
    localStorage.setItem("pocketwise_user", JSON.stringify(user));
    renderApp();
  } catch (error) {
    $("#authError").textContent = error.message;
  }
});
$("#logoutBtn").addEventListener("click", () => signOut());
document
  .querySelectorAll("[data-add]")
  .forEach((button) => button.addEventListener("click", openModal));
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);
$("#transactionModal").addEventListener("click", (event) => {
  if (event.target === $("#transactionModal")) closeModal();
});
document
  .querySelectorAll(".type-option")
  .forEach((button) =>
    button.addEventListener("click", () =>
      setTransactionType(button.dataset.type),
    ),
  );
$("#transactionForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#transactionError").textContent = "";
  const payload = Object.fromEntries(
    new FormData(event.currentTarget).entries(),
  );
  payload.amount = Number(payload.amount);
  payload.description = payload.description.trim() || null;
  try {
    await api("/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    closeModal();
    await loadDashboard();
    showToast("Transaction saved. Nice and tidy.");
  } catch (error) {
    $("#transactionError").textContent = error.message;
  }
});
$("#transactionRows").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  if (!window.confirm("Delete this transaction?")) return;
  try {
    await api(`/transactions/${button.dataset.delete}`, { method: "DELETE" });
    await loadDashboard();
    showToast("Transaction deleted.");
  } catch (error) {
    showToast(error.message);
  }
});
["fromDate", "toDate", "categoryFilter"].forEach((id) =>
  $(`#${id}`).addEventListener("change", loadDashboard),
);
$("#clearFilters").addEventListener("click", () => {
  $("#fromDate").value = "";
  $("#toDate").value = "";
  $("#categoryFilter").value = "";
  loadDashboard();
});
$("#transactionsNav").addEventListener("click", () =>
  $("#transactionsSection").scrollIntoView({
    behavior: "smooth",
    block: "start",
  }),
);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});
if (token && user) renderApp();
else renderAuth();
