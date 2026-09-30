# 奶蛙大冒险 🐸

> 「吃掉一切，慢慢长大。」

一个纯前端的 2D 吞噬成长休闲小游戏：控制可爱的奶蛙吞食比自己小的东西，不断长大，最终成为一口吞掉小房子的超级巨蛙。

## 玩法

- 吃掉比你小的东西 → 获得成长值 → 升级变大 → 吃掉更大的东西
- 比你大的生物会把你弹开并造成伤害，长到足够大再回来报仇
- 10 分钟成长挑战，时间到可以继续玩无尽模式
- 7 个成长阶段：小奶蛙 → 普通奶蛙 → 大奶蛙 → 巨型奶蛙 → 超级奶蛙 → 远古巨蛙 → 终极巨蛙

## 操作

| 平台 | 移动 | 加速 |
| --- | --- | --- |
| 电脑 | WASD / 方向键 / 按住鼠标 | SHIFT |
| 手机 | 左下角虚拟摇杆 | 右下角 ⚡ 按钮 |

电脑按 `ESC` / `P` 暂停。手机建议横屏游玩。

## 本地运行

```bash
# 方式一：Python
python -m http.server 8000

# 方式二：Node.js（自带 server.js）
node server.js
```

然后打开 http://localhost:8000

> 游戏使用 ES Modules，必须通过 HTTP 服务器运行，不能直接双击 index.html。

## 部署到公网

### Cloudflare Pages

1. 把项目推送到 GitHub 仓库
2. 打开 https://dash.cloudflare.com → Workers & Pages → Create → Pages
3. Connect to Git，选择仓库
4. Build command 留空，Output directory 填 `/`（根目录）
5. 部署完成即可获得 `https://xxxx.pages.dev` 网址

### GitHub Pages

Settings → Pages → Source 选择 `main` 分支根目录即可。

### Vercel

`vercel deploy`（无构建配置，纯静态）。

## PWA

支持「添加到主屏幕」：部署到 HTTPS 后，手机浏览器菜单选择「添加到主屏幕」，即可像 App 一样打开（含离线缓存）。

## 常见自定义修改

所有可调参数集中在 `js/config.js`：

| 想改什么 | 位置 |
| --- | --- |
| 玩家移动速度 | `CONFIG.player.baseSpeed` / `speedPerLevel` / `speedCap` |
| 加速倍率 / 能量消耗 | `CONFIG.player.boostMult` / `boostDrain` / `boostRegen` |
| 地图大小 | `CONFIG.world.width` / `height` |
| 成长等级数量 / 升级所需经验 | `CONFIG.levels.max` / `expBase` / `expPow` |
| 游戏时长（秒） | `CONFIG.game.duration` |
| 吞食阈值 | `CONFIG.eat.threshold`（1.0 = 必须严格更大） |
| 游戏名称 | `index.html` 的 `<title>` 和 `<h1 class="title">`，以及 `manifest.json` 的 `name` |
| 奶蛙外观 | `js/player.js` 的 `drawMilkFrog()`（颜色、眼睛、嘴巴、皇冠、光环）与各状态动画 |
| 新增生物 | `js/config.js` 的 `TARGET_TYPES` 数组加一条，再在 `js/target.js` 的 `drawType()` 里加绘制分支 |

## 项目结构

```
naifen-tuntun/
├── index.html          # 页面结构 + 所有 UI 容器
├── css/style.css       # 全部样式与动画
├── js/
│   ├── main.js         # 入口：启动、循环、resize、PWA 注册
│   ├── game.js         # 游戏主循环：生成、碰撞、吞食、成长、结算
│   ├── player.js       # 奶蛙：物理、7 状态动画（idle/move/boost/eat/hurt/laugh/dead）、绘制
│   ├── target.js       # 22 种吞食目标：AI、绘制
│   ├── world.js        # 大地图：草地/水塘/树/装饰/云/视差
│   ├── particles.js    # 粒子对象池 + 飘字
│   ├── camera.js       # 跟随镜头 + 缩放 + 震动
│   ├── ui.js           # HUD、菜单、暂停、结算、设置
│   ├── input.js        # 键盘/鼠标/虚拟摇杆/加速按钮
│   ├── audio.js        # Web Audio 程序化音效与 BGM
│   ├── config.js       # 全部可调参数、生物表、成长表
│   ├── storage.js      # localStorage 记录
│   └── utils.js        # 数学工具
├── icons/              # PWA 图标
├── scripts/make-icons.ps1
├── manifest.json       # PWA 清单
├── sw.js               # Service Worker（离线缓存）
├── server.js           # 零依赖 Node 静态服务器
└── README.md
```
