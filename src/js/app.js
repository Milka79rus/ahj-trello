import "../css/style.css";
import Trello from "./Trello";

document.addEventListener("DOMContentLoaded", () => {
  const trello = new Trello();
  trello.init();
});
