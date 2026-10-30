/* ============================================================
   Expense & Budget Visualizer — Application Logic
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Constants ---------- */
  const STORAGE_KEY = "expense_visualizer_transactions";
  const CATEGORIES_KEY = "expense_visualizer_categories";
  const THEME_KEY = "expense_visualizer_theme";
  const SORT_KEY = "expense_visualizer_sort";

  // Default categories with their colors
  const DEFAULT_CATEGORIES = [
    { name: "Food", color: "#ff6b6b" },
    { name: "Transport", color: "#4ecdc4" },
    { name: "Fun", color: "#a55eea" },
  ];

  // Color palette assigned to custom categories (cycling)
  const COLOR_PALETTE = [
    "#f39c12", "#3498db", "#2ecc71", "#e74c3c", "#1abc9c",
    "#9b59b6", "#f1c40f", "#e67e22", "#16a085", "#d35400",
  ];

  /* ---------- DOM References ---------- */
  const form = document.getElementById("expenseForm");
  const itemNameInput = document.getElementById("itemName");
  const amountInput = document.getElementById("amount");
  const categorySelect = document.getElementById("category");
  const formError = document.getElementById("formError");

  const totalBalanceEl = document.getElementById("totalBalance");
  const transactionCountEl = document.getElementById("transactionCount");

  const transactionListEl = document.getElementById("transactionList");
  const emptyStateEl = document.getElementById("emptyState");

  const clearAllBtn = document.getElementById("clearAll");
  const sortBySelect = document.getElementById("sortBy");

  const chartCanvas = document.getElementById("pieChart");
  const chartEmptyEl = document.getElementById("chartEmpty");

  const themeToggleBtn = document.getElementById("themeToggle");
  const newCategoryNameInput = document.getElementById("newCategoryName");
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  const categoryError = document.getElementById("categoryError");

  /* ---------- State ---------- */
  let transactions = [];
  let customCategories = [];
  let currentSort = "newest";
  let pieChart = null;

  /* ---------- Theme Management ---------- */
  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  }

  function handleThemeToggle() {
    const current = document.documentElement.getAttribute("data-theme");
    const newTheme = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    updateChartTheme();
  }

  function updateChartTheme() {
    if (!pieChart) return;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    pieChart.data.datasets[0].borderColor = isDark ? "#2d3748" : "#ffffff";
    pieChart.options.plugins.legend.labels.color = isDark ? "#a0aec0" : "#718096";
    pieChart.update();
  }

  /* ---------- Category Management ---------- */
  function getAllCategories() {
    return DEFAULT_CATEGORIES.concat(customCategories);
  }

  function getCategoryColor(name) {
    var all = getAllCategories();
    for (var i = 0; i < all.length; i++) {
      if (all[i].name === name) return all[i].color;
    }
    return "#cbd5e0";
  }

  function loadCategories() {
    try {
      const raw = localStorage.getItem(CATEGORIES_KEY);
      customCategories = raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("Failed to load categories:", err);
      customCategories = [];
    }
  }

  function saveCategories() {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(customCategories));
  }

  function populateCategorySelect(selectedValue) {
    const all = getAllCategories();
    const options =
      '<option value="">Select a category</option>' +
      all
        .map(function (c) {
          return (
            '<option value="' +
            escapeHtml(c.name) +
            '">' +
            escapeHtml(c.name) +
            "</option>"
          );
        })
        .join("");

    categorySelect.innerHTML = options;
    if (selectedValue) {
      categorySelect.value = selectedValue;
    }
  }

  function handleAddCategory() {
    const name = newCategoryNameInput.value.trim();

    if (!name) {
      categoryError.textContent = "Please enter a category name.";
      return;
    }

    // Check for duplicates (case-insensitive)
    const all = getAllCategories();
    const exists = all.some(function (c) {
      return c.name.toLowerCase() === name.toLowerCase();
    });
    if (exists) {
      categoryError.textContent = "This category already exists.";
      return;
    }

    // Assign next color from palette
    const color = COLOR_PALETTE[customCategories.length % COLOR_PALETTE.length];
    customCategories.push({ name: name, color: color });
    saveCategories();

    populateCategorySelect(name);
    newCategoryNameInput.value = "";
    categoryError.textContent = "";
  }

  /* ---------- Storage ---------- */
  function loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      transactions = raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("Failed to load transactions:", err);
      transactions = [];
    }
  }

  function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }

  /* ---------- Sort Management ---------- */
  function loadSort() {
    const saved = localStorage.getItem(SORT_KEY);
    if (saved) {
      currentSort = saved;
      sortBySelect.value = saved;
    }
  }

  function handleSortChange() {
    currentSort = sortBySelect.value;
    localStorage.setItem(SORT_KEY, currentSort);
    renderTransactionList();
  }

  function getSortedTransactions() {
    const sorted = transactions.slice();

    switch (currentSort) {
      case "newest":
        return sorted.reverse();
      case "oldest":
        return sorted;
      case "amount-desc":
        return sorted.sort(function (a, b) {
          return b.amount - a.amount;
        });
      case "amount-asc":
        return sorted.sort(function (a, b) {
          return a.amount - b.amount;
        });
      case "category-asc":
        return sorted.sort(function (a, b) {
          return a.category.localeCompare(b.category);
        });
      case "category-desc":
        return sorted.sort(function (a, b) {
          return b.category.localeCompare(a.category);
        });
      default:
        return sorted.reverse();
    }
  }

  /* ---------- Utilities ---------- */
  function formatCurrency(value) {
    return "Rp " + Math.abs(value).toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- Validation ---------- */
  function validateForm() {
    const name = itemNameInput.value.trim();
    const amount = amountInput.value.trim();
    const category = categorySelect.value;

    if (!name || !amount || !category) {
      formError.textContent = "Please fill in all fields.";
      return false;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      formError.textContent = "Please enter a valid amount greater than 0.";
      return false;
    }

    formError.textContent = "";
    return true;
  }

  /* ---------- Add Transaction ---------- */
  function handleAddTransaction(e) {
    e.preventDefault();

    if (!validateForm()) return;

    const transaction = {
      id: generateId(),
      name: itemNameInput.value.trim(),
      amount: parseFloat(amountInput.value),
      category: categorySelect.value,
    };

    transactions.push(transaction);
    saveTransactions();

    // Reset form
    form.reset();
    itemNameInput.focus();

    renderAll();
  }

  /* ---------- Delete Transaction ---------- */
  function handleDeleteTransaction(id) {
    transactions = transactions.filter(function (t) {
      return t.id !== id;
    });
    saveTransactions();
    renderAll();
  }

  /* ---------- Clear All ---------- */
  function handleClearAll() {
    if (transactions.length === 0) return;

    const confirmed = confirm(
      "Are you sure you want to delete all transactions? This cannot be undone."
    );
    if (!confirmed) return;

    transactions = [];
    saveTransactions();
    renderAll();
  }

  /* ---------- Render: Total Balance ---------- */
  function renderBalance() {
    const total = transactions.reduce(function (sum, t) {
      return sum + t.amount;
    }, 0);
    totalBalanceEl.textContent = formatCurrency(total);
    transactionCountEl.textContent =
      transactions.length +
      (transactions.length === 1 ? " transaction" : " transactions");
  }

  /* ---------- Render: Transaction List ---------- */
  function renderTransactionList() {
    if (transactions.length === 0) {
      transactionListEl.innerHTML = "";
      transactionListEl.appendChild(emptyStateEl);
      return;
    }

    const items = getSortedTransactions();
    const html = items
      .map(function (t) {
        const color = getCategoryColor(t.category);
        return (
          '<div class="transaction-item">' +
          '<span class="cat-badge" style="background:' +
          color +
          '" title="' +
          escapeHtml(t.category) +
          '"></span>' +
          '<div class="txn-info">' +
          '<div class="txn-name">' +
          escapeHtml(t.name) +
          "</div>" +
          '<div class="txn-cat">' +
          escapeHtml(t.category) +
          "</div>" +
          "</div>" +
          '<div class="txn-amount">' +
          formatCurrency(t.amount) +
          "</div>" +
          '<button class="btn-delete" data-id="' +
          t.id +
          '" title="Delete transaction">&times;</button>' +
          "</div>"
        );
      })
      .join("");

    transactionListEl.innerHTML = html;

    // Attach delete handlers
    const deleteButtons = transactionListEl.querySelectorAll(".btn-delete");
    deleteButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        handleDeleteTransaction(btn.dataset.id);
      });
    });
  }

  /* ---------- Render: Pie Chart ---------- */
  function renderChart() {
    // Aggregate amounts by category from all transactions
    const totalsByCategory = {};
    transactions.forEach(function (t) {
      totalsByCategory[t.category] =
        (totalsByCategory[t.category] || 0) + t.amount;
    });

    // Filter to categories with spending > 0
    const labels = [];
    const data = [];
    const colors = [];

    Object.keys(totalsByCategory).forEach(function (cat) {
      if (totalsByCategory[cat] > 0) {
        labels.push(cat);
        data.push(totalsByCategory[cat]);
        colors.push(getCategoryColor(cat));
      }
    });

    // Show/hide empty state
    if (data.length === 0) {
      chartCanvas.style.display = "none";
      chartEmptyEl.style.display = "block";
      if (pieChart) {
        pieChart.destroy();
        pieChart = null;
      }
      return;
    }

    chartCanvas.style.display = "block";
    chartEmptyEl.style.display = "none";

    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const borderColor = isDark ? "#2d3748" : "#ffffff";
    const textColor = isDark ? "#a0aec0" : "#718096";

    // Create or update chart
    if (pieChart) {
      pieChart.data.labels = labels;
      pieChart.data.datasets[0].data = data;
      pieChart.data.datasets[0].backgroundColor = colors;
      pieChart.data.datasets[0].borderColor = borderColor;
      pieChart.options.plugins.legend.labels.color = textColor;
      pieChart.update();
    } else {
      pieChart = new Chart(chartCanvas, {
        type: "pie",
        data: {
          labels: labels,
          datasets: [
            {
              data: data,
              backgroundColor: colors,
              borderWidth: 2,
              borderColor: borderColor,
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: textColor,
                padding: 16,
                font: { size: 13 },
                usePointStyle: true,
                pointStyle: "circle",
              },
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const value = ctx.parsed;
                  const total = data.reduce(function (a, b) {
                    return a + b;
                  }, 0);
                  const pct =
                    total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return (
                    ctx.label +
                    ": " +
                    formatCurrency(value) +
                    " (" +
                    pct +
                    "%)"
                  );
                },
              },
            },
          },
        },
      });
    }
  }

  /* ---------- Helper: HTML Escape ---------- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------- Render All ---------- */
  function renderAll() {
    renderBalance();
    renderTransactionList();
    renderChart();
  }

  /* ---------- Event Listeners ---------- */
  form.addEventListener("submit", handleAddTransaction);
  clearAllBtn.addEventListener("click", handleClearAll);
  themeToggleBtn.addEventListener("click", handleThemeToggle);
  addCategoryBtn.addEventListener("click", handleAddCategory);
  sortBySelect.addEventListener("change", handleSortChange);

  // Add category on Enter key
  newCategoryNameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCategory();
    }
  });

  // Clear error when user starts typing again
  itemNameInput.addEventListener("input", function () {
    if (formError.textContent) formError.textContent = "";
  });

  // Clear category error when user starts typing
  newCategoryNameInput.addEventListener("input", function () {
    if (categoryError.textContent) categoryError.textContent = "";
  });

  /* ---------- Init ---------- */
  loadTheme();
  loadTransactions();
  loadCategories();
  loadSort();
  populateCategorySelect();
  renderAll();
})();
