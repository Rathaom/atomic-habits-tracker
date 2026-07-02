export class HabitsCalendarEngine {
  constructor(weeklyContainerId, monthlyContainerId, titleId) {
    this.wContainer = document.getElementById(weeklyContainerId);
    this.mContainer = document.getElementById(monthlyContainerId);
    this.titleEl = document.getElementById(titleId);
    this.currentAnchorDate = new Date();
    this.activeMode = "weekly"; // "weekly" or "monthly"
    this.cachedHabits = [];
  }

  setMode(mode) {
    this.activeMode = mode;
    if (mode === "weekly") {
      this.wContainer.classList.remove("hidden");
      this.mContainer.classList.add("hidden");
    } else {
      this.wContainer.classList.add("hidden");
      this.mContainer.classList.remove("hidden");
    }
    this.render(this.cachedHabits);
  }

  navigate(direction) {
    if (this.activeMode === "weekly") {
      this.currentAnchorDate.setDate(this.currentAnchorDate.getDate() + direction * 7);
    } else {
      this.currentAnchorDate.setMonth(this.currentAnchorDate.getMonth() + direction);
    }
    this.render(this.cachedHabits);
  }

  render(habits) {
    this.cachedHabits = habits.filter(h => !h.archived);
    if (this.activeMode === "weekly") {
      this.renderWeeklyView();
    } else {
      this.renderMonthlyView();
    }
  }

  renderWeeklyView() {
    this.wContainer.innerHTML = "";
    const startOfWeek = this.getStartOfWeek(new Date(this.currentAnchorDate));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const options = { month: 'short', day: 'numeric' };
    this.titleEl.textContent = `${startOfWeek.toLocaleDateString(undefined, options)} - ${endOfWeek.toLocaleDateString(undefined, options)}`;

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      weekDays.push(d.toISOString().split("T")[0]);
    }

    if (this.cachedHabits.length === 0) {
      this.wContainer.innerHTML = `<div class="empty-state"><h3>No active habits tracking schedule</h3></div>`;
      return;
    }

    this.cachedHabits.forEach(habit => {
      const row = document.createElement("div");
      row.className = "weekly-habit-row";
      
      const meta = document.createElement("div");
      meta.className = "weekly-habit-meta";
      meta.innerHTML = `<strong>${habit.name}</strong><br><span class="badge">${habit.category || 'General'}</span>`;
      row.appendChild(meta);

      const grid7 = document.createElement("div");
      grid7.className = "weekly-grid-7";

      weekDays.forEach(dateStr => {
        let status = "pending";
        const todayStr = new Date().toISOString().split("T")[0];
        
        if (dateStr === todayStr) {
          status = habit.status;
        } else {
          const histEntry = habit.history?.find(h => h.date === dateStr);
          if (histEntry) {
            status = histEntry.status;
          } else if (dateStr < todayStr && dateStr >= habit.dueDate) {
            status = "missed";
          }
        }

        const cell = document.createElement("div");
        cell.className = `cell-day-block status-${status}`;
        
        const displayDayNum = dateStr.split("-")[2];
        const dayLabelText = new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' }).substring(0,2);
        
        cell.innerHTML = `<span class="day-lbl">${dayLabelText}</span><span>${displayDayNum}</span>`;
        grid7.appendChild(cell);
      });

      row.appendChild(grid7);
      this.wContainer.appendChild(row);
    });
  }

  renderMonthlyView() {
    this.mContainer.innerHTML = "";
    const year = this.currentAnchorDate.getFullYear();
    const month = this.currentAnchorDate.getMonth();
    
    this.titleEl.textContent = this.currentAnchorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const weekdayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    weekdayHeaders.forEach(day => {
      const hCell = document.createElement("div");
      hCell.className = "month-cell header-cell";
      hCell.textContent = day;
      this.mContainer.appendChild(hCell);
    });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Structural Padding Cells
    for (let i = 0; i < firstDayIndex; i++) {
      const pCell = document.createElement("div");
      pCell.className = "month-cell hidden-pad";
      pCell.style.visibility = "hidden";
      this.mContainer.appendChild(pCell);
    }

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const cell = document.createElement("div");
      cell.className = "month-cell";
      cell.dataset.date = cellDateStr;

      const numEl = document.createElement("span");
      numEl.className = "month-cell-daynum";
      numEl.textContent = dayNum;
      cell.appendChild(numEl);

      const dotsContainer = document.createElement("div");
      dotsContainer.className = "month-cell-dots";

      const dailyBreakdownArr = [];
      const todayStr = new Date().toISOString().split("T")[0];

      this.cachedHabits.forEach(habit => {
        let status = null;
        if (cellDateStr === todayStr) {
          status = habit.status;
        } else {
          const matchedHist = habit.history?.find(h => h.date === cellDateStr);
          if (matchedHist) {
            status = matchedHist.status;
          } else if (cellDateStr < todayStr && cellDateStr >= habit.dueDate) {
            status = "missed";
          }
        }

        if (status && status !== "pending") {
          const dot = document.createElement("span");
          dot.className = `dot-indicator ${status}`;
          dotsContainer.appendChild(dot);
          dailyBreakdownArr.push({ name: habit.name, status: status });
        }
      });

      cell.appendChild(dotsContainer);
      
      cell.addEventListener("click", () => {
        this.openDayBreakdownModal(cellDateStr, dailyBreakdownArr);
      });

      this.mContainer.appendChild(cell);
    }
  }

  openDayBreakdownModal(dateStr, records) {
    const modal = document.getElementById("day-breakdown-modal");
    document.getElementById("day-breakdown-title").textContent = `History Map: ${dateStr}`;
    const listContainer = document.getElementById("day-breakdown-content");
    listContainer.innerHTML = "";

    if (records.length === 0) {
      listContainer.innerHTML = `<p style="color: var(--text-muted); text-align:center;">No completed, skipped, or logged metrics for this date anchor.</p>`;
    } else {
      records.forEach(r => {
        const item = document.createElement("div");
        item.className = "breakdown-item";
        item.innerHTML = `<span>${r.name}</span><span class="badge" style="background-color: var(--color-${r.status}-bg); color: var(--color-${r.status});">${r.status.toUpperCase()}</span>`;
        listContainer.appendChild(item);
      });
    }
    modal.classList.remove("hidden");
  }

  getStartOfWeek(d) {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Normalize loop anchors for localized Mon shifts
    return new Date(d.setDate(diff));
  }
}