import { db } from "./firebase-config.js";
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, writeBatch, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const habitsCollectionRef = collection(db, "habits");

export function subscribeToHabits(callback) {
  const q = query(habitsCollectionRef, orderBy("order", "asc"));
  return onSnapshot(q, (snapshot) => {
    const habits = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      habits.push({ id: doc.id, ...data });
    });
    callback(habits);
  }, (error) => {
    console.error("Firestore real-time link stream operational fault:", error);
  });
}

export async function createHabit(habitData) {
  const newDoc = {
    name: habitData.name,
    category: habitData.category || "Personal",
    status: "pending",
    dueDate: habitData.dueDate,
    reminderTime: habitData.reminderTime || null,
    completedAt: null,
    note: habitData.note || "",
    order: habitData.order || 0,
    archived: false,
    currentStreak: 0,
    bestStreak: 0,
    history: [],
    createdAt: serverTimestamp()
  };
  return await addDoc(habitsCollectionRef, newDoc);
}

export async function updateHabit(id, fields) {
  const habitDocRef = doc(db, "habits", id);
  return await updateDoc(habitDocRef, fields);
}

export async function deleteHabit(id) {
  const habitDocRef = doc(db, "habits", id);
  return await deleteDoc(habitDocRef);
}

export async function updateHabitOrder(ordersArray) {
  const batch = writeBatch(db);
  ordersArray.forEach(item => {
    const dRef = doc(db, "habits", item.id);
    batch.update(dRef, { order: item.order });
  });
  return await batch.commit();
}

/**
 * Validates, handles, and retroactively back-fills records for historical gaps 
 * when the application is reopened after multiple calendar days.
 */
export async function runDailyResetLogic(allHabits) {
  const todayStr = new Date().toISOString().split("T")[0];
  const lastReset = localStorage.getItem("atomic_last_reset_date");

  if (!lastReset) {
    localStorage.setItem("atomic_last_reset_date", todayStr);
    return;
  }

  if (lastReset !== todayStr) {
    const batch = writeBatch(db);
    let modificationsTriggered = false;

    // Generate chronological gap sequence map
    const missingDates = [];
    let loopDate = new Date(lastReset);
    loopDate.setDate(loopDate.getDate() + 1);

    while (loopDate.toISOString().split("T")[0] < todayStr) {
      missingDates.push(loopDate.toISOString().split("T")[0]);
      loopDate.setDate(loopDate.getDate() + 1);
    }
    const yesterdayStr = loopDate.toISOString().split("T")[0];
    if (yesterdayStr !== lastReset) missingDates.push(yesterdayStr);

    allHabits.forEach(habit => {
      if (habit.archived) return;

      modificationsTriggered = true;
      const updatedHistory = [...(habit.history || [])];
      let currentStreak = habit.currentStreak || 0;
      let bestStreak = habit.bestStreak || 0;

      // Back-fill intermediate gap instances as missed
      missingDates.forEach((date, index) => {
        const isLastIndex = index === missingDates.length - 1;
        let definitiveStatus = "missed";

        if (isLastIndex) {
          // Process transition state logic explicitly for the actual final status
          definitiveStatus = (habit.status === "pending") ? "missed" : habit.status;
        }

        updatedHistory.push({ date: date, status: definitiveStatus });

        if (definitiveStatus === "completed") {
          currentStreak++;
          if (currentStreak > bestStreak) bestStreak = currentStreak;
        } else if (definitiveStatus === "missed") {
          currentStreak = 0;
        } // Skipped retains active status balances without breaking
      });

      const hRef = doc(db, "habits", habit.id);
      batch.update(hRef, {
        history: updatedHistory,
        status: "pending",
        completedAt: null,
        currentStreak: currentStreak,
        bestStreak: bestStreak
      });
    });

    if (modificationsTriggered) {
      await batch.commit();
    }
    localStorage.setItem("atomic_last_reset_date", todayStr);
  }
}

export function reevaluateStreakStateFromHistory(historyArray, currentStatus) {
  let streak = 0;
  const sorted = [...historyArray].sort((a,b) => b.date.localeCompare(a.date));
  
  if (currentStatus === "completed") streak = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].status === "completed") {
      streak++;
    } else if (sorted[i].status === "missed") {
      break;
    } // Skip statements do not add or terminate strings
  }
  return streak;
}
