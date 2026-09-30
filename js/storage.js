const KEYS = {
  exp: 'nf_best_exp',
  level: 'nf_best_level',
  size: 'nf_best_size',
  games: 'nf_games',
  bgm: 'nf_bgm',
  sfx: 'nf_sfx',
};

function get(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : JSON.parse(v);
  } catch (e) {
    return def;
  }
}

function set(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    /* storage unavailable */
  }
}

export const storage = {
  getBestExp: () => get(KEYS.exp, 0),
  getBestLevel: () => get(KEYS.level, 1),
  getBestSize: () => get(KEYS.size, 24),
  getGames: () => get(KEYS.games, 0),
  getBgm: () => get(KEYS.bgm, true),
  getSfx: () => get(KEYS.sfx, true),
  setBestExp: (v) => set(KEYS.exp, v),
  setBestLevel: (v) => set(KEYS.level, v),
  setBestSize: (v) => set(KEYS.size, v),
  setGames: (v) => set(KEYS.games, v),
  setBgm: (v) => set(KEYS.bgm, v),
  setSfx: (v) => set(KEYS.sfx, v),
  resetAll() {
    try {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      /* ignore */
    }
  },
};
