// Linha do tempo da splash Victa — fonte única da animação.
// A prévia (index.html), os frames do Figma e o Lottie (scripts/build-lottie.js) saem daqui.
// Funciona no navegador (window.VictaSplash), no Node (require) e no plugin do Figma (globalThis).
// Coordenadas da marca em "unidades do logotipo" (viewBox do componente Marca / logotipo, node 91:2).
(function (root) {
  const COLORS = {
    bg: '#42CF00',   // semantico/surface-brand
    mark: '#00512A', // semantico/text-on-brand
    ring: '#C5F167', // semantico/brand-neon
  };

  // O "v" do logotipo é o próprio isotipo: haste longa + haste curta.
  // A haste curta foi reescrita para começar no canto de cima, assim as duas
  // hastes são contornadas de cima para baixo.
  const PATHS = {
    vLong: 'M96.1056 32.937C92.4552 41.3953 88.8047 49.8534 85.1543 58.3116C84.1273 60.7097 83.1003 63.1076 82.0732 65.5056C81.712 66.3857 81.184 67.6639 80.5328 69.2116C79.716 71.1525 79.5511 71.5079 79.3307 71.9026C79.3307 71.9026 78.2951 74.046 75.9818 75.6354C72.4786 78.0421 68.3528 77.9791 63.709 78.0212C64.8276 75.2875 81.4994 34.4171 82.1268 32.937H96.1056Z',
    vShort: 'M41.9185 32.9196H50.6341C52.3638 32.9196 53.9452 33.8878 54.7186 35.4203L66.2144 58.4134C66.7115 59.3984 65.9884 60.5573 64.8768 60.5573H53.6637L40.5871 35.0753C40.0782 34.0898 40.801 32.9196 41.9185 32.9196Z',
    i: 'M100.071 73.724V32.9354H107.938C110.416 32.9354 112.424 34.9251 112.424 37.3794V78.0196H104.407C102.013 78.0196 100.071 76.0965 100.071 73.724Z',
    c: 'M141.357 68.1654C150.056 68.0973 147.085 60.9418 151.006 60.6297C151.006 60.6298 160.927 60.6298 160.927 60.6298C160.43 73.1293 152.522 78.9226 139.861 78.4058C124.221 78.7209 118.377 69.7127 118.731 55.4771C118.379 41.247 124.219 32.2318 139.862 32.5492C152.678 32.0775 160.363 37.666 160.927 50.325H152.122C150.522 50.325 149.125 49.2936 148.616 47.7908C147.661 44.4805 144.677 42.6283 141.357 42.7896C139.743 42.7938 137.775 42.6959 136.253 43.2726C130.082 45.8917 130.595 56.3838 131.799 61.8859C133.138 67.1185 136.41 68.54 141.357 68.1654Z',
    t: 'M201.692 32.871V39.4247C201.692 41.4609 200.025 43.1117 197.97 43.1117H188.949V77.9552H176.595V43.1117H163.852V32.871H201.692Z',
    a: 'M227.698 72.468V43.2405C226.311 43.4559 225.163 44.2498 224.253 45.6234C223.924 46.0866 211.28 76.2235 210.469 78.0198H196.49C197.959 74.8008 204.492 59.286 209.053 48.7197C210.971 44.2775 212.528 40.1575 213.234 39.1278C214.21 37.5396 215.347 36.6298 216.535 35.6397C219.378 33.2711 223.808 32.8484 228.419 32.8058C232.537 32.7676 236.819 33.0006 239.922 32.9354V78.0198H227.698V74.8357Z',
  };
  const NAMES = { vLong: 'v · haste longa', vShort: 'v · haste curta', i: 'i', c: 'c', t: 't', a: 'a' };
  const STEMS = { vLong: 'haste longa', vShort: 'haste curta' };
  const V_PARTS = ['vShort', 'vLong'];
  const LETTERS = ['i', 'c', 't', 'a'];

  const DURATION = 2800; // ms
  const FPS = 30;        // frames exportados para o Figma
  const STAGE = 400;     // lado do quadro do Lottie (pt), centralizado na tela
  const STROKE_W = 2.25; // espessura do contorno em unidades do logotipo (= traço de 17 px do ícone de 1024)
  const V_PIVOT = [68.35, 55.46]; // centro do v, eixo dos giros

  // Assinatura do isotipo (ícone do app): três v com as hastes do logotipo.
  // `off` desloca o centro em relação ao v da marca, `rot` gira em torno do centro (graus).
  // Só o v da marca (`v`) preenche e desvira; os outros dois ficam em contorno e somem com a entrada do logotipo.
  // `delay` atrasa o desenho do contorno.
  const ICON_VS = [
    { key: 'vTop', name: 'v de cima', off: [34.9, -24.85], rot: 0, delay: 100 },
    { key: 'vBottom', name: 'v de baixo', off: [34.9, 29.26], rot: 180, delay: 200 },
    { key: 'v', name: 'v', off: [0, 0], delay: 0 },
  ];
  const ICON_CENTER = [88.32, 57.66]; // centro da assinatura (os três v), âncora inicial da câmera

  // Curvas cúbicas [x1, y1, x2, y2] — as mesmas viram o easing dos keyframes do Lottie
  const EASE = {
    linear: [0, 0, 1, 1],
    out: [0.33, 1, 0.68, 1],      // ease-out cubic
    inOut: [0.65, 0, 0.35, 1],    // ease-in-out cubic
    inOutSine: [0.37, 0, 0.63, 1],
  };

  // Keyframes: [tempo ms, valor, curva até o próximo keyframe]
  const TRACKS = {
    // 2 · só o v da marca preenche; o traço dele sai
    'v.fill': [[900, 0, EASE.out], [1200, 1]],
    'v.stroke': [[1100, 1, EASE.linear], [1300, 0]],
    // 3 · pulso de escala + anel neon saindo do v da marca (raio e traço em unidades do logotipo)
    'cam.scale': [[1150, 1.76, EASE.inOutSine], [1300, 1.883, EASE.inOutSine], [1450, 1.76, EASE.inOut], [2050, 0.9]],
    'ring.r': [[1150, 25, EASE.out], [1750, 92]], // 92: maior raio que ainda cabe no quadro do Lottie
    'ring.w': [[1150, 3.4, EASE.out], [1750, 0.75]],
    'ring.o': [[1100, 0, EASE.linear], [1150, 0.9, EASE.linear], [1750, 0]],
    // 4 · câmera: da assinatura do ícone ao logotipo (180 pt de largura)
    'cam.anchor': [[1450, ICON_CENTER, EASE.inOut], [2050, [140.26, 55.48]]],
    // o v da marca começa virado como no ícone (−90°, apontando para a direita) e desvira com a entrada do logotipo;
    // os dois v em contorno somem ao mesmo tempo
    'v.rot': [[1450, -90, EASE.inOut], [1850, 0]],
    'outlines.o': [[1450, 1, EASE.out], [1650, 0]],
  };
  // 1 · contorno: os três v são desenhados como traço, haste longa primeiro
  ICON_VS.forEach(({ key, delay }) => {
    TRACKS[`${key}.vLong.trim`] = [[150 + delay, 0, EASE.inOut], [850 + delay, 1]];
    TRACKS[`${key}.vShort.trim`] = [[300 + delay, 0, EASE.inOut], [950 + delay, 1]];
  });
  // 5 · letras "icta" saem de trás do v, uma a cada 80 ms
  LETTERS.forEach((k, n) => {
    const s = 1600 + n * 80;
    TRACKS[`${k}.o`] = [[s, 0, EASE.out], [s + 420, 1]];
    TRACKS[`${k}.x`] = [[s, -14, EASE.out], [s + 420, 0]];
  });

  // ---------- easing (cubic-bezier, igual ao CSS / After Effects) ----------
  const easeCache = new Map();
  function easeFn(e) {
    const key = e.join(',');
    if (easeCache.has(key)) return easeCache.get(key);
    const [x1, y1, x2, y2] = e;
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dsx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    const fn = (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const err = sx(t) - x;
        if (Math.abs(err) < 1e-7) return sy(t);
        const d = dsx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      let lo = 0, hi = 1;
      t = x;
      for (let i = 0; i < 40; i++) {
        if (sx(t) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
    easeCache.set(key, fn);
    return fn;
  }

  function value(track, t) {
    const kfs = TRACKS[track];
    if (t <= kfs[0][0]) return kfs[0][1];
    for (let k = 0; k < kfs.length - 1; k++) {
      const [t0, v0, e] = kfs[k];
      const [t1, v1] = kfs[k + 1];
      if (t <= t1) {
        const p = easeFn(e || EASE.linear)((t - t0) / (t1 - t0));
        return Array.isArray(v0) ? v0.map((x, j) => x + (v1[j] - x) * p) : v0 + (v1 - v0) * p;
      }
    }
    return kfs[kfs.length - 1][1];
  }

  // ---------- paths: leitura e traço parcial (trim) ----------
  // Os paths só usam comandos absolutos M, L, H, V, C, Z e têm um subpath fechado cada.
  function parsePath(d) {
    const tok = d.match(/[MLHVCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
    const segs = [];
    let i = 0, cmd = null, cur = [0, 0], start = [0, 0];
    const num = () => parseFloat(tok[i++]);
    while (i < tok.length) {
      if (/[A-Z]/i.test(tok[i])) cmd = tok[i++].toUpperCase();
      if (cmd === 'M') { cur = [num(), num()]; start = cur.slice(); cmd = 'L'; continue; }
      if (cmd === 'Z') {
        if (Math.hypot(cur[0] - start[0], cur[1] - start[1]) > 1e-3) segs.push({ type: 'L', from: cur, to: start.slice() });
        cur = start.slice();
        continue;
      }
      let to;
      if (cmd === 'L') to = [num(), num()];
      else if (cmd === 'H') to = [num(), cur[1]];
      else if (cmd === 'V') to = [cur[0], num()];
      else if (cmd === 'C') {
        const c1 = [num(), num()], c2 = [num(), num()];
        to = [num(), num()];
        segs.push({ type: 'C', from: cur, c1, c2, to });
        cur = to;
        continue;
      } else throw new Error(`Comando de path não suportado: ${cmd}`);
      segs.push({ type: 'L', from: cur, to });
      cur = to;
    }
    return segs;
  }

  const flatCache = {};
  function flatten(name) {
    if (flatCache[name]) return flatCache[name];
    const segs = parsePath(PATHS[name]);
    const pts = [segs[0].from];
    for (const s of segs) {
      if (s.type === 'L') { pts.push(s.to); continue; }
      for (let k = 1; k <= 16; k++) {
        const u = k / 16, v = 1 - u;
        pts.push([0, 1].map((j) => v * v * v * s.from[j] + 3 * v * v * u * s.c1[j] + 3 * v * u * u * s.c2[j] + u * u * u * s.to[j]));
      }
    }
    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    return (flatCache[name] = { pts, cum, total: cum[cum.length - 1] });
  }

  const r3 = (n) => Math.round(n * 1000) / 1000;

  // Path aberto com a fração `e` do contorno, a partir do ponto inicial
  function trimmedD(name, e) {
    const { pts, cum, total } = flatten(name);
    const target = e * total;
    let d = `M${r3(pts[0][0])} ${r3(pts[0][1])}`;
    for (let k = 1; k < pts.length; k++) {
      if (cum[k] >= target) {
        const p = (target - cum[k - 1]) / (cum[k] - cum[k - 1] || 1);
        d += `L${r3(pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * p)} ${r3(pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * p)}`;
        break;
      }
      d += `L${r3(pts[k][0])} ${r3(pts[k][1])}`;
    }
    return d;
  }

  // ---------- estado e SVG de cada frame ----------
  function frameState(t) {
    const [ax, ay] = value('cam.anchor', t);
    const vs = {};
    for (const p of ICON_VS) {
      const main = p.key === 'v';
      vs[p.key] = {
        rot: main ? value('v.rot', t) : p.rot,
        o: main ? 1 : value('outlines.o', t),
        fill: main ? value('v.fill', t) : 0,
        stroke: main ? value('v.stroke', t) : 1,
        trim: { vShort: value(`${p.key}.vShort.trim`, t), vLong: value(`${p.key}.vLong.trim`, t) },
      };
    }
    const letters = {};
    for (const k of LETTERS) letters[k] = { o: value(`${k}.o`, t), dx: value(`${k}.x`, t) };
    return {
      cam: { ax, ay, s: value('cam.scale', t) },
      ring: { r: value('ring.r', t), w: value('ring.w', t), o: value('ring.o', t) },
      vs,
      letters,
    };
  }

  // SVG completo do frame (W × H em pt). `layers` lista os nomes das camadas da marca na ordem do SVG.
  function frameSVG(t, W, H) {
    const st = frameState(t);
    const { cam, ring } = st;
    const tx = W / 2 - cam.s * cam.ax;
    const ty = H / 2 - cam.s * cam.ay;
    const layers = [];
    const hasRing = ring.o > 0.001;
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    out += `<rect width="${W}" height="${H}" fill="${COLORS.bg}"/>`;
    out += `<g transform="matrix(${r3(cam.s)} 0 0 ${r3(cam.s)} ${r3(tx)} ${r3(ty)})">`;
    if (hasRing) {
      out += `<circle cx="${V_PIVOT[0]}" cy="${V_PIVOT[1]}" r="${r3(ring.r)}" fill="none" stroke="${COLORS.ring}" stroke-width="${r3(ring.w)}" opacity="${r3(ring.o)}"/>`;
    }
    // opacidade vai em cada path (e não no <g>) para sobreviver à importação no Figma
    for (const p of ICON_VS) {
      const V = st.vs[p.key];
      if (V.o <= 0.001) continue;
      out += `<g transform="translate(${p.off[0]} ${p.off[1]}) rotate(${r3(V.rot)} ${V_PIVOT[0]} ${V_PIVOT[1]})">`;
      for (const k of V_PARTS) {
        const name = `${p.name} · ${STEMS[k]}`;
        if (V.fill > 0.001) {
          out += `<path d="${PATHS[k]}" fill="${COLORS.mark}" opacity="${r3(V.fill)}"/>`;
          layers.push(name);
        }
        const trim = V.trim[k];
        if (trim > 0.001 && V.stroke * V.o > 0.001) {
          const d = trim >= 0.9999 ? PATHS[k] : trimmedD(k, trim);
          out += `<path d="${d}" fill="none" stroke="${COLORS.mark}" stroke-width="${STROKE_W}" stroke-linecap="round" stroke-linejoin="round" opacity="${r3(V.stroke * V.o)}"/>`;
          layers.push(`${name} · contorno`);
        }
      }
      out += '</g>';
    }
    for (const k of LETTERS) {
      const L = st.letters[k];
      if (L.o <= 0.001) continue;
      out += `<path d="${PATHS[k]}" fill="${COLORS.mark}" opacity="${r3(L.o)}" transform="translate(${r3(L.dx)} 0)"/>`;
      layers.push(NAMES[k]);
    }
    out += '</g></svg>';
    return { svg: out, layers, hasRing };
  }

  const api = { COLORS, PATHS, NAMES, V_PARTS, LETTERS, DURATION, FPS, STAGE, STROKE_W, V_PIVOT, ICON_VS, ICON_CENTER, STEMS, EASE, TRACKS, value, parsePath, frameState, frameSVG };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VictaSplash = api;
})(typeof window !== 'undefined' ? window : globalThis);
