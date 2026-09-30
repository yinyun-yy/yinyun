import { CONFIG, PONDS } from './config.js';
import { TAU, hash2, rand } from './utils.js';

const CELL = 96;
const FLOWER_COLORS = ['#FF8FB1', '#FFC46B', '#C79BF2', '#FF9B9B', '#FFF2F2'];

export class World {
  constructor() {
    this.W = CONFIG.world.width;
    this.H = CONFIG.world.height;
    this.time = 0;
    this.trees = [];
    this.lily = [];
    this.reeds = [];
    this.clouds = [];
    this.dirt = [];
    this.vignetteCache = null;
    this.build();
  }

  build() {
    this.trees = [];
    for (let i = 0; i < 115; i++) {
      const x = rand(180, this.W - 180);
      const y = rand(180, this.H - 180);
      if (this.waterAt(x, y)) continue;
      const r = rand(30, 78);
      this.trees.push({ x, y, r, phase: rand(TAU), fruit: rand() < 0.4, fruitColor: ['#FFD23E', '#FF9B7E', '#E86A5E'][Math.floor(rand(3))] });
    }

    this.dirt = [];
    for (let i = 0; i < 10; i++) {
      this.dirt.push({ x: rand(300, this.W - 300), y: rand(300, this.H - 300), rx: rand(90, 190), ry: rand(60, 130), rot: rand(TAU) });
    }

    this.lily = [];
    PONDS.forEach((p, pi) => {
      const n = 8 + pi * 4;
      for (let i = 0; i < n; i++) {
        const a = rand(TAU);
        const d = Math.sqrt(rand(0.15, 0.95));
        this.lily.push({
          x: p.x + Math.cos(a) * p.rx * d,
          y: p.y + Math.sin(a) * p.ry * d,
          r: rand(9, 17),
          flower: rand() < 0.25,
          phase: rand(TAU),
        });
      }
    });

    this.reeds = [];
    PONDS.forEach((p) => {
      const n = 30;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(0.15);
        const x = p.x + Math.cos(a) * p.rx;
        const y = p.y + Math.sin(a) * p.ry;
        if (x < 60 || x > this.W - 60 || y < 60 || y > this.H - 60) continue;
        this.reeds.push({ x, y, phase: rand(TAU), len: rand(14, 26), dir: rand() < 0.5 ? -1 : 1 });
      }
    });

    this.clouds = [];
    for (let i = 0; i < 16; i++) {
      const puffs = [];
      const np = 3 + Math.floor(rand(3));
      for (let j = 0; j < np; j++) {
        puffs.push({ dx: rand(-46, 46), dy: rand(-12, 12), r: rand(30, 58) });
      }
      this.clouds.push({
        x: rand(0, this.W + 600),
        y: rand(150, this.H - 150),
        spd: rand(7, 16),
        puffs,
        alpha: rand(0.5, 0.85),
      });
    }
  }

  sdf(x, y) {
    let m = Infinity;
    for (const p of PONDS) {
      const d = Math.hypot((x - p.x) / p.rx, (y - p.y) / p.ry) - 1;
      if (d < m) m = d;
    }
    return m;
  }

  waterAt(x, y) {
    return this.sdf(x, y) < 0;
  }

  shoreDist(x, y) {
    return Math.abs(this.sdf(x, y)) * Math.min(300, this.nearestPond(x, y).rx);
  }

  nearestPond(x, y) {
    let best = PONDS[0];
    let bd = Infinity;
    for (const p of PONDS) {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  update(dt) {
    this.time += dt;
    for (const c of this.clouds) {
      c.x += c.spd * dt;
      if (c.x > this.W + 700) c.x = -700;
    }
  }

  drawOcean(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#9fdcf0');
    g.addColorStop(1, '#5fb3d8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    const t = this.time;
    for (let row = 0; row < 6; row++) {
      const baseY = ((row * h) / 5 + ((t * 26) % (h / 5))) % h;
      ctx.beginPath();
      for (let x = -20; x <= w + 20; x += 26) {
        const y = baseY + Math.sin(x * 0.02 + t * 1.4 + row * 2.1) * 5;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  drawGround(ctx, cam, view, zoom) {
    const W = this.W;
    const H = this.H;
    const m = CONFIG.world.margin;
    const cr = CONFIG.world.corner;

    ctx.fillStyle = '#d9ecc4';
    this.roundRectPath(ctx, -60, -60, W + 120, H + 120, cr + 60);
    ctx.fill();

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#a3dd7e');
    g.addColorStop(0.5, '#96d572');
    g.addColorStop(1, '#8acb66');
    ctx.fillStyle = g;
    this.roundRectPath(ctx, 0, 0, W, H, cr);
    ctx.fill();

    ctx.strokeStyle = 'rgba(60,110,50,0.28)';
    ctx.lineWidth = 6;
    this.roundRectPath(ctx, 3, 3, W - 6, H - 6, cr - 3);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = '#efe0b0';
    ctx.lineWidth = 30;
    this.roundRectPath(ctx, -14, -14, W + 28, H + 28, cr + 14);
    ctx.stroke();
    ctx.strokeStyle = '#e2cf9a';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    for (const d of this.dirt) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = 'rgba(203,178,122,0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, d.rx, d.ry, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,135,85,0.35)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    const hw = view.w / (2 * zoom);
    const hh = view.h / (2 * zoom);
    const cx0 = Math.floor((cam.x - hw) / CELL);
    const cx1 = Math.floor((cam.x + hw) / CELL);
    const cy0 = Math.floor((cam.y - hh) / CELL);
    const cy1 = Math.floor((cam.y + hh) / CELL);

    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const h1 = hash2(cx * 7 + 3, cy * 13 + 5);
        if (h1 < 0.88) {
          const px = cx * CELL + h1 * CELL;
          const py = cy * CELL + hash2(cx * 17 + 1, cy * 23 + 9) * CELL;
          const pr = CELL * (0.22 + hash2(cx * 29 + 5, cy * 31 + 2) * 0.5);
          ctx.fillStyle = h1 < 0.45 ? 'rgba(76,145,62,0.09)' : 'rgba(190,235,150,0.10)';
          ctx.beginPath();
          ctx.ellipse(px, py, pr, pr * 0.66, hash2(cx, cy) * TAU, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  drawPonds(ctx, cam, view, zoom) {
    const t = this.time;
    const hw = view.w / (2 * zoom) + 200;
    const hh = view.h / (2 * zoom) + 200;
    for (const p of PONDS) {
      if (p.x < cam.x - hw - p.rx || p.x > cam.x + hw + p.rx || p.y < cam.y - hh - p.ry || p.y > cam.y + hh + p.ry) continue;

      ctx.save();
      ctx.translate(p.x, p.y);

      ctx.strokeStyle = '#d9c98f';
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx + 30, p.ry + 30, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = '#c3b276';
      ctx.lineWidth = 10;
      ctx.stroke();

      const wg = ctx.createRadialGradient(-p.rx * 0.2, -p.ry * 0.2, p.ry * 0.1, 0, 0, p.rx);
      wg.addColorStop(0, '#7ec9e6');
      wg.addColorStop(0.55, '#63b8de');
      wg.addColorStop(1, '#4fa5d2');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        const ph = t * (0.5 + i * 0.17) + i * 2.4;
        const s = 0.52 + ((ph % 2) > 1 ? 2 - (ph % 2) : ph % 2) * 0.46;
        ctx.beginPath();
        ctx.ellipse(-p.rx * 0.25, -p.ry * 0.25, p.rx * s, p.ry * s, 0, 0, TAU);
        ctx.stroke();
      }

      for (let i = 0; i < 6; i++) {
        const hx = hash2(i * 13 + 7, p.x) * 1.6 - 0.8;
        const hy = hash2(i * 29 + 3, p.y) * 1.6 - 0.8;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.8 + i * 2.9);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + tw * 0.25).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(hx * p.rx * 0.8, hy * p.ry * 0.8, 3 + tw * 3, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    }

    for (const lp of this.lily) {
      if (lp.x < cam.x - hw - 40 || lp.x > cam.x + hw + 40 || lp.y < cam.y - hh - 40 || lp.y > cam.y + hh + 40) continue;
      ctx.save();
      ctx.translate(lp.x, lp.y);
      ctx.rotate(Math.sin(t * 0.5 + lp.phase) * 0.08);
      ctx.fillStyle = '#54a852';
      ctx.beginPath();
      ctx.arc(0, 0, lp.r, 0.4, TAU - 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(-lp.r * 0.25, -lp.r * 0.25, lp.r * 0.3, 0, TAU);
      ctx.fill();
      if (lp.flower) {
        ctx.fillStyle = '#ff9dc0';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * lp.r * 0.32, Math.sin(a) * lp.r * 0.32, lp.r * 0.24, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath();
        ctx.arc(0, 0, lp.r * 0.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawTrees(ctx, cam, view, zoom) {
    const hw = view.w / (2 * zoom) + 200;
    const hh = view.h / (2 * zoom) + 200;
    for (const tr of this.trees) {
      if (tr.x < cam.x - hw || tr.x > cam.x + hw || tr.y < cam.y - hh || tr.y > cam.y + hh) continue;
      ctx.save();
      ctx.translate(tr.x, tr.y);

      ctx.fillStyle = 'rgba(40,70,40,0.22)';
      ctx.beginPath();
      ctx.ellipse(tr.r * 0.22, tr.r * 0.3, tr.r * 1.05, tr.r * 0.55, 0, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#3c7f45';
      ctx.beginPath();
      ctx.arc(0, 0, tr.r, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#4f9a52';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + tr.phase;
        const d = tr.r * 0.45;
        const br = tr.r * 0.52;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, br, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#63b263';
      ctx.beginPath();
      ctx.arc(0, 0, tr.r * 0.62, 0, TAU);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(-tr.r * 0.35, -tr.r * 0.4, tr.r * 0.34, 0, TAU);
      ctx.fill();

      if (tr.fruit) {
        ctx.fillStyle = tr.fruitColor;
        for (let i = 0; i < 6; i++) {
          const a = tr.phase + (i / 6) * TAU;
          const d = tr.r * (0.5 + hash2(i, tr.x) * 0.3);
          ctx.beginPath();
          ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 4.5, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  drawDecor(ctx, cam, view, zoom, t) {
    const hw = view.w / (2 * zoom);
    const hh = view.h / (2 * zoom);
    const cx0 = Math.floor((cam.x - hw) / CELL);
    const cx1 = Math.floor((cam.x + hw) / CELL);
    const cy0 = Math.floor((cam.y - hh) / CELL);
    const cy1 = Math.floor((cam.y + hh) / CELL);

    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const h1 = hash2(cx * 31 + 7, cy * 17 + 3);
        const h2 = hash2(cx * 53 + 1, cy * 41 + 11);
        const h3 = hash2(cx * 71 + 5, cy * 23 + 9);
        const h4 = hash2(cx * 89 + 13, cy * 61 + 17);
        const gx = cx * CELL + h1 * CELL;
        const gy = cy * CELL + h2 * CELL;

        this.drawGrassTuft(ctx, gx, gy, h3 * TAU, t * 1.3 + h4 * TAU, 0.85 + h2 * 0.4);

        if (h2 < 0.6) {
          const fx = cx * CELL + h3 * CELL;
          const fy = cy * CELL + h4 * CELL;
          if (!this.waterAt(fx, fy)) {
            this.drawFlower(ctx, fx, fy, FLOWER_COLORS[Math.floor(h1 * FLOWER_COLORS.length)], t * 1.1 + h2 * TAU);
          }
        }
        if (h3 < 0.38) {
          const sx = cx * CELL + h4 * CELL;
          const sy = cy * CELL + h1 * CELL;
          if (!this.waterAt(sx, sy)) this.drawStone(ctx, sx, sy, 4 + h2 * 7);
        }
        if (h4 < 0.16) {
          const mx = cx * CELL + h2 * CELL;
          const my = cy * CELL + h3 * CELL;
          if (!this.waterAt(mx, my)) this.drawMushroom(ctx, mx, my, 5 + h1 * 5, t * 0.9 + h2 * TAU);
        }
      }
    }

    for (const rd of this.reeds) {
      if (rd.x < cam.x - hw - 40 || rd.x > cam.x + hw + 40 || rd.y < cam.y - hh - 40 || rd.y > cam.y + hh + 40) continue;
      this.drawReed(ctx, rd.x, rd.y, rd.len, rd.phase + t * 1.5, rd.dir);
    }
  }

  drawGrassTuft(ctx, x, y, rot, sway, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(90,165,66,0.8)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + sway * 0.14;
      const len = (7 + (i % 2) * 2.5) * s;
      const ex = Math.cos(a) * len;
      const ey = Math.sin(a) * len;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(ex * 0.5, ey * 0.5 - 1.5, ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFlower(ctx, x, y, color, sway) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(sway) * 0.12);
    ctx.fillStyle = color;
    const pr = 3.4;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * pr, Math.sin(a) * pr, pr * 0.85, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(0, 0, pr * 0.72, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawStone(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(40,60,40,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, r * 1.1, r * 0.62, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c9cdd2';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.72, 0.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,130,140,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.28, y - r * 0.24, r * 0.36, r * 0.22, 0.4, 0, TAU);
    ctx.fill();
  }

  drawMushroom(ctx, x, y, r, sway) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(sway) * 0.08);
    ctx.fillStyle = 'rgba(40,60,40,0.16)';
    ctx.beginPath();
    ctx.ellipse(2, 3, r * 1.2, r * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e86a5e';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,60,50,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff6ec';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.6;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.18, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawReed(ctx, x, y, len, sway, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(105,168,79,0.85)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.34 * dir + Math.sin(sway + i) * 0.18;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.sin(sway + i) * 4, -len * 0.5, Math.sin(a) * len * 0.9, -len);
      ctx.stroke();
    }
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath();
    ctx.ellipse(dir * 3, -len - 4, 2.6, 6, dir * 0.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawCloudShadows(ctx, cam, view, zoom) {
    const hw = view.w / (2 * zoom) + 400;
    const hh = view.h / (2 * zoom) + 400;
    ctx.fillStyle = 'rgba(40,70,50,0.06)';
    for (const c of this.clouds) {
      if (c.x < cam.x - hw || c.x > cam.x + hw || c.y < cam.y - hh || c.y > cam.y + hh) continue;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 130, 70, 0, 0, TAU);
      ctx.fill();
    }
  }

  drawClouds(ctx, view, cam) {
    const par = 0.35;
    for (const c of this.clouds) {
      const sx = (c.x - cam.x) * cam.zoom * par + view.w / 2;
      const sy = (c.y - cam.y) * cam.zoom * par + view.h / 2;
      if (sx < -400 || sx > view.w + 400 || sy < -300 || sy > view.h + 300) continue;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = 'rgba(255,255,255,' + c.alpha.toFixed(3) + ')';
      for (const p of c.puffs) {
        ctx.beginPath();
        ctx.arc(p.dx * 1.6, p.dy * 1.6, p.r * 1.4, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,' + (c.alpha * 0.5).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(0, -26, 120, 30, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawVignette(ctx, w, h) {
    if (!this.vignetteCache) {
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, 'rgba(30,60,30,0)');
      vg.addColorStop(1, 'rgba(24,52,30,0.30)');
      this.vignetteCache = vg;
    }
    ctx.fillStyle = this.vignetteCache;
    ctx.fillRect(0, 0, w, h);
  }
}
