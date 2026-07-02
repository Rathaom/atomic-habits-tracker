export function downloadHabitsToExcel(habitsList) {
  if (typeof XLSX === "undefined") {
    alert("Excel utility engine not loaded yet. Verify connectivity script CDNs.");
    return;
  }

  const flattenedData = habitsList.map(h => {
    const formattedHistory = h.history ? h.history.map(item => `${item.date}[${item.status}]`).join(", ") : "";
    return {
      "Habit Name": h.name,
      "Category": h.category || "Unassigned",
      "Current Status": h.status,
      "Due Date": h.dueDate,
      "Reminder Time": h.reminderTime || "None",
      "Current Streak (Days)": h.currentStreak || 0,
      "Best Streak Ever": h.bestStreak || 0,
      "Is Archived": h.archived ? "Yes" : "No",
      "Notes / Narrative": h.note || "",
      "Historical Entries Log": formattedHistory
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Atomic Habits Track");

  // Adjust column width dynamically for presentation layout output 
  const maxW = [{wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 20}, {wch: 12}, {wch: 30}, {wch: 50}];
  worksheet["!cols"] = maxW;

  XLSX.writeFile(workbook, `AtomicHabits_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}
