import { CONFIG, PONDS, TARGET_TYPES, radiusFor, expToNext, stageFor } from './config.js';
import { TAU, clamp, rand, randInt, angleTo } from './utils.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { Particles, Texts } from './particles.js';
import { Target, drawType } from './target.js';
import { storage } from './storage.js';

export class Game {
  constructor() {
    this.state = 'menu';
    this.world = new World();
    this.player = new Player();
    this.camera = new Camera(this.world.W, this.world.H);
    this.particles = new Particles(420);
    this.texts = new Texts(40);
    this.targets = [];
    const poolSize = CONFIG.game.maxTargets + 20;
    for (let i = 0; i < poolSize; i++) this.targets.push(new Target());
    this.aliveCount = 0;
    this.time = 0;
    this.gameTime = 0;
    this.timer = CONFIG.game.duration;
    this.endless = false;
    this.score = 0;
    this.spawnTimer = 0;
    this.ambientTimer = 0;
    this.attractT = 0;
    this.mouseWX = 0;
    this.mouseWY = 0;
    this.lastStageName = '小奶蛙';
    this.prevInWater = false;
    this.input = null;
    this.audio = null;
    this.ui = null;
    this.scatterInitial();
    this.camera.snapTo(this.player.x, this.player.y);
  }

  scatterInitial() {
    for (const t of this.targets) t.alive = false;
    this.aliveCount = 0;
    const m = CONFIG.world.margin + 80;
    const W = this.world.W - m;
    const H = this.world.H - m;
    for (let i = 0; i < CONFIG.game.initialScatter; i++) {
      const x = rand(m, W);
      const y = rand(m, H);
      const type = this.pickTypeFor(x, y, 5);
      if (!type) continue;
      const t = this.firstInactive();
      if (!t) break;
      t.spawn(type, x, y);
      this.aliveCount++;
    }
  }

  firstInactive() {
    for (const t of this.targets) {
      if (!t.alive) return t;
    }
    return null;
  }

  pickTypeFor(x, y, maxTier) {
    const water = this.world.waterAt(x, y);
    const pool = [];
    let total = 0;
    for (const type of TARGET_TYPES) {
      if (type.tier > maxTier) continue;
      let ok = false;
      if (type.habitat === 'any') ok = true;
      else if (water && type.habitat === 'water') ok = true;
      else if (!water && type.habitat === 'land') ok = true;
      else if (!water && type.habitat === 'shore' && this.world.shoreDist(x, y) < 80) ok = true;
      if (!ok) continue;
      let w = Math.max(1, 10 - type.tier * 1.7 + (type.speed === 0 ? 2.2 : 0));
      if (type.tier >= 4) w *= 0.3;
      pool.push({ type, w });
      total += w;
    }
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const p of pool) {
      r -= p.w;
      if (r <= 0) return p.type;
    }
    return pool[pool.length - 1].type;
  }

  bindIO(input, audio, ui) {
    this.input = input;
    this.audio = audio;
    this.ui = ui;
  }

  start() {
    this.player.reset();
    this.score = 0;
    this.gameTime = 0;
    this.timer = CONFIG.game.duration;
    this.endless = false;
    this.spawnTimer = 0;
    this.time = 0;
    this.lastStageName = stageFor(1).name;
    this.prevInWater = false;
    this.scatterInitial();
    this.camera.snapTo(this.player.x, this.player.y);
    this.camera.zoomTarget = CONFIG.zoom.base - this.player.visualR * CONFIG.zoom.shrink;
    this.state = 'playing';
  }

  pause() {
    if (this.state === 'playing') this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') this.state = 'playing';
  }

  toMenu() {
    this.state = 'menu';
    this.player.reset();
    this.attractT = 0;
    this.scatterInitial();
  }

  continueEndless() {
    this.endless = true;
    this.state = 'playing';
  }

  gameover(reason) {
    this.state = 'gameover';
    const s = this.player.stats;
    const bestExp = storage.getBestExp();
    const isRecord = s.totalExp > bestExp;
    if (isRecord) storage.setBestExp(s.totalExp);
    storage.setBestLevel(Math.max(storage.getBestLevel(), s.maxLevel));
    storage.setBestSize(Math.max(storage.getBestSize(), Math.round(s.maxSize)));
    storage.setGames(storage.getGames() + 1);
    if (this.ui) {
      this.ui.showGameover(
        {
          exp: s.totalExp,
          score: this.score,
          eaten: s.eaten,
          level: s.maxLevel,
          size: Math.round(s.maxSize),
          time: this.gameTime,
        },
        reason,
        isRecord
      );
    }
  }

  update(dt, view) {
    if (this.state === 'playing') this.updatePlay(dt, view);
    else if (this.state === 'menu') this.updateMenu(dt, view);
    else if (this.state === 'dying') {
      this.world.update(dt);
      for (const t of this.targets) if (t.alive) t.update(dt, this.player, this.world);
      this.particles.update(dt);
      this.texts.update(dt);
      this.player.animTime += dt;
      this.player.deadT += dt;
      if (this.player.deadT > 1.7) this.gameover('death');
    } else if (this.state === 'gameover') {
      this.world.update(dt);
      for (const t of this.targets) if (t.alive) t.update(dt, this.player, this.world);
      this.particles.update(dt);
      this.texts.update(dt);
    }
  }

  updateMenu(dt, view) {
    this.world.update(dt);
    this.attractT += dt;
    const cx = this.world.W / 2 + Math.cos(this.attractT * 0.1) * 800;
    const cy = this.world.H / 2 + Math.sin(this.attractT * 0.07) * 520;
    this.camera.follow(cx, cy, dt, view.w, view.h);
    this.camera.zoomTarget = 0.62;
    this.player.x = this.camera.x + this.camera.shakeX;
    this.player.y = this.camera.y + this.camera.shakeY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.idle(dt);
    for (const t of this.targets) if (t.alive) t.update(dt, this.player, this.world);
    this.particles.update(dt);
    this.texts.update(dt);
    this.ambientBubbles(dt, view);
  }

  updatePlay(dt, view) {
    if (window.__frames !== undefined) window.__frames++;
    this.time += dt;
    this.gameTime += dt;
    if (!this.endless) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0;
        this.gameover('time');
        return;
      }
    }

    this.mouseWX = this.camera.x + (this.input.mouse.x - view.w / 2) / this.camera.zoom;
    this.mouseWY = this.camera.y + (this.input.mouse.y - view.h / 2) / this.camera.zoom;

    this.player.update(dt, this.input, this.world, this);
    this.camera.follow(
      this.player.x + this.player.vx * 0.12,
      this.player.y + this.player.vy * 0.12,
      dt,
      view.w,
      view.h
    );
    this.camera.zoomTarget = clamp(
      CONFIG.zoom.base - this.player.visualR * CONFIG.zoom.shrink,
      CONFIG.zoom.min,
      CONFIG.zoom.max
    );
    this.world.update(dt);

    if (this.player.inWater && !this.prevInWater) {
      this.particles.splash(this.player.x, this.player.y, this.player.visualR * 0.8);
      if (this.audio) this.audio.splash();
    }
    if (!this.player.inWater && this.prevInWater) {
      this.particles.splash(this.player.x, this.player.y, this.player.visualR * 0.6);
    }
    this.prevInWater = this.player.inWater;

    if (!this.player.inWater && Math.hypot(this.player.vx, this.player.vy) > 150 && Math.random() < dt * 7) {
      this.particles.dust(this.player.x, this.player.y + this.player.visualR * 0.8);
    }

    this.spawnTargets(dt);
    for (const t of this.targets) {
      if (t.alive) t.update(dt, this.player, this.world);
    }
    this.collisions();
    this.processEatAnims();

    this.particles.update(dt);
    this.texts.update(dt);
    this.ambientBubbles(dt, view);

    if (this.ui) this.ui.updateHud(this);
  }

  spawnTargets(dt) {
    this.spawnTimer -= dt;
    const m = CONFIG.world.margin + 60;
    const W = this.world.W - m;
    const H = this.world.H - m;
    while (this.spawnTimer <= 0 && this.aliveCount < CONFIG.game.maxTargets) {
      this.spawnTimer += CONFIG.game.spawnInterval;
      for (let attempt = 0; attempt < 8; attempt++) {
        let x, y;
        if (attempt >= 5) {
          x = rand(m, W);
          y = rand(m, H);
        } else {
          const a = rand(TAU);
          const d = rand(CONFIG.game.spawnDistMin, CONFIG.game.spawnDistMax);
          x = clamp(this.player.x + Math.cos(a) * d, m, W);
          y = clamp(this.player.y + Math.sin(a) * d, m, H);
        }
        const type = this.pickTypeFor(x, y, 5);
        if (!type) continue;
        const t = this.firstInactive();
        if (!t) return;
        t.spawn(type, x, y);
        this.aliveCount++;
        break;
      }
    }
  }

  collisions() {
    const p = this.player;
    for (const t of this.targets) {
      if (!t.alive) continue;
      const dx = p.x - t.x;
      const dy = p.y - t.y;
      const rr = p.visualR * 0.75 + t.r;
      if (dx * dx + dy * dy >= rr * rr) continue;

      if (p.visualR >= t.r * CONFIG.eat.threshold) {
        this.eat(t);
      } else {
        const a = angleTo(t.x, t.y, p.x, p.y);
        p.x = t.x + Math.cos(a) * (rr + 2);
        p.y = t.y + Math.sin(a) * (rr + 2);
        p.vx += Math.cos(a) * CONFIG.player.knockback * 0.55;
        p.vy += Math.sin(a) * CONFIG.player.knockback * 0.55;
        t.fleeT = 1.2;
        this.texts.add(t.x, t.y - t.r - 12, '还吃不了…', '#ffb04a', 15, 0.9);
        this.camera.shake(0.12);
        if (this.audio) this.audio.deny();
        if (t.r > p.visualR * 1.15 && p.damageCd <= 0) {
          this.damage(t);
        }
      }
    }
  }

  eat(t) {
    const exp = t.type.exp;
    t.alive = false;
    this.aliveCount--;
    this.player.exp += exp;
    this.score += t.type.score;
    this.player.stats.eaten++;
    this.player.stats.totalExp += exp;
    this.player.mouth = 1;
    if (t.r >= 26) this.player.laugh(0.9);
    this.player.eatAnims.push({
      t: 0,
      dur: 0.42,
      x: t.x,
      y: t.y,
      r: t.r,
      type: t.type,
      swallowed: false,
      done: false,
    });
    if (this.audio) {
      if (t.r >= 60) this.audio.bigEat();
      else this.audio.eat(t.r);
      this.audio.vibrate(12);
    }
    this.checkLevelUp();
  }

  processEatAnims() {
    for (const a of this.player.eatAnims) {
      if (a.swallowed && !a.done) {
        a.done = true;
        this.particles.eatPop(a.x, a.y, a.type.colors[0], Math.max(8, a.r * 0.6));
        this.texts.add(this.player.x, this.player.y - this.player.visualR * 1.5, '+' + a.type.exp, '#ffe9a0', Math.min(30, 14 + a.r * 0.28), 1.0);
      }
    }
  }

  checkLevelUp() {
    const p = this.player;
    let leveled = false;
    while (p.level < CONFIG.levels.max && p.exp >= expToNext(p.level)) {
      p.exp -= expToNext(p.level);
      p.level++;
      leveled = true;
    }
    if (p.level >= CONFIG.levels.max) p.exp = Math.min(p.exp, expToNext(p.level - 1) - 1);
    if (leveled) this.onLevelUp();
  }

  onLevelUp() {
    const p = this.player;
    p.stats.maxLevel = Math.max(p.stats.maxLevel, p.level);
    p.stats.maxSize = Math.max(p.stats.maxSize, radiusFor(p.level));
    p.hp = Math.min(CONFIG.player.hpMax, p.hp + 15);
    p.levelUpPop();
    p.laugh(1.2);
    this.camera.shake(0.5);
    this.particles.levelUp(p.x, p.y);
    const st = stageFor(p.level);
    if (st.name !== this.lastStageName) {
      this.lastStageName = st.name;
      if (this.ui) this.ui.banner('LEVEL UP!', '奶蛙长大啦！成长为「' + st.name + '」');
    } else {
      if (this.ui) this.ui.banner('LEVEL UP!', '奶蛙长大啦！');
    }
    if (this.audio) {
      this.audio.levelup();
      this.audio.vibrate(40);
    }
  }

  damage(t) {
    const p = this.player;
    p.hp = Math.max(0, p.hp - CONFIG.player.damage);
    p.damageCd = CONFIG.player.damageCooldown;
    p.hpTimer = CONFIG.player.hpRegenDelay;
    p.hurt(0.5);
    this.camera.shake(0.45);
    this.texts.add(p.x, p.y - p.visualR * 1.4, '好痛！', '#ff6b5e', 20, 1.0);
    if (this.audio) {
      this.audio.hurt();
      this.audio.vibrate(60);
    }
    if (this.ui) this.ui.flashDamage();
    if (p.hp <= 0) {
      this.state = 'dying';
      p.die();
      this.particles.burst(p.x, p.y, '#fff3c4', 26, 300);
      this.particles.ring(p.x, p.y, '#ffd23e', p.visualR * 0.8, 0.7);
      this.particles.ring(p.x, p.y, '#ffffff', p.visualR * 0.4, 0.5);
      this.camera.shake(0.7);
    }
  }

  ambientBubbles(dt, view) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 0.22;
    const p = PONDS[randInt(0, PONDS.length - 1)];
    const a = rand(TAU);
    const d = Math.sqrt(Math.random());
    const bx = p.x + Math.cos(a) * p.rx * d;
    const by = p.y + Math.sin(a) * p.ry * d;
    const hw = view.w / (2 * this.camera.zoom) + 100;
    const hh = view.h / (2 * this.camera.zoom) + 100;
    if (bx < this.camera.x - hw || bx > this.camera.x + hw || by < this.camera.y - hh || by > this.camera.y + hh) return;
    this.particles.bubbles(bx, by, 1);
  }

  render(ctx, view, dpr) {
    const w = view.w;
    const h = view.h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.world.drawOcean(ctx, w, h);
    const cam = this.camera;
    const z = cam.zoom;
    ctx.save();
    ctx.setTransform(
      dpr * z,
      0,
      0,
      dpr * z,
      (w / 2 - (cam.x - cam.shakeX) * z) * dpr,
      (h / 2 - (cam.y - cam.shakeY) * z) * dpr
    );
    this.world.drawGround(ctx, cam, view, z);
    this.world.drawPonds(ctx, cam, view, z);
    this.world.drawTrees(ctx, cam, view, z);
    this.world.drawDecor(ctx, cam, view, z, this.world.time);
    this.world.drawCloudShadows(ctx, cam, view, z);

    const hw = w / (2 * z) + 140;
    const hh = h / (2 * z) + 140;
    const showRings = this.state === 'playing' || this.state === 'menu';
    for (const t of this.targets) {
      if (!t.alive) continue;
      if (t.x < cam.x - hw || t.x > cam.x + hw || t.y < cam.y - hh || t.y > cam.y + hh) continue;
      t.draw(ctx, this.world.time, showRings ? this.player : null);
    }

    for (const a of this.player.eatAnims) {
      const f = Math.min(1, a.t / a.dur);
      const ease = f * f;
      const mx = this.player.x + this.player.facing * this.player.visualR * 0.75;
      const my = this.player.y + this.player.visualR * 0.1;
      const px = a.x + (mx - a.x) * ease;
      const py = a.y + (my - a.y) * ease;
      const pr = Math.max(0.5, a.r * (1 - ease * 0.92));
      drawType(ctx, a.type, px, py, pr, this.world.time, { dir: angleTo(a.x, a.y, mx, my), wag: this.world.time * 10, speed: 0 });
    }

    this.player.draw(ctx, this.world.time);
    this.particles.draw(ctx);
    this.texts.draw(ctx);
    ctx.restore();

    this.world.drawClouds(ctx, view, cam);
    this.world.drawVignette(ctx, w, h);
  }

  targetsAlive() {
    return this.aliveCount;
  }

  debugGain(exp) {
    this.player.exp += exp;
    this.player.stats.totalExp += exp;
    this.checkLevelUp();
  }
}
