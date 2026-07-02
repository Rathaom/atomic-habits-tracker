export class AnalyticsChartsEngine {
  constructor() {
    this.donutChart = null;
    this.completionsBarChart = null;
    this.streaksLineChart = null;
    this.categoriesBarChart = null;
  }

  renderDashboard(habits) {
    const activeHabits = habits.filter(h => !h.archived);
    this.buildDonut(activeHabits);
    this.buildCompletionsBar(activeHabits);
    this.buildStreaksLine(activeHabits);
    this.buildCategoriesBar(activeHabits);
  }

  getThemeColors() {
    const isDark = document.body.classList.contains("dark-theme");
    return {
      text: isDark ? "#94a3b8" : "#64748b",
      grid: isDark ? "#475569" : "#cbd5e1",
      completed: isDark ? "#34d399" : "#10b981",
      pending: isDark ? "#94a3b8" : "#64748b",
      skipped: isDark ? "#fbbf24" : "#f59e0b",
      missed: isDark ? "#f87171" : "#ef4444"
    };
  }

  buildDonut(habits) {
    const ctx = document.getElementById("chart-status-donut")?.getContext("2d");
    if (!ctx) return;
    
    let comp = 0, pend = 0, skip = 0;
    habits.forEach(h => {
      if (h.status === "completed") comp++;
      else if (h.status === "skipped") skip++;
      else pend++;
    });

    if (this.donutChart) this.donutChart.destroy();
    const colors = this.getThemeColors();

    this.donutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Completed", "Pending", "Skipped"],
        datasets: [{
          data: [comp, pend, skip],
          backgroundColor: [colors.completed, colors.pending, colors.skipped],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: colors.text } } }
      }
    });
  }

  buildCompletionsBar(habits) {
    const ctx = document.getElementById("chart-completions-bar")?.getContext("2d");
    if (!ctx) return;

    // Calculate dates for last 7 chronological windows
    const labels = [];
    const counts = [];
    const colors = this.getThemeColors();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split("T")[0];
      labels.push(d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }));
      
      let dailyDone = 0;
      habits.forEach(h => {
        if (str === new Date().toISOString().split("T")[0] && h.status === "completed") {
          dailyDone++;
        } else if (h.history?.find(hist => hist.date === str && hist.status === "completed")) {
          dailyDone++;
        }
      });
      counts.push(dailyDone);
    }

    if (this.completionsBarChart) this.completionsBarChart.destroy();

    this.completionsBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Completions",
          data: counts,
          backgroundColor: colors.completed,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: colors.text }, grid: { display: false } },
          y: { ticks: { color: colors.text, stepSize: 1 }, grid: { color: colors.grid } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  buildStreaksLine(habits) {
    const ctx = document.getElementById("chart-streaks-line")?.getContext("2d");
    if (!ctx) return;

    if (this.streaksLineChart) this.streaksLineChart.destroy();
    const colors = this.getThemeColors();

    const labels = habits.map(h => h.name.substring(0, 12));
    const currentStreaks = habits.map(h => h.currentStreak || 0);
    const bestStreaks = habits.map(h => h.bestStreak || 0);

    this.streaksLineChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          { label: "Current Streak", data: currentStreaks, borderColor: colors.completed, tension: 0.3 },
          { label: "Best Streak", data: bestStreaks, borderColor: colors.skipped, tension: 0.3 }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: colors.text } },
          y: { ticks: { color: colors.text, stepSize: 1 }, grid: { color: colors.grid } }
        },
        plugins: { legend: { labels: { color: colors.text } } }
      }
    });
  }

  buildCategoriesBar(habits) {
    const ctx = document.getElementById("chart-categories-bar")?.getContext("2d");
    if (!ctx) return;

    const catMap = {};
    habits.forEach(h => {
      const cat = h.category || "Unassigned";
      if (!catMap[cat]) catMap[cat] = { totalDays: 0, completedDays: 0 };
      
      // Accumulate past entries metrics plus active state
      const totalTracked = (h.history?.length || 0) + 1;
      let completedTracked = h.history ? h.history.filter(hist => hist.status === "completed").length : 0;
      if (h.status === "completed") completedTracked++;

      catMap[cat].totalDays += totalTracked;
      catMap[cat].completedDays += completedTracked;
    });

    const labels = Object.keys(catMap);
    const rates = labels.map(cat => {
      const item = catMap[cat];
      return item.totalDays > 0 ? Math.round((item.completedDays / item.totalDays) * 100) : 0;
    });

    if (this.categoriesBarChart) this.categoriesBarChart.destroy();
    const colors = this.getThemeColors();

    this.categoriesBarChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Compliance Rate %",
          data: rates,
          backgroundColor: colors.skipped,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        scales: {
          x: { max: 100, ticks: { color: colors.text }, grid: { color: colors.grid } },
          y: { ticks: { color: colors.text }, grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}
