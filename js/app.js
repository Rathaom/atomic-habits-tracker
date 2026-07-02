import { subscribeToHabits, runDailyResetLogic } from "./habits.js";
import { UIManagerEngine } from "./ui.js";
import { HabitsCalendarEngine } from "./calendar.js";
import { AnalyticsChartsEngine } from "./charts.js";
import { setupDragAndDrop } from "./dragdrop.js";
import { sendBrowserNotification } from "./notifications.js";

document.addEventListener("DOMContentLoaded", () => {
  // Enforce structural client custom property theme settings profiles
  const persistedTheme = localStorage.getItem("atomic_theme_mode") || "dark";
  if (persistedTheme === "light") {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
  }

  // Initialize Engines 
  const calendarEngine = new HabitsCalendarEngine("weekly-view-container", "monthly-view-container", "calendar-title");
  const chartsEngine = new AnalyticsChartsEngine();
  const ui = new UIManagerEngine(calendarEngine, chartsEngine);

  // Initialize Data Subscriptions Loop Pipeline
  let appInitialized = false;
  
  subscribeToHabits(async (habitsList) => {
    if (!appInitialized) {
      appInitialized = true;
      // Evaluate calendar boundary rules and reset history lists before view generation
      await runDailyResetLogic(habitsList);
    }
    
    ui.syncAndRenderAll(habitsList);
  });

  // Setup functional HTML5 DND system rules mapping on target lists grid housing
  setupDragAndDrop("#habits-container");

  // Spin real-time internal asynchronous clock background monitoring loops for reminders
  setInterval(() => {
    const now = new Date();
    const currentClockStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    ui.rawHabits.forEach(habit => {
      if (!habit.archived && habit.status === "pending" && habit.reminderTime === currentClockStr) {
        // Enforce throttling to fire alerts explicitly only once per structural match minute
        if (window.lastFiredReminder !== `${habit.id}_${currentClockStr}`) {
          window.lastFiredReminder = `${habit.id}_${currentClockStr}`;
          sendBrowserNotification("Atomic Habit Reminder!", `Time to complete your daily routine optimization: "${habit.name}"`);
        }
      }
    });
  }, 15000);

  // Register Progressive Web App Service Worker Framework Intermediary Access Rules
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .then(() => console.log("Service Worker Context Thread Bound Successfully."))
      .catch(err => console.error("Service Worker registration failed safely:", err));
  }
});