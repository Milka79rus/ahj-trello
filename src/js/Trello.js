import State from "./State";

export default class Trello {
  constructor() {
    this.stateManager = new State();
    this.state = {};

    // Переменные для Drag and Drop
    this.draggedEl = null; // Элемент, который тащим
    this.placeholder = null; // Серый блок-пустышка
    this.shiftX = 0; // Смещение курсора относительно левого края карточки
    this.shiftY = 0; // Смещение курсора относительно верхнего края карточки
  }

  init() {
    // 1. Загружаем состояние из LocalStorage
    this.state = this.stateManager.load();

    // 2. Отрисовываем карточки во всех колонках
    this.render();

    // 3. Вешаем слушатели событий
    this.initDOMListeners();
    this.initDragAndDrop();
  }

  // --- ОТРИСОВКА ИНТЕРФЕЙСА ---
  render() {
    const columns = ["todo", "inprogress", "done"];

    columns.forEach((colName) => {
      const container = document.querySelector(
        `[data-column="${colName}"] .cards-container`,
      );
      container.innerHTML = ""; // Очищаем перед перерисовкой

      this.state[colName].forEach((text) => {
        const card = this.createCardElement(text);
        container.appendChild(card);
      });
    });
  }

  createCardElement(text) {
    const card = document.createElement("div");
    card.classList.add("card");
    card.textContent = text;

    const deleteBtn = document.createElement("span");
    deleteBtn.classList.add("card-delete");
    deleteBtn.innerHTML = "&#10006;";

    card.appendChild(deleteBtn);
    return card;
  }

  // --- УПРАВЛЕНИЕ ФОРМАМИ И УДАЛЕНИЕМ ---
  initDOMListeners() {
    const board = document.querySelector(".board");

    board.addEventListener("click", (e) => {
      // Клик по кнопке "+ Add another card"
      if (e.target.classList.contains("add-card-btn")) {
        const wrapper = e.target.closest(".add-card-wrapper");
        e.target.classList.add("hidden");
        wrapper.querySelector(".add-card-form").classList.remove("hidden");
      }

      // Клик по кнопке "✖" (отмена) внутри формы
      if (e.target.classList.contains("cancel-card-btn")) {
        const wrapper = e.target.closest(".add-card-wrapper");
        wrapper.querySelector(".add-card-form").classList.add("hidden");
        wrapper.querySelector(".add-card-btn").classList.remove("hidden");
        wrapper.querySelector("textarea").value = "";
      }

      // Клик по кнопке "Add Card" (сохранение новой карточки)
      if (e.target.classList.contains("save-card-btn")) {
        const wrapper = e.target.closest(".add-card-wrapper");
        const textarea = wrapper.querySelector("textarea");
        const text = textarea.value.trim();
        const colName = wrapper.closest(".column").dataset.column;

        if (text) {
          this.state[colName].push(text);
          this.stateManager.save(this.state);
          this.render();
        }
      }

      // Клик по крестику удаления карточки
      if (e.target.classList.contains("card-delete")) {
        const card = e.target.closest(".card");
        const colName = card.closest(".column").dataset.column;

        // Находим индекс карточки в массиве по её тексту
        const cardText = card.firstChild.textContent;
        const index = this.state[colName].indexOf(cardText);

        if (index > -1) {
          this.state[colName].splice(index, 1);
          this.stateManager.save(this.state);
          this.render();
        }
      }
    });
  }

  // --- РЕАЛИЗАЦИЯ DRAG AND DROP ---
  initDragAndDrop() {
    document.addEventListener("mousedown", (e) => {
      // Проверяем, что схватили именно карточку
      if (
        !e.target.classList.contains("card") ||
        e.target.classList.contains("card-delete")
      ) {
        return;
      }

      e.preventDefault();

      this.draggedEl = e.target;

      // Считаем координаты клика относительно левого и верхнего краев самой карточки
      const rect = this.draggedEl.getBoundingClientRect();
      this.shiftX = e.clientX - rect.left;
      this.shiftY = e.clientY - rect.top;

      // Создаем placeholder под размеры перетаскиваемой карточки
      this.placeholder = document.createElement("div");
      this.placeholder.classList.add("placeholder");
      this.placeholder.style.height = `${rect.height}px`;

      // Задаем абсолютные координаты и размеры летящей карточке
      this.draggedEl.style.width = `${rect.width}px`;
      this.draggedEl.style.height = `${rect.height}px`;

      // Вставляем placeholder на место карточки, а саму карточку отрываем и вешаем в body
      this.draggedEl.parentNode.insertBefore(this.placeholder, this.draggedEl);
      this.draggedEl.classList.add("dragged");
      document.body.appendChild(this.draggedEl);

      // Добавляем глобальный класс перетаскивания на body для фиксации курсора grabbing
      document.body.classList.add("dragging-mode");

      // Двигаем карточку первый раз
      this.moveAt(e.pageX, e.pageY);
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.draggedEl) return;

      // Двигаем карточку за курсором
      this.moveAt(e.pageX, e.pageY);

      // Ищем элемент, который сейчас находится под курсором
      const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
      if (!elementBelow) return;

      // Ищем ближайший контейнер или карточку под мышкой
      const cardsContainer = elementBelow.closest(".cards-container");
      const cardBelow = elementBelow.closest(".card");

      if (cardsContainer) {
        if (cardBelow) {
          // Вычисляем, куда ставить: в верхнюю половину карточки или в нижнюю
          const rect = cardBelow.getBoundingClientRect();
          const middleY = rect.top + rect.height / 2;

          if (e.clientY < middleY) {
            cardsContainer.insertBefore(this.placeholder, cardBelow);
          } else {
            cardsContainer.insertBefore(
              this.placeholder,
              cardBelow.nextSibling,
            );
          }
        } else if (
          cardsContainer.children.length === 0 ||
          elementBelow === cardsContainer
        ) {
          // Если контейнер пустой, просто закидываем placeholder внутрь
          cardsContainer.appendChild(this.placeholder);
        }
      }
    });

    document.addEventListener("mouseup", () => {
      if (!this.draggedEl) return;

      // Убираем глобальный режим перетаскивания с body
      document.body.classList.remove("dragging-mode");

      // Находим контейнер, куда в итоге упал наш placeholder
      const targetContainer = this.placeholder.closest(".cards-container");

      if (targetContainer) {
        // Возвращаем карточке нормальные стили и ставим вместо placeholder
        this.draggedEl.classList.remove("dragged");
        this.draggedEl.style.position = "";
        this.draggedEl.style.top = "";
        this.draggedEl.style.left = "";
        this.draggedEl.style.width = "";
        this.draggedEl.style.height = "";

        targetContainer.insertBefore(this.draggedEl, this.placeholder);
      }

      // Удаляем placeholder из DOM
      this.placeholder.remove();

      // Сбрасываем переменные
      this.draggedEl = null;
      this.placeholder = null;

      // Сохраняем новое распределение карточек в LocalStorage
      this.saveCurrentState();
    });
  }

  moveAt(pageX, pageY) {
    this.draggedEl.style.left = `${pageX - this.shiftX}px`;
    this.draggedEl.style.top = `${pageY - this.shiftY}px`;
  }

  saveCurrentState() {
    const columns = ["todo", "inprogress", "done"];

    columns.forEach((colName) => {
      const cards = document.querySelectorAll(
        `[data-column="${colName}"] .card`,
      );
      this.state[colName] = Array.from(cards).map(
        (card) => card.firstChild.textContent,
      );
    });

    this.stateManager.save(this.state);
  }
}
