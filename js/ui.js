import { createHabit, updateHabit, deleteHabit, reevaluateStreakStateFromHistory } from "./habits.js";
import { downloadHabitsToExcel } from "./export.js";
import { playSound } from "./notifications.js";

export class UIManagerEngine {
  constructor(calendarEngine, chartsEngine) {
    this.calendar = calendarEngine;
    this.charts = chartsEngine;
    this.rawHabits = [];
    this.currentFilters = { search: "", status: "all", category: "all" };
    this.initDOMEvents();
  }

  syncAndRenderAll(habitsList) {
    this.rawHabits = habitsList;
    this.updateGlobalMetrics();
    this.updateCategoryDropdownOptions();
    this.renderHabitsGrid();
    this.calendar.render(this.rawHabits);
    this.charts.renderDashboard(this.rawHabits);
  }

  updateGlobalMetrics() {
    const today = habitsListFilteredTodayScope(this.rawHabits);
    const total = today.length;
    const completed = today.filter(h => h.status === "completed").length;
    const pending = today.filter(h => h.status === "pending").length;
    const skipped = today.filter(h => h.status === "skipped").length;

    document.getElementById("count-total").textContent = total;
    document.getElementById("count-completed").textContent = completed;
    document.getElementById("count-pending").textContent = pending;
    document.getElementById("count-skipped").textContent = skipped;

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    document.getElementById("global-progress-pct").textContent = `${pct}%`;
    document.getElementById("global-progress-bar").style.width = `${pct}%`;
  }

  updateCategoryDropdownOptions() {
    const dropdown = document.getElementById("filter-category");
    const currentSelected = dropdown.value;
    const categories = new Set(this.rawHabits.map(h => h.category).filter(Boolean));
    
    dropdown.innerHTML = `<option value="all">All Categories</option>`;
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      dropdown.appendChild(opt);
    });
    dropdown.value = currentSelected;
  }

  renderHabitsGrid() {
    const container = document.getElementById("habits-container");
    container.innerHTML = "";

    const filtered = this.rawHabits.filter(h => {
      // Logic handling matrix for archived states maps explicitly
      if (this.currentFilters.status === "archived") {
        if (!h.archived) return false;
      } else {
        if (h.archived) return false;
        if (this.currentFilters.status !== "all" && h.status !== this.currentFilters.status) return false;
      }

      if (this.currentFilters.category !== "all" && h.category !== this.currentFilters.category) return false;
      
      if (this.currentFilters.search) {
        const term = this.currentFilters.search.toLowerCase();
        return h.name.toLowerCase().includes(term) || (h.note && h.note.toLowerCase().includes(term));
      }
      return true;
    });

    if (filtered.length === 0) {
      document.getElementById("habits-empty-state").classList.remove("hidden");
      return;
    }
    document.getElementById("habits-empty-state").classList.add("hidden");

    const todayStr = new Date().toISOString().split("T")[0];

    filtered.forEach(habit => {
      const card = document.createElement("div");
      card.className = `habit-card ${habit.status === 'completed' ? 'completed-state' : ''}`;
      card.dataset.id = habit.id;
      card.setAttribute("draggable", "true");

      const isOverdue = habit.status === "pending" && habit.dueDate < todayStr;
      if (isOverdue) card.classList.add("overdue-warning");

      card.innerHTML = `
        <div class="habit-card-top">
          <label class="checkbox-container">
            <input type="checkbox" class="habit-check-toggle" ${habit.status === 'completed' ? 'checked' : ''}>
            <span class="checkbox-checkmark"></span>
          </label>
          <div class="habit-details">
            <h4 class="habit-title">${escapeHTML(habit.name)}</h4>
            <div class="habit-meta-row">
              <span class="badge category-badge">${escapeHTML(habit.category || 'Personal')}</span>
              ${isOverdue ? '<span class="badge overdue-badge">Overdue</span>' : ''}
              ${habit.reminderTime ? `<span class="badge">⏰ ${habit.reminderTime}</span>` : ''}
            </div>
          </div>
          <div class="streak-flame-tag">🔥 <span>${habit.currentStreak || 0}</span></div>
        </div>
        <div class="habit-card-bottom">
          <span class="note-snippet">${escapeHTML(habit.note || '')}</span>
          <button class="secondary-btn compact-edit-trigger-btn" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;">Edit</button>
        </div>
      `;

      // Event Logic Wiring for Interactive Card Sub-elements
      card.querySelector(".habit-check-toggle").addEventListener("change", async (e) => {
        const checked = e.target.checked;
        const targetStatus = checked ? "completed" : "pending";
        const now = checked ? new Date().toISOString() : null;
        
        if (checked) playSound("complete");

        const computedStreak = reevaluateStreakStateFromHistory(habit.history || [], targetStatus);
        let best = habit.bestStreak || 0;
        if (computedStreak > best) best = computedStreak;

        await updateHabit(habit.id, {
          status: targetStatus,
          completedAt: now,
          currentStreak: computedStreak,
          bestStreak: best
        });
        showToast(`Habit marked ${targetStatus}`);
      });

      card.querySelector(".compact-edit-trigger-btn").addEventListener("click", () => {
        this.openMutationModal(habit);
      });

      container.appendChild(card);
    });
  }

  openMutationModal(habit = null) {
    const modal = document.getElementById("habit-modal");
    const form = document.getElementById("habit-mutation-form");
    form.reset();

    // Standard control configurations
    document.getElementById("delete-habit-btn").classList.add("hidden");
    document.getElementById("archive-habit-btn").classList.add("hidden");
    document.getElementById("completed-at-container").classList.add("hidden");
    document.getElementById("habit-stats-summary").classList.add("hidden");
    document.getElementById("form-status-container").classList.add("hidden");

    if (habit) {
      document.getElementById("modal-view-title").textContent = "Edit Habit Archetype";
      document.getElementById("form-habit-id").value = habit.id;
      document.getElementById("form-habit-name").value = habit.name;
      document.getElementById("form-habit-category").value = habit.category;
      document.getElementById("form-habit-duedate").value = habit.dueDate;
      document.getElementById("form-habit-remindertime").value = habit.reminderTime || "";
      document.getElementById("form-habit-note").value = habit.note || "";
      
      document.getElementById("form-status-container").classList.remove("hidden");
      document.getElementById("form-habit-status").value = habit.status;

      if (habit.completedAt) {
        document.getElementById("completed-at-container").classList.remove("hidden");
        // Normalize ISO timestamp string inputs directly to local datetime bounds
        document.getElementById("form-habit-completedat").value = habit.completedAt.substring(0, 16);
      }

      // Display internal dynamic calculation details
      document.getElementById("habit-stats-summary").classList.remove("hidden");
      document.getElementById("lbl-modal-curr-streak").textContent = habit.currentStreak || 0;
      document.getElementById("lbl-modal-best-streak").textContent = habit.bestStreak || 0;
      
      const totalDays = (habit.history?.length || 0) + 1;
      const doneDays = (habit.history?.filter(x => x.status === "completed").length || 0) + (habit.status === "completed" ? 1 : 0);
      document.getElementById("lbl-modal-compliance").textContent = `${Math.round((doneDays / totalDays) * 100)}%`;

      const deleteBtn = document.getElementById("delete-habit-btn");
      const archiveBtn = document.getElementById("archive-habit-btn");
      deleteBtn.classList.remove("hidden");
      archiveBtn.classList.remove("hidden");
      archiveBtn.textContent = habit.archived ? "Unarchive" : "Archive";

      deleteBtn.onclick = async () => {
        if (confirm("Permanently destroy trace track documents for this atomic habit strategy?")) {
          await deleteHabit(habit.id);
          modal.classList.add("hidden");
          showToast("Habit permanent log deleted", "error");
        }
      };

      archiveBtn.onclick = async () => {
        await updateHabit(habit.id, { archived: !habit.archived });
        modal.classList.add("hidden");
        showToast(habit.archived ? "Habit restored to grid active pool" : "Habit structural record archived");
      };

    } else {
      document.getElementById("modal-view-title").textContent = "Instantiate Atomic Habit";
      document.getElementById("form-habit-id").value = "";
      document.getElementById("form-habit-duedate").value = new Date().toISOString().split("T")[0];
    }

    modal.classList.remove("hidden");
  }

  initDOMEvents() {
    // Navigation routing map structures
    const setupNav = (buttons, dynamicPanels) => {
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          buttons.forEach(b => b.classList.remove("active"));
          dynamicPanels.forEach(p => p.classList.remove("active"));
          
          const target = btn.dataset.target;
          // Synchronize desktop sidebar buttons alongside mobile bottom navbar docks
          document.querySelectorAll(`[data-target="${target}"]`).forEach(t => t.classList.add("active"));
          document.getElementById(target).classList.add("active");
        });
      });
    };

    setupNav(document.querySelectorAll(".nav-btn"), document.querySelectorAll(".app-panel"));
    setupNav(document.querySelectorAll(".mobile-bottom-bar .mobile-nav-btn"), document.querySelectorAll(".app-panel"));

    // Filter controls change listeners
    document.getElementById("search-input").addEventListener("input", debounce((e) => {
      this.currentFilters.search = e.target.value;
      this.renderHabitsGrid();
    }, 200));

    document.getElementById("filter-status").addEventListener("change", (e) => {
      this.currentFilters.status = e.target.value;
      this.renderHabitsGrid();
    });

    document.getElementById("filter-category").addEventListener("change", (e) => {
      this.currentFilters.category = e.target.value;
      this.renderHabitsGrid();
    });

    // Theme logic deployment setup
    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
      document.body.classList.toggle("light-theme");
      const current = document.body.classList.contains("dark-theme") ? "dark" : "light";
      localStorage.setItem("atomic_theme_mode", current);
      this.charts.renderDashboard(this.rawHabits);
    });

    // Modal view window click triggers
    document.getElementById("open-add-modal-btn").addEventListener("click", () => this.openMutationModal());
    document.getElementById("close-modal-btn").addEventListener("click", () => document.getElementById("habit-modal").classList.add("hidden"));
    document.getElementById("cancel-modal-btn").addEventListener("click", () => document.getElementById("habit-modal").classList.add("hidden"));
    document.getElementById("close-breakdown-modal-btn").addEventListener("click", () => document.getElementById("day-breakdown-modal").classList.add("hidden"));

    // Form operational save procedures
    document.getElementById("habit-mutation-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("form-habit-id").value;
      
      const payload = {
        name: document.getElementById("form-habit-name").value,
        category: document.getElementById("form-habit-category").value || "Personal",
        dueDate: document.getElementById("form-habit-duedate").value,
        reminderTime: document.getElementById("form-habit-remindertime").value || null,
        note: document.getElementById("form-habit-note").value
      };

      if (id) {
        // Evaluate structural dropdown updates on edits
        const targetStatus = document.getElementById("form-habit-status").value;
        payload.status = targetStatus;
        if (targetStatus === "completed") {
          const customTime = document.getElementById("form-habit-completedat").value;
          payload.completedAt = customTime ? new Date(customTime).toISOString() : new Date().toISOString();
        } else {
          payload.completedAt = null;
        }

        // Recompute streak balances dynamically if status changes manually via edit form
        const matchedObj = this.rawHabits.find(x => x.id === id);
        if (matchedObj && matchedObj.status !== targetStatus) {
          payload.currentStreak = reevaluateStreakStateFromHistory(matchedObj.history || [], targetStatus);
          if (payload.currentStreak > (matchedObj.bestStreak || 0)) {
            payload.bestStreak = payload.currentStreak;
          }
        }

        await updateHabit(id, payload);
        showToast("Habit configurations updated");
      } else {
        payload.order = this.rawHabits.length;
        await createHabit(payload);
        showToast("New atomic habit created successfully");
      }

      document.getElementById("habit-modal").classList.add("hidden");
    });

    // Calendar panel display options toggle setup
    document.getElementById("toggle-weekly-btn").addEventListener("click", (e) => {
      document.getElementById("toggle-monthly-btn").classList.remove("active");
      e.target.classList.add("active");
      this.calendar.setMode("weekly");
    });
    document.getElementById("toggle-monthly-btn").addEventListener("click", (e) => {
      document.getElementById("toggle-weekly-btn").classList.remove("active");
      e.target.classList.add("active");
      this.calendar.setMode("monthly");
    });
    document.getElementById("cal-prev-btn").addEventListener("click", () => this.calendar.navigate(-1));
    document.getElementById("cal-next-btn").addEventListener("click", () => this.calendar.navigate(1));

    // Settings actions routing
    document.getElementById("export-excel-btn").addEventListener("click", () => {
      downloadHabitsToExcel(this.rawHabits);
    });

    const muteToggle = document.getElementById("mute-sound-toggle");
    muteToggle.checked = localStorage.getItem("atomic_mute") === "true";
    muteToggle.addEventListener("change", (e) => {
      localStorage.setItem("atomic_mute", e.target.checked ? "true" : "false");
    });

    document.getElementById("request-push-perm-btn").addEventListener("click", async () => {
      if ("Notification" in window) {
        const granted = await Notification.requestPermission();
        showToast(granted === "granted" ? "Notification channel verified" : "Permission denied", granted === "granted" ? "success" : "error");
      }
    });
  }
}

// Utility Framework Functions
function habitsListFilteredTodayScope(list) {
  return list.filter(h => !h.archived);
}

function debounce(func, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

export function showToast(msg, type = "success") {
  const dock = document.getElementById("toast-dock");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  dock.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
