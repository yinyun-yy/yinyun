import { expToNext, stageFor } from './config.js';
import { formatTime, fmtNum } from './utils.js';
import { storage } from './storage.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.isTouch = false;
    this.cache = { level: -1, expPct: -1, hp: -1, energy: -1, exp: -1, score: -1, timer: '', stage: '' };
    this.dmgTimer = null;
    this.bind();
    this.refreshMenuBest();
    this.refreshSettings();
  }

  el(id) {
    return document.getElementById(id);
  }

  bind() {
    this.el('btn-start').addEventListener('click', () => this.startGame());
    this.el('btn-help').addEventListener('click', () => {
      this.el('help').classList.remove('hidden');
      if (this.game.audio) this.game.audio.click();
    });
    this.el('btn-settings').addEventListener('click', () => {
      this.el('settings').classList.remove('hidden');
      if (this.game.audio) this.game.audio.click();
    });
    document.querySelectorAll('[data-close]').forEach((b) => {
      b.addEventListener('click', () => {
        this.el(b.dataset.close).classList.add('hidden');
        if (this.game.audio) this.game.audio.click();
      });
    });
    this.el('set-bgm').addEventListener('change', (e) => {
      if (this.game.audio) {
        this.game.audio.init();
        this.game.audio.setBgm(e.target.checked);
      }
    });
    this.el('set-sfx').addEventListener('change', (e) => {
      if (this.game.audio) this.game.audio.setSfx(e.target.checked);
    });
    this.el('btn-fullscreen').addEventListener('click', () => this.toggleFullscreen());
    this.el('btn-reset').addEventListener('click', () => {
      storage.resetAll();
      this.refreshMenuBest();
      this.refreshSettings();
      if (this.game.audio) this.game.audio.click();
    });
    this.el('btn-pause').addEventListener('click', () => this.pauseGame());
    this.el('btn-resume').addEventListener('click', () => this.resumeGame());
    this.el('btn-restart').addEventListener('click', () => this.restartGame());
    this.el('btn-home').addEventListener('click', () => this.goHome());
    this.el('btn-restart2').addEventListener('click', () => this.restartGame());
    this.el('btn-home2').addEventListener('click', () => this.goHome());
    this.el('btn-continue').addEventListener('click', () => {
      this.hideAllOverlays();
      this.game.continueEndless();
      this.el('hud').classList.remove('hidden');
      if (this.game.audio) this.game.audio.click();
    });
  }

  toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        const p = document.documentElement.requestFullscreen();
        if (p && p.catch) p.catch(() => {});
      } else {
        document.exitFullscreen();
      }
    } catch (e) {
      /* unsupported */
    }
  }

  hideAllOverlays() {
    for (const id of ['menu', 'help', 'settings', 'pause', 'gameover']) {
      this.el(id).classList.add('hidden');
    }
  }

  startGame() {
    if (this.game.audio) {
      this.game.audio.init();
      this.game.audio.click();
    }
    this.hideAllOverlays();
    this.game.start();
    this.el('hud').classList.remove('hidden');
  }

  pauseGame() {
    if (this.game.state !== 'playing') return;
    this.game.pause();
    this.hideAllOverlays();
    this.el('pause').classList.remove('hidden');
    if (this.game.audio) this.game.audio.click();
  }

  resumeGame() {
    this.hideAllOverlays();
    this.game.resume();
    this.el('hud').classList.remove('hidden');
    if (this.game.audio) this.game.audio.click();
  }

  onPauseRequest() {
    if (this.game.state === 'playing') this.pauseGame();
    else if (this.game.state === 'paused') this.resumeGame();
  }

  restartGame() {
    this.hideAllOverlays();
    this.game.start();
    this.el('hud').classList.remove('hidden');
    if (this.game.audio) this.game.audio.click();
  }

  goHome() {
    this.hideAllOverlays();
    this.game.toMenu();
    this.el('hud').classList.add('hidden');
    this.el('menu').classList.remove('hidden');
    this.refreshMenuBest();
    if (this.game.audio) this.game.audio.click();
  }

  showGameover(stats, reason, isRecord) {
    this.el('hud').classList.add('hidden');
    this.el('gameover').classList.remove('hidden');
    this.el('go-title').textContent = reason === 'death' ? '奶蛙被吃掉了！' : '时间到！';
    this.el('go-sub').classList.toggle('hidden', !isRecord);
    this.el('go-exp').textContent = fmtNum(stats.exp);
    this.el('go-score').textContent = fmtNum(stats.score);
    this.el('go-eaten').textContent = stats.eaten;
    this.el('go-level').textContent = 'Lv.' + stats.level;
    this.el('go-size').textContent = stats.size;
    this.el('go-time').textContent = formatTime(stats.time);
    this.el('btn-continue').classList.toggle('hidden', reason === 'death');
  }

  banner(main, sub) {
    const b = this.el('banner');
    b.querySelector('.banner-main').textContent = main;
    b.querySelector('.banner-sub').textContent = sub;
    b.classList.remove('hidden', 'show');
    void b.offsetWidth;
    b.classList.add('show');
  }

  flashDamage() {
    document.body.classList.remove('dmg');
    void document.body.offsetWidth;
    document.body.classList.add('dmg');
    if (this.dmgTimer) clearTimeout(this.dmgTimer);
    this.dmgTimer = setTimeout(() => document.body.classList.remove('dmg'), 620);
  }

  updateHud(game) {
    if (window.__hudCalls !== undefined) window.__hudCalls++;
    const p = game.player;
    const c = this.cache;
    if (c.level !== p.level) {
      c.level = p.level;
      this.el('hud-level').textContent = p.level;
    }
    const st = stageFor(p.level);
    if (c.stage !== st.name) {
      c.stage = st.name;
      this.el('hud-stage').textContent = st.name;
    }
    const pct = Math.min(100, Math.floor((p.exp / expToNext(p.level)) * 100));
    if (c.expPct !== pct) {
      c.expPct = pct;
      this.el('hud-exp-fill').style.width = pct + '%';
      this.el('hud-exp-pct').textContent = pct + '%';
    }
    const hp = Math.round(p.hp);
    if (c.hp !== hp) {
      c.hp = hp;
      this.el('hud-hp-fill').style.width = hp + '%';
    }
    const en = Math.round(p.energy);
    if (c.energy !== en) {
      c.energy = en;
      this.el('hud-energy-fill').style.width = en + '%';
    }
    const totalExp = p.stats.totalExp;
    if (c.exp !== totalExp) {
      c.exp = totalExp;
      this.el('hud-exp').textContent = fmtNum(totalExp);
    }
    if (c.score !== game.score) {
      c.score = game.score;
      this.el('hud-score').textContent = fmtNum(game.score);
      this.el('hud-score2').textContent = fmtNum(game.score);
    }
    const timerText = game.endless ? '∞' : formatTime(game.timer);
    if (c.timer !== timerText) {
      c.timer = timerText;
      this.el('hud-timer').textContent = timerText;
    }
  }

  onResize() {
    this.isTouch = this.game.input ? this.game.input.isTouch : this.isTouch;
    this.el('joy-zone').classList.toggle('hidden', !this.isTouch);
    this.el('btn-boost').classList.toggle('hidden', !this.isTouch);
    this.el('hud-hint-pc').classList.toggle('hidden', this.isTouch);
    this.el('menu-hint').textContent = this.isTouch
      ? '左下摇杆移动 · 右下按钮加速 · 自动横屏适配'
      : 'WASD / 方向键移动 · SHIFT 加速 · 按住鼠标跟随';
  }

  refreshMenuBest() {
    this.el('menu-best').textContent =
      '🏆 最高成长值 ' +
      fmtNum(storage.getBestExp()) +
      ' · 最高 Lv.' +
      storage.getBestLevel() +
      ' · 最大体型 ' +
      storage.getBestSize();
  }

  refreshSettings() {
    this.el('set-bgm').checked = storage.getBgm();
    this.el('set-sfx').checked = storage.getSfx();
  }
}
