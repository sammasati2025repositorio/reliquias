// =====================================================================
//  MÚSICA — Reliquias
//  Todo lo de arriba (MUSICA) es editable. El motor de síntesis está abajo
//  y no hace falta tocarlo.
//
//  Cómo se escribe una partitura (cada compás es un texto):
//    D4        nota Re de la 4.ª octava, dura 1 unidad (una corchea si division = 8)
//    D4.3      la misma nota, dura 3 unidades
//    Eb4  F#4  bemol (b) y sostenido (#)
//    -   -.4   silencio de 1 unidad / de 4 unidades
//    D3+A3     acorde: el koto lo rasguea de grave a agudo
//    A4^       oshide: tras pulsar, el músico aprieta la cuerda y sube medio tono
//    G4^^      igual, pero sube un tono entero
//    D5~       vibrato al final de la nota
//    D4!       nota acentuada (más fuerte)
//    x  X      golpe flojo / fuerte (solo para percusión: taiko, kane)
//  Cada compás debe sumar 'division' unidades (8 en la aldea, 16 en el dojo).
//  Instrumentos: koto, shamisen, taiko, kane.
// =====================================================================
const MUSICA = {

  // Qué tema suena en cada momento del juego ('' = silencio)
  fases: { aldea: 'aldea', menu: 'aldea', jugando: 'dojo', pausa: 'dojo', finRonda: 'dojo', fin: 'aldea', fruta: 'aldea' },

  fundido: 1.5,      // segundos del cambio suave entre temas
  humano: 1,         // 0 = exacto como una máquina, 1 = pequeñas imprecisiones de músico

  // ------------------------------------------------------------------
  //  LA ALDEA DEL CEREZO DORMIDO
  //  Modo miyako-bushi en Re (Re, Mi♭, Sol, La, Si♭): el color de koto clásico.
  //  Forma A-B-A': el koto canta, el shamisen contesta en los silencios.
  // ------------------------------------------------------------------
  aldea: {
    tempo: 70, division: 8,
    reverb: 0.32, viento: 0.025,
    voces: [
      { // Koto, voz cantante
        instrumento: 'koto', volumen: 1.0, pan: -0.15,
        compases: [
          // A — pregunta tranquila
          'A4.3 Bb4 A4.2 G4.2',
          'D5.4~ -.4',
          'Bb4.2 A4 G4 Eb4.2 D4.2',
          'A4.4^ -.4',
          'D5 Eb5 D5 Bb4 A4.2 G4.2',
          'A4.2 Bb4.2 D5.4~',
          'Eb5.2 D5 Bb4 A4.2 G4 Eb4',
          'D4.6~ -.2',
          // B — se abre, sube al registro agudo
          'D5+A5.2 G5 A5 Bb5.2 A5.2',
          'G5.2 Eb5 D5 Eb5.4~',
          'D5.2 Bb4 A4 G4.2 A4.2^',
          'D5.8~',
          // A' — vuelve, más resignado
          'A4.3 Bb4 D5.2 Eb5.2',
          'D5.2 Bb4.2 A4.4^',
          'G4 A4 Bb4 A4 G4.2 Eb4.2',
          'D4.4~ -.4'
        ]
      },
      { // Koto grave: rasgueos y octavas que sostienen la armonía
        instrumento: 'koto', volumen: 0.3, pan: 0.15, oscuro: true,
        compases: [
          'D3+A3+D4.3 A3 D4.2 A3.2',
          'D3+A3+D4.3 A3 D4.2 A3.2',
          'G2+D3+G3.3 D3 G3.2 D3.2',
          'D3+A3+D4.3 A3 D4.2 A3.2',
          'Bb2+D3+Bb3.3 D3 Bb3.2 D3.2',
          'D3+A3+D4.3 A3 D4.2 A3.2',
          'Eb3+Bb3+Eb4.3 Bb3 G3.2 Eb3.2',
          'D3+A3+D4.4 -.4',
          'D3+A3.2 A3 D4 A3 D4 A3.2',
          'Eb3+Bb3.2 Bb3 Eb4 Bb3 Eb4 Bb3.2',
          'G2+D3.2 D3 G3 D3 G3 A3.2',
          'D3+A3+D4.4 A3.2 D3.2',
          'D3+A3+D4.3 A3 D4.2 A3.2',
          'G2+D3+G3.3 D3 G3.2 D3.2',
          'Eb3+Bb3+Eb4.3 Bb3 G3.2 Eb3.2',
          'D3+A3+D4.4 -.4'
        ]
      },
      { // Shamisen: contesta cuando el koto respira
        instrumento: 'shamisen', volumen: 0.45, pan: 0.35,
        compases: [
          '-.8',
          '-.4 G4 A4 D5.2^',
          '-.8',
          '-.4 Eb4 D4 A3 D4',
          '-.8',
          '-.8',
          '-.8',
          '-.5 A3 Bb3 A3',
          'D3! - A3 D4 - A3 D4 A3',
          'Eb3! - Bb3 Eb4 - Bb3 Eb4 Bb3',
          'G3! - D4 G4 - D4 G4 D4',
          'D3! - A3 D4 A4 D4 A3 D3',
          '-.8',
          '-.4 G4 A4 Bb4 A4',
          '-.8',
          '-.4 A3 Bb3 D4 Eb4'
        ]
      }
    ]
  },

  // ------------------------------------------------------------------
  //  EL DOJO — tensión y persecución
  // ------------------------------------------------------------------
  dojo: {
    tempo: 112, division: 16,
    reverb: 0.18, viento: 0,
    voces: [
      { instrumento: 'taiko', volumen: 0.95, pan: 0,
        compases: [
          'X.4 x.2 x.2 X.3 x.1 x.4',
          'X.4 x.2 x.2 X.3 x.1 x.2 x.2',
          'X.4 x.2 x.2 X.3 x.1 x.4',
          'X.2 x.2 X.2 x.2 X x x x X.4'
        ] },
      { instrumento: 'kane', volumen: 1.3, pan: 0.3,
        compases: [
          '- x - x - x - x - x - x - x - x',
          '- x - x - x - x - x - x - x - x',
          '- x - x - x - x - x - x - x - x',
          '- x - x - x - x - x x x - x x x'
        ] },
      { instrumento: 'shamisen', volumen: 0.7, pan: -0.25,
        compases: [
          'D4! D4 - D5 - D4 Eb4 - D4 - A3 - Bb3.2 A3.2',
          'D4! D4 - D5 - D4 Eb4 - G4 - A4 - Bb4.2 A4.2',
          'G4! G4 - G5 - G4 A4 - Bb4 - A4 - G4.2 Eb4.2',
          'D4 Eb4 D4 Bb3 A3 Bb3 A3 G3 D4!.8'
        ] },
      { instrumento: 'koto', volumen: 0.6, pan: 0.15, oscuro: true,
        compases: [
          'D2.3 D2 -.2 D2.2 -.2 A1.2 D2.2 Eb2.2',
          'D2.3 D2 -.2 D2.2 -.2 A1.2 D2.2 Eb2.2',
          'G1.3 G1 -.2 G1.2 -.2 D2.2 G2.2 A2.2',
          'D2.3 D2 -.2 D2.2 Bb1.2 A1.2 G1.2 A1.2'
        ] }
    ]
  }
};

// =====================================================================
//  MOTOR DE SÍNTESIS (no hace falta tocarlo)
//  Las cuerdas usan Karplus-Strong: una cuerda virtual que vibra y se apaga
//  sola. Cada tema se calcula una vez entero y luego suena en bucle sin cortes.
// =====================================================================
const Musica = (function () {
  const TAU = Math.PI * 2;

  // --- lectura de partituras ---
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function frecuencia(nombre) {
    const m = /^([A-G])(b|#)?(-?\d)$/.exec(nombre);
    if (!m) return 0;
    const midi = 12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function leerVoz(voz, unidad, division, avisos) {
    const eventos = []; let t = 0;
    voz.compases.forEach((compas, ci) => {
      let suma = 0;
      for (const tok of compas.trim().split(/\s+/)) {
        const mods = tok.replace(/[^~^!]/g, '');
        const m = /^([^.]+?)(?:\.(\d+))?$/.exec(tok.replace(/[~^!]/g, ''));
        if (!m) continue;
        const dur = m[2] ? +m[2] : 1;
        let cuerpo = m[1] + mods.replace(/~/g, '').replace(/\^/g, '') + (mods.includes('~') ? '~' : '') + mods.replace(/[^^]/g, '');
        if (cuerpo !== '-') {
          const hum = MUSICA.humano || 0;
          const ev = { t: Math.max(0, t + suma * unidad + azar() * 0.012 * hum), dur: dur * unidad, vel: 0.8 * (1 + azar() * 0.12 * hum), sube: 0, vib: false };
          if (cuerpo.includes('!')) { ev.vel = 1.05; cuerpo = cuerpo.replace(/!/g, ''); }
          if (cuerpo.endsWith('~')) { ev.vib = true; cuerpo = cuerpo.slice(0, -1); }
          const s = /\^+$/.exec(cuerpo); if (s) { ev.sube = s[0].length; cuerpo = cuerpo.slice(0, -s[0].length); }
          if (cuerpo === 'x' || cuerpo === 'X') { ev.golpe = true; ev.vel = cuerpo === 'X' ? 1 : 0.55; }
          else { ev.frecs = cuerpo.split('+').map(frecuencia).filter(f => f > 0); if (!ev.frecs.length) { avisos.push('Nota rara "' + tok + '"'); continue; } }
          eventos.push(ev);
        }
        suma += dur;
      }
      if (suma !== division) avisos.push(voz.instrumento + ', compás ' + (ci + 1) + ': suma ' + suma + ' y debería sumar ' + division);
      t += division * unidad;
    });
    return eventos;
  }

  // --- ruido determinista (el tema suena siempre igual) ---
  let semilla = 1;
  const azar = () => { semilla = (semilla * 1664525 + 1013904223) >>> 0; return semilla / 2147483648 - 1; };

  // --- cuerda Karplus-Strong con tono variable ---
  // op: { brillo 0-1, t60 s, posicion 0-1, sube semitonos, vib, dur }
  function cuerda(sr, f, largo, op) {
    const y = new Float32Array(largo);
    const N0 = sr / f, P = Math.max(2, Math.floor(N0));
    // excitación: ruido suavizado y filtrado por la posición del púa
    const exc = new Float32Array(P);
    let lp = 0; const a = 0.15 + op.brillo * 0.85;
    for (let i = 0; i < P; i++) { lp += a * (azar() - lp); exc[i] = lp; }
    const pp = Math.max(1, Math.floor(P * op.posicion));
    for (let i = P - 1; i >= pp; i--) exc[i] -= exc[i - pp];
    const g = Math.pow(0.001, 1 / (op.t60 * f));
    const S = 0.5 + op.brillo * 0.45;
    const tBend = Math.min(op.dur * 0.35, 0.28) * sr, rBend = 0.11 * sr;
    const subida = Math.pow(2, op.sube / 12) - 1;
    const tVib = op.dur * 0.45 * sr;
    let prev = 0;
    for (let n = 0; n < largo; n++) {
      let r = 1;
      if (op.sube) r += subida * Math.min(1, Math.max(0, (n - tBend) / rBend));
      if (op.vib && n > tVib) r *= 1 + 0.006 * Math.min(1, (n - tVib) / (0.3 * sr)) * Math.sin(TAU * 5.2 * n / sr);
      const pos = n - N0 / r;
      let v = 0;
      if (pos >= 1) { const i = pos | 0, fr = pos - i; v = y[i] * (1 - fr) + y[i + 1] * fr; }
      const fil = S * v + (1 - S) * prev; prev = v;
      y[n] = (n < P ? exc[n] : 0) + g * fil;
    }
    return y;
  }

  // --- instrumentos: cada uno escribe en su pista (con vuelta al inicio = bucle) ---
  function sumar(pista, sonido, inicio, vol) {
    const L = pista.length;
    for (let i = 0; i < sonido.length; i++) pista[(inicio + i) % L] += sonido[i] * vol;
  }
  function apagar(s, sr, desde) {
    const fin = Math.min(s.length, desde + Math.floor(0.08 * sr));
    for (let i = desde; i < s.length; i++) s[i] *= i < fin ? 1 - (i - desde) / (fin - desde) : 0;
  }

  const INSTRUMENTOS = {
    koto(sr, ev, voz) {
      const out = []; const t60 = voz.oscuro ? 2.6 : 3.2;
      ev.frecs.forEach((f, k) => {
        const largo = Math.floor(Math.min(4, Math.max(ev.dur + 0.6, t60 * (f > 600 ? 0.6 : 0.9))) * sr);
        const s = cuerda(sr, f, largo, { brillo: voz.oscuro ? 0.45 : 0.72, t60, posicion: 0.13, sube: ev.sube, vib: ev.vib, dur: ev.dur });
        // clic de la uña (tsume)
        for (let i = 0; i < 90 && i < s.length; i++) s[i] += azar() * 0.25 * (1 - i / 90);
        out.push({ s, retardo: k * 0.032 }); // rasgueo de grave a agudo
      });
      return out;
    },
    shamisen(sr, ev) {
      const f = ev.frecs[0];
      const sono = Math.max(0.22, ev.dur * 1.4) + 0.1;
      const largo = Math.floor((sono + 0.1) * sr);
      const s = cuerda(sr, f, largo, { brillo: 0.92, t60: 1.1, posicion: 0.08, sube: ev.sube, vib: ev.vib, dur: ev.dur });
      // sawari: el zumbido metálico característico (saturación suave)
      for (let i = 0; i < largo; i++) { const x = s[i] * 2.2; s[i] = 0.55 * s[i] + 0.45 * Math.tanh(x) / 1.2; }
      // golpe del bachi sobre la piel
      for (let i = 0; i < Math.floor(0.07 * sr) && i < largo; i++) {
        const tt = i / sr, env = Math.exp(-tt * 55);
        s[i] += (Math.sin(TAU * 165 * tt) * 0.55 + azar() * 0.35 * Math.exp(-tt * 400)) * env;
      }
      apagar(s, sr, Math.floor(sono * sr));
      return [{ s, retardo: 0 }];
    },
    taiko(sr, ev) {
      const largo = Math.floor(0.7 * sr), s = new Float32Array(largo);
      let fase = 0, lp = 0;
      for (let i = 0; i < largo; i++) {
        const tt = i / sr, f = 58 + 75 * Math.exp(-tt * 22);
        fase += TAU * f / sr;
        lp += 0.08 * (azar() - lp);
        s[i] = (Math.sin(fase) * Math.exp(-tt * 6) + lp * 1.6 * Math.exp(-tt * 30)) * ev.vel;
      }
      return [{ s, retardo: 0 }];
    },
    kane(sr, ev) {
      const largo = Math.floor(0.18 * sr), s = new Float32Array(largo);
      let prev = 0;
      for (let i = 0; i < largo; i++) {
        const tt = i / sr, n = azar(), hp = n - prev; prev = n;
        s[i] = ((Math.sin(TAU * 3150 * tt) + 0.7 * Math.sin(TAU * 4720 * tt) + 0.5 * Math.sin(TAU * 6230 * tt)) * 0.25 * Math.exp(-tt * 28) + hp * 0.3 * Math.exp(-tt * 90)) * ev.vel;
      }
      return [{ s, retardo: 0 }];
    }
  };

  // --- ecualizador (biquad) para dar cuerpo de madera ---
  function picoEQ(x, sr, f0, gananciaDb, q) {
    const A = Math.pow(10, gananciaDb / 40), w = TAU * f0 / sr, al = Math.sin(w) / (2 * q), c = Math.cos(w);
    const b0 = 1 + al * A, b1 = -2 * c, b2 = 1 - al * A, a0 = 1 + al / A, a1 = -2 * c, a2 = 1 - al / A;
    const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const xi = x[i], yi = B0 * xi + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
      x2 = x1; x1 = xi; y2 = y1; y1 = yi; x[i] = yi;
    }
  }

  // --- reverb tipo sala de madera (Schroeder), en bucle sin costuras ---
  function reverb(L, R, sr, cantidad) {
    if (cantidad <= 0) return;
    const k = sr / 44100;
    const peines = [1116, 1188, 1277, 1356, 1422, 1491];
    const todos = [556, 441, 341];
    const procesar = (entrada, extra) => {
      const out = new Float32Array(entrada.length);
      const cs = peines.map(p => ({ b: new Float32Array(Math.floor((p + extra) * k)), i: 0, lp: 0 }));
      const as = todos.map(p => ({ b: new Float32Array(Math.floor((p + extra) * k)), i: 0 }));
      // 1.ª pasada: solo los últimos 3 s, para que la cola del final entre al principio del bucle
      const calentar = Math.max(0, entrada.length - Math.floor(3 * sr));
      for (let pasada = 0; pasada < 2; pasada++) for (let n = pasada ? 0 : calentar; n < entrada.length; n++) {
        const x = entrada[n] * 0.12; let s = 0;
        for (const c of cs) { const v = c.b[c.i]; c.lp = v * 0.75 + c.lp * 0.25; c.b[c.i] = x + c.lp * 0.86; c.i = (c.i + 1) % c.b.length; s += v; }
        for (const a of as) { const v = a.b[a.i]; const o = -s + v; a.b[a.i] = s + v * 0.5; a.i = (a.i + 1) % a.b.length; s = o; }
        if (pasada) out[n] = s;
      }
      return out;
    };
    const rl = procesar(L, 0), rr = procesar(R, 23);
    for (let i = 0; i < L.length; i++) { L[i] += rl[i] * cantidad; R[i] += rr[i] * cantidad; }
  }

  // --- calcula un tema entero → { L, R, avisos } ---
  function calcular(tema, sr) {
    semilla = 12345;
    const unidad = 60 / tema.tempo * 4 / tema.division;
    const compases = Math.max(...tema.voces.map(v => v.compases.length));
    const largo = Math.floor(compases * tema.division * unidad * sr);
    const L = new Float32Array(largo), R = new Float32Array(largo), avisos = [], energias = [];
    for (const voz of tema.voces) {
      const inst = INSTRUMENTOS[voz.instrumento];
      if (!inst) { avisos.push('Instrumento desconocido: ' + voz.instrumento); continue; }
      const pista = new Float32Array(largo);
      for (const ev of leerVoz(voz, unidad, tema.division, avisos))
        for (const p of inst(sr, ev, voz)) sumar(pista, p.s, Math.floor((ev.t + p.retardo) * sr), ev.vel);
      if (voz.instrumento === 'koto') { picoEQ(pista, sr, 240, 3, 1.2); picoEQ(pista, sr, 2800, 2, 1.5); }
      if (voz.instrumento === 'shamisen') picoEQ(pista, sr, 1900, 4, 2);
      const pan = Math.max(-1, Math.min(1, voz.pan || 0)), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
      const vol = voz.volumen == null ? 1 : voz.volumen;
      let en = 0; for (let i = 0; i < largo; i++) { L[i] += pista[i] * vol * gl; R[i] += pista[i] * vol * gr; const v = pista[i] * vol; en += v * v; }
      energias.push(voz.instrumento + ' ' + Math.sqrt(en / largo).toFixed(3));
    }
    // viento suave entre los árboles
    if (tema.viento > 0) {
      let a = 0, b = 0; const periodo = largo / 4;
      for (let i = 0; i < largo; i++) {
        const env = 0.55 + 0.45 * Math.sin(TAU * i / periodo);
        a += 0.012 * (azar() - a); b += 0.012 * (azar() - b);
        L[i] += a * tema.viento * 6 * env; R[i] += b * tema.viento * 6 * env;
      }
    }
    reverb(L, R, sr, tema.reverb);
    // volumen: se iguala la energía y se suavizan los picos de las púas
    let e = 0; for (let i = 0; i < largo; i++) e += L[i] * L[i] + R[i] * R[i];
    const rms = Math.sqrt(e / (2 * largo)) || 1, k = 0.14 / rms;
    for (let i = 0; i < largo; i++) { L[i] = Math.tanh(L[i] * k * 1.1) * 0.9; R[i] = Math.tanh(R[i] * k * 1.1) * 0.9; }
    return { L, R, avisos, energias };
  }

  // --- reproducción en el navegador ---
  let ctx = null, salida = null, actual = '', fuente = null, ganancia = null, mudo = false;
  const cache = {};
  function contexto() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC(); salida = ctx.createGain(); salida.connect(ctx.destination);
    const despertar = () => { if (ctx.state !== 'running') ctx.resume(); };
    ['pointerdown', 'touchstart', 'keydown'].forEach(e => window.addEventListener(e, despertar, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else ctx.resume(); });
    return ctx;
  }
  function volumen() { const s = (typeof CONFIG !== 'undefined' && CONFIG.sonido) || {}; return s.activado === false || mudo ? 0 : (s.musica == null ? 0.5 : s.musica); }
  function buffer(nombre) {
    if (cache[nombre]) return cache[nombre];
    const tema = MUSICA[nombre]; if (!tema) return null;
    const sr = Math.min(ctx.sampleRate, 32000); // calcular a 32 kHz es la mitad de rápido y suena igual de bien
    const r = calcular(tema, sr);
    if (r.avisos.length) console.warn('[Música] ' + nombre + ':\n' + r.avisos.join('\n'));
    const b = ctx.createBuffer(2, r.L.length, sr);
    b.getChannelData(0).set(r.L); b.getChannelData(1).set(r.R);
    return (cache[nombre] = b);
  }
  function poner(nombre) {
    if (nombre === actual) return;
    actual = nombre;
    if (!contexto()) return;
    const t = ctx.currentTime, fd = MUSICA.fundido || 1;
    if (fuente) { const f = fuente, g = ganancia; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fd); try { f.stop(t + fd + 0.05); } catch (e) { } fuente = null; }
    if (!nombre) return;
    const b = buffer(nombre); if (!b) return;
    fuente = ctx.createBufferSource(); fuente.buffer = b; fuente.loop = true;
    ganancia = ctx.createGain(); ganancia.gain.setValueAtTime(0, t); ganancia.gain.linearRampToValueAtTime(1, t + fd);
    fuente.connect(ganancia); ganancia.connect(salida); fuente.start(t);
    // prepara los demás temas sin prisa, para que el cambio no se note
    setTimeout(() => { for (const k in MUSICA) if (MUSICA[k] && MUSICA[k].voces) buffer(k); }, 2500);
  }
  // El motor llama a esto en cada fotograma
  function ajustar(fase, silencio) {
    mudo = !!silencio;
    poner((MUSICA.fases || {})[fase] || '');
    if (salida) salida.gain.setTargetAtTime(volumen(), ctx.currentTime, 0.1);
  }
  function recargar() { for (const k in cache) delete cache[k]; const a = actual; actual = null; poner(a); }

  return { ajustar, poner, recargar, calcular, get actual() { return actual; } };
})();

if (typeof module !== 'undefined') module.exports = { MUSICA, Musica };
