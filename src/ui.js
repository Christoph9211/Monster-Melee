export class UIManager {
  constructor() {
    this.menu = document.querySelector("#menu");
    this.hud = document.querySelector("#hud");
    this.pause = document.querySelector("#pause");
    this.result = document.querySelector("#result");
    this.playerBar = document.querySelector("#player-bar");
    this.enemyBar = document.querySelector("#enemy-bar");
    this.playerName = document.querySelector("#player-name");
    this.enemyName = document.querySelector("#enemy-name");
    this.special = document.querySelector("#special");
    this.specialText = document.querySelector("#special-text");
    this.controls = document.querySelector("#controls");
    this.selected = "brute";
    this.hintTime = 8;
    this.handlers = {};

    document.querySelectorAll(".fighter").forEach(button => button.addEventListener("click", () => {
      document.querySelector(".fighter.selected")?.classList.remove("selected");
      button.classList.add("selected");
      this.selected = button.dataset.fighter;
    }));
    document.querySelector("#start").addEventListener("click", () => this.handlers.start?.(this.selected));
    document.querySelector("#resume").addEventListener("click", () => this.handlers.resume?.());
    document.querySelector("#rematch").addEventListener("click", () => this.handlers.start?.(this.selected));
    document.querySelectorAll(".to-menu").forEach(button => button.addEventListener("click", () => this.handlers.menu?.()));
    document.querySelector("#quit").addEventListener("click", () => {
      document.querySelector("#quit-note").textContent = "Browsers cannot close their own tab. You can close this tab safely.";
    });
  }

  on(name, handler) { this.handlers[name] = handler; }

  showMenu() {
    this.menu.classList.remove("hidden");
    this.hud.classList.add("hidden");
    this.pause.classList.add("hidden");
    this.result.classList.add("hidden");
  }

  showGame() {
    this.menu.classList.add("hidden");
    this.pause.classList.add("hidden");
    this.result.classList.add("hidden");
    this.hud.classList.remove("hidden");
    this.hintTime = 8;
    this.controls.style.opacity = "1";
  }

  showPause(show) {
    this.pause.classList.toggle("hidden", !show);
  }

  showResult(won) {
    document.querySelector("#result-title").textContent = won ? "VICTORY" : "DEFEAT";
    this.result.classList.remove("hidden");
  }

  update(dt, player, enemy) {
    this.playerName.textContent = player.name;
    this.enemyName.textContent = enemy.name;
    this.playerBar.style.transform = `scaleX(${player.health / player.stats.maxHealth})`;
    this.enemyBar.style.transform = `scaleX(${enemy.health / enemy.stats.maxHealth})`;
    const ratio = 1 - player.specialCooldown / player.stats.cooldown;
    this.special.querySelector("i").style.transform = `scaleX(${ratio})`;
    this.specialText.textContent = player.specialCooldown <= 0 ? "READY" : `${player.specialCooldown.toFixed(1)}s`;
    this.hintTime -= dt;
    if (this.hintTime < 2) this.controls.style.opacity = String(Math.max(0, this.hintTime / 2));
  }
}
