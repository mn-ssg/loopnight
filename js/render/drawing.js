
  /* ================= 그리기 도구 ================= */
  const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const mod = (a, n) => ((a % n) + n) % n;
  function txt(s, x, y, color, size = 8, align = 'left', shadow = C.ink, font = F_PIX, weight = '700') {
    ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'top';
    if (shadow) { ctx.fillStyle = shadow; ctx.fillText(s, x + 1, y + 1); }
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  const num = (s, x, y, color, size = 8, align = 'left') => txt(s, x, y, color, size, align, C.ink, F_NUM, '400');
  // 뒷면 태그와 같은 칩 (RUNNER · 1 PLAYER)
  function chip(s, x, y, bg, fg = C.ink) {
    ctx.font = `700 8px ${F_PIX}`; const w = Math.ceil(ctx.measureText(s).width) + 10;
    R(C.ink, x + 2, y + 2, w, 13); R(C.ink, x - 1, y - 1, w + 2, 15); R(bg, x, y, w, 13);
    txt(s, x + 5, y + 2, fg, 8, 'left', null); return w;
  }
  // 한글은 표지 헤드라인처럼 1비트 픽셀 글자로 (Noto Sans KR Black/Bold)
  const KCACHE = new Map();
  function kimg(str, size, color, weight) {
    const key = str + '|' + size + '|' + color + '|' + weight;
    if (KCACHE.has(key)) return KCACHE.get(key);
    const font = `${weight} ${size}px "Noto Sans KR", sans-serif`;
    const m = document.createElement('canvas').getContext('2d'); m.font = font;
    const w = Math.ceil(m.measureText(str).width) + 4, h = size + 8;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.font = font; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(str, 1, 1);
    const src = g.getImageData(0, 0, w, h), out = g.createImageData(w, h);
    const n = parseInt(color.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    for (let i = 0; i < w * h; i++) if (src.data[i * 4 + 3] > 110) { out.data[i * 4] = r; out.data[i * 4 + 1] = gg; out.data[i * 4 + 2] = b; out.data[i * 4 + 3] = 255; }
    g.clearRect(0, 0, w, h); g.putImageData(out, 0, 0);
    KCACHE.set(key, c); return c;
  }
  function ktxt(str, x, y, color, size = 12, align = 'left', weight = 900) {
    const c = kimg(str, size, color, weight), s = kimg(str, size, C.ink, weight);
    const dx = Math.round(align === 'center' ? x - c.width / 2 : align === 'right' ? x - c.width : x);
    ctx.drawImage(s, dx + 1, Math.round(y) + 1); ctx.drawImage(c, dx, Math.round(y));
  }
  function dim(a, c = '#02060a') { ctx.globalAlpha = a; R(c, 0, 0, W, H); ctx.globalAlpha = 1; }
