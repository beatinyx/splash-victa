// Gera o Lottie da splash a partir de src/timeline.js (node scripts/build-lottie.js)
// Saída: dist/victa-splash.json — quadro de 400 × 400 pt, fundo transparente,
// para ser centralizado na tela sobre o verde Victa (#42CF00).
const fs = require('fs');
const path = require('path');
const S = require('../src/timeline.js');

const FR = 60;
const OP = Math.round((S.DURATION / 1000) * FR);
const C = S.STAGE / 2;
const toFrame = (ms) => Math.round((ms / 1000) * FR * 1000) / 1000;
const rgba = (hex) => [1, 3, 5].map((i) => Math.round((parseInt(hex.slice(i, i + 2), 16) / 255) * 10000) / 10000).concat(1);
const stat = (k) => ({ a: 0, k });

// Track da timeline → propriedade animada do Lottie (mesmos tempos e curvas)
function anim(track, map = (v) => v) {
  const kfs = S.TRACKS[track];
  return {
    a: 1,
    k: kfs.map(([t, v, e], idx) => {
      const s = [].concat(map(v));
      const key = { t: toFrame(t), s };
      if (idx < kfs.length - 1) {
        const ez = e || S.EASE.linear;
        const dims = s.length;
        key.o = { x: Array(dims).fill(ez[0]), y: Array(dims).fill(ez[1]) };
        key.i = { x: Array(dims).fill(ez[2]), y: Array(dims).fill(ez[3]) };
      }
      return key;
    }),
  };
}

// Path SVG → shape do Lottie (vértices + tangentes relativas)
function shape(name) {
  const segs = S.parsePath(S.PATHS[name]);
  const n = segs.length;
  const v = segs.map((s) => s.from);
  const inT = v.map(() => [0, 0]);
  const outT = v.map(() => [0, 0]);
  segs.forEach((s, k) => {
    if (s.type !== 'C') return;
    outT[k] = [s.c1[0] - s.from[0], s.c1[1] - s.from[1]];
    inT[(k + 1) % n] = [s.c2[0] - s.to[0], s.c2[1] - s.to[1]];
  });
  return { ty: 'sh', nm: 'path', ks: stat({ c: true, v, i: inT, o: outT }) };
}

const transformGroup = () => ({ ty: 'tr', nm: 'transform', p: stat([0, 0]), a: stat([0, 0]), s: stat([100, 100]), r: stat(0), o: stat(100), sk: stat(0), sa: stat(0) });
const ks = (over = {}) => ({ o: stat(100), r: stat(0), p: stat([0, 0, 0]), a: stat([0, 0, 0]), s: stat([100, 100, 100]), ...over });
const layer = (ind, ty, nm, extra) => ({ ddd: 0, ind, ty, nm, sr: 1, ao: 0, ip: 0, op: OP, st: 0, bm: 0, ...extra });

const CAM = 1;
const layers = [];

// Câmera: âncora e escala animadas, todas as camadas da marca são filhas dela
layers.push(layer(CAM, 3, 'câmera', {
  ks: ks({
    a: anim('cam.anchor', (v) => [v[0], v[1], 0]),
    p: stat([C, C, 0]),
    s: anim('cam.scale', (v) => [v * 100, v * 100, 100]),
  }),
}));

// Giro do v da marca: gira em torno do centro do v, as duas hastes são filhas dele
const GIRO = 2;
layers.push(layer(GIRO, 3, 'v · giro', {
  parent: CAM,
  ks: ks({
    a: stat([...S.V_PIVOT, 0]),
    p: stat([...S.V_PIVOT, 0]),
    r: anim('v.rot'),
  }),
}));

let ind = 3;
for (const k of [...S.LETTERS].reverse()) {
  layers.push(layer(ind++, 4, S.NAMES[k], {
    parent: CAM,
    ks: ks({ o: anim(`${k}.o`, (v) => v * 100), p: anim(`${k}.x`, (v) => [v, 0, 0]) }),
    shapes: [{ ty: 'gr', nm: k, it: [shape(k), { ty: 'fl', nm: 'cor', c: stat(rgba(S.COLORS.mark)), o: stat(100), r: 1, bm: 0 }, transformGroup()] }],
  }));
}

// Contorno de uma haste de um dos v da assinatura, desenhado pelo trim
const outline = (key, k, opacity) => ({
  ty: 'gr', nm: `${S.STEMS[k]} · contorno`, it: [
    shape(k),
    { ty: 'tm', nm: 'trim', s: stat(0), e: anim(`${key}.${k}.trim`, (v) => v * 100), o: stat(0), m: 1 },
    { ty: 'st', nm: 'traço', c: stat(rgba(S.COLORS.mark)), o: opacity, w: stat(S.STROKE_W), lc: 2, lj: 2, ml: 4, bm: 0 },
    transformGroup(),
  ],
});

// v da marca: contorno, depois preenchimento; gira com o null "v · giro"
for (const k of ['vLong', 'vShort']) {
  layers.push(layer(ind++, 4, S.NAMES[k], {
    parent: GIRO,
    ks: ks(),
    shapes: [
      outline('v', k, anim('v.stroke', (v) => v * 100)),
      {
        ty: 'gr', nm: 'preenchimento', it: [
          shape(k),
          { ty: 'fl', nm: 'cor', c: stat(rgba(S.COLORS.mark)), o: anim('v.fill', (v) => v * 100), r: 1, bm: 0 },
          transformGroup(),
        ],
      },
    ],
  }));
}

// v de cima e v de baixo: só contorno, posicionados como no ícone, somem com a entrada do logotipo
for (const p of S.ICON_VS.filter((p) => p.key !== 'v')) {
  layers.push(layer(ind++, 4, p.name, {
    parent: CAM,
    ks: ks({
      a: stat([...S.V_PIVOT, 0]),
      p: stat([S.V_PIVOT[0] + p.off[0], S.V_PIVOT[1] + p.off[1], 0]),
      r: stat(p.rot),
      o: anim('outlines.o', (v) => v * 100),
    }),
    shapes: ['vLong', 'vShort'].map((k) => outline(p.key, k, stat(100))),
  }));
}

// Anel: sai do centro do v da marca, em unidades do logotipo (filho da câmera)
layers.push(layer(ind++, 4, 'anel', {
  parent: CAM,
  ks: ks({ p: stat([...S.V_PIVOT, 0]) }),
  shapes: [{
    ty: 'gr', nm: 'anel', it: [
      { ty: 'el', nm: 'círculo', p: stat([0, 0]), s: anim('ring.r', (v) => [v * 2, v * 2]), d: 1 },
      { ty: 'st', nm: 'traço', c: stat(rgba(S.COLORS.ring)), o: anim('ring.o', (v) => v * 100), w: anim('ring.w'), lc: 2, lj: 2, ml: 4, bm: 0 },
      transformGroup(),
    ],
  }],
}));

const lottie = {
  v: '5.7.4', fr: FR, ip: 0, op: OP, w: S.STAGE, h: S.STAGE, nm: 'Victa · splash', ddd: 0,
  meta: { g: 'splash-victa/scripts/build-lottie.js' },
  assets: [], layers, markers: [],
};

const out = path.resolve(__dirname, '..', 'dist', 'victa-splash.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(lottie));
console.log(`${path.relative(process.cwd(), out)} · ${OP} frames a ${FR} fps · ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
