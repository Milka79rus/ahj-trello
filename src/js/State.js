export default class State {
  constructor() {
    this.storageKey = "trello_state";
  }

  // Загружаем данные из localStorage
  load() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return this.getDefaultState();
      }
    }
    return this.getDefaultState();
  }

  // Сохраняем актуальное состояние колонок
  save(state) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  // Дефолтное состояние при первом входе
  getDefaultState() {
    return {
      todo: [
        "Welcome to Trello Clone!",
        "Hover over me to see the cross",
        "Drag me around",
      ],
      inprogress: ["Working on DnD"],
      done: ["Setup Webpack"],
    };
  }
}
