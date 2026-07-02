import { updateHabitOrder } from "./habits.js";

let dragSourceElement = null;

export function setupDragAndDrop(containerSelector, updateCallback) {
  const container = document.querySelector(containerSelector);

  container.addEventListener("dragstart", (e) => {
    const card = e.target.closest(".habit-card");
    if (!card) return;
    dragSourceElement = card;
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", card.dataset.id);
  });

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    const card = e.target.closest(".habit-card");
    if (!card || card === dragSourceElement) return;
    
    const bounding = card.getBoundingClientRect();
    const offset = e.clientY - bounding.top;
    if (offset > bounding.height / 2) {
      card.after(dragSourceElement);
    } else {
      card.before(dragSourceElement);
    }
  });

  container.addEventListener("dragend", async (e) => {
    const card = e.target.closest(".habit-card");
    if (card) card.classList.remove("dragging");
    
    // Evaluate sequential structural index orders from actual visual matrix placements
    const currentCards = Array.from(container.querySelectorAll(".habit-card"));
    const batchUpdates = currentCards.map((cardElement, index) => {
      return {
        id: cardElement.dataset.id,
        order: index
      };
    });

    try {
      await updateHabitOrder(batchUpdates);
      if (updateCallback) updateCallback();
    } catch (err) {
      console.error("Failed persisting layout sync mutations matrix:", err);
    }
    dragSourceElement = null;
  });
}
