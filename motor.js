// ============================================================
//  MOTOR.JS — la lógica del juego. No hace falta tocarlo:
//  todo lo editable está en config.js, niveles.js y assets/.
// ============================================================
(function () {
  'use strict';

  // ---------- utilidades ----------
  const PI = Math.PI, abs = Math.abs, floor = Math.floor, hypot = Math.hypot;
  const limita = (v, a, b) => Math.max(a, Math.min(b, v));
  const azar = (a, b) => a + Math.random() * (b - a);
  const difAng = (a, b) => { let d = a - b; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI; return d; };
  const hash = (x, y) => { let n = x * 374761393 + y * 668265263; n = (n ^ (n >> 13)) * 1274126177; return (n ^ (n >> 16)) >>> 0; };
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  // ---------- estado general ----------
  let cont, lienzo, ctx, g, ui, mandos, btnSprint, joyBase, joyPomo, btnLanzar, btnCambiar, lanzadas = [];
  let IW = 356, IH = 192, AH = 192, K = 1, vertical = false, T = 24;
  let fase = 'menu';            // menu | jugando | pausa | finRonda | fin
  let L = null;                 // nivel cargado
  let h = null;                 // ladrón
  let espectros = [], gemas = [], turbos = [], manchas = [], gotas = [];
  let ronda = 1, puntos = 0, tiempo = 0, dif = 'normal', mapaIni = 0, nivelActual = 0;
  let temblor = 0, destello = 0, aviso = { txt: '', t: 0 }, reloj = 0, ultimoTic = 0;
  let miedo = 0, susto = 0, sustoE = null, tLatido = 0;
  let portales = [], tp = null, jugador = '', racha = 0, entregadas = [];
  let zonaId = 'aldea', panelMundo = '', btnDiario, btnArte, btnMundo, guiaActual=null;
  const zona = () => MUNDO.zonas[zonaId];
  const dojo = () => (CONFIG.ambiente || {}).tema === 'dojo';
  const teclas = new Set();
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, sprint: false, ultimoToque: 0 };
  let sprintBoton = false, silencio = false, audio = null;
  const imagenes = {};
  const estampas = {};
  // v0.20: imagen reescalada una vez a su tamaño real en pantalla (las originales miden ~500 px y
  // se pintan a ~60). Reescalar en cada fotograma era la segunda causa del lag.
  const escaladas = new Map();
  // v0.38: sombra de contacto. Una mancha ancha y suave + un núcleo oscuro justo bajo los pies:
  // es lo que hace que un personaje parezca apoyado y no flotando.
  function pisar(x, y, ancho) {
    const r = ancho * .5, sg = g.createRadialGradient(x, y, 0, x, y, r);
    sg.addColorStop(0, 'rgba(10,8,6,.72)'); sg.addColorStop(.45, 'rgba(10,8,6,.4)'); sg.addColorStop(1, 'rgba(10,8,6,0)');
    g.save(); g.translate(x, y); g.scale(1, .36); g.translate(-x, -y); g.fillStyle = sg; g.beginPath(); g.arc(x, y, r, 0, 2 * PI); g.fill(); g.restore();
    elip(x, y, ancho * .26, ancho * .07, 'rgba(6,4,3,.66)');
  }
  // margen transparente bajo los pies de una imagen (sale de arte.js > pieArte)
  const piesCache = new WeakMap();
  const pieDe = im => { let v = piesCache.get(im); if (v === undefined) { const src = im.getAttribute('src'); v = (typeof pieArte !== 'undefined' && pieArte[Object.keys(arteIntegrado).find(k => arteIntegrado[k] === src)]) || 0; piesCache.set(im, v); } return v; };
  function escalada(im, ancho, alto) {
    const k = Math.min(2.25, Math.max(1, K)), pw = Math.max(2, Math.round(ancho * k / 2) * 2), key = im.src.slice(-40) + pw;
    let cv = escaladas.get(key);
    if (!cv) { if (escaladas.size > 300) escaladas.clear(); cv = document.createElement('canvas'); cv.width = pw; cv.height = Math.max(2, Math.round(pw * alto / ancho)); const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(im, 0, 0, cv.width, cv.height); escaladas.set(key, cv); }
    return cv;
  }
  let expedicion = false, gemasPiso = 0, recompensaPiso = null;
  let ranura = 'arma', ritual = null, btnEquipo;
  let atributosEquipo = {};
  function recalcularEquipo() {
    const total = {};
    for (const id of Object.values(prog.equipo)) {
      const objeto = EQUIPO.objetos[id];
      if (!objeto) continue;
      for (const [k,v] of Object.entries(objeto.atributos)) total[k]=(total[k]||0)+v;
      const forja = prog.forjas[id], juramento = EQUIPO.juramentos[forja?.juramento];
      if (juramento) total[juramento.atributo]=(total[juramento.atributo]||0)+juramento.valor*forja.grado;
    }
    for (const [id,favor] of Object.entries(MUNDO.favores)) {
      if (prog.favores[id] && favor.atributo) total[favor.atributo]=(total[favor.atributo]||0)+favor.valor;
    }
    const peregrino=Object.values(prog.equipo).filter(id=>['shide','kintsugi','mascara'].includes(id)).length;
    if(peregrino>=2)total.aguante=(total.aguante||0)+.25;
    if(peregrino>=3)total.fortuna=(total.fortuna||0)+4;
    atributosEquipo = total;
  }
  const atributo = k => atributosEquipo[k] || 0;
  const equipoPoseido = id => id === 'dofus' ? !!prog.huevo : !!prog.inventario[id];
  function ganarXP(xp) { prog.xp += Math.round(xp*(1+atributo('sabiduria')/100)); }
  const capacidadCarga = () => (!esVillano() && prog.favores.brizna ? 2 : 1) + (torre && !esVillano() ? (torre.mods.bolsa || 0) : 0);
  let ceremonia = null, escenaJade;
  const duracionJade = 7.4;
  function abrirJade(ensayo = false) {
    if ((!ensayo && !prog.huevo) || ceremonia) return;
    const reducida = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    ceremonia = { t: reducida ? duracionJade : 0, pulso: 0 };
    escenaJade.hidden = false;
    escenaJade.querySelector('button').textContent = reducida ? 'Continuar' : 'Saltar';
    escenaJade.querySelector('button').focus({ preventScroll: true });
    teclas.clear(); soltarJoy(); cerca = null;
  }
  function cerrarJade() {
    if (!ceremonia) return;
    ceremonia = null; escenaJade.hidden = true; if (fase === 'aldea') actualizarAldea(); refrescarBoton();
  }
  const notasJade = [[.1,110],[.62,165],[1.15,220],[1.65,330],[2.12,440],[2.45,659],[2.76,880],[3.04,523],[3.12,659],[3.2,784],[3.3,1047],[3.43,1319],[4.07,1047],[4.48,1568]];
  function avanzarJade(dt) {
    if (!ceremonia || ceremonia.t >= duracionJade) return;
    ceremonia.t = Math.min(duracionJade, ceremonia.t + dt);
    while (ceremonia.pulso < notasJade.length && ceremonia.t >= notasJade[ceremonia.pulso][0]) {
      const [t, f] = notasJade[ceremonia.pulso++];
      pitido(f, t < 3 ? .36 : .65, t < 2 ? 'sine' : 'triangle', t < 3 ? .55 : .8);
    }
    if (ceremonia.t === duracionJade) escenaJade.querySelector('button').textContent = 'Continuar';
  }
  const rutaArte = id => arteIntegrado['assets/mundo/' + id + '.webp'];

  const reduccionSigilo = () => Math.min(.10,efectoMejora('sigilo')+atributo('sigilo')/100);
  const D = () => { const b = CONFIG.dificultades[dif] || CONFIG.dificultades.normal, k = 1-reduccionSigilo(); return k === 1 ? b : Object.assign({}, b, { alcance: b.alcance * k, oido: b.oido * k }); };
  const col = () => CONFIG.colores;
  const txt = () => CONFIG.textos;

  // ---------- sonido (sintetizado, sin archivos) ----------
  function pitido(f, dur, tipo, vol, f2) {
    if (!CONFIG.sonido.activado || silencio) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), a = audio.createGain(), t = audio.currentTime;
      o.type = tipo || 'square'; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      a.gain.setValueAtTime((vol || 1) * CONFIG.sonido.volumen, t);
      a.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(a); a.connect(audio.destination); o.start(t); o.stop(t + dur);
    } catch (e) { /* sin sonido, no pasa nada */ }
  }
  function ruido(dur, frec, vol, q) {
    if (!CONFIG.sonido.activado || silencio) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      const n = floor(audio.sampleRate * dur), b = audio.createBuffer(1, n, audio.sampleRate), d = b.getChannelData(0), t = audio.currentTime;
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = audio.createBufferSource(), f = audio.createBiquadFilter(), a = audio.createGain();
      src.buffer = b; f.type = 'bandpass'; f.frequency.value = frec; f.Q.value = q || 1;
      a.gain.setValueAtTime(0.001, t); a.gain.linearRampToValueAtTime(vol * CONFIG.sonido.volumen, t + dur * .2); a.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(a); a.connect(audio.destination); src.start(t);
    } catch (e) { }
  }
  const SON = {
    tp: () => { ruido(0.35, 2600, 1.2, .8); pitido(1400, 0.12, 'sine', .5, 2200); },
    tp2: () => { ruido(0.3, 900, 1.4, .8); pitido(700, 0.2, 'triangle', .6, 180); },
    latido: v => { pitido(58, 0.13, 'sine', 2.2 * v, 40); setTimeout(() => pitido(52, 0.11, 'sine', 1.6 * v, 38), 140); },
    coger: () => { pitido(660, 0.08); setTimeout(() => pitido(990, 0.1), 70); },
    entregar: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => pitido(f, 0.12, 'triangle'), i * 70)); },
    atrapado: () => { pitido(900, 0.7, 'sawtooth', 0.9, 110); pitido(90, 0.7, 'square', 0.8, 30); ruido(0.8, 1900, 2.2, 2.5); ruido(0.8, 300, 2, 1); },
    alerta: () => { pitido(140, 0.5, 'sawtooth', 0.6, 70); ruido(0.7, 240, 2, 2); },
    turbo: () => pitido(400, 0.25, 'triangle', 1, 1200),
    tic: () => pitido(880, 0.04, 'square', 0.5),
    fin: () => { [392, 330, 262].forEach((f, i) => setTimeout(() => pitido(f, 0.2, 'triangle'), i * 160)); }
  };

  // ---------- nivel ----------
  let golpesTronco=[], astillas=[], corteTronco=null, cadenciaTronco=0, pulsandoGolpe=false;
  let giroRueda=null, paginaBolsa='equipo';
  const estaEnPueblo=()=>fase==='aldea'&&zonaId==='aldea'&&L.exterior;
  const alAlcance=p=>estaEnPueblo()&&cercaCasilla([p.x,p.y],1.78);
  const armaDePractica=()=>{
    const id=prog.equipo.arma;
    return EQUIPO.objetos[id]?.tipo==='arma' && equipoPoseido(id) ? EQUIPO.objetos[id] : null;
  };
  function golpearTronco() {
    if (!alAlcance(TALLER.tronco)||prog.troncoPDV<=0||cadenciaTronco>0||panelMundo||dlg||tienda) return;
    if (!armaDePractica()) {
      decir('Equipa un arma del Dojo antes de entrenar.',2.5);
      cadenciaTronco=.8; return;
    }
    const {x:tx,y:ty,intervalo,critico:prob}=TALLER.tronco;
    const x=(tx+.5)*T,y=(ty+.35)*T,critico=Math.random()<prob;
    const cantidad=Math.min(prog.troncoPDV,TALLER.dano(atributo('ataque'),critico));
    prog.troncoPDV-=cantidad; cadenciaTronco=intervalo;
    h.dir=Math.atan2(y-h.y,x-h.x);
    corteTronco={x,y,t:critico?.52:.31,dur:critico?.52:.31,critico,dir:h.dir};
    golpesTronco.push({x:x+azar(-7,7),y:y-T*.72,t:1.04,cantidad,critico});
    for(let i=0;i<(critico?24:13);i++) {
      const a=azar(0,PI*2), v=azar(16,critico?110:78);
      astillas.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-24,t:azar(.3,.72),r:azar(.7,2.4)});
    }
    pitido(critico?190:104,.14,'triangle',critico?.83:.65,48);
    ruido(.1,790,1.4,1.1);
    if(critico) {
      pitido(1244,.22,'sine',.55);
      temblor=.16;
    }
    if(!prog.troncoPDV) {
      temblor=.45;
      if(!prog.troncoPremio) {
        prog.troncoPremio=true;prog.fichas+=3;ganarXP(350);
        prog.materiales.jade=(prog.materiales.jade||0)+1;
        decir('Tronco partido · 3 fichas, 350 XP base y jade lunar',6);
        SON.entregar();
      }
    }
    guardarProg();
  }
  function moverTaller(dt) {
    cadenciaTronco=Math.max(0,cadenciaTronco-dt);
    if(corteTronco) {corteTronco.t-=dt;if(corteTronco.t<=0)corteTronco=null;}
    for(const p of golpesTronco)p.t-=dt;
    golpesTronco=golpesTronco.filter(p=>p.t>0);
    for(const p of astillas){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;}
    astillas=astillas.filter(p=>p.t>0);
    if(cerca?.tronco && (pulsandoGolpe || tecla(CONFIG.controles.accion || ['KeyE','Enter']))) golpearTronco();
  }
  // Puesto de zumos: imagen assets/mundo/puesto-zumos.webp (se cambia en zumos.js > imagen). Si falta, se dibuja uno simple.
  function dibujaPuestoZumos() {
    const Z = ZU(), p = Z.puesto, x = (p.x + p.ancho / 2) * T, y = (p.y + p.fondo) * T, alto = T * Z.altoPuesto;
    if (Z.gato) { const res = 1 + Math.sin(reloj * 2.2) * .012; dibujaProp(Z.gato, x + T * 1.25, y + T * .15, T * Z.altoGato * res); }   // Momo, sentada junto al puesto
    if (!dibujaProp(Z.imagen, x, y, alto)) { R(x - T, y - T * 1.2, T * 2, T * 1.2, '#5a3820'); R(x - T * 1.1, y - T * 2, T * 2.2, T * .3, '#c94a3a'); }
    if (cerca && cerca.zumos) placaMundo(x, y - alto * .98, Z.nombre.toUpperCase(), 'Corta fruta · gana monedas', 116);
  }
  function placaMundo(x,y,titulo,texto,w=84) {
    const base=y-12;
    R(x-w/2-1,base-1,w+2,texto?23:13,'#201719');
    R(x-w/2,base,w,texto?21:11,'#3d2a24');
    linea([x-w/2+2,base+1,x+w/2-2,base+1],'#a27853',.6);
    circ(x-w/2+3,base+3,.9,'#c3975c');circ(x+w/2-3,base+3,.9,'#c3975c');
    escribe(titulo,x,base+8,Math.min(6.9,(w-9)/(titulo.length*.63)),'#ffe7ad','center');
    if(texto)escribe(texto,x,base+17,Math.min(6.7,(w-7)/(texto.length*.62)),'#e9d1ac','center');
  }
  function dibujaTronco() {
    const {x:tx,y:ty,pdv}=TALLER.tronco,x=(tx+.5)*T,y=(ty+.78)*T;
    const vida=prog.troncoPDV/pdv,alto=T*(vida>0?2.25:.85);
    const golpe=corteTronco ? Math.sin(corteTronco.t*43)*corteTronco.t*3 : 0;
    if(vida>0) dibujaProp('cedro-entrenamiento',x+golpe,y,alto);
    else {
      const im=estampas['cedro-entrenamiento'];
      if(im?.naturalWidth){
        const w=T*2.65, mit=w/2;
        g.drawImage(im,0,im.naturalHeight*.56,im.naturalWidth*.5,im.naturalHeight*.44,x-mit-5,y-alto,mit,alto);
        g.drawImage(im,im.naturalWidth*.5,im.naturalHeight*.52,im.naturalWidth*.5,im.naturalHeight*.48,x+5,y-alto+2,mit,alto);
      }
    }
    if(vida<.62&&vida>0) {
      linea([x-T*.25,y-alto*.76,x+T*.10,y-alto*.58,x-T*.08,y-alto*.34,x+T*.21,y-alto*.20],'#251813',1.8);
      linea([x-T*.09,y-alto*.36,x-T*.34,y-alto*.28],'#9e7045',.7);
    }
    if(alAlcance(TALLER.tronco)) {
      placaMundo(x,y-alto-10,vida>0?'CEDRO DE LOS MIL CORTES':'CEDRO PARTIDO',
        vida>0?prog.troncoPDV.toLocaleString('es-ES')+' / '+pdv.toLocaleString('es-ES')+' PDV':'Recompensa recogida',106);
      R(x-43,y-alto+1,86,4,'#211517');
      const bar=g.createLinearGradient(x-42,0,x+42,0);
      bar.addColorStop(0,'#762d33');bar.addColorStop(1,'#df7953');
      R(x-42,y-alto+2,84*vida,2,bar);
    }
  }
  function dibujaGolpesTronco() {
    if(corteTronco) {
      const e=corteTronco,f=e.t/e.dur;
      const brillo=g.createRadialGradient(e.x,e.y,0,e.x,e.y,34);
      brillo.addColorStop(0,alfa(e.critico?'#ffd070':'#fff0ca',.37*f));brillo.addColorStop(1,'#ffad4100');
      circ(e.x,e.y,34,brillo);
      g.save();g.translate(e.x,e.y);g.rotate(e.dir+.36);
      for(let k=0;k<(e.critico?3:2);k++){
        g.beginPath();g.ellipse(0,0,(18+k*4)*(1.1-f*.24),10+k*2,0,-1.3,1.2);
        g.strokeStyle=alfa(e.critico?'#ffd67a':'#fff2d6',f*(1-k*.19));
        g.lineWidth=1.9-k*.35;g.stroke();
      }
      g.restore();
    }
    for(const p of astillas) {
      g.globalAlpha=limita(p.t*2.3,0,1);
      poli([p.x-p.r,p.y+p.r*.2,p.x+p.r*.2,p.y-p.r,p.x+p.r*1.4,p.y+p.r*.5],'#de9e60');
    }
    g.globalAlpha=1;
    for(const p of golpesTronco) {
      const t=1.04-p.t, tam=(p.critico?15.5:12)*(.78+.22*Math.min(1,t*11));
      g.globalAlpha=Math.min(1,p.t*4);
      escribe('−'+p.cantidad,p.x,p.y-t*29,tam,p.critico?'#ffd466':'#ffffff','center',true);
      if(p.critico)escribe('CRÍTICO',p.x,p.y-t*29-12,6,'#ffdf91','center',true);
    }
    g.globalAlpha=1;
  }
  function girarRueda() {
    if(panelMundo!=='ruleta'||!alAlcance(TALLER.puesto)||prog.fichas<1||giroRueda?.girando)return;
    const i=TALLER.sortear(Math.random()), premio=TALLER.premios[i];
    prog.fichas--;
    let nombre=premio.nombre, detalle=premio.detalle;
    if(premio.tipo==='equipo') {
      if(equipoPoseido(premio.id)) {prog.puntos+=45;detalle='Repetido · convertido en 45 monedas';}
      else prog.inventario[premio.id]=1;
    } else if(premio.tipo==='curio') prog.curiosidades[premio.id]=(prog.curiosidades[premio.id]||0)+1;
    else if(premio.tipo==='mineral')prog.materiales[premio.id]=(prog.materiales[premio.id]||0)+premio.n;
    else if(premio.tipo==='xp'){const previo=prog.xp;ganarXP(premio.n);detalle='+'+(prog.xp-previo)+' XP';}
    else if(premio.tipo==='monedas')prog.puntos+=premio.n;
    prog.ultimoPremio={i,nombre,detalle};
    guardarProg();
    const tirada={girando:true,i};giroRueda=tirada;pintarUI();pitido(230,.25,'triangle',.5);
    setTimeout(()=>{
      if(giroRueda!==tirada)return;
      tirada.girando=false;
      if(panelMundo==='ruleta'){SON.entregar();pintarUI();}
    },window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?50:2450);
  }
  function htmlRuleta() {
    const p=prog.ultimoPremio,girando=giroRueda?.girando, colores=TALLER.colores.map((c,i)=>c+' '+i*45+'deg '+(i+1)*45+'deg').join(',');
    const rot=p?360-22.5-p.i*45:0;
    const sectores=TALLER.premios.map((p,i)=>'<i style="--a:'+(i*45+22.5)+'deg">'+iconoObjeto(p.id,p.icono)+'</i>').join('');
    return '<h2>Rueda del Cedro</h2><p>◈ '+prog.fichas+' '+(prog.fichas===1?'ficha':'fichas')+'</p>'+
      '<div class="rq-tombola"><div class="rq-puntero"></div><div class="rq-rueda '+(girando?'rodando':'')+'" style="--rot:'+rot+'deg;--sectores:'+colores+'">'+sectores+'<b>✦</b></div></div>'+
      (girando?'<p aria-live="polite">La rueda está girando…</p>':p?'<p aria-live="polite"><b>'+esc(p.nombre)+'</b><br>'+esc(p.detalle)+'</p>':'<p>Una ficha por giro. Gana fichas en el Dojo.</p>')+
      '<button class="rq-b" data-a="girarRueda" '+(girando||!prog.fichas?'disabled':'')+'>Girar · 1 ficha</button>'+
      '<details class="rq-prob"><summary>Premios y probabilidades</summary><ul class="rq-lista">'+TALLER.premios.map(p=>'<li>'+p.icono+' '+esc(p.nombre)+' · '+p.peso+' %</li>').join('')+'</ul></details>'+cerrarPanel();
  }

  function cargarNivel(i, aldea) {
    const genera = !aldea && typeof i === 'object';
    if (!aldea && !genera) nivelActual = ((i % NIVELES.length) + NIVELES.length) % NIVELES.length;
    const n = aldea ? (zona() || ALDEA) : genera ? i : NIVELES[nivelActual], filas = n.mapa;
    T = CONFIG.pantalla.tile;
    L = { nombre: n.nombre, rows: filas.length, cols: Math.max(...filas.map(f => f.length)), c: [], inicio: null, espIni: [], base: [], exterior: !!aldea, npcs: [], objetos: [], puertas: [], arboles: [] };
    armaCd = 0; efectos = []; proyectiles = []; lanzadas = [];
    gemas = []; turbos = []; manchas = []; gotas = []; portales = []; tp = null;
    for (let y = 0; y < L.rows; y++) {
      L.c.push([]);
      for (let x = 0; x < L.cols; x++) {
        const ch = filas[y][x] || '#';
        let t = 0;
        if (ch === '#') t = 1; else if (ch === 'A') t = 2; else if (ch === 'S') t = 3; else if (ch === 'H') t = 4; else if (ch === 'M') t = 8;
        if (aldea) {
          const P = zona() ? MUNDO.personajes : ALDEA.personajes;
          if (t === 4) t = 5; else if (ch === ':') t = 5; else if (ch === 't') { t = 6; L.arboles.push([x, y]); } else if (ch === 'D') { t = 5; L.puertas.push([x, y]); }
          else if (P[ch]) { t = 7; L.npcs.push({ id: ch, tx: x, ty: y, p: P[ch] }); }
          else for (const k in P) if (P[k].mision && P[k].mision.objeto === ch) L.objetos.push({ id: k, tx: x, ty: y, tipo: P[k].mision.tipoObjeto });
        }
        L.c[y].push(t);
        if (ch === 'H' && !L.inicio) L.inicio = [x, y];
        if (ch === 'H' && !aldea) L.base.push([x, y]);
        if (ch === 'G') gemas.push({ tx: x, ty: y, valor: 1, estado: 'suelo', t: 0 });
        if (ch === 'V') turbos.push({ tx: x, ty: y, t: 0 });
        if (ch === 'T') portales.push({ tx: x, ty: y, t: 0 });
        if (ch >= '1' && ch <= '9') L.espIni.push([x, y, +ch]);
      }
    }
    pulsandoGolpe=false;golpesTronco=[];astillas=[];corteTronco=null;cadenciaTronco=0;
    mapaExplorador=false;
    if(aldea&&zonaId==='aldea')for(const punto of [TALLER.tronco,TALLER.puesto]) L.c[punto.y][punto.x]=7;
    if (!L.inicio) L.inicio = [1, 1];
    if (!aldea) {
      L.luces = [L.inicio];
      for(let y=1;y<L.rows-1;y++) for(let x=1;x<L.cols-1;x++)
        if(L.c[y][x]===0 && hash(x,y)%23===7 && hash(x,y)%5!==0) L.luces.push([x,y]);
    }
    prepararMonumentos();
    // valor de cada gema según lo lejos que está de la base
    const dist = distancias(L.inicio[0], L.inicio[1]);
    gemas.sort((a, b) => dist[a.ty * L.cols + a.tx] - dist[b.ty * L.cols + b.tx]);
    gemas.forEach((gm, k) => gm.valor = 1 + Math.min(2, floor(k * 3 / gemas.length)));
    // espectros
    const tiposE = Object.keys(CONFIG.espectros || {});
    espectros = L.espIni.map((p, k) => ({
      tipo: tiposE.length ? tiposE[(p[2] - 1) % tiposE.length] : '', n: k, x: (p[0] + .5) * T, y: (p[1] + .5) * T, dir: PI / 2, objDir: PI / 2, estado: 'patrulla',
      ruta: [], vista: null, tMem: 0, tEspera: 0, tRecalc: 0, tGota: 0, anim: Math.random() * 9
    }));
    h = { x: (L.inicio[0] + .5) * T, y: (L.inicio[1] + .5) * T, dir: PI / 2, carga: [], energia: energiaMax(), inv: 0, turbo: 0, oculto: 0, paraguas: 0, anim: 0, mueve: false };
  }
  const celda = (tx, ty) => (ty < 0 || tx < 0 || ty >= L.rows || tx >= L.cols) ? 1 : L.c[ty][tx];
  const solido = (tx, ty) => { const c = celda(tx, ty); return c === 1 || c === 2 || c === 6 || c === 7; };
  const vetado = (tx, ty) => L.exterior ? solido(tx, ty) : ![0,8].includes(celda(tx,ty));      // los espectros solo pisan suelo normal
  const lunaActiva = () => reloj % 12 < 6;
  const heroeSeguro = () => { const c = celda(floor(h.x / T), floor(h.y / T)); return c === 3 || c === 4 || (c === 8 && lunaActiva()); };

  function distancias(ax, ay) {
    const W = L.cols, d = new Int32Array(W * L.rows).fill(99999), q = [ay * W + ax]; d[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], cx = c % W, cy = (c - cx) / W;
      for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy; if (solido(nx, ny)) continue; const n = ny * W + nx; if (d[n] < 99999) continue; d[n] = d[c] + 1; q.push(n); }
    }
    return d;
  }
  // camino más corto en casillas; si el destino no se puede pisar, llega a la más cercana
  function camino(ax, ay, bx, by, bloque) {
    const W = L.cols, prev = new Int32Array(W * L.rows).fill(-1), ini = ay * W + ax, q = [ini];
    prev[ini] = ini; let mejor = ini, mejorD = abs(ax - bx) + abs(ay - by);
    for (let i = 0; i < q.length; i++) {
      const c = q[i], cx = c % W, cy = (c - cx) / W, d = abs(cx - bx) + abs(cy - by);
      if (d < mejorD) { mejorD = d; mejor = c; }
      if (d === 0) break;
      for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy; if (bloque(nx, ny)) continue; const n = ny * W + nx; if (prev[n] !== -1) continue; prev[n] = c; q.push(n); }
    }
    const r = []; let c = mejor;
    while (c !== ini) { r.push([c % W, floor(c / W)]); c = prev[c]; }
    return r.reverse();
  }

  // ---------- partida ----------
  function empezar(o) {
    o = o || {};
    dif = o.difficulty || o.dificultad || dif;
    mapaIni = o.map != null ? o.map : (o.mapa != null ? o.mapa : mapaIni);
    expedicion = !!o.expedicion; torre = o.torre && TW() ? nuevaTorre() : null; ronda = torre && o.piso ? o.piso : 1; puntos = 0; entregadas = []; capturas = 0; if (o.bando) bando = o.bando;
    iniciarRonda();
  }
  function iniciarRonda() {
    panelMundo = ''; ritual = null; gemasPiso = 0; recompensaPiso = null;
    if (torre) { torre.gen = generarPiso(ronda, semilla((Date.now() % 1e9) + ronda * 7919)); cargarNivel(torre.gen); }
    else cargarNivel(expedicion ? ronda-1 : mapaIni + (CONFIG.partida.cambiarMapaCadaRonda ? ronda - 1 : 0));
    tiempo = expedicion ? 125 + (ronda-1)*15 : CONFIG.partida.duracionRonda; h.inv = CONFIG.heroe.invulnerable;
    dlg = null; pintarDlg(); tienda = false; bot.ruta = []; trazo = null; mapaGeo = null; camarasVistas.clear(); sel = bando==='villano' ? (espectrosPorCercania()[0] ?? 0) : 0; racha = 0; temblor = 0; destello = 0; aviso.t = 0; ultimoTic = 0; miedo = 0; susto = 0;
    fase = 'jugando'; pintarUI(); if (!esVillano()) aconsejar('dojo');
    if (torre) prepararTorre();
    else if (expedicion) decir(ronda===3 ? 'La luna te oculta cuando sus losas brillan.' : 'Planta '+ronda+' · entrega '+(ronda+1)+' gemas en zona segura', 5);
  }
  function claveRecord() { return 'reliquias-record-' + mapaIni + '-' + dif; }
  function leerRecord() { try { return +localStorage.getItem(claveRecord()) || 0; } catch (e) { return 0; } }
  function terminarRonda() {
    SON.fin();
    if (torre) { finPisoTorre(); return; }
    if (expedicion) {
      const superada = gemasPiso >= ronda+1;
      if (superada) {
        const premio = EQUIPO.botin[ronda-1];
        const nuevos = premio.objetos.filter(id => !prog.inventario[id]);
        for (const id of nuevos) prog.inventario[id] = 1;
        for (const [id,cantidad] of Object.entries(premio.materiales))
          prog.materiales[id]=(prog.materiales[id]||0)+cantidad;
        const monedas=Math.round(premio.monedas*(1+atributo('fortuna')/100)), xpAntes=prog.xp;
        const fichas=((CONFIG.ruleta||{}).fichasPorPlanta??1)+(ronda===3?((CONFIG.ruleta||{}).fichasExtraDojo||0):0);
        prog.puntos+=monedas; prog.fichas+=fichas; ganarXP(premio.xp); contar('plantas'); guardarProg();
        recompensaPiso={nuevos,materiales:premio.materiales,monedas,fichas,xp:prog.xp-xpAntes};
        [784,988,1175].forEach((f,i)=>setTimeout(()=>pitido(f,.16,'triangle',.5),300+i*110));
      }
      fase = 'finRonda'; pintarUI(); return;
    }
    window.dispatchEvent(new CustomEvent('reliquias:round-end', { detail: { mode: 'solo', round: ronda, score: puntos, player: jugador } }));
    if (ronda < CONFIG.partida.rondas) { fase = 'finRonda'; }
    else {
      fase = 'fin';
      const rec = leerRecord(); L.nuevoRecord = puntos > rec && bando !== 'villano';
      if (L.nuevoRecord) { try { localStorage.setItem(claveRecord(), puntos); } catch (e) { } }
      window.dispatchEvent(new CustomEvent('reliquias:match-end', { detail: { mode: 'solo', score: puntos, record: Math.max(rec, puntos), player: jugador } }));
    }
    pintarUI();
  }
  function decir(t, seg) { aviso.txt = t; aviso.t = seg || 2.2; }

  // ---------- ladrón ----------
  function choca(x, y, r) {
    // Círculo contra huellas sólidas. Los árboles y personajes tienen un tronco/cuerpo redondo.
    for(let ty=floor((y-r)/T);ty<=floor((y+r)/T);ty++)for(let tx=floor((x-r)/T);tx<=floor((x+r)/T);tx++) {
      const tile=celda(tx,ty);if(!solido(tx,ty)||tile===2)continue;
      if(L.exterior&&(tile===6||tile===7)) {
        const taller=zonaId==='aldea'&&[TALLER.tronco,TALLER.puesto].some(p=>p.x===tx&&p.y===ty);
        const radio=T*(taller?.44:tile===6?.29:.23);
        if(hypot(x-(tx+.5)*T,y-(ty+.5)*T)<r+radio)return true;
      }else{
        const px=limita(x,tx*T,(tx+1)*T),py=limita(y,ty*T,(ty+1)*T);
        if((x-px)**2+(y-py)**2<r*r-.0001)return true;
      }
    }
    if(sobreAguaPermitido())return false;   // mizugumo: el agua aguanta mientras corras
    if(ARTE_ISO.aguaEn(L,T,x,y))return true;
    for(let k=0;k<12;k++)if(ARTE_ISO.aguaEn(L,T,x+Math.cos(k*PI/6)*r,y+Math.sin(k*PI/6)*r))return true;
    return false;
  }
  // ---------- v0.38 PASO DEL MIZUGUMO: esprintar sobre el agua (config.js > tecnicas.mizugumo) ----------
  const tieneTecnica = id => !!(prog.tecnicas || {})[id];
  function sobreAguaPermitido() { return L.exterior && tieneTecnica('mizugumo') && h && h.energia > 0 && (h.corre || h.enAgua); }
  function actualizarAgua(dt, mueveAntes) {
    if (!L.exterior || !tieneTecnica('mizugumo')) { h.enAgua = false; return; }
    const ahora = ARTE_ISO.aguaEn(L, T, h.x, h.y), Z = (CONFIG.tecnicas || {}).mizugumo || {};
    if (!ahora) { if (h.enAgua) contar('aguaCruzada'); h.enAgua = false; h.tierra = [h.x, h.y]; return; }
    if (!h.enAgua) { h.enAgua = true; pitido(900, .06, 'sine', .4, 1400); }
    h.energia = Math.max(0, h.energia - dt * ((Z.gasto || 1.3) - 1));   // gasta algo más que esprintar en tierra
    h.tOnda = (h.tOnda || 0) - dt; if (h.tOnda <= 0) { h.tOnda = .09; efectos.push({ tipo: 'onda', x: h.x, y: h.y, t: .45, dur: .45, r: T * .7 }); if (Math.random() < .5) ruido(.04, 2600, .3, 1.6); }
    if (h.energia <= 0) {   // sin aguante: ¡al agua!
      for (let i = 0; i < 30; i++) { const a = azar(0, 2 * PI), v = azar(40, 140); gotas.push({ x: h.x, y: h.y - 6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, t: azar(.3, .7) }); }
      efectos.push({ tipo: 'onda', x: h.x, y: h.y, t: .8, dur: .8, r: T * 1.6 }); ruido(.4, 600, 1.6, 1); pitido(160, .3, 'sine', .8, 60);
      if (h.tierra) { h.x = h.tierra[0]; h.y = h.tierra[1]; } h.enAgua = false; h.energia = 0; h.inv = Math.max(h.inv, .6);
      decir(Z.alCaer || '¡Chof! Hay que salir antes de cansarse', 2.4);
    }
  }
  function tecla(lista) { for (const k of lista) if (teclas.has(k)) return true; return false; }
  function actualizarHeroe(dt) {
    const H = CONFIG.heroe, Ct = CONFIG.controles;
    let mx = (tecla(Ct.derecha) ? 1 : 0) - (tecla(Ct.izquierda) ? 1 : 0), my = (tecla(Ct.abajo) ? 1 : 0) - (tecla(Ct.arriba) ? 1 : 0);
    if (joy.id !== null) { mx += joy.x; my += joy.y; }
    if (!esVillano()) {const mag=Math.min(1,hypot(mx,my));[mx,my]=ARTE_ISO.direccion(mx,my);const norm=hypot(mx,my);if(norm){mx=mx/norm*mag;my=my/norm*mag;}}
    let botS = false; if (esVillano()) { const b = botHeroe(1 / 60); mx = b[0]; my = b[1]; botS = b[2]; }
    const m = hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    h.mueve = m > 0.15;
    if (h.enAgua) { if (!h.mueve) { mx = Math.cos(h.dir); my = Math.sin(h.dir); } h.mueve = true; }   // sobre el agua no se puede parar
    const quiereSprint = h.enAgua || (esVillano() ? botS : tecla(Ct.sprint) || sprintBoton || joy.sprint);
    let v = H.velocidad * (1 + efectoMejora('velocidad') + atributo('velocidad')/100) * (1 + modT('velocidad'));
    if (quiereSprint && h.mueve && h.energia > 0) { v *= H.sprint; h.energia = Math.max(0, h.energia - dt); h.corre = true; }
    else { h.energia = Math.min(energiaMax(), h.energia + H.recargaEnergia * (1+atributo('recarga')/100) * dt); h.corre = false; }
    if (h.turbo > 0) { v *= CONFIG.turbo.multiplicador; h.turbo -= dt; }
    if (h.carga.length) {
      const peso = h.carga.reduce((total,gema)=>total+gema.valor,0);
      v *= Math.max(.3,1-H.frenoPorCarga*(1-efectoMejora('fuerza'))*peso);
    }
    if (h.lanzando > 0) h.lanzando -= dt;
    if (h.inv > 0) h.inv -= dt;
    if (h.oculto > 0) h.oculto -= dt;
    if (h.paraguas > 0) { h.paraguas -= dt; v *= (armas().paraguas || {}).freno || 0.45; }
    if (h.mueve) {
      const r = H.radio * T, paso = v * dt;
      h.dir = Math.atan2(my, mx); h.anim += dt * (h.corre ? 16 : 11);
      const nx = h.x + mx * paso, ny = h.y + my * paso;
      if (!choca(nx, h.y, r)) h.x = nx;
      else if (abs(mx) > abs(my)) { const cy = (floor(h.y / T) + .5) * T; if (!choca(nx, cy, r)) h.y += Math.sign(cy - h.y) * Math.min(abs(cy - h.y), paso); }
      if (!choca(h.x, ny, r)) h.y = ny;
      else if (abs(my) > abs(mx)) { const cx = (floor(h.x / T) + .5) * T; if (!choca(cx, ny, r)) h.x += Math.sign(cx - h.x) * Math.min(abs(cx - h.x), paso); }
    }
    actualizarAgua(dt);
    const tx = floor(h.x / T), ty = floor(h.y / T);
    if (h.carga.length < capacidadCarga()) {
      const gema = gemas.find(gm=>gm.estado==='suelo'&&(modT('iman')?abs(gm.tx-tx)+abs(gm.ty-ty)<=1:gm.tx===tx&&gm.ty===ty));
      if (gema) {
        gema.estado='llevada'; h.carga.push(gema); SON.coger(); if (torre && gema.idolo) torreAlarma(); if (fase === 'jugando') aconsejar('lanzar');
        decir('Gemas en la bolsa: '+h.carga.length+'/'+capacidadCarga(),2);
      }
    }
    const destino = celda(tx,ty);
    if (h.carga.length && (destino===4 || (destino===3 && !esVillano()))) {
      let total = 0, cantidad = h.carga.length;
      for (const gema of h.carga) {
        racha++; gemasPiso++; if (!esVillano()) contar('reliquias'); if (torre) torreEntrega(gema);
        const pts = (CONFIG.gemas.puntos[gema.valor-1] || gema.valor) + (racha-1)*(CONFIG.partida.bonoRacha || 0);
        total += pts;
        tiempo += CONFIG.partida.tiempoPorEntrega || 0;
        entregadas.push(gema.valor);
        gema.estado='espera'; gema.t=CONFIG.partida.reaparicionGema;
      }
      h.carga=[];
      puntos+=total;
      if (!esVillano()) {
        prog.puntos+=Math.round(total*(CONFIG.partida.monedasPorPunto||1)*(1+atributo('fortuna')/100));
        ganarXP(total*2); guardarProg();
      }
      SON.entregar();
      if (cantidad>1) setTimeout(()=>pitido(1319,.15,'triangle'),220);
      decir('+'+total+' puntos · '+cantidad+(cantidad===1?' gema':' gemas')+' · Racha ×'+racha,2.4);
    }
    // teletransporte: los portales van por parejas (1º con 2º, 3º con 4º...)
    for (let i = 0; i < portales.length; i++) {
      const a = portales[i], b = portales[i ^ 1];
      if (!b || a.t > 0 || a.tx !== tx || a.ty !== ty) continue;
      const TP = CONFIG.teletransporte || {};
      a.t = b.t = TP.espera || 4; tp = { t: 0, dur: TP.duracion || 1.5, a, b, hecho: false }; SON.tp(); break;
    }
    // botas
    for (const b of turbos) if (b.t <= 0 && b.tx === tx && b.ty === ty) { b.t = CONFIG.turbo.reaparicion; h.turbo = CONFIG.turbo.duracion; SON.turbo(); decir(txt().turbo, 2.6); }
  }

  // ---------- espectros ----------
  function lineaLibre(ax, ay, bx, by) {
    const d = hypot(bx - ax, by - ay), n = Math.ceil(d / (T / 4));
    for (let i = 1; i < n; i++) { const t = i / n; if (solido(floor((ax + (bx - ax) * t) / T), floor((ay + (by - ay) * t) / T))) return false; }
    return true;
  }
  // ---------- v0.38 LANZAR RELIQUIAS (dojo). Ajustes en config.js > lanzar ----------
  function lanzar() {
    if (fase !== 'jugando' || esVillano() || !h.carga.length) return;
    const Lz = CONFIG.lanzar || {}, gema = h.carga.pop(), casillas = (Lz.alcance || [4, 2, 2])[gema.valor - 1] || 2;
    const mx = Math.cos(h.dir), my = Math.sin(h.dir);
    // busca hasta dónde llega sin atravesar paredes (se para delante de la primera)
    let d = 0; const paso = .25;
    while (d + paso <= casillas) { const nx = h.x + mx * (d + paso) * T, ny = h.y + my * (d + paso) * T; if (solido(floor(nx / T), floor(ny / T))) break; d += paso; }
    const pesada = gema.valor > 1, dur = (Lz.duracion || .55) * (.55 + d / 4 * .6);
    lanzadas.push({ gema, x0: h.x, y0: h.y, x1: h.x + mx * d * T, y1: h.y + my * d * T, t: 0, dur: Math.max(.22, dur), alto: (pesada ? .55 : .9) * T * (.6 + d * .25), rebote: 0, giro: (Math.random() < .5 ? -1 : 1) * (pesada ? 6 : 14), mx, my, pesada, x: h.x, y: h.y, z: 0 });
    contar('lanzamientos'); gema.estado = 'volando'; h.lanzando = ((CONFIG.animacionHeroe||{}).tiras||{}).lanzar?.duracion || .45;
    pitido(pesada ? 260 : 520, .12, 'triangle', .5, pesada ? 160 : 900); ruido(.12, pesada ? 900 : 2600, .6, 1.2);
    decir(pesada ? '¡Ugh! Pesa lo suyo' : '¡Allá va!', 1.2);
  }
  // una reliquia entregada vuelve a salir en un sitio al azar del dojo (nunca en la base ni en zonas seguras)
  function reaparecerGema(gm) {
    const libres = [];
    for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) {
      if (L.c[y][x] !== 0 || gemas.some(o => o !== gm && o.estado === 'suelo' && o.tx === x && o.ty === y)) continue;
      if (hypot((x + .5) * T - h.x, (y + .5) * T - h.y) < 4 * T) continue;   // lejos del héroe
      libres.push([x, y]);
    }
    if (libres.length) { const [x, y] = libres[floor(Math.random() * libres.length)]; gm.tx = x; gm.ty = y; }
    gm.estado = 'suelo'; efectos.push({ tipo: 'puf', x: (gm.tx + .5) * T, y: (gm.ty + .5) * T, t: .5, dur: .5 });
  }
  function aterrizaReliquia(q, final) {
    const tx = floor(q.x / T), ty = floor(q.y / T), Lz = CONFIG.lanzar || {};
    efectos.push({ tipo: 'polvo', x: q.x, y: q.y, t: .45, dur: .45, r: q.pesada ? 1.1 * T : .6 * T });
    if (q.pesada) { temblor = Math.max(temblor, final ? .18 : .12); pitido(90, .22, 'square', 1, 45); ruido(.25, 400, 2, 1.1); if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) { } }
    else { pitido(1400 - q.rebote * 300, .06, 'triangle', .45); ruido(.06, 3500, .8, 1.4); }
    // el golpe se oye: los centinelas cercanos van a mirar
    const oido = (Lz.ruidoCasillas || [2, 3.5, 4])[q.gema.valor - 1] * T;
    for (const e of espectros) if (!(e.muerto > 0) && e.estado !== 'persigue' && hypot(e.x - q.x, e.y - q.y) < oido) { e.estado = 'busca'; e.ruta = []; irA(e, tx, ty); e.tEspera = 2; }
    if (final) {
      q.fin = true; const cz = celda(tx, ty);
      if (cz === 3 || cz === 4) { q.gema.estado = 'espera'; q.gema.t = 1.2; efectos.push({ tipo: 'puf', x: q.x, y: q.y, t: .5, dur: .5 }); decir('La zona sagrada la rechaza: rodará a otro sitio', 2); return; }
      q.gema.tx = tx; q.gema.ty = ty; q.gema.estado = 'suelo';
    }
  }
  function actualizarLanzadas(dt) {
    for (const q of lanzadas) {
      q.t += dt; const k = Math.min(1, q.t / q.dur);
      q.x = q.x0 + (q.x1 - q.x0) * k; q.y = q.y0 + (q.y1 - q.y0) * k; q.z = 4 * q.alto * k * (1 - k);
      q.rot = (q.rot || 0) + q.giro * dt * (1 - k * .4);
      // los centinelas ven la reliquia volando si está dentro de su cono (como ven al héroe)
      if (!q.visto) for (const e of espectros) {
        if (e.muerto > 0 || e.estado === 'persigue') continue;
        const P = PE(e), dx = q.x - e.x, dy = q.y - e.y, dd = hypot(dx, dy);
        if (dd < P.alcance * T * 1.1 && abs(difAng(Math.atan2(dy, dx), e.dir)) < P.angulo * PI / 360 && lineaLibre(e.x, e.y, q.x, q.y)) {
          q.visto = true; e.estado = 'busca'; e.ruta = []; irA(e, floor(q.x1 / T), floor(q.y1 / T)); e.tEspera = 2.6; SON.alerta();
          efectos.push({ tipo: 'interroga', x: e.x, y: e.y, t: 1, dur: 1, e });
        }
      }
      if (k < 1) continue;
      // rebote: cada vez más bajo y más corto, como en Zelda. Lo pesado apenas rebota
      const rebotes = q.pesada ? 1 : 2;
      if (q.rebote < rebotes) {
        aterrizaReliquia(q, false); q.rebote++;
        const sig = (q.pesada ? .25 : .55) / q.rebote; let d = 0;
        while (d + .25 <= sig) { const nx = q.x + q.mx * (d + .25) * T, ny = q.y + q.my * (d + .25) * T; if (solido(floor(nx / T), floor(ny / T))) break; d += .25; }
        q.x0 = q.x; q.y0 = q.y; q.x1 = q.x + q.mx * d * T; q.y1 = q.y + q.my * d * T; q.t = 0; q.dur = (q.pesada ? .16 : .24) / q.rebote; q.alto *= q.pesada ? .18 : .32; q.giro *= .5;
      } else aterrizaReliquia(q, true);
    }
    lanzadas = lanzadas.filter(q => !q.fin);
  }
  function loVe(e) {
    if ((fase !== 'jugando' && fase !== 'aldea') || heroeSeguro() || h.inv > 0 || h.oculto > 0 || e.distraido > 0) return false;
    const dx = h.x - e.x, dy = h.y - e.y, d = hypot(dx, dy), P = PE(e);
    const cerca = d < P.oido * T;
    const cono = d < P.alcance * T && abs(difAng(Math.atan2(dy, dx), e.dir)) < P.angulo * PI / 360;
    return (cerca || cono) && lineaLibre(e.x, e.y, h.x, h.y);
  }
  function irA(e, tx, ty) {
    // sigue desde la casilla a la que ya se dirigía, para no atravesar esquinas
    const ini = e.ruta.length ? e.ruta[0] : [floor(e.x / T), floor(e.y / T)];
    const r = camino(ini[0], ini[1], tx, ty, vetado);
    e.ruta = e.ruta.length ? [ini].concat(r) : r;
  }
  function nuevaPatrulla(e) {
    for (let k = 0; k < 12; k++) {
      let tx, ty;
      if (gemas.length && Math.random() < 0.4) { const gm = gemas[floor(Math.random() * gemas.length)]; tx = gm.tx; ty = gm.ty; }
      else { tx = floor(azar(1, L.cols - 1)); ty = floor(azar(1, L.rows - 1)); }
      if (vetado(tx, ty) || abs(tx - e.x / T) + abs(ty - e.y / T) < 5) continue;
      e.ruta = []; irA(e, tx, ty);
      if (e.ruta.length > 3) return;
    }
  }
  function avanzar(e, vel, dt) {
    if (e.lento > 0) vel *= (CONFIG.huevo || {}).freno || .5;
    const mr = (CONFIG.espectros || {})[e.tipo]; if (mr && mr.recta && e.ruta.length > 1 && (e.ruta[0][0] === e.ruta[1][0] || e.ruta[0][1] === e.ruta[1][1])) vel *= mr.recta;   // embiste en línea recta
    let rest = vel * dt;
    while (rest > 0 && e.ruta.length) {
      const px = (e.ruta[0][0] + .5) * T, py = (e.ruta[0][1] + .5) * T, dx = px - e.x, dy = py - e.y, d = hypot(dx, dy);
      if (d <= rest) { e.x = px; e.y = py; rest -= d; e.ruta.shift(); }
      else { e.x += dx / d * rest; e.y += dy / d * rest; e.objDir = Math.atan2(dy, dx); rest = 0; }
    }
    e.dir += limita(difAng(e.objDir, e.dir), -7 * dt, 7 * dt);
  }
  function actualizarEspectro(e, dt) {
    const P = PE(e), fr = 1 + CONFIG.partida.subidaPorRonda * (ronda - 1), ME = (CONFIG.espectros || {})[e.tipo] || {};
    if (e.lento > 0) e.lento -= dt;
    e.anim += dt;
    if (e.muerto > 0) { e.muerto -= dt; if (e.muerto <= 0) efectos.push({ tipo: 'puf', x: e.x, y: e.y - 20, t: .6, dur: .6 }); return; }
    if (e.aturdido > 0) { e.aturdido -= dt; return; }
    if (e.distraido > 0) e.distraido -= dt;
    const ve = loVe(e);
    if (ve) {
      if (e.estado !== 'persigue') SON.alerta(); if (torre) torreVisto();
      e.estado = 'persigue'; e.vista = [floor(h.x / T), floor(h.y / T)]; e.tMem = P.memoria;
    }
    if (e.estado === 'persigue') {
      if (!ve) { e.tMem -= dt; if (e.tMem <= 0) { e.estado = 'busca'; e.tEspera = 2.5; irA(e, e.vista[0], e.vista[1]); } }
      e.tRecalc -= dt;
      if (e.tRecalc <= 0) { e.tRecalc = 0.3; irA(e, e.vista[0], e.vista[1]); }
      if (ve && !e.ruta.length) e.objDir = Math.atan2(h.y - e.y, h.x - e.x);
      avanzar(e, P.velPersigue * fr, dt);
    } else if (e.estado === 'busca') {
      if (e.ruta.length) avanzar(e, P.velBusca * fr, dt);
      else { e.tEspera -= dt; e.dir += dt * 2.6; e.objDir = e.dir; if (e.tEspera <= 0) e.estado = 'patrulla'; }
    } else {
      if (bando === 'villano') { if (!e.ruta.length) { e.dir += dt * .7; e.objDir = e.dir; } }   // sin ruta trazada, se queda vigilando
      else { if (ME.erratico && Math.random() < ME.erratico * dt) e.ruta = []; if (!e.ruta.length) nuevaPatrulla(e); }
      avanzar(e, P.velPatrulla * fr, dt);
    }
    // gotea sangre
    if (CONFIG.gore.sangre && CONFIG.gore.intensidad > 0) {
      e.tGota -= dt;
      if (e.tGota <= 0) {
        e.tGota = azar(0.25, 0.6) / CONFIG.gore.intensidad;
        manchas.push({ x: e.x + azar(-4, 4), y: e.y + T * 0.3 + azar(-3, 3), r: azar(0.8, 2.2), v: 7, v0: 7 });
        if (manchas.length > 220) manchas.shift();
      }
    }
    // ¿te atrapa?
    if ((fase === 'jugando' || fase === 'aldea') && h.inv <= 0 && !(h.oculto > 0) && !heroeSeguro() && hypot(h.x - e.x, h.y - e.y) < T * 0.6) atrapar(e);
  }
  function atrapar(e) {
    const HV = CONFIG.huevo || {};
    const jade = !esVillano() && prog.huevo;
    if (jade) {
      prog.cargaJade = (prog.cargaJade + 1) % 4;
      guardarProg();
    }
    if (jade && prog.cargaJade === 0) {
      e.lento = HV.duracion || 2.2; h.inv = Math.max(h.inv, 1.2); e.estado = 'busca'; e.ruta = []; e.tEspera = 1; efectos.push({ tipo: 'jade', x: h.x, y: h.y, t: .75, dur: .75, r: 2 * T });
      [660, 880, 1320].forEach((f, i) => setTimeout(() => pitido(f, 0.18, 'sine', .7), i * 80)); decir('El Dofus verde detiene el golpe', 2.2); return;
    }
    if (L.exterior) {
      h.x = (L.inicio[0] + .5) * T; h.y = (L.inicio[1] + .5) * T; h.inv = 2;
      e.estado = 'patrulla'; e.ruta = []; temblor = .28;
      decir('El espectro te devuelve a la entrada', 2.6);
      return;
    }
    capturas++;
    SON.atrapado();
    const I = CONFIG.gore.intensidad;
    temblor = 0.5 * CONFIG.gore.temblor; destello = 0.45;
    if (CONFIG.gore.susto !== false && bando !== 'villano') { susto = 0.8; sustoE = e; }
    if (CONFIG.gore.sangre) {
      for (let i = 0; i < 16 * I; i++) manchas.push({ x: h.x + azar(-14, 14), y: h.y + azar(-10, 12), r: azar(1.5, 5), v: 14, v0: 14 });
      for (let i = 0; i < 26 * I; i++) { const a = azar(0, 2 * PI), v = azar(30, 130); gotas.push({ x: h.x, y: h.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: azar(0.3, 0.7) }); }
    }
    for (const q of lanzadas) { q.gema.estado = 'suelo'; } lanzadas = [];
    for (const gema of h.carga) gema.estado = 'suelo';
    h.carga = [];
    racha = 0;
    const pena = CONFIG.partida.penalizacionCaptura * (((CONFIG.espectros || {})[e.tipo] || {}).castigo || 1);
    const perdida = Math.max(1, Math.round(pena*(1-Math.min(.55,atributo('defensa')/100))));
    tiempo -= torre ? Math.round(perdida * (1 - modT('piel'))) : perdida;
    if (torre) { const l = Math.round(torre.botin.monedas * TW().perdidaPorCaptura * (1 - modT('piel'))); torre.botin.monedas -= l; torreVisto(); if (l) setTimeout(() => decir('Se te caen ' + l + ' monedas del botín', 2), 2100); }
    h.x = (L.inicio[0] + .5) * T; h.y = (L.inicio[1] + .5) * T; h.inv = CONFIG.heroe.invulnerable; h.turbo = 0;
    decir(txt().atrapado + '  -' + perdida + ' s', 2);
    // todos vuelven a patrullar lejos: nadie se queda acampando en la puerta de la base
    for (const o of espectros) { o.estado = 'patrulla'; o.ruta = []; }
  }

  // ---------- v0.38 TORRE DEL DOJO: 15 pisos generados, objetivos, cartas, botín y jefes (datos en torre.js) ----------
  let torre = null;
  const TW = () => (typeof TORRE !== 'undefined' ? TORRE : null);
  const modT = k => (torre && torre.mods[k]) || 0;
  function nuevaTorre() { return { mods: {}, cartas: [], botin: { monedas: 0, materiales: {}, fichas: 0, xp: 0 }, obj: null, faro: [], lenta: 0 }; }
  // mapa nuevo en cada piso: laberinto con rodeos y salas, base en el centro
  function generarPiso(n, rnd) {
    const TT = TW(), W = TT.tamano.ancho, H = TT.tamano.alto, P = TT.pisos[n - 1], g = Array.from({ length: H }, () => Array(W).fill('#'));
    const cw = (W - 1) / 2, chh = (H - 1) / 2, vis = new Set(['0,0']), pila = [[0, 0]]; g[1][1] = '.';
    while (pila.length) {
      const [cx, cy] = pila[pila.length - 1], v = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; return nx >= 0 && ny >= 0 && nx < cw && ny < chh && !vis.has(nx + ',' + ny); });
      if (!v.length) { pila.pop(); continue; }
      const [dx, dy] = v[floor(rnd() * v.length)], nx = cx + dx, ny = cy + dy; vis.add(nx + ',' + ny); g[1 + cy * 2 + dy][1 + cx * 2 + dx] = '.'; g[1 + ny * 2][1 + nx * 2] = '.'; pila.push([nx, ny]);
    }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '#') { const ho = g[y][x - 1] === '.' && g[y][x + 1] === '.', ve = g[y - 1][x] === '.' && g[y + 1][x] === '.'; if ((ho || ve) && rnd() < .2) g[y][x] = '.'; }
    for (let k = 0; k < 5; k++) { const w = 3 + floor(rnd() * 3), h2 = 3 + floor(rnd() * 2), x0 = 1 + floor(rnd() * (W - w - 2)), y0 = 1 + floor(rnd() * (H - h2 - 2)); for (let y = y0; y < y0 + h2; y++) for (let x = x0; x < x0 + w; x++) g[y][x] = '.'; }
    const bx = floor(W / 2) - 1, by = floor(H / 2) - 1;
    for (let y = by - 1; y < by + 3; y++) for (let x = bx - 1; x < bx + 3; x++) g[y][x] = '.';
    for (let y = by; y < by + 2; y++) for (let x = bx; x < bx + 2; x++) g[y][x] = 'H';
    // distancias desde la base para repartir cosas lejos o cerca
    const dist = Array.from({ length: H }, () => Array(W).fill(-1)), q = [[bx, by]]; dist[by][bx] = 0;
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (g[ny]?.[nx] && g[ny][nx] !== '#' && dist[ny][nx] < 0) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); } } }
    const libres = []; let dmax = 1;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && dist[y][x] > 2) { libres.push([x, y]); dmax = Math.max(dmax, dist[y][x]); }
    const usados = [];
    const poner = (ch, cuantos, f0, f1, sep) => {
      const out = [], cand = libres.filter(([x, y]) => dist[y][x] >= dmax * f0 && dist[y][x] <= dmax * f1);
      for (let t = 0; t < 400 && out.length < cuantos && cand.length; t++) {
        const [x, y] = cand[floor(rnd() * cand.length)];
        if (g[y][x] !== '.' || usados.some(([ux, uy]) => abs(ux - x) + abs(uy - y) < sep)) continue;
        g[y][x] = ch; usados.push([x, y]); out.push([x, y]);
      }
      return out;
    };
    const tipos = Object.keys(CONFIG.espectros), dig = t => String(Math.max(0, tipos.indexOf(t)) + 1);
    const res = { nombre: 'Piso ' + n, faro: [], idolo: null };
    if (P.jefe) poner(dig(TT.jefes[P.jefe].tipo), 1, .55, .9, 1);
    const nE = P.espectros + modT('espectroExtra');
    for (let i = 0; i < nE; i++) poner(dig(P.tipos[i % P.tipos.length]), 1, .35, 1, 5);
    poner('S', 4, .25, .75, 7);
    poner('T', 2, .7, 1, 14);
    poner('V', 2, .3, .8, 8);
    if (P.objetivo === 'farolillos') res.faro = poner('F', P.meta + 1, .45, 1, 5);
    if (P.objetivo === 'idolo') { const i = poner('G', 1, .9, 1, 1); res.idolo = i[0]; poner('G', 2, .3, .7, 4); }
    else poner('G', P.objetivo === 'farolillos' ? 2 : P.meta + 3, .3, 1, 4);
    for (const [x, y] of res.faro) g[y][x] = '.';   // el farolillo se dibuja aparte; la casilla es suelo
    res.mapa = g.map(r => r.join(''));
    return res;
  }
  function prepararTorre() {
    const P = TW().pisos[ronda - 1];
    torre.obj = { tipo: P.objetivo, meta: P.meta, hechos: 0, visto: false, extra: 0 };
    torre.faro = (torre.gen.faro || []).map(([x, y]) => ({ tx: x, ty: y, apagado: false }));
    if (torre.gen.idolo) { const [ix, iy] = torre.gen.idolo, gm = gemas.find(o => o.tx === ix && o.ty === iy); if (gm) { gm.valor = 3; gm.idolo = true; } }
    torre.jefe = null;
    if (P.jefe) {
      const J = TW().jefes[P.jefe], e = espectros.find(o => o.tipo === J.tipo) || espectros[0];
      if (e) { e.jefe = J; e.escala = J.escala; e.tHab = J.cada; torre.jefe = e; }
    }
    for (const e of espectros) e.tBlink = 8 + Math.random() * 4;
    torre.mitad = false; torre.lenta = 0; torre.enSegura = true;
    tiempo = P.tiempo + modT('tiempo');
    const txt2 = (TW().textos[P.objetivo] || '').replace('{m}', P.meta);
    cortina = { t: 0, nombre: (P.jefe ? TW().jefes[P.jefe].nombre : 'Piso ' + ronda + ' / ' + TW().pisos.length), preparada: true };
    decir(txt2, 5.5);
    if (P.jefe) setTimeout(() => { if (torre && fase === 'jugando') decir(TW().jefes[P.jefe].frase, 5); }, 5600);
  }
  function objetivoTorre() {
    const o = torre?.obj; if (!o) return false;
    if (o.tipo === 'farolillos' || o.tipo === 'idolo') return o.hechos >= (o.tipo === 'idolo' ? 1 : o.meta);
    return gemasPiso >= o.meta + o.extra;
  }
  function progresoTorre() {
    const o = torre.obj; if (!o) return '';
    const v = o.tipo === 'farolillos' ? o.hechos + '/' + o.meta + ' farolillos' : o.tipo === 'idolo' ? (o.hechos ? 'ídolo ✓' : 'ídolo ✗') : gemasPiso + '/' + (o.meta + o.extra) + ' reliquias';
    return 'Piso ' + ronda + ' · ' + v;
  }
  function torreVisto() { const o = torre?.obj; if (!o || o.visto) return; o.visto = true; if (o.tipo === 'sigilo') { o.extra = 1; decir('¡Te han visto! Ahora necesitas una reliquia más', 2.4); } }
  function torreEntrega(gema) {
    if (gema.idolo) { torre.obj.hechos = 1; decir('¡El ídolo está a salvo!', 2); }
    if (!torre.obj.visto) efectos.push({ tipo: 'interroga', x: h.x, y: h.y, t: 1, dur: 1, texto: '¡Fantasma!' });
  }
  function torreAlarma() {
    for (const e of espectros) if (!(e.muerto > 0)) { e.estado = 'busca'; e.ruta = []; irA(e, floor(h.x / T), floor(h.y / T)); e.tEspera = 3; }
    destello = .35; SON.alerta(); decir('¡Has cogido el ídolo! Todos vienen a por ti', 2.6);
  }
  // casillas libres cerca de un punto (para el parpadeo de las cabezas)
  function casillaCerca(cx, cy, d0, d1) {
    const op = [];
    for (let y = cy - d1; y <= cy + d1; y++) for (let x = cx - d1; x <= cx + d1; x++) { const d = abs(x - cx) + abs(y - cy); if (d >= d0 && d <= d1 && celda(x, y) === 0) op.push([x, y]); }
    return op.length ? op[floor(Math.random() * op.length)] : null;
  }
  function parpadeo(e, d0, d1) {
    const c = casillaCerca(floor(h.x / T), floor(h.y / T), d0, d1); if (!c) return;
    efectos.push({ tipo: 'puf', x: e.x, y: e.y, t: .5, dur: .5 }); e.x = (c[0] + .5) * T; e.y = (c[1] + .5) * T; e.ruta = []; efectos.push({ tipo: 'puf', x: e.x, y: e.y, t: .5, dur: .5 }); pitido(220, .2, 'sine', .5, 90);
  }
  function actualizarTorre(dt) {
    if (!torre || fase !== 'jugando') return;
    const tx = floor(h.x / T), ty = floor(h.y / T);
    // farolillos: pasas por encima y se apagan (y hace ruido)
    for (const f of torre.faro) if (!f.apagado && abs(f.tx - tx) + abs(f.ty - ty) === 0) {
      f.apagado = true; torre.obj.hechos++; pitido(520, .2, 'sine', .5, 260); ruido(.2, 1200, 1, 1);
      efectos.push({ tipo: 'puf', x: (f.tx + .5) * T, y: (f.ty + .5) * T, t: .6, dur: .6 }); decir('Farolillo apagado · ' + torre.obj.hechos + '/' + torre.obj.meta, 1.8);
      for (const e of espectros) if (!(e.muerto > 0) && e.estado === 'patrulla' && hypot(e.x - h.x, e.y - h.y) < 6 * T) { e.estado = 'busca'; e.ruta = []; irA(e, tx, ty); e.tEspera = 2; }
    }
    // paso de sombra: al salir de una zona segura quedas oculto un momento
    const seg = heroeSeguro(); if (torre.enSegura && !seg && modT('sombra')) h.oculto = Math.max(h.oculto, modT('sombra')); torre.enSegura = seg;
    for (const e of espectros) {
      if (e.muerto > 0) continue;
      if (e.tCasi > 0) e.tCasi -= dt;
      // ¡por poco!: un espectro pasa rozándote sin verte → cámara lenta un instante
      if (e.estado !== 'persigue' && !(e.tCasi > 0) && hypot(e.x - h.x, e.y - h.y) < T * 1.2 && !seg) { e.tCasi = 5; torre.lenta = .5; decir('¡Por poco!', 1.1); pitido(160, .3, 'sine', .4, 80); }
      // las cabezas atraviesan las sombras: si te buscan y no te ven, aparecen más cerca
      if (e.tipo === 'cabeza' && !e.jefe && e.estado !== 'patrulla') { e.tBlink -= dt; if (e.tBlink <= 0 && !lineaLibre(e.x, e.y, h.x, h.y)) { e.tBlink = 10; parpadeo(e, 4, 6); } }
      if (e.embiste > 0) e.embiste -= dt;
      if (e.aviso > 0) { e.aviso -= dt; if (e.aviso <= 0) { if (!heroeSeguro()) { torreVisto(); for (const o of espectros) if (!(o.muerto > 0)) { o.estado = 'busca'; o.ruta = []; irA(o, tx, ty); o.tEspera = 3; } decir('¡El Ojo te ha visto!', 2); destello = .5; } else decir('El Ojo no te encuentra…', 1.6); } }
    }
    const J = torre.jefe;
    if (J && !(J.muerto > 0)) {
      J.tHab -= dt;
      if (J.tHab <= 0) {
        J.tHab = J.jefe.cada;
        if (J.jefe.habilidad === 'embestida' && J.estado === 'persigue') { J.embiste = .9; temblor = .35; pitido(70, .4, 'square', 1.2, 30); decir('¡Kuroni embiste!', 1.2); }
        else if (J.jefe.habilidad === 'mirada') { J.aviso = 1.3; pitido(880, .6, 'sine', .6, 1760); decir('¡El Ojo se abre! Escóndete', 1.3); }
        else if (J.jefe.habilidad === 'luna' && J.estado !== 'patrulla') parpadeo(J, 3, 5);
        else J.tHab = 1.5;
      }
      if (J.jefe.habilidad === 'luna' && !torre.mitad && tiempo < TW().pisos[ronda - 1].tiempo / 2) {   // a mitad del piso llama a dos crías
        torre.mitad = true; const tc = Object.keys(CONFIG.espectros);
        for (let k = 0; k < 2; k++) espectros.push({ tipo: 'cabeza', n: espectros.length, x: J.x, y: J.y, dir: PI / 2, objDir: PI / 2, estado: 'busca', ruta: [], vista: null, tMem: 0, tEspera: 2, tRecalc: 0, tGota: 0, anim: Math.random() * 9, tBlink: 6 + k * 2 });
        L.espIni.push([floor(J.x / T), floor(J.y / T), tc.indexOf('cabeza') + 1], [floor(J.x / T), floor(J.y / T), tc.indexOf('cabeza') + 1]);
        decir('¡Akakubi llama a sus crías!', 2.2); temblor = .3;
      }
    }
  }
  function finPisoTorre() {
    const ok = objetivoTorre(), n = ronda, B = TW().botinPorPiso;
    torre.resultado = { ok, n };
    if (ok) {
      const mult = (1 + modT('botin')) * rango().mult, mon = Math.round((B.monedas + B.subida * (n - 1)) * mult), fantasma = !torre.obj.visto;
      const extraF = fantasma ? Math.round(mon * .25) : 0, ks = Object.keys(EQUIPO.materiales);
      torre.botin.monedas += mon + extraF; torre.botin.xp += B.xp * n;
      let mat = null; if (n % B.materialCada === 0) { mat = ks[Math.min(ks.length - 1, floor(n / 5))]; torre.botin.materiales[mat] = (torre.botin.materiales[mat] || 0) + 1 + floor(n / 6); }
      const fich = TW().pisos[n - 1].jefe ? B.fichasEnJefe : 0; torre.botin.fichas += fich;
      torre.resultado = { ok, n, mon, extraF, fantasma, mat, fich };
      contar('plantas'); if (TW().pisos[n - 1].jefe) contar('jefes');
      const pool = TW().cartas.filter(c => !torre.cartas.includes(c.id) || c.mod.botin || c.mod.tiempo);
      torre.ofertas = []; while (torre.ofertas.length < 3 && pool.length) torre.ofertas.push(pool.splice(floor(Math.random() * pool.length), 1)[0]);
      torre.elegida = n >= TW().pisos.length;
      [784, 988, 1175].forEach((f, i) => setTimeout(() => pitido(f, .16, 'triangle', .5), 300 + i * 110));
    }
    fase = 'finRonda'; pintarUI();
  }
  function cobrarTorre(factor) {
    const b = torre.botin, L2 = [];
    const p = { monedas: Math.round(b.monedas * factor), fichas: factor >= 1 ? b.fichas : 0, xp: Math.round(b.xp * factor) };
    L2.push(...darPremio(p));
    for (const k in b.materiales) { const c = Math.round(b.materiales[k] * factor); if (c) { prog.materiales[k] = (prog.materiales[k] || 0) + c; L2.push((EQUIPO.materiales[k] || k) + ' × ' + c); } }
    if (torre.resultado?.ok && torre.resultado.n >= TW().pisos.length) { L2.push(...darPremio({ objeto: ['Legendario'], siRepetido: 300 })); contar('torres'); }
    guardarProg(); torre = null; irMenu(); decir('Botín: ' + (L2.join(' · ') || 'nada'), 4.5); SON.entregar();
  }
  function htmlTorre() {
    const r = torre.resultado, b = torre.botin, N = TW().pisos.length;
    const bolsa = '<div class="rq-botin"><b>Botín acumulado</b><span>◈ ' + b.monedas + '</span>' + (b.fichas ? '<span>✦ ' + b.fichas + '</span>' : '') + Object.entries(b.materiales).map(([k, v]) => '<span>' + esc(EQUIPO.materiales[k] || k) + ' ×' + v + '</span>').join('') + '<span>' + b.xp + ' XP</span></div>';
    if (!r.ok) {
      const f = modT('todoONada') ? 0 : TW().siFallas;
      return '<div class="rq-hanko">敗</div><h2>Se acabó el tiempo</h2><p>Piso ' + r.n + ' sin completar.</p>' + bolsa + '<p>' + (f ? 'Te llevas el ' + Math.round(f * 100) + ' % del botín.' : 'Doble o nada: lo pierdes todo.') + '</p><button class="rq-b" data-a="cobrarTorre" data-id="' + f + '">Volver con lo que queda</button>';
    }
    const lineas = [['Piso superado', '◈ +' + r.mon], r.fantasma && ['¡Fantasma! Nadie te vio', '◈ +' + r.extraF], r.mat && ['Material', EQUIPO.materiales[r.mat]], r.fich && ['Jefe derrotado', '✦ +' + r.fich]].filter(Boolean)
      .map(([a, v], i) => '<li class="rq-pop" style="animation-delay:' + (i * .25) + 's"><span>' + esc(a) + '</span><b>' + esc(String(v)) + '</b></li>').join('');
    if (r.n >= N) return '<div class="rq-hanko">覇</div><h2>¡Has conquistado la Torre!</h2><ul class="rq-premios">' + lineas + '</ul>' + bolsa + '<p>Premio final: un objeto Legendario.</p><button class="rq-b" data-a="cobrarTorre" data-id="1">Cobrar todo</button>';
    const sig = TW().pisos[r.n], cartas = torre.elegida ? '<p>Carta elegida: <b>' + esc(torre.ultimaCarta || '') + '</b></p>' :
      '<h3>Elige una carta</h3><div class="rq-cartas">' + torre.ofertas.map(c => '<button class="rq-carta" data-a="cartaTorre" data-id="' + c.id + '"><b>' + esc(c.nombre) + '</b><small>' + esc(c.desc) + '</small></button>').join('') + '</div>';
    const pistas = (sig.jefe ? '⚠ Jefe: ' + TW().jefes[sig.jefe].nombre : (TW().textos[sig.objetivo] || '').replace('{m}', sig.meta));
    return '<div class="rq-hanko">' + r.n + '</div><h2>Piso ' + r.n + ' superado</h2><ul class="rq-premios">' + lineas + '</ul>' + bolsa + cartas +
      '<p><small>Siguiente: ' + esc(pistas) + '</small></p>' +
      '<button class="rq-b" data-a="seguirTorre"' + (torre.elegida ? '' : ' disabled') + '>Arriesgar · subir al piso ' + (r.n + 1) + '</button>' +
      '<button class="rq-b sec" data-a="cobrarTorre" data-id="1">Retirarse con el botín</button>' +
      (torre.cartas.length ? '<p><small>Tus cartas: ' + torre.cartas.map(id => esc(TW().cartas.find(c => c.id === id)?.nombre || id)).join(' · ') + '</small></p>' : '');
  }
  function elegirCarta(id) {
    const c = TW().cartas.find(x => x.id === id); if (!c || torre.elegida) return;
    for (const k in c.mod) torre.mods[k] = (torre.mods[k] || 0) + c.mod[k];
    torre.cartas.push(c.id); torre.ultimaCarta = c.nombre; torre.elegida = true; pitido(990, .12, 'triangle', .5); pintarUI();
  }
  // farolillos de la torre: assets/mundo/farol-torre.webp (encendido) y farol-torre-apagado.webp
  function dibujaFarolillo(f) {
    const x = (f.tx + .5) * T, y = (f.ty + .5) * T, alto = T * ((CONFIG.decoracion || {}).altoFarol || 1.7), im = estampas[f.apagado ? 'farol-torre-apagado' : 'farol-torre'];
    if (!f.apagado) { const p = .75 + Math.sin(reloj * 7 + f.tx) * .15, gl = g.createRadialGradient(x, y - alto * .55, 2, x, y - alto * .55, alto * 1.1); gl.addColorStop(0, 'rgba(255,170,70,' + (.5 * p) + ')'); gl.addColorStop(1, 'rgba(255,170,70,0)'); g.fillStyle = gl; g.fillRect(x - alto * 1.1, y - alto * 1.65, alto * 2.2, alto * 2.2); }
    if (!dibujaProp(f.apagado ? 'farol-torre-apagado' : 'farol-torre', x, y + 6, alto)) R(x - 4, y - 14, 8, 14, '#4a4038');
  }
  // farolillos de piedra de decoración en las zonas del mundo (config.js > decoracion)
  function dibujaFarolDecor(p) {
    const x = (p[0] + .5) * T, y = (p[1] + .5) * T, alto = T * ((CONFIG.decoracion || {}).altoFarol || 1.7);
    const k = .8 + Math.sin(reloj * 5 + p[0] * 3) * .1, gl = g.createRadialGradient(x, y - alto * .55, 2, x, y - alto * .55, alto * .9); gl.addColorStop(0, 'rgba(255,200,110,' + (.32 * k) + ')'); gl.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = gl; g.fillRect(x - alto, y - alto * 1.5, alto * 2, alto * 2);
    dibujaProp('farol-piedra', x, y + 6, alto);
  }

  // ---------- bucle ----------
  // ---------- v0.38 CONSEJOS: se explican las cosas la primera vez que las ves (textos en config.js > consejos) ----------
  let consejo = null;
  function aconsejar(clave) {
    const C = (CONFIG.consejos || {})[clave]; if (!C || !prog) return;
    prog.vistos = prog.vistos || {}; if (prog.vistos[clave] || CONFIG.consejosApagados) return;
    prog.vistos[clave] = true; guardarProg(); consejo = C; soltarJoy(); pintarUI();
  }
  function htmlConsejo() {
    return '<div class="rq-hanko">導</div><h2>' + esc(consejo.titulo) + '</h2>' + consejo.lineas.map(l => '<p>' + esc(l) + '</p>').join('') +
      '<button class="rq-b" data-a="entendido">Entendido</button>';
  }
  function actualizar(dt) {
    if (consejo) return;   // el mundo espera mientras lees el consejo
    actualizarCofres(dt); if (cofreAbierto && cofreAbierto.mostrar <= 0) return;
    if (torre && torre.lenta > 0) { torre.lenta -= dt; dt *= .35; }   // cámara lenta del «¡por poco!»
    actualizarTorre(dt);
    if (fase === 'fruta') { actualizarFruta(dt); return; }
    reloj += dt;
    if (aviso.t > 0) aviso.t -= dt;
    if (temblor > 0) temblor -= dt;
    if (destello > 0) destello -= dt;
    for (const m of manchas) m.v -= dt;
    while (manchas.length && manchas[0].v <= 0) manchas.shift();
    for (const p of gotas) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.t -= dt; }
    gotas = gotas.filter(p => p.t > 0);
    if (susto > 0) { susto -= dt; for (const e of espectros) e.anim += dt; return; }   // el juego se congela durante el susto
    // miedo: 0 tranquilo, 1 te persiguen. Mueve la oscuridad y el latido
    let obj = 0;
    if (fase === 'jugando') for (const e of espectros) if (!(e.muerto > 0)) obj = Math.max(obj, e.estado === 'persigue' ? 1 : limita(1 - hypot(h.x - e.x, h.y - e.y) / (7 * T), 0, 0.6));
    miedo += (obj - miedo) * Math.min(1, dt * 3);
    if (fase === 'jugando' && CONFIG.gore.latido && miedo > 0.2) { tLatido -= dt; if (tLatido <= 0) { SON.latido(miedo); tLatido = 1.05 - miedo * 0.68; } }
    if (fase === 'jugando') {
      tiempo -= dt;
      for (const gm of gemas) if (gm.estado === 'espera') { gm.t -= dt; if (gm.t <= 0) reaparecerGema(gm); }
      for (const b of turbos) if (b.t > 0) b.t -= dt;
      for (const p of portales) if (p.t > 0) p.t -= dt;
      if (armaCd > 0) armaCd -= dt;
      for (const ef of efectos) ef.t -= dt; efectos = efectos.filter(ef => ef.t > 0);
      for (const q of proyectiles) {   // estrella ninja: no hace daño, pero el ruido donde cae los despista
        q.x += q.vx * dt; q.y += q.vy * dt; q.t -= dt;
        const dado = espectros.find(e => !(e.muerto > 0) && hypot(e.x - q.x, e.y - 20 - q.y) < T * .7), cae = dado || q.t <= 0 || solido(floor(q.x / T), floor(q.y / T));
        if (!cae) continue;
        q.t = -1; if (dado) { dado.aturdido = .5; decir('Ni cosquillas. Pero ha mirado', 2); }
        const qx = floor((q.x - q.vx * dt) / T), qy = floor((q.y - q.vy * dt) / T); efectos.push({ tipo: 'onda', x: q.x, y: q.y, t: .5, dur: .5, r: q.r * .5 }); pitido(2400, 0.07, 'square', .5);
        for (const e of espectros) if (!(e.muerto > 0) && hypot(e.x - q.x, e.y - q.y) < q.r && e.estado !== 'persigue') { e.estado = 'busca'; e.ruta = []; irA(e, qx, qy); e.tEspera = q.dur; e.distraido = q.dur; }
      }
      proyectiles = proyectiles.filter(q => q.t > 0);
      actualizarLanzadas(dt);
      if (tp) {   // durante el viaje no te ven ni te atrapan
        tp.t += dt; h.inv = Math.max(h.inv, 0.4); h.mueve = false;
        if (!tp.hecho && tp.t >= tp.dur * 0.6) { tp.hecho = true; h.x = (tp.b.tx + .5) * T; h.y = (tp.b.ty + .5) * T; SON.tp2(); }
        if (tp.t >= tp.dur) tp = null;
      } else actualizarHeroe(dt);
      for (const e of espectros) actualizarEspectro(e, dt);
      if (tiempo <= 10 && tiempo > 0 && floor(tiempo) !== ultimoTic) { ultimoTic = floor(tiempo); SON.tic(); }
      if (tiempo <= 0 || (torre ? objetivoTorre() : expedicion && gemasPiso >= ronda+1)) { tiempo = Math.max(0,tiempo); terminarRonda(); }
    } else if (fase === 'aldea') {
      moverTaller(dt);
      if (!dlg && !tienda && !panelMundo) {
        armaCd = Math.max(0, armaCd - dt);
        for (const ef of efectos) ef.t -= dt;
        efectos = efectos.filter(ef => ef.t > 0);
        actualizarHeroe(dt);
        for (const e of espectros) actualizarEspectro(e, dt);
        actualizarAldea();
      }
    } else if (fase === 'menu') {
      for (const e of espectros) actualizarEspectro(e, dt);   // de fondo, patrullan solos
    }
  }

  // ---------- dibujo (resolución completa del móvil, falso 3D) ----------
  const cacheTono = {};
  function tono(hex, f) { const k = hex + f; if (cacheTono[k]) return cacheTono[k]; const n = parseInt(String(hex).slice(1), 16) || 0, c = v => limita(Math.round(v * f), 0, 255); return cacheTono[k] = 'rgb(' + c(n >> 16) + ',' + c((n >> 8) & 255) + ',' + c(n & 255) + ')'; }
  function alfa(hex, a) { const n = parseInt(String(hex).slice(1), 16) || 0; return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function R(x, y, w, hh, c) { g.fillStyle = c; g.fillRect(x, y, w, hh); }
  function poli(pts, c) { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
  function circ(x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 2 * PI); g.fill(); }
  function elip(x, y, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 2 * PI); g.fill(); }
  function linea(pts, c, lw) { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); }
  function escribe(t, x, y, tam, color, alin, borde) {
    g.font = '700 ' + tam + 'px ui-monospace, Menlo, Consolas, monospace'; g.textAlign = alin || 'left';
    if (borde) { g.lineWidth = tam * 0.28; g.lineJoin = 'round'; g.strokeStyle = '#000'; g.strokeText(t, x, y); }
    g.fillStyle = color; g.fillText(t, x, y);
  }
  const colorEstado = e => col()[e.estado] || '#ffffff';

  // ---------- RELIQUIAS hechas a mano: grulla de papel, tetera de hierro y daruma ----------
  function dibujaReliquia(x, y, s, valor, completo) {
    const C = col(), c = C['gema' + valor] || '#ffffff', t = reloj;
    const gr = g.createRadialGradient(x, y, 0, x, y, s * 2.6); gr.addColorStop(0, alfa(c, .42)); gr.addColorStop(1, alfa(c, 0)); g.fillStyle = gr; g.fillRect(x - s * 2.6, y - s * 2.6, s * 5.2, s * 5.2);
    g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
    if (valor === 1) {            // grulla de origami: mueve las alas despacio
      const al = Math.sin(t * 3 + x) * .25, pp = '#fbf6ea', sm = '#d9cfbd';
      poli([-.2, .1, -1.5, -1.3 - al, .5, -.3], sm); poli([.2, .1, 1.6, -1.2 - al, -.3, -.4], pp);
      poli([-1.1, .5, 1.1, .5, 0, 1.25], pp); poli([-1.1, .5, 0, 1.25, -.2, .5], sm);
      poli([.9, .5, 1.7, -.5, 1.25, .55], pp); poli([1.7, -.5, 2.05, -.25, 1.6, -.2], C.ninjaCinta || '#d62f3a');
      poli([-.9, .5, -2, .05, -1.2, .7], sm);
      g.strokeStyle = 'rgba(60,40,30,.55)'; g.lineWidth = .09; g.beginPath(); g.moveTo(-1.1, .5); g.lineTo(1.1, .5); g.lineTo(0, 1.25); g.closePath(); g.stroke();
    } else if (valor === 2) {     // tetera de hierro, todavía caliente
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = .12;
      for (let k = 0; k < 2; k++) { const ph = (t * .6 + k * .5) % 1; g.globalAlpha = 1 - ph; g.beginPath(); g.moveTo(1.35 + k * .3, -.5 - ph * 1.2); g.quadraticCurveTo(1.7 + k * .3, -.9 - ph * 1.2, 1.35 + k * .3, -1.3 - ph * 1.2); g.stroke(); }
      g.globalAlpha = 1;
      g.strokeStyle = '#1b1d24'; g.lineWidth = .22; g.beginPath(); g.arc(0, -.35, 1.05, PI * 1.08, PI * 1.92); g.stroke();
      poli([.9, .1, 1.7, -.45, 1.75, -.15, 1.05, .55], '#2a2d36');
      const gt = g.createRadialGradient(-.4, -.1, .1, 0, .3, 1.5); gt.addColorStop(0, '#565b6b'); gt.addColorStop(1, '#22242c'); elip(0, .35, 1.3, .95, gt);
      for (let r = 0; r < 3; r++) for (let k = -2; k <= 2; k++) circ(k * .45 + (r % 2) * .2, .05 + r * .3, .07, 'rgba(255,255,255,.28)');
      elip(0, -.5, .75, .2, '#33363f'); circ(0, -.72, .17, C.heroeMetal || '#e8c15a');
    } else {                      // daruma: le falta un ojo hasta que cumples
      const gd = g.createRadialGradient(-.4, -.5, .1, 0, 0, 1.6); gd.addColorStop(0, '#f0535f'); gd.addColorStop(1, '#a81826');
      g.fillStyle = gd; g.beginPath(); g.ellipse(0, .1, 1.25, 1.35, 0, 0, 2 * PI); g.fill();
      elip(0, -.3, .85, .7, '#f6ead0');
      g.strokeStyle = '#1b1320'; g.lineWidth = .16; g.beginPath(); g.moveTo(-.75, -.72); g.quadraticCurveTo(-.4, -.95, -.08, -.66); g.moveTo(.75, -.72); g.quadraticCurveTo(.4, -.95, .08, -.66); g.stroke();
      circ(-.38, -.35, .26, '#fff'); circ(.38, -.35, .26, '#fff'); circ(-.38, -.35, .15, '#1b1320'); if (completo) circ(.38, -.35, .15, '#1b1320');
      g.beginPath(); g.moveTo(-.3, .02); g.quadraticCurveTo(0, .16, .3, .02); g.stroke();
      g.strokeStyle = C.heroeMetal || '#e8c15a'; g.lineWidth = .14; g.beginPath(); g.moveTo(-.5, .75); g.quadraticCurveTo(0, .5, .5, .75); g.moveTo(0, .55); g.lineTo(0, 1.15); g.stroke();
    }
    g.restore();
  }
  // mochi de la abuela (el turbo)
  function dibujaMochi(x, y, s) {
    const bl = Math.sin(reloj * 5 + x) * .5 * s;
    g.fillStyle = '#5c9a4a'; g.beginPath(); g.ellipse(x, y + 3.6 * s, 7 * s, 2.6 * s, -.12, 0, 2 * PI); g.fill(); linea([x - 6 * s, y + 4 * s, x + 6 * s, y + 3 * s], '#3f7435', .5 * s);
    const gm = g.createRadialGradient(x - 1.5 * s, y - 2 * s, .5 * s, x, y, 6 * s); gm.addColorStop(0, '#ffffff'); gm.addColorStop(1, '#f3dfe6');
    g.fillStyle = gm; g.beginPath(); g.ellipse(x, y + .6 * s - bl * .3, 5.2 * s + bl * .3, 4 * s - bl * .3, 0, 0, 2 * PI); g.fill();
    circ(x - 2.6 * s, y + 1.4 * s, 1 * s, 'rgba(255,140,170,.55)'); circ(x + 2.6 * s, y + 1.4 * s, 1 * s, 'rgba(255,140,170,.55)');
    circ(x - 1.5 * s, y + .2 * s, .5 * s, '#3a2a30'); circ(x + 1.5 * s, y + .2 * s, .5 * s, '#3a2a30');
    g.strokeStyle = '#3a2a30'; g.lineWidth = .4 * s; g.beginPath(); g.arc(x, y + 1 * s, .9 * s, .15 * PI, .85 * PI); g.stroke();
  }

  function dibujaGema(x, y, s, valor, completo) {
    const c = col()['gema' + valor] || '#ffffff';
    if (!imagenes.gema && CONFIG.gemas.estilo === 'reliquias') return dibujaReliquia(x, y, s * 1.15, valor, completo);
    if (imagenes.gema) { g.drawImage(imagenes.gema, x - s * 1.3, y - s * 1.3, s * 2.6, s * 2.6); return; }
    const gr = g.createRadialGradient(x, y, 0, x, y, s * 2.6); gr.addColorStop(0, alfa(c, .5)); gr.addColorStop(1, alfa(c, 0));
    g.fillStyle = gr; g.fillRect(x - s * 2.6, y - s * 2.6, s * 5.2, s * 5.2);
    poli([x, y - s * 1.25, x + s * .8, y - s * .45, x + s * .8, y + s * .35, x, y + s * 1.25, x - s * .8, y + s * .35, x - s * .8, y - s * .45], c);
    poli([x, y - s * 1.25, x + s * .8, y - s * .45, x, y - s * .1, x - s * .8, y - s * .45], tono(c, 1.4));
    poli([x - s * .8, y - s * .45, x, y - s * .1, x, y + s * 1.25, x - s * .8, y + s * .35], tono(c, .82));
    poli([x + s * .8, y - s * .45, x, y - s * .1, x, y + s * 1.25, x + s * .8, y + s * .35], tono(c, .58));
    poli([x - s * .45, y - s * .6, x - s * .1, y - s * .95, x - s * .05, y - s * .6], 'rgba(255,255,255,.8)');
    const tw = Math.sin(reloj * 5 + x * 0.3);
    if (tw > 0.55) { const k = (tw - 0.55) * s * 2.2, px = x + s * .7, py = y - s * 1.1; linea([px - k, py, px + k, py], '#fff', s * .14); linea([px, py - k, px, py + k], '#fff', s * .14); }
  }

  function dibujaHeroe(x, y) {
    if (h.inv > 0 && !tp && floor(reloj * 12) % 2) return;
    const s = T / 24, C = col(), bote = h.mueve ? abs(Math.sin(h.anim)) * 1.6 : 0, mx = Math.cos(h.dir), my = Math.sin(h.dir);
    pisar(x, y + 7 * s, 15 * s);
    const fantasma = h.oculto > 0 && !tp; if (fantasma) g.globalAlpha = .5;
    const pid = CONFIG.aspectos?.ronin?.dibujo;
    // v0.38: animaciones del héroe por tiras (assets/mundo/ronin-*.webp, fila de casillas de 256 px). Ajustes en config.js > animacionHeroe
    const AN=CONFIG.animacionHeroe||{}, anims=AN.tiras||{};
    let clave = h.lanzando>0 ? 'lanzar' : h.carga.length ? 'cargar' : h.mueve ? 'correr' : 'quieto';
    let A=anims[clave], tira=A&&estampas[A.imagen];
    if(!tira?.naturalWidth&&clave==='cargar'){clave=h.mueve?'correr':'quieto';A=anims[clave];tira=A&&estampas[A.imagen];}
    let usaTira=false;
    if(AN.activa!==false&&tira?.naturalWidth) {
      const n=A.fotogramas, celda=tira.naturalWidth/n;
      let fr;
      if(clave==='lanzar') fr=Math.min(n-1,floor((1-h.lanzando/(A.duracion||.45))*n));
      else if(clave==='quieto') fr=floor(reloj*(A.fps||4))%n;
      else if(clave==='cargar'&&!h.mueve) fr=0;
      else fr=floor(h.anim*(A.velocidad||.75))%n;
      const alto=T*1.6*(AN.escala||1)*celda/(AN.altoPersonaje||208), pie=(AN.lineaPies||239)/celda, salto=h.mueve?((A.bote||[])[fr]||0)*s:0;
      g.save();g.translate(x,y+7*s+salto);g.scale((mx-my)>=0?1:-1,1);g.drawImage(tira,fr*celda,0,celda,celda,-alto/2,-alto*pie,alto,alto);g.restore();
      h.manos=y+7*s+salto-alto*pie*(AN.altoManos||.97);   // dónde dibujar la reliquia que lleva en alto
      usaTira=true;
    } else h.manos=null;
    const pintado=estampas[h.mueve ? (floor(h.anim*1.5)%2?'ronin-paso1':'ronin-paso2') : 'ronin-idle'];
    if (usaTira) {}
    else if(pintado?.naturalWidth) {
      const alto=T*1.6, ancho=alto*pintado.naturalWidth/pintado.naturalHeight;
      const hueco=alto*pieDe(pintado);g.save();g.translate(x,y+7*s+hueco);g.scale((mx-my)>=0?1:-1,1-bote*.012);g.drawImage(escalada(pintado,ancho,alto),-ancho/2,-alto,ancho,alto);g.restore();
    }
    else if (!imagenes.heroe && pid && PJ(pid)) PJ(pid).dibujar(g, pid, { x, y: y + 7*s - bote*s, alto: (CONFIG.pantalla.altoHeroe || 1.55)*T, t: reloj, mirando: mx >= 0 ? 1 : -1 });
    else if (imagenes.heroe) g.drawImage(imagenes.heroe, x - T / 2, y - T * 0.7 - bote * s, T, T);
    else {
      g.save(); g.translate(x, y + 7 * s - bote * s); g.scale(s, s);   // origen en los pies
      // RŌNIN CHIBI (diseños propios). El aspecto sale de config.js > aspectos
      const A = CONFIG.aspectos?.ronin || { sombrero: 'paja', ropa: '#f3ecdc', hakama: '#6b665c', faja: '#e2574c', cara: '#2a2224', detalle: '#8a5a34', ojos: '#ffffff' };
      const p = h.mueve ? Math.sin(h.anim) * 2.2 : 0, lado = mx >= 0 ? 1 : -1, atras = my <= -0.6, fx = mx * 1.4, ond = Math.sin(reloj * 9) * 1.2, oro = C.heroeMetal || '#e8c15a';
      g.lineCap = 'round';
      const katana = () => { linea([-lado * 8.5, -3, lado * 6.6, -19.5], A.vaina || '#15171d', 1.9); linea([lado * 6.6, -19.5, lado * 9.6, -23.2], A.faja, 1.7); circ(lado * 6.6, -19.5, 1.2, oro); if (A.sombrero !== 'paja') { linea([-lado * 9.5, -6, lado * 4, -17], A.vaina || '#15171d', 1.4); linea([lado * 4, -17, lado * 6.4, -19.6], A.faja, 1.3); } };
      if (!atras) katana();
      for (const d of [-1, 1]) { const q = d * p * .45; elip(d * 2.5, -3.6 + q, 3.1, 3.5, A.hakama); R(d < 0 ? -4.8 : .5, -1 + q, 4.3, 1.1, A.detalle); R(d < 0 ? -4.2 : 1, -2.3 + q, 3.2, .6, A.faja); }
      const gp = g.createLinearGradient(0, -12, 0, -5); gp.addColorStop(0, A.ropa); gp.addColorStop(1, tono(A.ropa, .8));
      poli([-5.2, -11.8, 5.2, -11.8, 6, -5.2, -6, -5.2], gp);
      if (!atras) poli([-2.8, -11.8, 0, -7.6, 2.8, -11.8, 1.5, -11.8, 0, -9.4, -1.5, -11.8], A.cara);
      for (const d of [-1, 1]) { const q = d * p * .35; poli([d * 4.6, -11.7, d * 9.4, -8.4 + q, d * 8.4, -4.8 + q, d * 4.9, -6.4], tono(A.ropa, .92)); linea([d * 8.9, -6.6 + q, d * 5.6, -7.6], tono(A.ropa, .7), .4); circ(d * 8.3, -5 + q, 1.45, A.mano || A.cara); }
      R(-6.1, -6.8, 12.2, 2.1, A.faja); R(-6.1, -5.1, 12.2, .5, tono(A.faja, .7));
      if (!atras) { poli([-2.6, -5, -4, -.4 + ond * .3, -2.2, -.7 + ond * .3, -1.2, -5], A.faja); poli([-1.4, -5, -1.6, .2 + ond * .2, -.2, -.2 + ond * .2, -.2, -5], tono(A.faja, .85)); circ(-1.6, -5.6, 1.35, tono(A.faja, .8)); }
      circ(0, -15, 5.5, A.cara);
      if (!atras) { elip(fx - 1.9, -14.5, 1.05, .6, A.ojos || '#fff'); elip(fx + 1.9, -14.5, 1.05, .6, A.ojos || '#fff'); }
      if (A.sombrero === 'plano') {           // kasa ancho y liso
        elip(0, -17, 12.8, 2.7, '#cfcfd6'); poli([-12.8, -17, 12.8, -17, 0, -23.4], '#f4f4f6'); poli([0, -23.4, 12.8, -17, 3, -17], '#e2e2e8');
        linea([-12.8, -17, 12.8, -17], oro, .5); linea([-9.5, -16.4, -9.5, -11.2 + ond * .3], '#f4f4f6', .5); R(-10, -11.4 + ond * .3, 1, 1.6, A.faja);
      } else if (A.sombrero === 'mascara') {  // máscara blanca con astas doradas
        poli([-10.5, -16.2, 10.5, -16.2, 6.5, -20.6, -6.5, -20.6], '#3a3a42'); linea([-10.5, -16.2, 10.5, -16.2], oro, .5);
        g.fillStyle = '#f4f1ea'; g.beginPath(); g.arc(0, -17.6, 6.3, PI, 0); g.lineTo(4.4, -14.4); g.lineTo(0, -13); g.lineTo(-4.4, -14.4); g.closePath(); g.fill();
        if (!atras) { poli([fx - 3.4, -16.4, fx - .9, -15.6, fx - 3, -15], '#1a1216'); poli([fx + 3.4, -16.4, fx + .9, -15.6, fx + 3, -15], '#1a1216'); linea([fx, -19.5, fx, -17.4], A.faja, .7); }
        g.strokeStyle = oro; g.lineWidth = 1.1; g.beginPath(); for (const d of [-1, 1]) { g.moveTo(d * 3.2, -22.6); g.quadraticCurveTo(d * 5, -25.5, d * 4.2, -29); g.moveTo(d * 4.4, -25.4); g.lineTo(d * 7.4, -27.4); g.moveTo(d * 4.5, -27.4); g.lineTo(d * 6.4, -30.4); } g.stroke();
        poli([-lado * 5.4, -20.4, -lado * 10 , -22.6 + ond, -lado * 9, -19.4 + ond], A.faja);
      } else {                                // sombrero de paja deshilachado
        elip(0, -16.3, 10.8, 2.3, '#bfa96c'); poli([-10.8, -16.3, 10.8, -16.3, 0, -24.6], '#e3d2a0'); poli([0, -24.6, 10.8, -16.3, 2.5, -16.3], '#d3bf88');
        g.strokeStyle = '#b89f62'; g.lineWidth = .35; g.beginPath(); for (let k = -4; k <= 4; k++) { g.moveTo(0, -24.6); g.lineTo(k * 2.5, -16.3); } g.stroke();
        for (let k = -5; k <= 5; k++) linea([k * 2.1, -16.2, k * 2.1 + (k % 2 ? .5 : -.4), -15.1 - (k & 1) * .5], '#bfa96c', .4);
        R(-4.2, -20.4, 2, 2.4, A.faja);
      }
      if (atras) katana();
      g.restore();
    }
    g.globalAlpha = 1;
    if (h.paraguas > 0) { const py = y - 24 * s - bote * s, c = col().ninjaCinta || '#d62f3a'; linea([x, y - 6 * s, x, py], '#6b452c', .9 * s); g.fillStyle = c; g.beginPath(); g.ellipse(x, py, 14 * s, 7 * s, 0, PI, 0); g.fill(); g.strokeStyle = tono(c, .6); g.lineWidth = .5 * s; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x, py - 7 * s); g.lineTo(x + k * 5.5 * s, py); g.stroke(); } R(x - 14 * s, py - .4 * s, 28 * s, .9 * s, '#f6ecd4'); }
    h.carga.forEach((gema,i)=>dibujaGema(x+(i-(h.carga.length-1)/2)*10*s,(h.manos!=null?h.manos-i*7*s:y-22*s-bote*s)+Math.sin(reloj*6+i)*s*.6,4.2*s,gema.valor));
    if (h.turbo > 0 || h.corre) for (let i = 1; i < 5; i++) circ(x - mx * i * 5 * s, y + 5 * s - my * i * 5 * s, (2.2 - i * .35) * s, 'rgba(255,255,255,' + (0.5 - i * 0.1) + ')');
  }

  // ESPECTRO (diseño propio): sudario flotante, pecho abierto como una boca con dientes y un
  // corazón dentro, calavera astada con un ojo enorme, garras largas. Al perseguir, grita.
  function dibujaEspectro(e, x, y, esc, forzar) {
    esc = esc || 1;
    const s = T / 24 * esc, C = col(), furia = forzar || e.estado === 'persigue', ce = forzar ? C.persigue : colorEstado(e), gore = CONFIG.gore.sangre;
    const t = e.anim, w = Math.sin(t * (furia ? 13 : 3.2)), w2 = Math.sin(t * (furia ? 9 : 2.1) + 1.3);
    const mx = forzar ? 0 : Math.cos(e.dir), my = forzar ? 1 : Math.sin(e.dir), lado = mx >= 0 ? 1 : -1, espalda = my < -0.7;
    const flota = !!(CONFIG.espectros[e.tipo] || {}).flota;
    if (!forzar) { if (flota) elip(x, y + 7 * s, 11 * s, 3.4 * s, 'rgba(0,0,0,' + (.32 - w2 * .06) + ')'); else pisar(x, y + 7 * s, 26 * s); }
    const pintado=estampas['enemigo-'+e.tipo];
    if(pintado?.naturalWidth){
      const ME=CONFIG.espectros[e.tipo]||{},alto=(ME.alto||2.2)*T*esc,ancho=alto*pintado.naturalWidth/pintado.naturalHeight;
      const yy=y+7*s+alto*pieDe(pintado)+(forzar||!flota?0:w2*1.6*s-2.5*s);
      if(furia){const halo=g.createRadialGradient(x,yy-alto*.4,0,x,yy-alto*.4,alto*.62);halo.addColorStop(0,'#e03c3555');halo.addColorStop(1,'#e03c3500');circ(x,yy-alto*.4,alto*.62,halo);}
      g.save();g.translate(x,yy);g.scale(mx-my>=0?1:-1,flota?1:1+w2*.012);g.rotate(flota?w*.012:0);g.drawImage(escalada(pintado,ancho,alto),-ancho/2,-alto,ancho,alto);g.restore();
      if(e.lento>0&&esc===1)dibujaHuevo(g,x,yy-alto-5*s,3*s,reloj);
    }
    else if (!imagenes.espectro && e.tipo && PJ(e.tipo)) {
      const ME = (CONFIG.espectros || {})[e.tipo] || {}, alto = (ME.alto || 2.3) * T * esc, yy = y + 8 * s + (forzar ? 0 : w2 * 1.2 * s);
      if (furia) { const gg = g.createRadialGradient(x, yy - alto * .55, 0, x, yy - alto * .55, alto * .75); gg.addColorStop(0, alfa(ce, .32)); gg.addColorStop(1, alfa(ce, 0)); g.fillStyle = gg; g.fillRect(x - alto, yy - alto * 1.4, alto * 2, alto * 1.8); }
      PJ(e.tipo).dibujar(g, e.tipo, { x: x + (furia ? azar(-.8, .8) * s : 0), y: yy, alto, t: e.anim * (furia ? 2.2 : 1), mirando: lado });
      if (e.lento > 0 && esc === 1) dibujaHuevo(g, x, yy - alto - 6 * s, 3 * s, reloj);
    }
    else if (imagenes.espectro) { g.drawImage(imagenes.espectro, x - T * 0.9 * esc, y - T * 1.9 * esc + w2 * s, T * 1.8 * esc, T * 2.3 * esc); }
    else {
      g.save(); g.translate(x + (furia ? azar(-.7, .7) * s : 0), y + 5 * s + w2 * 1.2 * s); g.scale(s, s); g.rotate(lado * (furia ? 0.10 : 0.04) + w2 * 0.025);
      g.lineCap = 'round'; g.lineJoin = 'round';
      // sudario hecho jirones, se deshace en niebla
      const gr = g.createLinearGradient(0, -36, 0, 3); gr.addColorStop(0, C.espectro); gr.addColorStop(.62, C.espectro); gr.addColorStop(1, alfa(C.espectro, 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(-7, -35); g.quadraticCurveTo(-14, -24, -12 + w2, -6);
      for (let i = 0; i <= 8; i++) g.lineTo(-12 + i * 3 + w2 * (i % 2 ? .5 : 1.2), (i % 2 ? -10 : 2) + Math.sin(t * 4 + i * 1.7) * 1.6);
      g.quadraticCurveTo(14, -24, 7, -35); g.closePath(); g.fill();
      // hombros con espinas de hueso
      for (const d of [-1, 1]) { poli([d * 6, -35.5, d * 14, -39, d * 9.5, -30.5], C.espectro); poli([d * 9.5, -36.5, d * 13.5, -44, d * 11.5, -36], C.espectroHueso); poli([d * 12, -35, d * 17, -39.5, d * 13, -33.8], tono(C.espectroHueso, .8)); }
      // brazos descarnados y garras
      for (const d of [-1, 1]) {
        const sw = (d < 0 ? w : -w) * (furia ? 1.5 : 2.5);
        const el = furia ? [d * 16, -30 + sw] : [d * 14.5, -21 + sw * .4], ha = furia ? [d * 19 + lado * 3, -40 + sw] : [d * 13 + lado * 2, -9 + sw];
        linea([d * 8, -32, el[0], el[1], ha[0], ha[1]], C.espectro, 2.7);
        linea([d * 8, -32, el[0], el[1], ha[0], ha[1]], alfa(C.espectroHueso, .5), .7);
        circ(el[0], el[1], 1.5, tono(C.espectroHueso, .7));
        for (let k = -2; k <= 2; k++) {
          const a = (furia ? -PI / 2 : PI / 2) + k * 0.32 + d * 0.15, Lg = (furia ? 8.5 : 6.8) - abs(k) * .7, ux = Math.cos(a), uy = Math.sin(a);
          linea([ha[0], ha[1], ha[0] + ux * Lg, ha[1] + uy * Lg], C.espectroHueso, .95);
          linea([ha[0] + ux * Lg * .68, ha[1] + uy * Lg * .68, ha[0] + ux * Lg, ha[1] + uy * Lg], C.sangre, .95);
        }
      }
      if (!espalda) {
        // pecho: costillas abiertas y herida-boca
        const ab = (furia ? 3.2 : 1.4) + abs(w) * (furia ? 1.2 : .4);
        g.strokeStyle = C.espectroHueso; g.lineWidth = 1.15;
        for (let i = 0; i < 4; i++) for (const d of [-1, 1]) { const yy = -30.5 + i * 3.4; g.beginPath(); g.moveTo(d * (ab * .7 + .3), yy + 1); g.quadraticCurveTo(d * 7, yy - 1.6, d * 8.4, yy + 2.2); g.stroke(); }
        const gm = g.createLinearGradient(0, -32, 0, -16); gm.addColorStop(0, C.sangre); gm.addColorStop(1, '#12000a');
        g.fillStyle = gm; g.beginPath(); g.moveTo(0, -32.5); g.quadraticCurveTo(ab + 1.2, -24, 0, -15.5); g.quadraticCurveTo(-ab - 1.2, -24, 0, -32.5); g.fill();
        for (let i = 0; i < 5; i++) { const yy = -30 + i * 3, xe = (ab + 1.2) * 0.55 * (1 - Math.pow((yy + 24) / 8.5, 2)); if (xe > .5) for (const d of [-1, 1]) poli([d * xe, yy - .8, d * xe, yy + .8, d * (xe - 1.4), yy], C.espectroHueso); }
        const lat = 1.4 + abs(Math.sin(t * (furia ? 9 : 3))) * .9, gc = g.createRadialGradient(0, -24, 0, 0, -24, lat * 2.4);
        gc.addColorStop(0, '#ffc2c8'); gc.addColorStop(.4, '#ff2e4a'); gc.addColorStop(1, 'rgba(255,46,74,0)'); circ(0, -24, lat * 2.4, gc);
        if (gore) for (let k = 0; k < 2; k++) { const ph = (t * (.9 + k * .3) + k * .5) % 1, dx = k * 1.6 - .8; R(dx - .4, -16, .8, ph * 9, C.sangre); circ(dx, -16 + ph * 13, .9, C.sangre); }
      } else for (let i = 0; i < 7; i++) circ(0, -33 + i * 3.6, 1.15, tono(C.espectroHueso, .75));   // de espaldas: la columna
      for (let i = 0; i < 3; i++) R(-1.1, -38.6 + i * 1.5, 2.2, 1.1, tono(C.espectroHueso, .8));
      // cabeza
      g.translate(lado * 1.2 + mx * .8, furia ? w * .6 : 0);
      g.strokeStyle = C.espectro; g.lineWidth = 1.7; g.beginPath();
      g.moveTo(-4, -48); g.quadraticCurveTo(-9, -51, -10, -58.5); g.moveTo(-8.3, -53); g.lineTo(-13.5, -55.5); g.moveTo(-9.6, -56); g.lineTo(-12.5, -59.5);
      g.moveTo(4, -48); g.quadraticCurveTo(8, -50, 9.5, -54.5); g.lineTo(8.2, -53.2); g.stroke();   // un asta rota
      const gs = g.createRadialGradient(-2, -47.5, 1, 0, -44, 9.5); gs.addColorStop(0, tono(C.espectroHueso, 1.14)); gs.addColorStop(1, tono(C.espectroHueso, .58));
      g.fillStyle = gs; g.beginPath(); g.moveTo(-6.2, -45); g.bezierCurveTo(-6.9, -52.8, 6.9, -52.8, 6.2, -45); g.quadraticCurveTo(5.8, -40.5, 3, -38.2); g.lineTo(-3, -38.2); g.quadraticCurveTo(-5.8, -40.5, -6.2, -45); g.fill();
      for (let k = 0; k < 9; k++) { const hx0 = -8 + k * 2; if (abs(hx0) < 4) continue; g.strokeStyle = '#0b0710'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(hx0 * .7, -51); g.quadraticCurveTo(hx0 * 1.25 + w2, -42, hx0 * 1.1 + w2 * 1.6, -30 + (k * 5) % 9); g.stroke(); }   // melena de onryō
      linea([2, -51.5, 3, -49, 2.2, -47.6], tono(C.espectroHueso, .35), .4); linea([-4.6, -49.6, -3.6, -48], tono(C.espectroHueso, .35), .4);
      if (!espalda) {
        if (furia) { const gg = g.createRadialGradient(0, -44.5, 1, 0, -44.5, 12); gg.addColorStop(0, alfa(ce, .5)); gg.addColorStop(1, alfa(ce, 0)); circ(0, -44.5, 12, gg); }
        elip(0, -44.5, 4.5, 3.9, '#0a0006');
        const ge = g.createRadialGradient(mx, -45, .2, 0, -44.5, 3.2); ge.addColorStop(0, '#ffffff'); ge.addColorStop(.35, ce); ge.addColorStop(1, tono(ce, .5)); circ(0, -44.5, 3.15, ge);
        g.strokeStyle = C.sangre; g.lineWidth = .35; g.beginPath();
        g.moveTo(-3, -45.6); g.lineTo(-1.4, -44.9); g.lineTo(-1, -44); g.moveTo(3, -43.6); g.lineTo(1.5, -44.2); g.moveTo(-2.2, -42.6); g.lineTo(-1, -43.6); g.moveTo(2.4, -46.4); g.lineTo(1.2, -45.5); g.stroke();
        elip(mx * 1.3, -44.5 + my * 1, furia ? .45 : .85, 2.3, '#000'); circ(-1, -45.7, .5, 'rgba(255,255,255,.9)');
        circ(-4.6, -40.6, .95, '#0a0006'); circ(-4.6, -40.6, .55, ce); circ(4.4, -40.2, .8, '#0a0006'); circ(4.4, -40.2, .42, ce);   // ojos de más
        poli([0, -41.3, -.8, -39.6, .8, -39.6], '#16000a');
        // mandíbula que se descuelga
        const d = furia ? 4.6 + abs(w) * 1.5 : 1.2 + abs(w2) * .5;
        R(-3, -38.4, 6, d + 1, '#16000a');
        poli([-3.6, -37.6 + d, 3.6, -37.6 + d, 2.4, -35 + d, -2.4, -35 + d], tono(C.espectroHueso, .78));
        for (let i = -2; i <= 2; i++) { poli([i * 1.15 - .5, -38.4, i * 1.15 + .5, -38.4, i * 1.15, -36.6 + (i & 1) * .9], C.espectroHueso); poli([i * 1.1 - .45, -37.6 + d, i * 1.1 + .45, -37.6 + d, i * 1.1, -39 + d], C.espectroHueso); }
        if (furia) { g.strokeStyle = C.sangre; g.lineWidth = 1.3; g.beginPath(); g.moveTo(0, -37.2 + d * .5); g.quadraticCurveTo(1.5 + w2 * 1.5, -33 + d, w2 * 2.5, -29.5 + d); g.stroke(); }
        if (gore) R(-1.9, -35 + d, .5, ((t * 1.1) % 1) * 5, C.sangre);
      }
      g.restore();
    }
    if (esc === 1 && e.estado !== 'patrulla') escribe(furia ? '!' : '?', x, y - 58 * s, 12, ce, 'center', true);
  }

  // ---------- ALDEA: vecinos, misiones y armas ----------
  let prog, dlg = null, cerca = null, armaCd = 0, efectos = [], dlgEl, btnAccion, btnDojo, etiquetaAccion = null;
  const hayAldea = () => typeof ALDEA !== 'undefined' && ALDEA && ALDEA.mapa;
  const armas = () => CONFIG.armas || {};
  function leerProg() { prog = progNuevo(); try { const p = JSON.parse(localStorage.getItem('reliquias-progreso') || 'null'); if (p) { prog = Object.assign(progNuevo(), p); if (!p.versionJade) prog.huevo = false;
      for (const id of p.aspectos || []) if (MUNDO.favores[id]) prog.favores[id]=true;
      prog.aspecto='ronin'; } } catch (e) { } recalcularEquipo(); }
  function guardarProg() { try { localStorage.setItem('reliquias-progreso', JSON.stringify(prog)); } catch (e) { } }
  const misiones = () => Object.entries({ ...ALDEA.personajes, ...MUNDO.personajes }).filter(([, p]) => p.mision);
  const pasosMundo = () => zona()?.pasos || MUNDO.pasosAldea;
  const nombreZona = id => id === 'aldea' ? ALDEA.nombre : MUNDO.zonas[id].nombre;
  const abierto = paso => !paso[4] || prog.m[paso[4]] === 'hecha';
  const cercaCasilla = ([x, y], alcance = 1.05) => hypot((x + .5) * T - h.x, (y + .5) * T - h.y) < alcance * T;
  function irAldea(id = 'aldea', llegada) {
    if (!hayAldea()) return irMenu();
    const primeraVisita = id !== 'aldea' && !prog.visitadas.includes(id);
    zonaId = id; fase = 'aldea'; bando = 'heroe'; tienda = false; dlg = null; cerca = null; panelMundo = '';
    cargarNivel(0, true); ignorarHasta = performance.now() + 6000; colocarCofres(); setTimeout(comprobarDiaria, 1800);
    for (const [fx, fy] of (((CONFIG.decoracion || {}).faroles || {})[id] || [])) if (L.c[fy] && L.c[fy][fx] === 0) L.c[fy][fx] = 7;   // los faroles no se atraviesan
    if (id === 'aldea' && ZU()) { const p = ZU().puesto; for (let yy = p.y; yy < p.y + p.fondo; yy++) for (let xx = p.x; xx < p.x + p.ancho; xx++) if (L.c[yy] && L.c[yy][xx] === 0) L.c[yy][xx] = 7; TALLER.zumos = p; }
    if (id !== zonaPrevia) cortina = { t: 0, nombre: nombreZona(id), preparada: false }; zonaPrevia = id;
    if (llegada) { h.x = (llegada[0] + .5) * T; h.y = (llegada[1] + .5) * T; }
    if (id === 'aldea' && !prog.inicioCampana) {
      prog.inicioCampana = true; guardarProg();
      decir('Pulsa MUNDO o toma el camino del sur hacia el bosque.', 7);
    }
    if (primeraVisita) {
      prog.visitadas.push(id); prog.xp += 15; guardarProg();
      panelMundo = 'llegada';
    }
    guiaActual=null; actualizarGuia(); pintarUI(); pintarDlg();
  }
  const sellosListos = () => MUNDO.zonas.santuario.sellos.every((_, i) => prog.sellos[i]);
  const objetoVisible = o => prog.m[o.id] === 'activa' && !prog.items[o.id] && (o.id !== 'v' || sellosListos());
  function regionMision(id) {
    if (ALDEA.personajes[id]?.mision) return 'aldea';
    return Object.keys(MUNDO.zonas).find(k=>MUNDO.zonas[k].puntos.some(p=>p[2]===id));
  }
  const misionDisponible=(id,p)=>prog.m[id]!=='hecha' && !(p.mision.requisitos || []).some(k=>prog.m[k]!=='hecha');
  function pasoHacia(region) {
    const cola=[[zonaId,null]], vistas=new Set([zonaId]);
    for (const [origen,primero] of cola) {
      if(origen===region) return primero;
      const pasos=origen==='aldea'?MUNDO.pasosAldea:MUNDO.zonas[origen].pasos;
      for(const p of pasos) if(abierto(p)&&!vistas.has(p[2])) {
        vistas.add(p[2]);cola.push([p[2],primero||p]);
      }
    }
    return null;
  }
  function siguienteObjetivo() {
    if (prog.guia===false || fase!=='aldea' || !h) return null;
    const lista=misiones().filter(([id,p])=>misionDisponible(id,p));
    const entrada=lista.find(([id])=>id===prog.guia) || lista.find(([id])=>prog.m[id]==='activa'&&regionMision(id)===zonaId) ||
      lista.find(([id])=>regionMision(id)===zonaId) || lista.find(([id])=>prog.m[id]==='activa') || lista[0];
    if(!entrada)return null;
    const [id,p]=entrada, region=regionMision(id), m=p.mision;
    const paso=region!==zonaId ? pasoHacia(region) : null;
    const titulo=m.titulo || m.nombreObjeto;
    if(paso) return {id,titulo,x:paso[0],y:paso[1],tipo:'paso',texto:'Viaja a '+nombreZona(paso[2])};
    if(region!==zonaId)return null;
    const n=L.npcs.find(n=>n.id===id);
    if(prog.m[id]!=='activa' || prog.items[id]) return n ? {id,titulo,x:n.tx,y:n.ty,tipo:'hablar',texto:(prog.items[id]?'Vuelve con ':'Habla con ')+p.nombre.split(',')[0]} : null;
    if(id==='v' && !sellosListos()) {
      const sellos=MUNDO.zonas.santuario.sellos;
      const i=sellos.findIndex((_,i)=>!prog.sellos[i]);
      return {id,titulo,x:sellos[i][0],y:sellos[i][1],tipo:'sello',texto:'Enciende el sello '+(Object.keys(prog.sellos).length+1)+' de 3'};
    }
    const o=L.objetos.find(o=>o.id===id);
    return o ? {id,titulo,x:o.tx,y:o.ty,tipo:'objeto',texto:'Recoge '+m.nombreObjeto} : null;
  }
  function actualizarGuia() {
    const o=siguienteObjetivo();
    if(!o){guiaActual=null;return;}
    const tx=floor(h.x/T),ty=floor(h.y/T);
    const clave=[o.id,o.tipo,o.x,o.y,tx,ty].join(':');
    if(guiaActual?.clave===clave)return;
    let ruta=[];
    if(o.tipo==='hablar') {
      if(abs(tx-o.x)+abs(ty-o.y)!==1) ruta=buscar(tx,ty,(x,y)=>abs(x-o.x)+abs(y-o.y)===1,solido)||[];
    } else ruta=camino(tx,ty,o.x,o.y,solido);
    guiaActual={...o,clave,ruta};
  }
  function dibujaRutaGuia(x0,y0,x1,y1) {
    if(!guiaActual||fase!=='aldea')return;
    for(let i=0;i<guiaActual.ruta.length;i+=2) {
      const [x,y]=guiaActual.ruta[i];
      if(x<x0||x>x1||y<y0||y>y1) continue;
      const px=(x+.5)*T,py=(y+.53)*T;
      const luz=.6+.22*Math.sin(reloj*3-i*.55);
      circ(px,py,2.35,'#241811b0');circ(px,py,1.35,alfa('#ffe4a0',luz));
    }
  }
  function marcadorGuia(x,y,r) {
    poli([x,y-r,x+r*.78,y,x,y+r,x-r*.78,y],'#3a2923');
    poli([x,y-r*.72,x+r*.55,y,x,y+r*.72,x-r*.55,y],'#ffe6a0');
  }

  // ---------- v0.38 ECONOMÍA: rangos, premio diario, logros y mercado (datos en economia.js) ----------
  const EC = () => (typeof ECONOMIA !== 'undefined' ? ECONOMIA : null);
  let panelEco = null;   // 'diaria' | 'logros'
  function rangoActual() { const E = EC(), n = MUNDO.nivel(prog.xp); let r = 0; if (E) E.rangos.forEach((x, i) => { if (n >= x.desde) r = i; }); return r; }
  const rango = () => (EC()?.rangos[rangoActual()]) || { nombre: 'Viajero', mult: 1 };
  // da un premio {monedas, fichas, xp, material:[id,n], objeto:[rarezas], siRepetido} y devuelve las líneas para enseñarlo
  function darPremio(p, mult = 1) {
    const L2 = [];
    if (p.monedas) { const mo = Math.round(p.monedas * mult); prog.puntos += mo; L2.push('◈ +' + mo + ' monedas'); }
    if (p.fichas) { prog.fichas += p.fichas; L2.push('✦ +' + p.fichas + (p.fichas > 1 ? ' fichas' : ' ficha') + ' de la Rueda'); }
    if (p.xp) { const a = prog.xp; ganarXP(p.xp); L2.push('+' + (prog.xp - a) + ' XP'); }
    if (p.material) { const [k, n] = p.material; prog.materiales[k] = (prog.materiales[k] || 0) + n; L2.push((EQUIPO.materiales[k] || k) + ' × ' + n); }
    if (p.objeto) {
      const op = Object.entries(EQUIPO.objetos).filter(([id, o]) => p.objeto.includes(o.rareza) && !equipoPoseido(id));
      if (op.length) { const [id, o] = op[floor(Math.random() * op.length)]; prog.inventario[id] = 1; L2.push('⚔ ' + o.nombre + ' (' + o.rareza + ')'); }
      else { const mo = p.siRepetido || 60; prog.puntos += mo; L2.push('◈ +' + mo + ' monedas (ya lo tenías todo)'); }
    }
    return L2;
  }
  // cuenta algo que has hecho y avisa si completas un logro
  function contar(stat, n = 1) {
    const E = EC(); if (!E || !prog) return;
    prog.stats = prog.stats || {}; const antes = prog.stats[stat] || 0; prog.stats[stat] = antes + n;
    for (const l of E.logros) if (l.stat === stat && antes < l.meta && prog.stats[stat] >= l.meta) { decir('Logro: ' + l.nombre + ' · cóbralo en Misiones › Recompensas', 3.2); [880, 1175].forEach((q, i) => setTimeout(() => pitido(q, .14, 'triangle', .45), i * 90)); }
  }
  const logrosPorCobrar = () => (EC()?.logros || []).filter(l => (prog.stats?.[l.stat] || 0) >= l.meta && !prog.cobrados?.[l.id]).length;
  function comprobarDiaria() {
    const E = EC(); if (!E || !prog || prog.diaCobrado === hoy() || fase !== 'aldea' || panelEco) return;
    const ayer = new Date(Date.now() - 864e5), ay = ayer.getFullYear() + '-' + (ayer.getMonth() + 1) + '-' + ayer.getDate();
    prog.rachaDiaria = prog.diaCobrado === ay ? ((prog.rachaDiaria || 0) % E.diaria.length) + 1 : 1;
    panelEco = 'diaria'; soltarJoy(); pintarUI();
  }
  function htmlDiaria() {
    const E = EC(), d = prog.rachaDiaria || 1;
    const casillas = E.diaria.map((p, i) => '<div class="rq-dia' + (i + 1 < d ? ' hecho' : i + 1 === d ? ' hoy' : '') + '"><small>Día ' + (i + 1) + '</small><b>' + (p.objeto ? '⚔' : p.fichas ? '✦' : '◈') + '</b><small>' + (p.monedas || '') + '</small></div>').join('');
    return '<div class="rq-hanko">日</div><h2>Premio del día</h2><p>Rango: <b>' + esc(rango().nombre) + '</b> · las monedas valen ×' + rango().mult + '</p><div class="rq-dias">' + casillas + '</div>' +
      '<p><small>Entra cada día para llegar al día 7. Si fallas un día, la racha vuelve a empezar.</small></p><button class="rq-b" data-a="cobrarDiaria">Cobrar el día ' + d + '</button>';
  }
  function htmlLogros() {
    const E = EC(); prog.stats = prog.stats || {}; prog.cobrados = prog.cobrados || {};
    const filas = E.logros.map(l => {
      const v = Math.min(l.meta, prog.stats[l.stat] || 0), ok = v >= l.meta, cobrado = prog.cobrados[l.id];
      const pr = [l.premio.monedas && '◈ ' + Math.round(l.premio.monedas * rango().mult), l.premio.fichas && '✦ ' + l.premio.fichas, l.premio.material && (EQUIPO.materiales[l.premio.material[0]] || '') + ' ×' + l.premio.material[1], l.premio.objeto && '⚔ ' + l.premio.objeto.join('/')].filter(Boolean).join(' · ');
      return '<div class="rq-logro' + (cobrado ? ' cobrado' : ok ? ' listo' : '') + '"><div><b>' + esc(l.nombre) + '</b><small>' + v + ' / ' + l.meta + ' · ' + pr + '</small><progress value="' + v + '" max="' + l.meta + '"></progress></div>' +
        (cobrado ? '<em>✓</em>' : ok ? '<button class="rq-c" data-a="cobrarLogro" data-id="' + l.id + '">Cobrar</button>' : '') + '</div>';
    }).join('');
    return '<div class="rq-hanko">賞</div><h2>Recompensas</h2><p>Rango <b>' + esc(rango().nombre) + '</b> (nivel ' + MUNDO.nivel(prog.xp) + ') · premios ×' + rango().mult + '</p>' + filas + '<button class="rq-b sec" data-a="cerrarEco">Volver</button>';
  }
  // ofertas del mercado: cambian cada día y según tu rango
  function ofertasDelDia() {
    const E = EC(); if (!E) return [];
    const r = rangoActual(), pool = E.mercado.stock.map((o, i) => ({ ...o, i })).filter(o => o.rango <= r);
    const rnd = semilla([...(hoy() + 'm' + r)].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 3) >>> 0), out = [];
    while (out.length < E.mercado.ofertas && pool.length) out.push(pool.splice(floor(rnd() * pool.length), 1)[0]);
    return out;
  }
  function textoOferta(o) {
    return o.tipo === 'material' ? (EQUIPO.materiales[o.id] || o.id) + ' × ' + o.cantidad : o.tipo === 'fichas' ? o.cantidad + (o.cantidad > 1 ? ' fichas' : ' ficha') + ' de la Rueda' : o.tipo === 'xp' ? o.cantidad + ' XP (pergamino de estudio)' : 'Objeto ' + o.rarezas.join('/') + ' sorpresa';
  }
  function comprarOferta(i) {
    const o = ofertasDelDia().find(x => x.i === +i); if (!o) return; prog.mercado = prog.mercado || {}; const k = hoy() + ':' + o.i;
    if (prog.mercado[k] || prog.puntos < o.precio) return;
    prog.puntos -= o.precio; prog.mercado[k] = true;
    const L2 = darPremio(o.tipo === 'material' ? { material: [o.id, o.cantidad] } : o.tipo === 'fichas' ? { fichas: o.cantidad } : o.tipo === 'xp' ? { xp: o.cantidad } : { objeto: o.rarezas, siRepetido: Math.round(o.precio * .8) });
    decir('Comprado: ' + L2.join(' · '), 2.8); guardarProg(); SON.entregar(); pintarUI();
  }
  function venderMaterial(k) {
    const E = EC(), p = E?.mercado.venta[k]; if (!p || !(prog.materiales[k] > 0)) return;
    prog.materiales[k]--; prog.puntos += p; guardarProg(); pitido(990, .06, 'triangle', .4); pintarUI();
  }
  function htmlMercado() {
    const E = EC(); if (!E) return ''; prog.mercado = prog.mercado || {};
    let o = '<h3>Mercado del día · rango ' + esc(rango().nombre) + '</h3>';
    for (const of of ofertasDelDia()) { const hecho = prog.mercado[hoy() + ':' + of.i]; o += '<div class="rq-item"><div style="flex:1"><b>' + esc(textoOferta(of)) + '</b><br><span>Cambia mañana. Sube de rango para ver mejores ofertas.</span></div>' + (hecho ? '<em>VENDIDO</em>' : '<button class="rq-c" data-a="comprarOferta" data-id="' + of.i + '"' + (prog.puntos < of.precio ? ' disabled' : '') + '>' + of.precio + ' monedas</button>') + '</div>'; }
    o += '<h3>Vender materiales</h3>';
    for (const k in E.mercado.venta) o += '<div class="rq-item"><div style="flex:1"><b>' + esc(EQUIPO.materiales[k] || k) + '</b> <small>tienes ' + (prog.materiales[k] || 0) + '</small></div><button class="rq-c" data-a="venderMaterial" data-id="' + k + '"' + (prog.materiales[k] > 0 ? '' : ' disabled') + '>+' + E.mercado.venta[k] + ' monedas</button></div>';
    return o;
  }
  // ---------- v0.38 COFRES por el mapa (ajustes y premios en config.js > cofres) ----------
  let cofres = [], cofreAbierto = null;
  const hoy = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function colocarCofres() {
    cofres = []; const K = CONFIG.cofres; if (!K || !L.exterior || fase === 'jugando' || expedicion) return;
    const dia = K.cadaDia ? hoy() : 'fijo', clave = zonaId + '@' + dia;
    prog.cofres = prog.cofres || {}; if (prog.cofresDia !== dia) { prog.cofres = {}; prog.cofresDia = dia; }
    const rnd = semilla([...clave].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7) >>> 0);
    const libres = [];
    for (let y = 1; y < L.rows - 1; y++) for (let x = 1; x < L.cols - 1; x++) {
      if (L.c[y][x] !== 0) continue;
      let vecinoLibre = 0; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if (L.c[y + dy]?.[x + dx] === 0) vecinoLibre++;
      if (vecinoLibre < 3) continue;   // nunca tapa un pasillo
      if (L.npcs.some(n => abs(n.tx - x) + abs(n.ty - y) < 3)) continue;
      if ([[.5,.5],[.1,.1],[.9,.1],[.1,.9],[.9,.9]].some(([u,v]) => ARTE_ISO.aguaEn(L, T, (x + u) * T, (y + v) * T))) continue;   // nunca en el agua
      libres.push([x, y]);
    }
    const n = (K.porZona || {})[zonaId] ?? K.porZonaDefecto ?? 2;
    for (let i = 0; i < n && libres.length; i++) {
      const k = floor(rnd() * libres.length), [x, y] = libres.splice(k, 1)[0];
      if (libres.length) for (let j = libres.length - 1; j >= 0; j--) if (abs(libres[j][0] - x) + abs(libres[j][1] - y) < 5) libres.splice(j, 1);   // separados entre sí
      cofres.push({ tx: x, ty: y, id: clave + ':' + i, abierto: !!prog.cofres[clave + ':' + i], t: prog.cofres[clave + ':' + i] ? 99 : -1 });
    }
  }
  function sortearPremioCofre() {
    const R = CONFIG.cofres.rarezas, tot = R.reduce((a, r) => a + r.peso, 0); let x = Math.random() * tot;
    for (const r of R) { if (x < r.peso) return r; x -= r.peso; } return R[0];
  }
  function abrirCofre(c) {
    if (c.abierto) return;
    c.abierto = true; c.t = 0; prog.cofres[c.id] = true;
    const r = sortearPremioCofre(), lineas = [], az = (a, b) => a + floor(Math.random() * (b - a + 1)); contar('cofres');
    if (r.monedas) { const m = Math.round(az(...r.monedas) * rango().mult); prog.puntos += m; lineas.push('◈ +' + m + ' monedas'); }
    if (r.fichas) { prog.fichas += r.fichas; lineas.push('✦ +' + r.fichas + (r.fichas > 1 ? ' fichas' : ' ficha') + ' de la Rueda'); }
    if (r.xp) { const p0 = prog.xp; ganarXP(r.xp); lineas.push('+' + (prog.xp - p0) + ' XP'); }
    if (r.material) { const ks = Object.keys(EQUIPO.materiales).filter(k => r.material.tipos ? r.material.tipos.includes(k) : true), k = ks[floor(Math.random() * ks.length)], n = az(...r.material.n); prog.materiales[k] = (prog.materiales[k] || 0) + n; lineas.push(EQUIPO.materiales[k] + ' × ' + n); }
    if (r.objeto) {
      const op = Object.entries(EQUIPO.objetos).filter(([id, o]) => r.objeto.includes(o.rareza) && !equipoPoseido(id));
      if (op.length) { const [id, o] = op[floor(Math.random() * op.length)]; prog.inventario[id] = 1; lineas.push('⚔ ' + o.nombre + ' (' + o.rareza + ')'); }
      else { prog.puntos += r.siRepetido || 40; lineas.push('◈ +' + (r.siRepetido || 40) + ' monedas (ya tenías todo)'); }
    }
    guardarProg();
    cofreAbierto = { r, lineas, mostrar: CONFIG.cofres.duracionApertura || 1.4 };
    pitido(330, .2, 'triangle', .5, 220); ruido(.25, 900, 1, 1);
  }
  function actualizarCofres(dt) {
    for (const c of cofres) if (c.t >= 0 && c.t < 99) c.t += dt;
    if (cofreAbierto && cofreAbierto.mostrar > 0) {
      cofreAbierto.mostrar -= dt;
      if (cofreAbierto.mostrar <= 0) {
        const r = cofreAbierto.r;
        if (r.fenomenal) { destello = .9; temblor = .35; [523, 659, 784, 1047, 1319, 1568].forEach((q, i) => setTimeout(() => pitido(q, .25, 'triangle', .6), i * 90)); if (navigator.vibrate) try { navigator.vibrate([40, 40, 80]); } catch (e) { } }
        else [659, 784, 988].forEach((q, i) => setTimeout(() => pitido(q, .16, 'triangle', .45), i * 80));
        soltarJoy(); pintarUI();
      }
    }
  }
  function htmlCofre() {
    const { r, lineas } = cofreAbierto;
    return '<div class="rq-hanko" style="background:' + r.color + '">宝</div><h2>' + (r.fenomenal ? '¡Cofre fenomenal!' : 'Cofre abierto') + '</h2>' +
      '<p class="rq-rareza" style="color:' + r.color + '">' + esc(r.nombre) + '</p><ul class="rq-premios">' + lineas.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>' +
      '<button class="rq-b" data-a="cerrarCofre">Guardar en la bolsa</button>';
  }
  function dibujaCofre(c) {
    const im = estampas['cofre'], x = (c.tx + .5) * T, y = (c.ty + .5) * T, K = CONFIG.cofres;
    if (!im?.naturalWidth) { R(x - 8, y - 10, 16, 12, '#7a4a28'); return; }
    const n = K.fotogramas || 24, celda = im.naturalWidth / n, dur = K.duracionApertura || 1.4;
    const fr = c.t < 0 ? 0 : Math.min(n - 1, floor(c.t / dur * n)), ancho = T * (K.tamano || 1.35), sx = fr * celda;
    pisar(x, y + 6, ancho * .8);
    // cerrado: brilla un poco para que se vea; al abrir, una luz dorada sale de dentro
    if (!c.abierto) { const p = .5 + Math.sin(reloj * 3 + c.tx) * .5; g.fillStyle = 'rgba(255,225,140,' + (.12 + p * .12) + ')'; g.beginPath(); g.ellipse(x, y - ancho * .3, ancho * .6, ancho * .45, 0, 0, 2 * PI); g.fill(); }
    g.drawImage(im, sx, 0, celda, celda, x - ancho / 2, y + 6 - ancho * (184 / 192), ancho, ancho);
    if (c.abierto && c.t < 3) { const u = Math.min(1, c.t / dur); g.fillStyle = 'rgba(255,220,120,' + (.5 * u * (1 - Math.max(0, c.t - dur) / 1.6)) + ')'; g.beginPath(); g.moveTo(x - ancho * .2, y - ancho * .35); g.lineTo(x - ancho * .5, y - ancho * 1.4); g.lineTo(x + ancho * .5, y - ancho * 1.4); g.lineTo(x + ancho * .2, y - ancho * .35); g.fill(); }
    if (!c.abierto && cerca && cerca.cofre === c) placaMundo(x, y - ancho * .95, 'COFRE', 'Ábrelo', 60);
  }
  function actualizarAldea() {
    const tx = floor(h.x / T), ty = floor(h.y / T), z = zona();
    const vecinos = z ? MUNDO.personajes : ALDEA.personajes;
    for (const o of L.objetos) if (objetoVisible(o) && cercaCasilla([o.tx,o.ty],.68)) {
      prog.items[o.id] = true; guardarProg(); SON.coger();
      decir('Tienes: ' + vecinos[o.id].mision.nombreObjeto, 2.6);
    }
    z?.tesoros.forEach(([x,y], i) => {
      const clave = zonaId + ':' + i;
      if (x !== tx || y !== ty || prog.tesoros[clave]) return;
      prog.tesoros[clave] = true; prog.puntos += 18; ganarXP(12);
      guardarProg(); SON.coger(); decir('Alijo · +18 monedas · +12 XP', 2.3);
    });
    actualizarGuia();
    cerca = null;
    if(alAlcance(TALLER.tronco)&&prog.troncoPDV>0){cerca={tronco:true};return;}
    if (fase === 'aldea') { const c = cofres.find(c => !c.abierto && cercaCasilla([c.tx, c.ty], 1.15)); if (c) { cerca = { cofre: c }; return; } }
    if(ZU()&&estaEnPueblo()){const p=ZU().puesto;if(hypot((p.x+p.ancho/2)*T-h.x,(p.y+p.fondo/2)*T-h.y)<T*(1.1+Math.max(p.ancho,p.fondo)/2)){cerca={zumos:true};return;}}
    if(alAlcance(TALLER.puesto)){cerca={ruleta:true};return;}
    const paso = pasosMundo().find(p => cercaCasilla(p));
    if (paso) { cerca = { paso }; return; }
    if (z?.forja && cercaCasilla(z.forja)) { cerca = { forja: true }; return; }
    const sello = z?.sellos?.findIndex(p => cercaCasilla(p));
    if (sello >= 0 && prog.m.v === 'activa' && !prog.sellos[sello]) { cerca = { sello }; return; }
    let md = 1.5 * T;
    for (const n of L.npcs) {
      const d = hypot((n.tx + .5) * T - h.x, (n.ty + .5) * T - h.y);
      if (d < md) { md = d; cerca = { npc: n }; }
    }
    if (!cerca && L.puertas.some(p => cercaCasilla(p, .85))) cerca = { puerta: true };
  }
  function hablar(n) {
    const M = n.p.mision, st = prog.m[n.id]; let lineas, fin = null;
    if (!M) {
      lineas = n.p.frases || ['…'];
      const id = n.p.favor, favor = MUNDO.favores[id];
      if (favor && !prog.favores[id]) {
        lineas = [...lineas, 'Recibes «'+favor.nombre+'». '+favor.desc];
        fin = () => {
          prog.favores[id]=true; recalcularEquipo(); guardarProg(); SON.entregar();
          decir('Favor recibido: '+favor.nombre,3.5);
        };
      }
      if (n.p.tienda) fin = () => { tienda = true; retratoTienda = n.p.sprite ? rutaArte(n.p.sprite) : n.p.retrato || ''; pintarUI(); aconsejar('tienda'); };
    } else if (!st && M.requisitos?.some(id => prog.m[id] !== 'hecha')) {
      const anterior = M.requisitos.find(id => prog.m[id] !== 'hecha');
      lineas = ['Necesito que cierres este asunto primero: «' + MUNDO.personajes[anterior].mision.titulo + '».'];
    } else if (!st) {
      lineas = [...M.pide, 'Puedes seguir los puntos dorados o marcar esta misión desde Misiones.'];
      fin = () => { prog.m[n.id] = 'activa'; if(prog.guia!==false)prog.guia=n.id; actualizarGuia(); guardarProg(); };
    } else if (st === 'activa' && prog.items[n.id]) {
      const arma = armas()[M.premio], xp = M.xp || 40, oro = M.monedas || 22;
      lineas = [...M.gracias, '+' + oro + ' monedas · +' + xp + ' XP' + (arma ? ' · ' + arma.nombre : '')];
      fin = () => {
        const nivelAntes = MUNDO.nivel(prog.xp);
        prog.m[n.id] = 'hecha'; contar('misiones'); if(prog.guia===n.id)prog.guia=null; actualizarGuia(); ganarXP(xp); prog.puntos += oro;
        if (arma && !prog.armas.includes(M.premio)) prog.armas.push(M.premio);
        if (arma && !prog.arma) prog.arma = M.premio;
        if (!prog.huevo && misiones().every(([id]) => prog.m[id] === 'hecha')) {
          prog.huevo = true; prog.cargaJade = 0;
          abrirJade();
        }
        guardarProg(); SON.entregar();
        if (MUNDO.nivel(prog.xp) > nivelAntes) decir('Nivel ' + MUNDO.nivel(prog.xp) + ' · más aguante', 2.5);
      };
    } else lineas = st === 'activa' ? M.recuerda : M.luego;
    dlg = { nombre: n.p.nombre, lineas, i: 0, fin, retrato: n.p.sprite ? rutaArte(n.p.sprite) : n.p.retrato, dibujo: n.p.dibujo, sprite: n.p.sprite };
    pitido(520, 0.06, 'triangle', .5); pintarDlg();
  }
  function avanzarDlg() { if (!dlg) return; if (dlg.c < dlg.txt.length) { dlg.c = dlg.txt.length; dlgTxt.textContent = dlg.txt; return; } dlg.i++; pitido(620, 0.05, 'triangle', .4); if (dlg.i >= dlg.lineas.length) { const f = dlg.fin; dlg = null; if (f) f(); } pintarDlg(); }
  function pintarDlg() {
    if (!dlgEl) return; dlgEl.hidden = !dlg; dlgTxt = null;
    if (!dlg) return;
    // con retrato: diálogo grande con la imagen enmarcada y el texto escribiéndose
    dlg.txt = String(dlg.lineas[dlg.i]).replace(/\{nombre\}/g, jugador || 'samurái'); dlg.c = 0;
    const conCara = dlg.retrato || (dlg.dibujo && (dlg.dibujo === 'huevo' || PJ(dlg.dibujo)));
    dlgEl.className = 'rq-dlg' + (conCara ? ' grande' : '') + (dlg.sprite ? ' retrato-sprite' : '');
    dlgEl.innerHTML = (dlg.retrato ? '<div class="rq-marco"><img src="' + esc(dlg.retrato) + '" alt=""></div>' : conCara ? '<div class="rq-marco"><canvas></canvas></div>' : '') + '<div class="rq-dtx"><b>' + esc(dlg.nombre) + '</b><p></p><small>' + (dlg.i + 1) + ' / ' + dlg.lineas.length + '</small></div><span>▶</span>';
    dlgTxt = dlgEl.querySelector('p'); dlgCv = dlgEl.querySelector('canvas');
  }
  function accion() {
    if (ceremonia) return;
    if (dlg) return avanzarDlg();
    if (fase === 'aldea' && (panelMundo || tienda)) return;
    if (fase === 'jugando') { usarArma(); etiquetaAccion = ''; return; }
    if (fase === 'aldea' && cerca) {
      if (cerca.tronco) golpearTronco();
      else if (cerca.ruleta) { panelMundo='ruleta'; pintarUI(); aconsejar('ruleta'); }
      else if (cerca.cofre) { abrirCofre(cerca.cofre); cerca = null; }
      else if (cerca.zumos) { const Z = ZU(), pe = Z.precioEntrada || 0, pobre = prog.puntos < pe; dlg = { nombre: Z.vendedora, lineas: pobre ? [(Z.sinDinero || 'La entrada son {p} monedas. Vuelve cuando las tengas, miau.').replace('{p}', pe)] : [...Z.frasesEntrada, ...(pe ? ['La entrada son ' + pe + ' monedas. Tienes ' + prog.puntos + '. ¡Que no se te caiga nada!'] : [])], i: 0, fin: pobre ? null : empezarFruta, retrato: Z.retrato && (arteIntegrado[Z.retrato] || Z.retrato) }; pitido(880, .08, 'triangle', .4); pintarDlg(); }
      else if (cerca.npc) hablar(cerca.npc);
      else if (cerca.paso) {
        const p = cerca.paso;
        if (abierto(p)) irAldea(p[2], p[3]);
        else decir('Completa «' + MUNDO.personajes[p[4]].mision.titulo + '»', 3);
      } else if (cerca.sello !== undefined) {
        prog.sellos[cerca.sello] = true; guardarProg(); SON.entregar();
        decir(sellosListos() ? 'La clavija ha salido a la superficie' : 'Sello encendido · ' + Object.keys(prog.sellos).length + '/3', 2.6);
      } else if (cerca.forja) { panelMundo = 'forja'; pintarUI(); }
      else irMenu();
    }
  }
  // espectro al que puedes cortar por la espalda ahora mismo (o null)
  function objetivoCorte() {
    const A = armas().asesinato; if (!A) return null; const R2 = (A.radio || 1.7) * T;
    let o = null, md = R2; for (const e of espectros) { const d = hypot(e.x - h.x, e.y - h.y); if (!(e.muerto > 0) && d < md) { md = d; o = e; } }
    return o && abs(difAng(Math.atan2(h.y - o.y, h.x - o.x), o.dir)) >= PI * 0.6 ? o : null;
  }
  // cambia al siguiente pergamino que tengas (tecla R o el botón ⇄)
  function siguienteArma() {
    if (prog.armas.length < 2) return; const i = prog.armas.indexOf(prog.arma); prog.arma = prog.armas[(i + 1) % prog.armas.length];
    guardarProg(); etiquetaAccion = ''; decir((armas()[prog.arma] || {}).nombre || prog.arma, 1.6); pitido(700, .05, 'triangle', .4);
  }
  function usarArma() {
    const A = armas()[prog.arma]; if (!A || (L.exterior && prog.arma === 'shuriken') || armaCd > 0 || tp || susto > 0) return;
    armaCd = (A.espera || 20) * (1 - .15 * (prog.temples[prog.arma] || 0)); const R2 = (A.radio || 3) * T, cer = e => hypot(e.x - h.x, e.y - h.y) < R2, tx = floor(h.x / T), ty = floor(h.y / T);
    if (prog.arma === 'humo') { h.oculto = A.duracion; efectos.push({ tipo: 'humo', t: A.duracion, dur: A.duracion }); ruido(0.5, 1200, 1.4, .7); for (const e of espectros) if (cer(e) && e.estado !== 'patrulla') { e.estado = 'busca'; e.ruta = []; e.tEspera = 2; } }
    else if (prog.arma === 'senuelo') { efectos.push({ tipo: 'campana', x: h.x, y: h.y, t: A.duracion, dur: A.duracion }); [0, 220, 440].forEach(d => setTimeout(() => pitido(1568, 0.3, 'sine', .7), d)); for (const e of espectros) if (cer(e)) { e.estado = 'busca'; e.ruta = []; irA(e, tx, ty); e.tEspera = A.duracion; e.distraido = A.duracion; } }
    else if (prog.arma === 'paraguas') { h.oculto = A.duracion; h.paraguas = A.duracion; pitido(300, 0.15, 'triangle', .6, 600); }
    else if (prog.arma === 'asesinato') {
      let o = null, md = R2; for (const e of espectros) { const d = hypot(e.x - h.x, e.y - h.y); if (!(e.muerto > 0) && d < md) { md = d; o = e; } }
      if (!o) { armaCd = 1.5; decir('No hay nadie a tiro', 1.5); return; }
      if (abs(difAng(Math.atan2(h.y - o.y, h.x - o.x), o.dir)) < PI * 0.6) { armaCd = 4; decir('¡Solo por la espalda!', 2); o.estado = 'persigue'; o.vista = [tx, ty]; o.tMem = 2; SON.alerta(); return; }
      o.muerto = A.duracion; o.estado = 'patrulla'; o.ruta = []; temblor = .3; SON.atrapado();
      for (let i = 0; i < 26; i++) manchas.push({ x: o.x + azar(-18, 18), y: o.y + azar(-12, 14), r: azar(1.5, 5.5), v: 16, v0: 16 });
      for (let i = 0; i < 40; i++) { const a = azar(0, 2 * PI), v = azar(30, 150); gotas.push({ x: o.x, y: o.y - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 50, t: azar(0.3, 0.8) }); }
      const ini = L.espIni[o.n]; o.x = (ini[0] + .5) * T; o.y = (ini[1] + .5) * T; decir('Un corte limpio. Volverá, y de peor humor', 3); contar('cortes');
    }
    else if (prog.arma === 'pasoHumo') {
      const dx = abs(Math.cos(h.dir)) > abs(Math.sin(h.dir)) ? Math.sign(Math.cos(h.dir)) : 0, dy = dx ? 0 : Math.sign(Math.sin(h.dir)); let d = Math.round(A.radio || 3);
      while (d > 0 && solido(tx + dx * d, ty + dy * d)) d--;
      if (!d) { armaCd = 1; decir('Aquí no hay por dónde colarse', 1.5); return; }
      efectos.push({ tipo: 'puf', x: h.x, y: h.y, t: .5, dur: .5 }); h.x = (tx + dx * d + .5) * T; h.y = (ty + dy * d + .5) * T; efectos.push({ tipo: 'puf', x: h.x, y: h.y, t: .5, dur: .5 }); h.oculto = Math.max(h.oculto, A.duracion || .6); SON.tp();
    }
    else if (prog.arma === 'shuriken') { proyectiles.push({ x: h.x, y: h.y, vx: Math.cos(h.dir) * 230, vy: Math.sin(h.dir) * 230, t: 1.4, r: R2, dur: A.duracion }); pitido(1800, 0.08, 'triangle', .5, 900); }
    else if (prog.arma === 'geta') { temblor = 0.35; efectos.push({ tipo: 'onda', x: h.x, y: h.y, t: .5, dur: .5, r: R2 }); pitido(70, 0.4, 'square', 1.4, 30); ruido(0.3, 150, 2, 1); for (const e of espectros) if (cer(e)) { e.aturdido = A.duracion; e.estado = 'patrulla'; e.ruta = []; } }
  }
  function refrescarBoton() {
    if (btnCambiar) btnCambiar.classList.toggle('on', fase === 'jugando' && !esVillano() && prog.armas.length > 1 && !dlg);
    if (btnLanzar) btnLanzar.classList.toggle('on', fase === 'jugando' && !esVillano() && !!h?.carga?.length && !dlg);
    let et = null, apagado = false;
    if (!ceremonia && !dlg && !tienda && !panelMundo && !esVillano()) {
      if (fase === 'jugando' && armas()[prog.arma]) { const A = armas()[prog.arma]; apagado = armaCd > 0 || (L.exterior && prog.arma === 'shuriken'); et = (A.boton || 'USAR') + (armaCd > 0 ? ' ' + Math.ceil(armaCd) : prog.arma === 'asesinato' && objetivoCorte() ? ' ✓' : ''); }
      if (fase === 'aldea' && cerca) et = cerca.tronco ? (armaDePractica()?'GOLPEAR':'SIN ARMA') : cerca.ruleta ? 'RULETA' : cerca.zumos ? 'ZUMOS' : cerca.cofre ? 'ABRIR' : cerca.npc ? 'HABLAR' : cerca.forja ? 'TEMPLAR' : cerca.paso ? 'VIAJAR' : cerca.sello !== undefined ? 'ENCENDER' : 'ENTRAR';

    }
    const clave = et + '|' + apagado; if (clave === etiquetaAccion) return; etiquetaAccion = clave;
    btnAccion.style.display = et ? 'block' : 'none'; btnAccion.textContent = et || ''; btnAccion.style.opacity = apagado ? .45 : 1;
  }

  function dibujaAldeano(n) {
    const s = T / 24, p = n.p, x = (n.tx + .5) * T, y = (n.ty + .5) * T, C = col(), k = p.tipo === 'nina' ? .8 : 1, bob = Math.sin(reloj * 2 + n.tx) * .5;
    const im = estampas[p.sprite];
    if (im?.naturalWidth) {
      const alto = p.alto * T, ancho = alto * im.naturalWidth / im.naturalHeight;
      pisar(x, y + 7 * s, ancho * .95);
      const resp = 1 + Math.sin(reloj * 1.7 + n.tx) * .012, pie = y + 7 * s + alto * pieDe(im);   // respira: se estira un pelo, los pies no se mueven
      g.save(); g.translate(x, pie); g.scale(1 / Math.sqrt(resp), resp); g.drawImage(escalada(im, ancho, alto), -ancho / 2, -alto, ancho, alto); g.restore();
      if (p.favor && !prog.favores[p.favor]) escribe('◇', x, y - alto, 10, '#ffe7a1', 'center', true);
      if (p.tienda) escribe('◈',x,y-alto-3,10,'#b4ece2','center',true);
      if(p.mision){const st=prog.m[n.id],m=st==='hecha'?'♥':st==='activa'?(prog.items[n.id]?'!':'…'):'!';escribe(m,x,y-alto-3,10,st==='hecha'?'#e9b8b2':prog.items[n.id]?'#c6f09f':'#ffe7a1','center',true);}
      return;
    }
    if (p.dibujo && PJ(p.dibujo)) {
      const alto = (p.alto || 1.6) * T; elip(x, y + 7 * s, alto * .28, alto * .1, 'rgba(0,0,0,.3)');
      PJ(p.dibujo).dibujar(g, p.dibujo, { x, y: y + 7 * s, alto, t: reloj + n.tx, mirando: h.x >= x ? 1 : -1 });
      const M2 = p.mision, st2 = M2 && prog.m[n.id], lleva = st2 === 'activa' && prog.items[n.id];
      const m = p.tienda ? ['◈', '#7fe0ff'] : !M2 ? null : !st2 ? ['!', '#ffd23f'] : lleva ? ['!', '#6fe07a'] : st2 === 'activa' ? ['…', '#ffffff'] : ['♥', '#ff8aa0'];
      if (m) escribe(m[0], x, y + 7 * s - alto - (3 + Math.abs(Math.sin(reloj * 3)) * 2) * s, 11, m[1], 'center', true);
      return;
    }
    elip(x, y + 7 * s, 6.5 * s * k, 2.5 * s * k, 'rgba(0,0,0,.28)');
    g.save(); g.translate(x, y + 7 * s); g.scale(s * k, s * k); g.translate(0, bob); g.lineCap = 'round';
    if (p.tipo === 'kappa') { dibujaKappa(s, bob); g.restore(); escribe('◈', x, y - (27 + Math.abs(Math.sin(reloj * 3)) * 2) * s, 11, '#7fe0ff', 'center', true); return; }
    R(-3.4, -2.4, 2.8, 2.4, '#3a2a2a'); R(.6, -2.4, 2.8, 2.4, '#3a2a2a');
    const gk = g.createLinearGradient(0, -12, 0, -2); gk.addColorStop(0, tono(p.color, 1.15)); gk.addColorStop(1, tono(p.color, .7));
    g.fillStyle = gk; g.beginPath(); g.moveTo(-4.8, -11.5); g.quadraticCurveTo(-7.2, -6, -6.4, -1.8); g.lineTo(6.4, -1.8); g.quadraticCurveTo(7.2, -6, 4.8, -11.5); g.closePath(); g.fill();
    poli([-2.4, -11.5, 0, -7.4, 2.4, -11.5, 1.2, -11.5, 0, -9.4, -1.2, -11.5], '#f6ecd4');
    R(-6.2, -6.4, 12.4, 1.9, tono(p.color, .45)); circ(-6.6, -5 , 1.4, C.heroePiel); circ(6.6, -5, 1.4, C.heroePiel);
    circ(0, -15, 5.7, C.heroePiel);
    circ(-2.1, -14.6, .65, '#191320'); circ(2.1, -14.6, .65, '#191320'); circ(-3.3, -13.2, 1, 'rgba(255,140,150,.45)'); circ(3.3, -13.2, 1, 'rgba(255,140,150,.45)');
    g.strokeStyle = '#191320'; g.lineWidth = .5; g.beginPath(); g.arc(0, -13.2, 1.1, .15 * PI, .85 * PI); g.stroke();
    if (p.tipo === 'abuela') { g.fillStyle = '#e3e3ec'; g.beginPath(); g.arc(0, -16, 5.9, PI * 1.02, PI * 1.98); g.fill(); circ(0, -21.6, 2.3, '#e3e3ec'); linea([-2.5, -22.6, 2.8, -20.8], '#8a5a34', .5); linea([-3.4, -14.9, -1, -14.9], '#191320', .4); linea([1, -14.9, 3.4, -14.9], '#191320', .4); }
    else if (p.tipo === 'herrero') { g.fillStyle = '#2a2024'; g.beginPath(); g.arc(0, -16, 5.9, PI * 1.02, PI * 1.98); g.fill(); R(-5.9, -18.2, 11.8, 1.5, '#f6ecd4'); g.fillStyle = '#2a2024'; g.beginPath(); g.arc(0, -13, 4.6, .12 * PI, .88 * PI); g.fill(); R(-1.3, -12.9, 2.6, .5, C.heroePiel); }
    else if (p.tipo === 'nina') { g.fillStyle = '#2a2024'; g.beginPath(); g.arc(0, -16, 5.9, PI * 1.02, PI * 1.98); g.fill(); circ(-5.6, -19.4, 2.3, '#2a2024'); circ(5.6, -19.4, 2.3, '#2a2024'); circ(-5.6, -19.4, .8, '#ff9ecb'); circ(5.6, -19.4, .8, '#ff9ecb'); R(-5.6, -17.6, 11.2, 1.3, '#2a2024'); }
    else if (p.tipo === 'elfa' || p.tipo === 'elfo') {
      for (const d of [-1,1]) poli([d * 3.7,-14,d * 8.2,-17.9,d * 5.5,-12.5], '#d6a083');
      g.fillStyle = tono(p.color,.46); g.beginPath(); g.arc(0,-16,6.2,PI,2*PI); g.fill();
      poli([-6,-16,-5,-21,1,-23,5.5,-18,2,-17,-1,-19], tono(p.color,.7));
      linea([-5,-15.9,-2,-17.6,1,-17,4,-18,6,-16.3], '#e7c88a', .85);
      circ(0,-17,1.1,'#d7f3aa');
    }
    else { poli([-9, -17.2, 9, -17.2, 0, -23.5], '#d8c08a'); linea([-9, -17.2, 9, -17.2], '#a8884a', .7); linea([-4.5, -20.3, 4.5, -20.3], '#bfa268', .4); }
    g.restore();
    const M = p.mision, st = M && prog.m[n.id];
    if (M) { const lleva = st === 'activa' && prog.items[n.id], m = !st ? ['!', '#ffd23f'] : lleva ? ['!', '#6fe07a'] : st === 'activa' ? ['…', '#ffffff'] : ['♥', '#ff8aa0']; escribe(m[0], x, y - (26 * k + Math.abs(Math.sin(reloj * 3)) * 2) * s, 11, m[1], 'center', true); }
  }
  function dibujaObjeto(o) {
    const s = T / 24, x = (o.tx + .5) * T, y = (o.ty + .5) * T, C = col();
    elip(x, y + 6 * s, 5 * s, 1.8 * s, 'rgba(0,0,0,.25)');
    const gl = g.createRadialGradient(x, y, 0, x, y, 11 * s); gl.addColorStop(0, 'rgba(255,230,140,' + (.3 + .15 * Math.sin(reloj * 4)) + ')'); gl.addColorStop(1, 'rgba(255,230,140,0)'); circ(x, y, 11 * s, gl);
    if (o.tipo === 'gato') {
      g.strokeStyle = '#fbf6ea'; g.lineWidth = 1.4 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 4 * s, y + 4 * s); g.quadraticCurveTo(x + 8 * s, y + 3 * s, x + 7 * s + Math.sin(reloj * 3) * s, y - 1 * s); g.stroke();
      elip(x, y + 2.5 * s, 4.6 * s, 3.8 * s, '#fbf6ea'); circ(x, y - 3 * s, 3.6 * s, '#fbf6ea');
      poli([x - 3.4 * s, y - 4.6 * s, x - 2.6 * s, y - 8 * s, x - .8 * s, y - 5.8 * s], '#fbf6ea'); poli([x + 3.4 * s, y - 4.6 * s, x + 2.6 * s, y - 8 * s, x + .8 * s, y - 5.8 * s], '#3a3038');
      circ(x + 1.5 * s, y - 3.4 * s, 1.5 * s, '#3a3038');
      if (floor(reloj * .7) % 4) { circ(x - 1.4 * s, y - 3.3 * s, .55 * s, '#191320'); circ(x + 1.4 * s, y - 3.3 * s, .55 * s, '#e8c15a'); } else { R(x - 2 * s, y - 3.4 * s, 1.2 * s, .3 * s, '#191320'); R(x + .8 * s, y - 3.4 * s, 1.2 * s, .3 * s, '#e8c15a'); }
      poli([x - .5 * s, y - 2.2 * s, x + .5 * s, y - 2.2 * s, x, y - 1.6 * s], '#ff9ecb');
    } else if (o.tipo === 'carbon') {
      g.fillStyle = '#9a6b3f'; g.beginPath(); g.moveTo(x - 5 * s, y + 6 * s); g.quadraticCurveTo(x - 6.5 * s, y - 1 * s, x - 3 * s, y - 4 * s); g.lineTo(x + 3 * s, y - 4 * s); g.quadraticCurveTo(x + 6.5 * s, y - 1 * s, x + 5 * s, y + 6 * s); g.closePath(); g.fill();
      R(x - 3.4 * s, y - 4.6 * s, 6.8 * s, 1.2 * s, '#6f4a28'); for (const [a, b, r] of [[-1.6, -6, 1.7], [1.2, -6.4, 1.5], [0, -7.6, 1.3]]) circ(x + a * s, y + b * s, r * s, '#17171c'); circ(x - .3 * s, y - 7.9 * s, .4 * s, '#ff7a3d');
      linea([x - 3 * s, y + 1 * s, x + 3 * s, y + 1 * s], '#7a5230', .6 * s);
    } else if (o.tipo === 'campanilla') {
      const b = Math.sin(reloj * 6) * .25; g.save(); g.translate(x, y - 5 * s); g.rotate(b);
      g.fillStyle = C.heroeMetal || '#e8c15a'; g.beginPath(); g.moveTo(-4 * s, 7 * s); g.quadraticCurveTo(-4 * s, -1 * s, 0, -1.5 * s); g.quadraticCurveTo(4 * s, -1 * s, 4 * s, 7 * s); g.closePath(); g.fill();
      R(-4.8 * s, 6.4 * s, 9.6 * s, 1.4 * s, tono(C.heroeMetal || '#e8c15a', .75)); circ(0, 8.6 * s, 1.1 * s, '#8a5a34'); R(-.6 * s, -3.4 * s, 1.2 * s, 2 * s, C.ninjaCinta || '#d62f3a'); g.restore();
    } else dibujaReliquia(x, y - 2 * s + Math.sin(reloj * 3) * s, 4.6 * s, 1);
  }
  function dibujaProp(id, x, y, alto) {
    const im = estampas[id];
    if (!im?.naturalWidth) return false;
    const ancho = alto * im.naturalWidth / im.naturalHeight;
    pisar(x, y, ancho * .75);
    g.drawImage(escalada(im,ancho,alto),x-ancho/2,y-alto+alto*pieDe(im),ancho,alto);
    return true;
  }
  function dibujaArbol(x, y) {
    const arbol = ['bosque','ribera'].includes(zonaId) ? 'cedro-pintado' : 'cerezo-pintado';
    const balanceo = Math.sin(reloj * .9 + x * .03) * T * .012;
    const alto = T * (1.5 + (hash(x,y) % 8) * .07);
    if (dibujaProp(arbol, x + balanceo, y+T*.3, alto)) return;
    const s = T / 24, v = Math.sin(reloj * 1.2 + x) * .6 * s;
    elip(x, y + 8 * s, 11 * s, 3.6 * s, 'rgba(0,0,0,.28)');
    g.fillStyle = '#6b452c'; g.beginPath(); g.moveTo(x - 2.6 * s, y + 8 * s); g.quadraticCurveTo(x - 1.2 * s, y - 2 * s, x - 3 * s, y - 10 * s); g.lineTo(x + 3 * s, y - 10 * s); g.quadraticCurveTo(x + 1.2 * s, y - 2 * s, x + 2.8 * s, y + 8 * s); g.closePath(); g.fill();
    linea([x - 1 * s, y + 6 * s, x - .4 * s, y - 8 * s], 'rgba(30,16,8,.45)', .8 * s); linea([x + 1.2 * s, y + 4 * s, x + 1.6 * s, y - 6 * s], 'rgba(255,220,180,.25)', .6 * s);
    linea([x - 2 * s, y - 8 * s, x - 9 * s, y - 15 * s], '#6b452c', 1.6 * s); linea([x + 2 * s, y - 8 * s, x + 9 * s, y - 14 * s], '#6b452c', 1.6 * s);
    for (let k = 0; k < 7; k++) { const hs = hash(floor(x) + k, floor(y)); elip(x + ((hs % 30) - 15) * s, y + (6 + (hs >> 5) % 6) * s, 1.6 * s, .8 * s, k % 2 ? '#ffc4dc' : '#f29ac0'); }
    const fronda = zonaId === 'bosque' || zonaId === 'ribera';
    const hojas = ['#214934','#29593e','#306143','#3c7648','#478751','#5b9b58','#84aa59','#abc971','#9ebf60','#d5d78e','#719c54'];
    let hoja = 0;
    for (const [a, b, r, c] of [[-9, -13, 8.5, '#d9749f'], [9, -12, 8.5, '#d9749f'], [0, -15, 9, '#e386ae'], [-8, -16, 8, '#f29ac0'], [8, -15, 8, '#f29ac0'], [0, -22, 9.5, '#f7b3d0'], [-4, -13, 6.5, '#ffc9de'], [5, -20, 5.5, '#ffd9e8'], [-6, -23, 4.5, '#ffe6ef'], [10, -19, 4, '#ffc9de'], [-11, -20, 3.6, '#ffd9e8']]) {
      const color = fronda ? hojas[hoja++] : c;
      elip(x + a * s + v, y + b * s, r * s * 1.1, r * s, color);
    }
    for (let k = 0; k < 14; k++) { const hs = hash(floor(x) * 3 + k, floor(y) + 9); circ(x + ((hs % 34) - 17) * s + v, y - (9 + (hs >> 6) % 20) * s, (.6 + (hs >> 3) % 3 * .25) * s, fronda ? (k % 3 ? '#9ab968' : '#4d8245') : k % 3 ? '#fff0f6' : '#c45e8c'); }
  }
  function dibujaTorii(x, y, ancho, titulo = 'DOJO') {
    if (L.exterior && dibujaProp('torii-pintado', x, y + T*.16, ancho*.8)) {
      if (titulo) escribe(titulo,x,y-ancho*.7,7,'#ffe08a','center',true);
      return;
    }
    const s = T / 24, r = col().ninjaCinta || '#d62f3a', a = ancho / 2 + 2 * s;
    for (const d of [-1, 1]) { R(x + d * a - 1.8 * s, y - 30 * s, 3.6 * s, 34 * s, r); R(x + d * a - 2.4 * s, y + 2 * s, 4.8 * s, 2.4 * s, '#2a2024'); }
    R(x - a - 4 * s, y - 24 * s, a * 2 + 8 * s, 2.6 * s, r);
    g.fillStyle = '#2a2024'; g.beginPath(); g.moveTo(x - a - 8 * s, y - 34 * s); g.quadraticCurveTo(x, y - 30 * s, x + a + 8 * s, y - 34 * s); g.lineTo(x + a + 6 * s, y - 30 * s); g.quadraticCurveTo(x, y - 27 * s, x - a - 6 * s, y - 30 * s); g.closePath(); g.fill();
    R(x - a - 5.5 * s, y - 30.5 * s, a * 2 + 11 * s, 2.2 * s, r);
    if (titulo) escribe(titulo, x, y - 37 * s, 7, '#ffe08a', 'center', true);
  }
  function dibujaEfectos(s) {
    for (const ef of efectos) {
      const u = 1 - ef.t / ef.dur;
      if (ef.tipo === 'humo') for (let k = 0; k < 9; k++) { const a = k * .7 + reloj * .6, r = (10 + (k % 3) * 6) * s; circ(h.x + Math.cos(a) * r, h.y - 6 * s + Math.sin(a) * r * .6, (7 + (k % 2) * 3) * s, 'rgba(225,220,235,' + limita(.6 * (1 - u * u), 0, 1) + ')'); }
      else if (ef.tipo === 'campana') { dibujaObjeto({ tx: ef.x / T - .5, ty: ef.y / T - .5, tipo: 'campanilla' }); g.strokeStyle = 'rgba(255,224,138,.8)'; g.lineWidth = 1 * s; for (let k = 0; k < 3; k++) { const ph = (reloj * 1.2 + k / 3) % 1; g.globalAlpha = 1 - ph; g.beginPath(); g.ellipse(ef.x, ef.y, ph * 40 * s, ph * 26 * s, 0, 0, 2 * PI); g.stroke(); } g.globalAlpha = 1; }
      else if (ef.tipo === 'puf') humo(ef.x, ef.y, u, s);
      else if (ef.tipo === 'polvo') { for (let k = 0; k < 7; k++) { const a = k * .9 + (k % 2) * .4, r = ef.r * (.3 + u * .8); g.fillStyle = 'rgba(210,190,160,' + (.45 * (1 - u)).toFixed(2) + ')'; g.beginPath(); g.ellipse(ef.x + Math.cos(a) * r, ef.y + Math.sin(a) * r * .4 - u * 4 * s, (2.5 + u * 3) * s, (1.8 + u * 2) * s, 0, 0, 2 * PI); g.fill(); } }
      else if (ef.tipo === 'interroga') { const e = ef.e || ef; g.globalAlpha = Math.min(1, (1 - u) * 2); escribe(ef.texto || '?', e.x, e.y - 34 * s - u * 6 * s, ef.texto ? 9 : 12, ef.texto ? '#d6f5ff' : '#ffb04a', 'center', true); g.globalAlpha = 1; }
      else if (ef.tipo === 'jade') {
        g.save(); g.globalAlpha = 1-u;
        const y = ef.y - 12*s, radio = ef.r * (.22+u*.78);
        const halo = g.createRadialGradient(ef.x,y,0,ef.x,y,radio);
        halo.addColorStop(0,'#d9ff9988'); halo.addColorStop(1,'#85e84600');
        circ(ef.x,y,radio,halo);
        g.strokeStyle='#d7ff97'; g.lineWidth=1.4*s; g.beginPath(); g.ellipse(ef.x,y,radio,radio*.75,0,0,2*PI);g.stroke();
        dibujaHuevo(g, ef.x, y-13*s-u*8*s, 5*s, reloj); g.restore();
      }
      else if (ef.tipo === 'onda') { g.strokeStyle = 'rgba(255,255,255,' + (1 - u) + ')'; g.lineWidth = 2.5 * s; g.beginPath(); g.ellipse(ef.x, ef.y + 5 * s, u * ef.r, u * ef.r * .65, 0, 0, 2 * PI); g.stroke(); }
    }
    for (const q of proyectiles) { g.save(); g.translate(q.x, q.y - 8 * s); g.rotate(reloj * 25); g.fillStyle = '#d8dbe6'; g.beginPath(); for (let k = 0; k < 8; k++) { const r = (k % 2 ? 1.2 : 3.6) * s; g.lineTo(Math.cos(k * PI / 4) * r, Math.sin(k * PI / 4) * r); } g.fill(); g.restore(); }
    for (const e of espectros) if (e.aturdido > 0 && !(e.muerto > 0)) for (let k = 0; k < 3; k++) { const a = reloj * 5 + k * 2.1; escribe('✶', e.x + Math.cos(a) * 8 * s, e.y - 56 * s + Math.sin(a) * 3 * s, 8, '#ffe94a', 'center', true); }
  }

  // ---------- TIENDA DEL KAPPA: mejoras, pergaminos y aspectos ----------
  let tienda = false, proyectiles = [], dlgTxt = null, dlgCv = null, retratoTienda = '';
  const progNuevo = () => ({ m: {}, items: {}, armas: [], arma: '', puntos: 0, mejoras: {}, aspecto: 'ronin', troncoPDV:TALLER.tronco.pdv, troncoPremio:false, fichas:1, ultimoPremio:null, curiosidades:{}, favores: {}, guia:null, xp: 0, inventario: {}, equipo: {}, materiales: {}, forjas: {}, visitadas: [], tesoros: {}, sellos: {}, temples: {}, cargaJade: 0, versionJade: 1 });
  const niv = k => (prog.mejoras || {})[k] || 0;
  const efectoMejora = k => niv(k) * ((((CONFIG.tienda || {}).mejoras || {})[k] || {}).efecto || 0);
  const energiaMax = () => (CONFIG.heroe.energiaMax + atributo('aguante') + efectoMejora('aguante') + .2 * Math.min(10, MUNDO.nivel(prog.xp || 0) - 1)) * (1 + ((torre && torre.mods.aguante) || 0));
  function htmlTienda() {
    const Tn = CONFIG.tienda || {}, pr = Tn.precios || [1, 3, 5, 9, 12];
    const fila = (nom, sub, desc, boton, img) => `<div class="rq-item">${img ? `<img class="rq-mini" src="${esc(img)}" alt="">` : ''}<div style="flex:1"><b>${esc(nom)}</b> <small>${esc(sub)}</small><br><span>${esc(desc)}</span></div>${boton}</div>`;
    const bot = (clave, precio) => `<button class="rq-c" data-compra="${esc(clave)}"${prog.puntos < precio ? ' disabled' : ''}>${precio} monedas</button>`;
    let o = `${retratoTienda ? `<div class="rq-cab"><div class="rq-marco"><img src="${esc(retratoTienda)}" alt=""></div><div><h2>${esc(Tn.nombre || 'Tienda')}</h2><p>${esc(Tn.saludo || '')}</p></div></div>` : `<h2>${esc(Tn.nombre || 'Tienda')}</h2><p>${esc(Tn.saludo || '')}</p>`}<p>Tienes <b style="color:#ffe08a">${prog.puntos}</b> monedas</p><h3>Mejoras</h3>`;
    for (const k in (Tn.mejoras || {})) { const m = Tn.mejoras[k], n = niv(k); o += fila(m.nombre, '●'.repeat(n) + '○'.repeat(Math.max(0, pr.length - n)), m.desc, n >= pr.length ? '<em>MÁX</em>' : bot('mejora:' + k, pr[n])); }
    o += '<h3>Pergaminos</h3>';
    for (const id in armas()) { const A = armas()[id]; if (A.precio == null) continue; o += fila(A.nombre, '', A.desc, prog.armas.includes(id) ? '<em>TUYO</em>' : bot('arma:' + id, A.precio)); }
    o += htmlMercado();
    for (const id in (CONFIG.tecnicas || {})) { const Tc = CONFIG.tecnicas[id]; o += fila(Tc.nombre, 'técnica', Tc.desc, tieneTecnica(id) ? '<em>APRENDIDA</em>' : bot('tecnica:' + id, Tc.precio)); }
    return o + `<button class="rq-b" data-a="cerrarTienda">SALIR</button>
`;
  }
  function comprar(clave) {
    const [tipo, id] = clave.split(':'), Tn = CONFIG.tienda || {}, pr = Tn.precios || [1, 3, 5, 9, 12];
    let precio = 0;
    if (tipo === 'mejora') { if (niv(id) >= pr.length) return; precio = pr[niv(id)]; }
    else if (tipo === 'arma') precio = (armas()[id] || {}).precio || 0;
    else if (tipo === 'tecnica') { if (tieneTecnica(id)) return; precio = ((CONFIG.tecnicas || {})[id] || {}).precio || 0; }
    else return;
    if (prog.puntos < precio) return;
    prog.puntos -= precio;
    if (tipo === 'mejora') prog.mejoras[id] = niv(id) + 1;
    else if (tipo === 'arma') { if (!prog.armas.includes(id)) prog.armas.push(id); prog.arma = id; }
    else if (tipo === 'tecnica') { prog.tecnicas = prog.tecnicas || {}; prog.tecnicas[id] = true; decir('Aprendido: ' + CONFIG.tecnicas[id].nombre, 2.4); }
    guardarProg(); SON.entregar(); pintarUI();
  }
  function dibujaKappa(s, bob) {   // origen en los pies, ya escalado
    const v = '#5f9e5a', vo = '#3f7a43';
    elip(-1.5, -7.5, 7, 6.6, '#7a5a34'); elip(-1.5, -7.5, 5.4, 5, '#8f6c40'); for (const [a, b] of [[-3.5, -9.5], [.5, -9.8], [-1.5, -6.2]]) circ(a, b, 1.2, '#7a5a34');
    R(-3.6, -3, 3, 3, vo); R(.8, -3, 3, 3, vo); poli([-5.2, 0, -2.2, -1.2, -.6, 0], '#e8c15a'); poli([.4, 0, 2, -1.2, 5.2, 0], '#e8c15a');
    elip(0, -7, 5.4, 5.4, v); elip(.6, -6.4, 3.6, 3.8, '#cfe3a6');
    linea([4.6, -9, 7.6, -6.4], v, 2); g.save(); g.translate(8.4, -6.6); g.rotate(-.5 + bob * .1); elip(0, 0, 1.3, 3.6, '#3f8f3a'); for (let k = -2; k <= 2; k++) circ(.2, k * 1.2, .25, '#2c6b2a'); g.restore();
    linea([-4.6, -9, -6.8, -6], v, 2);
    circ(0, -15, 5.6, v);
    for (let k = 0; k < 9; k++) { const a = PI + k * PI / 8; poli([Math.cos(a) * 3.4, -19.2 + Math.sin(a) * 1.2, Math.cos(a) * 6.6, -18 + Math.sin(a) * 2.6 + (k % 2), Math.cos(a + .25) * 3.6, -19 + Math.sin(a + .25) * 1.2], '#1c2a1e'); }
    elip(0, -20, 3.7, 1.4, '#bfe6f5'); elip(-.8, -20.2, 1.6, .5, '#ffffff');
    circ(-2.3, -15.6, 1.7, '#fff'); circ(2.3, -15.6, 1.7, '#fff'); circ(-2, -15.4, .8, '#191320'); circ(2.6, -15.4, .8, '#191320');
    poli([-2.6, -13.4, 2.6, -13.4, 0, -10.6], '#e8c15a'); linea([-2.2, -12.6, 2.2, -12.6], '#b8922f', .4);
  }

  // ---------- PERSONAJES.JS: si está cargado, los personajes se dibujan con él ----------
  const PJ = id => (typeof PERSONAJES !== 'undefined' && PERSONAJES.fichas[id]) ? PERSONAJES : null;
  // carácter de cada espectro: multiplica la ficha de la dificultad (config.js > espectros)
  function PE(e) {
    const p = PEbase(e), k = 1 - modT('vista'), J = e.jefe;
    p.alcance *= k * (J ? J.vista : 1); p.oido *= k * (e.tipo === 'cesta' && h && h.corre ? 1.8 : 1);   // la cesta oye a quien esprinta
    if (J) { p.velPatrulla *= J.vel; p.velBusca *= J.vel; p.velPersigue *= J.vel * (e.embiste > 0 ? 2.6 : 1); }
    return p;
  }
  function PEbase(e) {
    const b = D(), m = (CONFIG.espectros || {})[e.tipo]; if (!m) return b;
    return { velPatrulla: b.velPatrulla * (m.vel || 1), velBusca: b.velBusca * (m.vel || 1), velPersigue: b.velPersigue * (m.velCaza || m.vel || 1), alcance: b.alcance * (m.alcance || 1), angulo: Math.min(340, b.angulo * (m.angulo || 1)), oido: b.oido * (m.oido || 1), memoria: b.memoria * (m.memoria || 1) };
  }

  // ---------- MODO VILLANO: tú llevas a los espectros y el héroe lo lleva la máquina ----------
  let bando = 'heroe', sel = 0, mapaGeo = null, trazo = null, capturas = 0, btnCamara, layoutVillano = false;
  const camarasVistas = new Set();
  const esVillano = () => bando === 'villano' && fase === 'jugando';
  const bot = { ruta: [], tRe: 0 };
  function buscar(ax, ay, meta, bloque) {
    const W = L.cols, prev = new Int32Array(W * L.rows).fill(-1), ini = ay * W + ax, q = [ini]; prev[ini] = ini;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], cx = c % W, cy = (c - cx) / W;
      if (i > 0 && meta(cx, cy)) { const r = []; let k = c; while (k !== ini) { r.push([k % W, floor(k / W)]); k = prev[k]; } return r.reverse(); }
      for (const [dx, dy] of DIRS) { const nx = cx + dx, ny = cy + dy; if (bloque(nx, ny)) continue; const n = ny * W + nx; if (prev[n] !== -1) continue; prev[n] = c; q.push(n); }
    }
    return null;
  }
  // el héroe automático: va a por la reliquia más cercana, rodea a los espectros y huye a un cojín si lo persiguen
  function botHeroe(dt) {
    const B = CONFIG.bot || {}, tx = floor(h.x / T), ty = floor(h.y / T), vivos = espectros.filter(e => !(e.muerto > 0));
    const peligro = vivos.some(e => e.estado === 'persigue'), seguro = (x, y) => celda(x, y) === 3 || celda(x, y) === 4;
    if (peligro && seguro(tx, ty)) { bot.ruta = []; return [0, 0, false]; }
    bot.tRe -= dt;
    if (!bot.ruta.length || bot.tRe <= 0) {
      bot.tRe = B.reaccion || 0.35; const pr = B.prudencia == null ? 2 : B.prudencia;
      const cerca = (x, y) => vivos.some(e => abs(floor(e.x / T) - x) + abs(floor(e.y / T) - y) <= pr);
      const meta = (x, y) => peligro ? seguro(x, y) : h.carga.length ? celda(x, y) === 4 : gemas.some(gm => gm.estado === 'suelo' && gm.tx === x && gm.ty === y);
      bot.ruta = buscar(tx, ty, meta, (x, y) => solido(x, y) || cerca(x, y)) || buscar(tx, ty, meta, solido) || [];
    }
    while (bot.ruta.length && hypot((bot.ruta[0][0] + .5) * T - h.x, (bot.ruta[0][1] + .5) * T - h.y) < 3) bot.ruta.shift();
    if (!bot.ruta.length) return [0, 0, false];
    const dx = (bot.ruta[0][0] + .5) * T - h.x, dy = (bot.ruta[0][1] + .5) * T - h.y, d = hypot(dx, dy) || 1;
    return [dx / d, dy / d, peligro && h.energia > 0.4];
  }
  const heroVisto = () => espectros.some(e => !(e.muerto > 0) && loVe(e));
  function aUnidades(ev) { const r = lienzo.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * IW, (ev.clientY - r.top) / r.height * IH]; }
  // tocar el mapa: eliges espectro y, arrastrando, le trazas la ruta
  function trazoIni(ev) {
    const [ux, uy] = aUnidades(ev), G = mapaGeo;
    const panel=panelTactico();
    if (vertical ? uy<panel.oy : ux<panel.ox) { siguienteCamara(); return; }
    if (!G || ux<G.mx || uy<G.my || ux>=G.mx+L.cols*G.ts || uy>=G.my+L.rows*G.ts) return;
    const fx = (ux - G.mx) / G.ts, fy = (uy - G.my) / G.ts; let md = 1.6, cual = -1;
    espectros.forEach((e, i) => { const d = hypot(e.x / T - fx, e.y / T - fy); if (!(e.muerto > 0) && d < md) { md = d; cual = i; } });
    if (cual >= 0) { sel = cual; camarasVistas.clear(); }
    const e = espectros[sel]; if (!e || e.muerto > 0) return;
    trazo = { id: ev.pointerId, e, empezado:false, ult: [floor(e.x / T), floor(e.y / T)] }; pitido(700, 0.04, 'triangle', .4);
    if (cual < 0) trazoSigue(ev);
    try { cont.setPointerCapture(ev.pointerId); } catch (er) { }
  }
  function trazoSigue(ev) {
    const [ux, uy] = aUnidades(ev), G = mapaGeo; if (!G || !trazo) return;
    const tx = limita(floor((ux - G.mx) / G.ts), 0, L.cols - 1), ty = limita(floor((uy - G.my) / G.ts), 0, L.rows - 1);
    if (tx === trazo.ult[0] && ty === trazo.ult[1]) return;
    const seg = camino(trazo.ult[0], trazo.ult[1], tx, ty, vetado);
    if (!seg.length || (trazo.empezado && trazo.e.ruta.length>90)) return;
    if (!trazo.empezado) {
      trazo.e.ruta=[]; trazo.empezado=true;
      if(trazo.e.estado!=='persigue')trazo.e.estado='patrulla';
    }
    trazo.e.ruta = trazo.e.ruta.concat(seg); trazo.ult = seg[seg.length - 1];
  }

  // ---------- MÚSICA: Audio.play('aldea') · Audio.play('dojo') · Audio.stop() ----------
  // Si en config.js > musica hay un archivo (assets/aldea.mp3) suena ese, en bucle y con fundido.
  // Si no, suena una música sencilla generada por el propio juego.
  const Respaldo = (function () {
    let actual = '', zona = '', el = null, salida = null, fijos = [], reloj2 = null, idx = 2, paso = 0;
    const M = () => CONFIG.musica || {};
    function stop() {
      const f = M().fundido || 1.5; actual = '';
      if (reloj2) { clearInterval(reloj2); reloj2 = null; }
      if (el) { const a = el, v0 = a.volume; let k = 0; const iv = setInterval(() => { k++; a.volume = Math.max(0, v0 * (1 - k / 20)); if (k >= 20) { clearInterval(iv); a.pause(); } }, f * 50); el = null; }
      if (salida && audio) { const s = salida, os = fijos; try { s.gain.cancelScheduledValues(audio.currentTime); s.gain.setValueAtTime(s.gain.value, audio.currentTime); s.gain.linearRampToValueAtTime(0.0001, audio.currentTime + f); } catch (e) { } setTimeout(() => { os.forEach(o => { try { o.stop(); } catch (e) { } }); try { s.disconnect(); } catch (e) { } }, f * 1000 + 200); salida = null; fijos = []; }
    }
    function nota(f, dur, vol, tipo) { if (!salida || audio.state !== 'running') return; const o = audio.createOscillator(), a = audio.createGain(), t = audio.currentTime; o.type = tipo || 'triangle'; o.frequency.value = f; a.gain.setValueAtTime(0.0001, t); a.gain.linearRampToValueAtTime(vol, t + 0.02); a.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(a); a.connect(salida); o.start(t); o.stop(t + dur + .05); }
    function generada(nombre) {
      try {
        if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
        salida = audio.createGain(); salida.gain.setValueAtTime(0.0001, audio.currentTime); salida.gain.linearRampToValueAtTime((M().volumen == null ? .5 : M().volumen) * .6, audio.currentTime + (M().fundido || 1.5)); salida.connect(audio.destination);
        if (nombre === 'dojo') { for (const f of [55, 55.7, 82.6]) { const o = audio.createOscillator(), a = audio.createGain(); o.type = 'sine'; o.frequency.value = f; a.gain.value = f > 60 ? .12 : .32; o.connect(a); a.connect(salida); o.start(); fijos.push(o); } }
        const esc = [293.66, 329.63, 392, 440, 493.88, 587.33, 659.25];   // pentatónica, suena a koto
        reloj2 = setInterval(() => {
          paso++;
          if (nombre === 'dojo') { if (Math.random() < .1) nota(880 + Math.random() * 500, 2.6, .05, 'sine'); if (paso % 16 === 0) nota(110, 1.6, .18, 'sine'); }
          else { if (Math.random() < .62) { idx = limita(idx + floor(Math.random() * 5) - 2, 0, esc.length - 1); nota(esc[idx], 1.1, .22); if (Math.random() < .25) setTimeout(() => nota(esc[limita(idx + 2, 0, esc.length - 1)], .9, .12), 140); } if (paso % 8 === 0) nota(73.42, 2.2, .2, 'sine'); }
        }, 300);
      } catch (e) { }
    }
    function play(nombre) {
      zona = nombre; if (nombre === actual) return; stop(); if (silencio || !CONFIG.sonido.activado || M().activada === false) return;
      actual = nombre; const src = M()[nombre];
      if (src) { try { const a = new window.Audio(src); a.loop = true; a.volume = 0; el = a; a.addEventListener('error', () => { if (el === a) { el = null; generada(nombre); } }); const p = a.play(); if (p && p.catch) p.catch(() => { }); const v = M().volumen == null ? .5 : M().volumen; let k = 0; const iv = setInterval(() => { k++; if (el !== a || k > 20) return clearInterval(iv); a.volume = v * k / 20; }, (M().fundido || 1.5) * 50); } catch (e) { generada(nombre); } }
      else generada(nombre);
    }
    return { play, stop, reanudar: () => { if (audio && audio.state === 'suspended') audio.resume(); if (el && el.paused) { const p = el.play(); if (p && p.catch) p.catch(() => { }); } }, get zona() { return zona; }, get sonando() { return actual; } };
  })();
  // Director de la música. Por defecto suena el tema de cada fase (los temas están en musica.js).
  //   Audio.play('aldea') / Audio.play('dojo') = fuerza ese tema · Audio.stop() = silencio con fundido · Audio.auto() = vuelve a lo automático
  // Si en config.js > musica pones un archivo (assets/aldea.mp3), suena tu instrumental en vez del tema generado.
  const Banda = (function () {
    let manual = null, el = null, elNombre = '', sonando = '';
    const sint = () => (typeof Musica !== 'undefined' && Musica && Musica.ajustar) ? Musica : null;
    const temas = () => (typeof MUSICA !== 'undefined' && MUSICA.fases) || { aldea: 'aldea', menu: 'aldea', jugando: 'dojo', pausa: 'dojo', finRonda: 'dojo', fin: 'aldea' };
    function quitarArchivo() { if (!el) return; const a = el, v0 = a.volume; el = null; elNombre = ''; let k = 0; const iv = setInterval(() => { k++; a.volume = Math.max(0, v0 * (1 - k / 15)); if (k >= 15) { clearInterval(iv); a.pause(); } }, 100); }
    function tick(fase, mudo) {
      const M = CONFIG.musica || {}, quiere = M.activada === false ? '' : manual !== null ? manual : (temas()[fase] || '');
      const archivo = quiere ? M[quiere] : '', S = sint(), vol = mudo || CONFIG.sonido.activado === false ? 0 : (CONFIG.sonido.musica == null ? .5 : CONFIG.sonido.musica);
      if (archivo) {
        if (elNombre !== quiere) { quitarArchivo(); try { el = new window.Audio(archivo); el.loop = true; el.volume = 0; elNombre = quiere; const p = el.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { el = null; } }
        if (el) el.volume = limita(el.volume + (vol - el.volume) * 0.04, 0, 1);
        if (S) { MUSICA.fases.__silencio = ''; S.ajustar('__silencio', mudo); } else Respaldo.stop();
      } else {
        quitarArchivo();
        if (S) { MUSICA.fases.__manual = quiere; S.ajustar('__manual', mudo); }
        else if (!vol || !quiere) Respaldo.stop(); else Respaldo.play(quiere);
      }
      sonando = quiere;
    }
    // tic suave mientras se escribe un diálogo (faltaba en la v0.19 y rompía el juego al hablar)
    let ultimaLetra = 0;
    const letra = () => { const t = performance.now(); if (t - ultimaLetra < 45) return; ultimaLetra = t; pitido(560, 0.025, 'square', .18); };
    return { tick, letra, play: n => { manual = n; }, stop: () => { manual = ''; }, auto: () => { manual = null; }, reanudar: () => { if (el && el.paused) { const p = el.play(); if (p && p.catch) p.catch(() => { }); } if (audio && audio.state === 'suspended') audio.resume(); }, get sonando() { return sonando; } };
  })();
  if (window.Audio) { window.Audio.play = Banda.play; window.Audio.stop = Banda.stop; window.Audio.auto = Banda.auto; }

  // ---------- HUEVO DE DRAGÓN (premio por las 4 misiones) ----------
  function dibujaHuevo(c, x, y, r, t) {
    const im = estampas['dofus-verde'];
    if (im?.naturalWidth) {
      c.drawImage(im, x-r*1.2, y-r*1.2, r*2.4, r*2.4);
      return;
    }
    const gl = c.createRadialGradient(x, y, r * .2, x, y, r * 2.2); gl.addColorStop(0, 'rgba(90,255,170,' + (.35 + .15 * Math.sin(t * 3)) + ')'); gl.addColorStop(1, 'rgba(90,255,170,0)'); c.fillStyle = gl; c.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
    const gr = c.createRadialGradient(x - r * .3, y - r * .45, r * .1, x, y, r * 1.25); gr.addColorStop(0, '#b6f5c9'); gr.addColorStop(.45, '#2fae6b'); gr.addColorStop(1, '#0d4a33');
    c.fillStyle = gr; c.beginPath(); c.moveTo(x, y - r * 1.2); c.bezierCurveTo(x + r * .95, y - r * 1.1, x + r * 1.05, y + r * .95, x, y + r); c.bezierCurveTo(x - r * 1.05, y + r * .95, x - r * .95, y - r * 1.1, x, y - r * 1.2); c.fill();
    c.strokeStyle = 'rgba(8,50,34,.55)'; c.lineWidth = r * .05;
    for (let f = 0; f < 5; f++) for (let k = -2; k <= 2; k++) { const ex = x + (k + (f % 2) * .5) * r * .36, ey = y - r * .7 + f * r * .36; if (hypot((ex - x) / .85, ey - y) > r * .95) continue; c.beginPath(); c.arc(ex, ey, r * .19, .1 * PI, .9 * PI); c.stroke(); }
    c.strokeStyle = 'rgba(255,236,150,' + (.6 + .4 * Math.sin(t * 3)) + ')'; c.lineWidth = r * .07; c.beginPath(); c.moveTo(x - r * .1, y - r * .9); c.lineTo(x + r * .12, y - r * .5); c.lineTo(x - r * .08, y - r * .25); c.lineTo(x + r * .18, y + r * .1); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x - r * .32, y - r * .55, r * .14, r * .26, -.4, 0, 2 * PI); c.fill();
  }

  // ---------- SUELO CON DETALLE: cada casilla se pinta una vez con mucho detalle y luego se reutiliza ----------
  let teselas = {};
  function semilla(n) { let a = (n * 2654435761) >>> 0 || 1; return () => { a ^= a << 13; a >>>= 0; a ^= a >> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; }
  function tesela(clave, pintor, v) {
    let cv = teselas[clave]; if (cv) return cv;
    cv = document.createElement('canvas'); const px = Math.max(8, Math.ceil(T * K)); cv.width = cv.height = px;
    const c = cv.getContext('2d'); c.scale(px / T, px / T); pintor(c, v); teselas[clave] = cv; return cv;
  }
  function pintaHierba(c, v) {
    const C = col(), rnd = semilla(v * 977 + 13), s = T / 24;
    c.fillStyle = C.hierba1; c.fillRect(0, 0, T, T);
    for (let i = 0; i < 7; i++) { const x = rnd() * T, y = rnd() * T, r = (5 + rnd() * 8) * s, gr = c.createRadialGradient(x, y, 0, x, y, r), k = rnd() < .5 ? tono(C.hierba1, .8) : tono(C.hierba1, 1.16); gr.addColorStop(0, k); gr.addColorStop(1, alfa(C.hierba1, 0)); c.globalAlpha = .55; c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); }
    c.globalAlpha = 1; c.lineCap = 'round';
    for (let i = 0; i < 95; i++) { const x = rnd() * T, y = rnd() * T, len = (1.8 + rnd() * 3.6) * s; c.strokeStyle = tono(C.hierba1, .62 + rnd() * .75); c.lineWidth = (.3 + rnd() * .35) * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (rnd() - .5) * 2 * s, y - len * .6, x + (rnd() - .5) * 3 * s, y - len); c.stroke(); }
    for (let i = 0; i < 5; i++) { const x = rnd() * T, y = rnd() * T; c.fillStyle = tono(C.hierba1, 1.35); for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + Math.cos(k * 2.1) * .9 * s, y + Math.sin(k * 2.1) * .9 * s, .75 * s, 0, 2 * PI); c.fill(); } }
    for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(60,40,20,.22)'; c.beginPath(); c.ellipse(rnd() * T, rnd() * T, (1 + rnd() * 2) * s, (.6 + rnd()) * s, rnd() * 3, 0, 2 * PI); c.fill(); }
  }
  function pintaCamino(c, v) {
    const rnd = semilla(v * 613 + 7), s = T / 24;
    c.fillStyle = '#b39b6e'; c.fillRect(0, 0, T, T);
    for (let i = 0; i < 6; i++) { const x = rnd() * T, y = rnd() * T, r = (4 + rnd() * 7) * s, gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rnd() < .5 ? 'rgba(120,96,60,.5)' : 'rgba(214,196,150,.5)'); gr.addColorStop(1, 'rgba(160,140,100,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 9; i++) {   // losas irregulares con sombra y brillo
      const x = (2 + rnd() * 20) * s, y = (2 + rnd() * 20) * s, rx = (2.4 + rnd() * 3) * s, ry = (1.6 + rnd() * 2) * s, a = rnd() * 3, gris = 150 + floor(rnd() * 60);
      c.fillStyle = 'rgba(40,28,14,.35)'; c.beginPath(); c.ellipse(x + .5 * s, y + .9 * s, rx, ry, a, 0, 2 * PI); c.fill();
      c.fillStyle = 'rgb(' + gris + ',' + (gris - 8) + ',' + (gris - 28) + ')'; c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, 2 * PI); c.fill();
      c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(x - rx * .25, y - ry * .3, rx * .5, ry * .35, a, 0, 2 * PI); c.fill();
      if (rnd() < .4) { c.strokeStyle = 'rgba(40,28,14,.4)'; c.lineWidth = .3 * s; c.beginPath(); c.moveTo(x - rx * .5, y); c.lineTo(x + rx * .2, y + ry * .3); c.stroke(); }
    }
    for (let i = 0; i < 26; i++) { c.fillStyle = rnd() < .3 ? 'rgba(80,130,60,.7)' : 'rgba(70,52,30,.45)'; c.beginPath(); c.arc(rnd() * T, rnd() * T, (.3 + rnd() * .6) * s, 0, 2 * PI); c.fill(); }
  }
  function flecosHierba(tx, ty, x, y, s) {   // la hierba se come los bordes del camino y de la orilla
    const C = col(), verde = c => c === 0 || c === 6 || c === 7; g.lineCap = 'round';
    for (const [dx, dy] of DIRS) {
      if (!verde(celda(tx + dx, ty + dy))) continue;
      for (let k = 0; k < 9; k++) { const hs = hash(tx * 7 + k + dx * 3, ty * 5 + dy), u = (k + (hs % 10) / 10) * T / 9, len = (2 + (hs >> 4) % 4) * s; let ax, ay, bx, by; if (dx) { ax = x + (dx > 0 ? T : 0); ay = y + u; bx = ax - dx * len; by = ay - s; } else { ax = x + u; ay = y + (dy > 0 ? T : 0); bx = ax + ((hs >> 7) % 3 - 1) * s; by = ay - dy * len; } g.strokeStyle = tono(C.hierba1, .7 + ((hs >> 9) % 6) / 10); g.lineWidth = (.5 + (hs >> 3) % 3 * .2) * s; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
    }
  }

  // ---------- tema DOJO: tatamis, paredes de papel y tejados ----------
  function sueloDojo(tx, ty, c) {
    const C = col(), x = tx * T, y = ty * T, hs = hash(tx, ty), s = T / 24, par = (tx + ty) & 1, base = par ? C.tatami1 : C.tatami2;
    R(x, y, T + .4, T + .4, base);
    g.strokeStyle = tono(base, .9); g.lineWidth = .35 * s; g.beginPath();
    for (let k = 1; k < 12; k++) { if (par) { g.moveTo(x, y + k * 2 * s); g.lineTo(x + T, y + k * 2 * s); } else { g.moveTo(x + k * 2 * s, y); g.lineTo(x + k * 2 * s, y + T); } }
    g.stroke();
    g.fillStyle = C.tatamiBorde; if (par) { g.fillRect(x, y, T + .4, 1.3 * s); g.fillRect(x, y + T - 1.3 * s, T + .4, 1.3 * s); } else { g.fillRect(x, y, 1.3 * s, T + .4); g.fillRect(x + T - 1.3 * s, y, 1.3 * s, T + .4); }
    if (c === 3) {   // zona segura: cojín de meditación
      const m = T / 2, pu = .5 + .5 * Math.sin(reloj * 2 + tx + ty);
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.roundRect(x + 2.6 * s, y + 3.6 * s, T - 5 * s, T - 5 * s, 4 * s); g.fill();
      g.fillStyle = C.seguro1; g.beginPath(); g.roundRect(x + 2.2 * s, y + 2.2 * s, T - 4.4 * s, T - 4.4 * s, 4 * s); g.fill();
      g.fillStyle = C.seguro2; g.beginPath(); g.roundRect(x + 4 * s, y + 3.4 * s, T - 8 * s, T - 9 * s, 3 * s); g.fill();
      circ(x + m, y + m, 2 * s, alfa(C.seguro1.length === 7 ? C.seguro1 : '#c9b6f2', .6 + .4 * pu));
      for (const [a, b] of [[3.4, 3.4], [20.6, 3.4], [3.4, 20.6], [20.6, 20.6]]) circ(x + a * s, y + b * s, .9 * s, C.heroeMetal || '#e8c15a');
      return;
    }
    deterioroDojo(tx,ty,x,y,hs,s);
    const px = x + ((hs >> 9) % 14 + 5) * s, py = y + ((hs >> 13) % 12 + 6) * s;
    if (hs % 5 === 0) for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? '#ffc4dc' : '#ff9ecb'; g.beginPath(); g.ellipse(px + ((hs >> k * 3) % 9 - 4) * s, py + ((hs >> k * 4) % 9 - 4) * s, 1.5 * s, .8 * s, k * 1.1, 0, 2 * PI); g.fill(); }
    else if (hs % 23 === 7) {   // farolillo de papel
      const fl = .75 + .25 * Math.sin(reloj * 7 + tx * 3), gl = g.createRadialGradient(px, py - 2 * s, 0, px, py - 2 * s, 13 * s);
      gl.addColorStop(0, 'rgba(255,190,90,' + (.38 * fl) + ')'); gl.addColorStop(1, 'rgba(255,190,90,0)'); circ(px, py - 2 * s, 13 * s, gl);
      R(px - 2.6 * s, py + 1.4 * s, 5.2 * s, 1 * s, C.madera); R(px - 2.2 * s, py - 5 * s, 4.4 * s, 6.4 * s, '#ffe7b0'); R(px - 2.6 * s, py - 5.6 * s, 5.2 * s, 1 * s, C.madera);
      R(px - .2 * s, py - 5 * s, .4 * s, 6.4 * s, alfa(C.madera, .6)); R(px - 2.2 * s, py - 2 * s, 4.4 * s, .4 * s, alfa(C.madera, .6));
    }
  }
  function muroDojo(tx, ty, hW) {
    const C = col(), x = tx * T, y = ty * T, hs = hash(tx + 31, ty + 17), s = T / 24, yt = y - hW, abajo = celda(tx, ty + 1) !== 1;
    if (abajo) {   // pared shoji: papel con luz detrás, celosía de madera
      const y0 = y + T - hW, fl = .8 + .2 * Math.sin(reloj * 5 + tx * 1.7 + ty), gr = g.createLinearGradient(0, y0, 0, y + T);
      gr.addColorStop(0, C.shoji); gr.addColorStop(1, tono(C.shoji, .78 + .1 * fl)); g.fillStyle = gr; g.fillRect(x, y0, T + .4, hW);
      const gl = g.createRadialGradient(x + T / 2, y0 + hW * .6, 0, x + T / 2, y0 + hW * .6, T * .6); gl.addColorStop(0, 'rgba(255,170,70,' + (.3 * fl) + ')'); gl.addColorStop(1, 'rgba(255,170,70,0)'); g.fillStyle = gl; g.fillRect(x, y0, T, hW);
      if (hs % 9 === 0) { const ph = (reloj * .12 + (hs % 100) / 100) % 1; g.save(); g.beginPath(); g.rect(x, y0, T, hW); g.clip(); const sx = x - 8 * s + ph * (T + 16 * s); elip(sx, y0 + hW * .55, 3 * s, hW * .5, 'rgba(20,0,10,.34)'); for (let k = -2; k <= 2; k++) linea([sx, y0 + hW * .3, sx + k * 1.6 * s, y0 - 1 * s + abs(k) * s], 'rgba(20,0,10,.34)', .8 * s); g.restore(); }   // una sombra pasa por detrás...
      if (CONFIG.gore.sangre && hs % 7 === 3) { circ(x + T * .6, y0 + hW * .45, 2.2 * s, alfa(C.sangre, .85)); circ(x + T * .6 - 2.6 * s, y0 + hW * .3, 1 * s, alfa(C.sangre, .85)); R(x + T * .6 - .4 * s, y0 + hW * .45, .8 * s, hW * .5, alfa(C.sangre, .8)); }
      g.fillStyle = C.madera; g.fillRect(x, y0, T + .4, 1.2 * s); g.fillRect(x, y + T - 1.5 * s, T + .4, 1.5 * s);
      for (let k = 0; k <= 3; k++) g.fillRect(x + k * T / 3 - .4 * s, y0, .8 * s, hW);
      g.fillRect(x, y0 + hW * .5, T, .5 * s);
      if (hs%4===1) {
        poli([x+T*.31,y0+hW*.12,x+T*.62,y0+hW*.23,x+T*.59,y0+hW*.42,x+T*.78,y0+hW*.83,x+T*.37,y0+hW*.89,x+T*.44,y0+hW*.63,x+T*.24,y0+hW*.48],'#221522');
        linea([x+T*.31,y0+hW*.12,x+T*.37,y0+hW*.43,x+T*.24,y0+hW*.48],'#c2a28b',.55*s);
      }
    }
    // tejado de teja
    R(x, yt, T + .4, T + .4, C.tejado);
    g.strokeStyle = tono(C.tejado, 1.5); g.lineWidth = .7 * s;
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (k + .5 + (r % 2) * .5) * T / 4, yt + (r + .25) * T / 4, T / 8.6, 0.1 * PI, 0.9 * PI); g.stroke(); }
    if (celda(tx, ty - 1) !== 1) R(x, yt, T + .4, 1.6 * s, tono(C.tejado, 1.7));
    if (celda(tx - 1, ty) !== 1) R(x, yt, 1.3 * s, T, 'rgba(255,255,255,.16)');
    if (celda(tx + 1, ty) !== 1) R(x + T - 1.6 * s, yt, 1.6 * s, T, 'rgba(0,0,0,.28)');
    if (abajo) R(x, yt + T - 1.8 * s, T + .4, 1.8 * s, tono(C.tejado, .6));
    if (hs%6===0) {
      poli([x+T*.19,yt+T*.20,x+T*.62,yt+T*.22,x+T*.76,yt+T*.46,x+T*.53,yt+T*.68,x+T*.26,yt+T*.61],'#211923');
      linea([x+T*.21,yt+T*.21,x+T*.47,yt+T*.38,x+T*.39,yt+T*.66,x+T*.7,yt+T*.83],'#55404b',.85*s);
    }
  }

  // ---------- teletransporte: el ninja ----------
  function humo(x, y, p, s) { for (let k = 0; k < 6; k++) { const a = k * 1.05 + 1; circ(x + Math.cos(a) * p * 11 * s, y - 6 * s + Math.sin(a) * p * 7 * s - p * 5 * s, (3 + p * 5) * s, 'rgba(225,220,235,' + limita(.85 - p, 0, 1) + ')'); } }
  function dibujaNinja(x, y, k, shh) {
    const s = T / 24, C = col(), cu = C.ninja || '#2a2440', ci = C.ninjaCinta || '#d62f3a', ond = Math.sin(reloj * 11) * 1.4;
    const im = estampas['ninja-shhh'];   // assets/mundo/ninja-shhh.webp: el ninja dibujado
    if (im?.naturalWidth && k > .05) {
      const alto = T * 2.1 * k, ancho = alto * im.naturalWidth / im.naturalHeight, pie = y + 7 * s;
      pisar(x, pie, ancho * .9);
      g.save(); g.translate(x, pie); g.rotate(Math.sin(reloj * 3) * .015); g.drawImage(escalada(im, ancho, alto), -ancho / 2, -alto, ancho, alto); g.restore();
      if (shh) escribe(txt().shhh || 'shhh…', x + ancho * .45, pie - alto * .85, 7.5, '#fff', 'left', true);
      return;
    }
    elip(x, y + 7 * s, 6 * s * k, 2.4 * s * k, 'rgba(0,0,0,.3)');
    g.save(); g.translate(x, y + 7 * s); g.scale(s * k, s * k); g.lineCap = 'round';
    g.fillStyle = ci; g.beginPath(); g.moveTo(-4, -17); g.quadraticCurveTo(-9, -19 + ond, -13, -16 + ond); g.lineTo(-12, -13.5 + ond); g.quadraticCurveTo(-8, -16, -4, -15); g.fill();
    R(-3.8, -4, 3, 4, tono(cu, .7)); R(.8, -4, 3, 4, tono(cu, .7));
    g.fillStyle = cu; g.beginPath(); g.moveTo(-4.6, -11); g.quadraticCurveTo(-6.4, -6, -5.4, -3); g.lineTo(5.4, -3); g.quadraticCurveTo(6.4, -6, 4.6, -11); g.closePath(); g.fill();
    R(-5.4, -6.4, 10.8, 1.5, ci);
    circ(0, -15, 6, cu); elip(.4, -15.2, 4.4, 1.9, C.heroePiel);
    g.strokeStyle = '#191320'; g.lineWidth = .8; g.beginPath(); g.arc(-1.6, -15, 1.1, PI, 0); g.stroke(); g.beginPath(); g.arc(2.4, -15, 1.1, PI, 0); g.stroke();   // ojos sonrientes
    R(-6, -18.6, 12, 1.3, ci);
    linea([-5, -9.5, -6.5, -6], cu, 2.2); circ(-6.5, -5.6, 1.3, C.heroePiel);
    if (shh) { linea([4.6, -9.5, 2.2, -11.2], cu, 2.2); circ(1.6, -11.8, 1.3, C.heroePiel); linea([1.4, -12, 1.2, -14.2], C.heroePiel, .95); }
    else { linea([4.6, -9.5, 7.5, -8], cu, 2.2); circ(8, -7.8, 1.3, C.heroePiel); }
    g.restore();
    if (shh) escribe(txt().shhh || 'shhh…', x + 9 * s, y - 19 * s, 7.5, '#fff', 'left', true);
  }
  // el ninja aparece, te manda callar, te agarra y os esfumáis; aparecéis en el otro extremo
  function dibujaTP() {
    const s = T / 24, u = tp.t / tp.dur, o = tp.hecho ? tp.b : tp.a, nx = h.x + 11 * s, ny = h.y;
    if (u < 0.5) { const cae = limita(1 - u / 0.1, 0, 1); dibujaHeroe(h.x, h.y); if (cae > 0) humo(nx, ny, 1 - cae, s); dibujaNinja(nx - (u > 0.42 ? (u - 0.42) / 0.08 * 9 * s : 0), ny - cae * 26 * s, 1, u > 0.12 && u < 0.42); }
    else if (u < 0.6) { const k = 1 - (u - 0.5) / 0.1; g.save(); g.translate(h.x, h.y + 7 * s); g.scale(k, k); g.translate(-h.x, -h.y - 7 * s); dibujaHeroe(h.x, h.y); g.restore(); dibujaNinja(h.x + 2 * s, ny, k, false); humo(h.x, h.y, 1 - k, s); }
    else if (u < 0.78) { const k = (u - 0.6) / 0.18; g.save(); g.translate(h.x, h.y + 7 * s); g.scale(k, k); g.translate(-h.x, -h.y - 7 * s); dibujaHeroe(h.x, h.y); g.restore(); dibujaNinja(nx, ny, k, false); humo(h.x, h.y, k, s); }
    else { const k = (u - 0.78) / 0.22; dibujaHeroe(h.x, h.y); if (k < 0.5) dibujaNinja(nx, ny, 1, false); else humo(nx, ny, (k - .5) * 2, s); }
    void o;
  }
  function dibujaPortal(p) {
    const s = T / 24, x = (p.tx + .5) * T, y = (p.ty + .5) * T, C = col(), c = C.portal || '#b06cff', listo = p.t <= 0;
    elip(x, y, 9 * s, 6.4 * s, '#120a1c'); g.strokeStyle = alfa(c, listo ? .95 : .3); g.lineWidth = 1.1 * s; g.beginPath(); g.ellipse(x, y, 9 * s, 6.4 * s, 0, 0, 2 * PI); g.stroke();
    if (listo) for (let k = 0; k < 3; k++) { const a = reloj * 2.4 + k * 2.1; g.beginPath(); g.ellipse(x, y, (6.5 - k * 2) * s, (4.6 - k * 1.4) * s, 0, a, a + 2.2); g.stroke(); }
    const a = reloj * (listo ? 1.5 : 0); g.fillStyle = listo ? '#d8dbe6' : '#565a6a'; g.beginPath(); for (let k = 0; k < 8; k++) { const r = (k % 2 ? 1.1 : 3.2) * s, an = a + k * PI / 4; g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r * .72); } g.fill();   // shuriken
  }

  function dibujaCono(e) {
    const P = PE(e), n = 16, a0 = e.dir - P.angulo * PI / 360, max = P.alcance * T, paso = T / 4, c = colorEstado(e);
    g.beginPath(); g.moveTo(e.x, e.y);
    for (let i = 0; i <= n; i++) {
      const a = a0 + P.angulo * PI / 180 * i / n; let d = 0;
      while (d < max && !solido(floor((e.x + Math.cos(a) * (d + paso)) / T), floor((e.y + Math.sin(a) * (d + paso)) / T))) d += paso;
      g.lineTo(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d);
    }
    g.closePath();
    const gr = g.createRadialGradient(e.x, e.y, 0, e.x, e.y, max); gr.addColorStop(0, alfa(c, e.estado === 'persigue' ? .5 : .34)); gr.addColorStop(1, alfa(c, .03));
    g.fillStyle = gr; g.fill();
  }

  function dibujaSuelo(tx, ty) {
    const C = col(), c0 = L.c[ty][tx], c = (c0 === 6 || c0 === 7 || (L.exterior && c0 === 5)) ? 0 : c0, x = tx * T, y = ty * T, hs = hash(tx, ty), s = T / 24;
    if (c === 1) return;
    if (c === 5) {   // camino de piedra
      g.drawImage(tesela('p' + (hs % 5), pintaCamino, hs % 5), x, y, T + .4, T + .4); flecosHierba(tx, ty, x, y, s);
    }
    else if (dojo() && !L.exterior && (c === 0 || c === 3)) sueloDojo(tx, ty, c);
    else if (c === 0) {
      g.drawImage(tesela('h' + (hs % 6), pintaHierba, hs % 6), x, y, T + .4, T + .4);
      g.strokeStyle = tono(C.hierba2, .82); g.lineWidth = .6 * s; g.beginPath();
      for (let k = 0; k < 3; k++) { const px = x + ((hs >> (k * 5)) % 20 + 2) * s, py = y + ((hs >> (k * 5 + 3)) % 17 + 5) * s; g.moveTo(px, py); g.lineTo(px - 1.2 * s, py - 3 * s); g.moveTo(px, py); g.lineTo(px + .3 * s, py - 3.8 * s); g.moveTo(px, py); g.lineTo(px + 1.8 * s, py - 2.6 * s); }
      g.stroke();
      const px = x + ((hs >> 9) % 16 + 4) * s, py = y + ((hs >> 13) % 14 + 5) * s;
      if (hs % 6 === 0) { for (let k = 0; k < 4; k++) circ(px + Math.cos(k * PI / 2) * 1.3 * s, py + Math.sin(k * PI / 2) * 1.3 * s, 1.1 * s, C.flor); circ(px, py, .8 * s, '#ff9d2e'); }
      else if (hs % 11 === 3) { elip(px, py, 2.4 * s, 1.5 * s, '#9aa39a'); elip(px - .5 * s, py - .4 * s, 1.2 * s, .6 * s, '#c3cbc3'); }
      else if (hs % 17 === 5) { R(px - .8 * s, py - 1 * s, 1.6 * s, 3 * s, '#fff3e0'); g.fillStyle = '#e8484f'; g.beginPath(); g.arc(px, py - 1 * s, 2.8 * s, PI, 0); g.fill(); circ(px - 1 * s, py - 2.2 * s, .5 * s, '#fff'); circ(px + 1.1 * s, py - 1.7 * s, .4 * s, '#fff'); }
    } else if (c === 8) {
      sueloDojo(tx, ty, 0);
      const luz=lunaActiva(), col = luz ? '#c6f0fb' : '#767086';
      elip(x+T*.5,y+T*.55,T*.39,T*.28,alfa(col,luz?.36:.18));
      escribe('☾',x+T*.5,y+T*.71,T*.55,col,'center',false);
    }
    else if (c === 3 || c === 4) {
      const a = c === 3 ? C.seguro1 : C.base1, b = c === 3 ? C.seguro2 : C.base2, pu = .5 + .5 * Math.sin(reloj * 2 + tx + ty);
      R(x, y, T + .4, T + .4, tono(a, .82)); R(x + 1.2 * s, y + 1.2 * s, T - 2.4 * s, T - 2.4 * s, a); R(x + 1.2 * s, y + 1.2 * s, T - 2.4 * s, 1.2 * s, b);
      const m = T / 2; poli([x + m, y + m - 5 * s, x + m + 5 * s, y + m, x + m, y + m + 5 * s, x + m - 5 * s, y + m], alfa(b.length === 7 ? b : '#ffffff', .55 + .35 * pu));
      poli([x + m, y + m - 2.4 * s, x + m + 2.4 * s, y + m, x + m, y + m + 2.4 * s, x + m - 2.4 * s, y + m], tono(a, .9));
    } else {
      const ga = g.createLinearGradient(0, y, 0, y + T); ga.addColorStop(0, tono(C.agua, .82)); ga.addColorStop(1, tono(C.agua, 1.05)); g.fillStyle = ga; g.fillRect(x, y, T + .4, T + .4);
      for (const [dx, dy] of DIRS) if (celda(tx + dx, ty + dy) !== 2) {   // orilla de tierra, sombra y espuma
        const ol = Math.sin(reloj * 2 + tx + ty) * .5 * s;
        if (dy < 0) { R(x, y, T + .4, 3.2 * s, '#5d4a2c'); R(x, y + 3.2 * s, T + .4, 2.4 * s, 'rgba(10,40,60,.35)'); R(x, y + 5.4 * s + ol, T + .4, .7 * s, alfa(C.aguaLuz, .75)); }
        else if (dy > 0) { R(x, y + T - 1.2 * s + ol * .5, T + .4, .7 * s, alfa(C.aguaLuz, .7)); }
        else if (dx < 0) { R(x, y, 1.8 * s, T + .4, '#5d4a2c'); R(x + 1.8 * s + abs(ol), y, .7 * s, T + .4, alfa(C.aguaLuz, .6)); }
        else { R(x + T - 1.8 * s, y, 1.8 * s, T + .4, '#6b5634'); R(x + T - 2.6 * s - abs(ol), y, .7 * s, T + .4, alfa(C.aguaLuz, .6)); }
      }
      if (L.exterior) flecosHierba(tx, ty, x, y, s);
      if (hs % 4 === 1) { const a = reloj * .6 + hs % 7, kx = x + T / 2 + Math.cos(a) * 6 * s, ky = y + T / 2 + Math.sin(a) * 4 * s; g.save(); g.translate(kx, ky); g.rotate(a + PI / 2); elip(0, 0, 1.4 * s, 3.4 * s, hs % 8 === 1 ? '#ff7a3d' : '#f4f1ea'); poli([0, 3 * s, -1.6 * s, 5.4 * s, 1.6 * s, 5.4 * s], hs % 8 === 1 ? '#ff7a3d' : '#f4f1ea'); circ(0, -1 * s, .8 * s, '#ff3d3d'); g.restore(); }   // carpas koi
      g.strokeStyle = alfa(C.aguaLuz, .8); g.lineWidth = .7 * s;
      for (let k = 0; k < 2; k++) { const ph = (reloj * .5 + (hs >> (k * 4)) % 10 / 10) % 1, px = x + ((hs >> (k * 6 + 2)) % 14 + 5) * s, py = y + ((hs >> (k * 6 + 5)) % 12 + 7) * s; g.globalAlpha = 1 - ph; g.beginPath(); g.ellipse(px, py, (1 + ph * 5) * s, (.5 + ph * 2.2) * s, 0, 0, 2 * PI); g.stroke(); }
      g.globalAlpha = 1;
      if (hs % 5 === 0) { const px = x + T * .55, py = y + T * .6; g.fillStyle = '#4f9a3a'; g.beginPath(); g.moveTo(px, py); g.arc(px, py, 4.2 * s, .5, 2 * PI - .1); g.closePath(); g.fill(); if (hs % 10 === 0) { circ(px - s, py - s, 1.6 * s, '#ff9ecb'); circ(px - s, py - s, .7 * s, '#fff4a8'); } }
    }
    // sombras que proyectan los setos (sol desde arriba-izquierda)
    if (celda(tx, ty - 1) === 1) { const gr = g.createLinearGradient(0, y, 0, y + 8 * s); gr.addColorStop(0, 'rgba(0,20,10,.38)'); gr.addColorStop(1, 'rgba(0,20,10,0)'); g.fillStyle = gr; g.fillRect(x, y, T + .4, 8 * s); }
    if (celda(tx - 1, ty) === 1) { const gr = g.createLinearGradient(x, 0, x + 6 * s, 0); gr.addColorStop(0, 'rgba(0,20,10,.26)'); gr.addColorStop(1, 'rgba(0,20,10,0)'); g.fillStyle = gr; g.fillRect(x, y, 6 * s, T + .4); }
  }

  // seto con volumen: cara de arriba desplazada hacia arriba y pared de tierra delante
  function dibujaSeto(tx, ty, hW) {
    if (dojo() && !L.exterior) return muroDojo(tx, ty, hW);
    const C = col(), x = tx * T, y = ty * T, hs = hash(tx + 31, ty + 17), s = T / 24, yt = y - hW, abajo = celda(tx, ty + 1) !== 1;
    if (abajo) {
      const gr = g.createLinearGradient(0, y + T - hW, 0, y + T); gr.addColorStop(0, C.tierra); gr.addColorStop(1, C.tierraSombra);
      g.fillStyle = gr; g.fillRect(x, y + T - hW, T + .4, hW);
      g.fillStyle = alfa(C.tierraSombra, .6); g.fillRect(x + (hs % 13 + 2) * s, y + T - hW * .55, 5 * s, 1.2 * s); g.fillRect(x + ((hs >> 4) % 12 + 6) * s, y + T - hW * .25, 4 * s, 1.2 * s);
      g.fillStyle = alfa(C.tierra, .9); g.fillRect(x + ((hs >> 7) % 14 + 3) * s, y + T - hW * .8, 3 * s, 1 * s);
    }
    R(x, yt, T + .4, T + .4, C.seto);
    for (let k = 0; k < 6; k++) circ(x + ((hs >> (k * 3)) % 19 + 2.5) * s, yt + ((hs >> (k * 3 + 2)) % 17 + 3.5) * s, (3 + (k % 3)) * s, k % 2 ? alfa(C.setoLuz, .8) : tono(C.seto, .84));
    for (let k = 0; k < 4; k++) circ(x + ((hs >> (k * 4 + 1)) % 20 + 2) * s, yt + ((hs >> (k * 4 + 3)) % 18 + 3) * s, 1 * s, tono(C.setoLuz, 1.15));
    if (hs % 7 === 0) { circ(x + T * .6, yt + T * .4, 1.5 * s, '#ff9ecb'); circ(x + T * .6, yt + T * .4, .6 * s, '#fff4a8'); }
    if (celda(tx, ty - 1) !== 1) R(x, yt, T + .4, 1.5 * s, tono(C.setoLuz, 1.12));
    if (celda(tx - 1, ty) !== 1) R(x, yt, 1.3 * s, T, 'rgba(255,255,255,.14)');
    if (celda(tx + 1, ty) !== 1) R(x + T - 1.6 * s, yt, 1.6 * s, T, 'rgba(0,0,0,.2)');
    if (abajo) { g.fillStyle = C.seto; g.beginPath(); for (let i = 0; i < 6; i++) { const fx = x + i * T / 6; g.moveTo(fx, yt + T - .2); g.lineTo(fx + T / 6, yt + T - .2); g.lineTo(fx + T / 12, yt + T + (2 + ((hs >> i) & 1) * 1.8) * s); } g.fill(); R(x, yt + T - 1.4 * s, T + .4, 1.4 * s, tono(C.seto, .8)); }
  }

  function dibujaCascada(x, y) {
    const s=T/24, alto=36*s, ancho=14*s;
    const roca=g.createLinearGradient(x-ancho,y-alto,x+ancho,y);
    roca.addColorStop(0,'#172b3d'); roca.addColorStop(.55,'#647988'); roca.addColorStop(1,'#233844');
    poli([x-ancho*1.4,y,x-ancho*1.15,y-alto*.8,x-ancho*.57,y-alto,x+ancho*.85,y-alto*.93,x+ancho*1.4,y],roca);
    const agua=g.createLinearGradient(x-ancho,y,x+ancho,y);
    agua.addColorStop(0,'rgba(67,149,175,.32)'); agua.addColorStop(.49,'rgba(187,243,250,.93)'); agua.addColorStop(1,'rgba(49,141,187,.24)');
    poli([x-ancho*.46,y-alto,x+ancho*.47,y-alto*.93,x+ancho*.88,y,x-ancho*.9,y],agua);
    for(let i=0;i<17;i++){
      const t=(reloj*(.8+i%4*.14)+i*.37)%1;
      const px=x+((i*17)%23-11)*s*(.6+t*.6), py=y-alto+t*alto;
      R(px,py,.8*s,(3+i%4)*s,alfa('#e7fbff',.23+.3*Math.sin(t*PI)));
    }
    for(let i=0;i<7;i++){
      const t=(reloj*.9+i/7)%1;
      elip(x+((i*23)%17-8)*s,y+3*s-t*4*s,(2+t*8)*s,(1+t*3)*s,alfa('#d4f8fa',.28*(1-t)));
    }
  }

  // Cada tramo llega al centro de su vecino. En las curvas se une por tangencia.
  function texturaSenderos() {
    if (L.senderos) return L.senderos;
    const lienzo = document.createElement('canvas');
    lienzo.width=L.cols*T; lienzo.height=L.rows*T;
    const c=lienzo.getContext('2d'), centros=[];
    const esCamino=(x,y)=>celda(x,y)===5;
    c.beginPath();
    for(let y=0;y<L.rows;y++) for(let x=0;x<L.cols;x++) {
      if(!esCamino(x,y)) continue;
      const px=(x+.5)*T, py=(y+.5)*T;
      centros.push([px,py,x,y]);
      const vecinos=DIRS.filter(([dx,dy])=>esCamino(x+dx,y+dy));
      for(const [dx,dy] of [[1,1],[-1,1],[1,-1],[-1,-1]]) {
        if(esCamino(x+dx,y+dy)&&!esCamino(x+dx,y)&&!esCamino(x,y+dy)) vecinos.push([dx,dy]);
      }
      if(vecinos.length===2) {
        const [a,b]=vecinos;
        c.moveTo(px+a[0]*T/2,py+a[1]*T/2);
        c.quadraticCurveTo(px,py,px+b[0]*T/2,py+b[1]*T/2);
      } else if (vecinos.length) {
        for(const [dx,dy] of vecinos) {
          c.moveTo(px,py); c.lineTo(px+dx*T/2,py+dy*T/2);
        }
      } else {
        c.moveTo(px-.2,py); c.lineTo(px+.2,py);
      }
    }
    c.lineCap='round'; c.lineJoin='round';
    const tonos = zonaId==='paso' || zonaId==='santuario' ? ['#6e666a','#998d8a','#b7a8a0'] :
      zonaId==='aldea' ? ['#786748','#b0a081','#d4c6a1'] : ['#706444','#a6956d','#c3b18c'];
    for(const [color,ancho] of [[tonos[0],.96],[tonos[1],.86],[tonos[2],.63]]) {
      c.strokeStyle=color; c.lineWidth=T*ancho; c.stroke();
    }
    for(const [px,py,x,y] of centros) {
      const hs=hash(x+13,y+7);
      for(let k=0;k<5;k++) {
        const a=(hs>>>(k*3))%14-7, b=(hs>>>(k*4+2))%10-5;
        c.fillStyle=k%2?'#f4e5bc72':'#594a3a55';
        c.beginPath(); c.ellipse(px+a*T/30,py+b*T/30,T*(.025+k*.006),T*.018,.55,0,2*PI);c.fill();
      }
    }
    L.senderos=lienzo; return lienzo;
  }
  function dibujaEdificio(b) {
    const x=b.x*T, y=b.y*T, ancho=b.ancho*T, fondo=b.fondo*T;
    // La huella de piedra ocupa las mismas losas sólidas que la casa.
    R(x+.045*T,y+.16*T,ancho-.09*T,fondo-.13*T,'#4b463d');
    R(x+.09*T,y+.21*T,ancho-.18*T,fondo-.28*T,'#8c7d6a');
    R(x+.09*T,y+fondo-.20*T,ancho-.18*T,.14*T,'#655849');
    for(let i=0;i<b.ancho*2;i++) {
      const xx=x+(.16+i*.46)*T;
      linea([xx,y+fondo-.22*T,xx,y+fondo-.065*T],'#54473c',.75);
    }
    const im=estampas['casa-pintada'];
    if (!im?.naturalWidth) return;
    const pie=y+fondo-.15*T, cx=x+ancho/2, proporcion=im.naturalHeight/im.naturalWidth;
    const w=Math.min(ancho*(b.templo?.89:1.015),(pie+.36*T)/proporcion), alto=w*proporcion;
    g.save();
    g.translate(cx,pie);
    if (!b.templo && b.x>10) g.scale(-1,1);
    if (!b.templo && b.y>8) g.filter='sepia(.18) saturate(.83)';
    g.drawImage(im,-w/2,-alto,w,alto);
    g.restore();
  }

  const sombrasNube = [];
  function sombraNube(i) {
    if (sombrasNube[i]) return sombrasNube[i];
    const cv=document.createElement('canvas');cv.width=256;cv.height=128;
    const c=cv.getContext('2d'), rnd=semilla(712+i*601);
    c.filter='blur(8px)'; c.fillStyle='#102932'; c.beginPath();
    c.moveTo(22,78);
    c.bezierCurveTo(17,64,30,54,49,55);
    c.bezierCurveTo(45,35,69,22+i*3,93,36);
    c.bezierCurveTo(100,9+i*5,137,9,152,39);
    c.bezierCurveTo(169,22,198,41,198,55);
    c.bezierCurveTo(220,50,239,61,232,77);
    c.bezierCurveTo(219,97,192,99,170,94);
    c.bezierCurveTo(148,108,124,98,109,99);
    c.bezierCurveTo(85,106,75,96,57,98);
    c.bezierCurveTo(39,97,22,91,22,78);
    c.fill();
    c.globalAlpha=.25;
    for(let j=0;j<8;j++){
      const x=42+rnd()*169,y=47+rnd()*44;
      c.beginPath();c.ellipse(x,y,8+rnd()*17,5+rnd()*10,.14,0,2*PI);c.fill();
    }
    sombrasNube[i]=cv;return cv;
  }
  function rayosDeLuz(cx,cy,agua,ocaso) {
    if(ocaso)return;
    g.save();g.globalCompositeOperation='screen';
    for(let i=0;i<3;i++){
      const centro=IW*(.13+i*.31)-cx*.11, deriva=(Math.sin(reloj*.24+i)*6-cy*.02);
      const grad=g.createLinearGradient(centro,0,centro+IW*.17,AH*.74);
      grad.addColorStop(0,agua?'#b9e7ff16':'#ffe4a51d');grad.addColorStop(.42,agua?'#c6ebfa10':'#ffe8af10');grad.addColorStop(1,'#ffffff00');
      poli([centro-10,-4,centro+10,-4,centro+IW*.38+deriva,AH*.9,centro+IW*.15+deriva,AH*.9],grad);
    }
    g.restore();
  }
  function luzExterior(cx,cy) {
    const bosque=zonaId==='bosque', agua=zonaId==='ribera'||zonaId==='manantial', ocaso=zonaId==='paso'||zonaId==='santuario';
    const color=ocaso?'#eea2ac':agua?'#bce4e7':'#ffe4a2';
    const cielo=g.createLinearGradient(0,0,IW*.75,AH*.82);
    cielo.addColorStop(0,alfa(color,bosque?.22:.16));cielo.addColorStop(.68,alfa(color,0));
    cielo.addColorStop(1,ocaso?'#22173148':agua?'#07324335':'#26381c30');
    R(0,0,IW,AH,cielo);
    rayosDeLuz(cx,cy,agua,ocaso);
    g.save(); g.globalCompositeOperation='multiply';
    for(let i=0;i<3;i++){
      const w=(.65+i*.18)*IW, hh=w*.44;
      const x=((reloj*(3.4+i*.31)+i*143-cx*.38)%(IW+w)+IW+w)%(IW+w)-w;
      const y=AH*(.08+i*.32)-hh*.35-Math.sin(cy*.009+i)*14;
      g.globalAlpha=ocaso?.09:.15+i*.02;g.drawImage(sombraNube(i),x,y,w,hh);
    }
    g.restore();
  }
  function luzDojo(cx,cy,foco) {
    const luna=nivelActual===2, color=luna?'#a9d2e0':'#ffb168';
    const lx=foco.x-cx,ly=foco.y-cy;
    const escala=Math.min(IW,AH);
    const sombra=g.createRadialGradient(lx,ly,escala*.12,lx,ly,escala*.85);
    sombra.addColorStop(0,'#140b1825');
    sombra.addColorStop(.48,luna?'#15192d55':'#19102055');
    sombra.addColorStop(1,'#080611c8');
    R(0,0,IW,AH,sombra);
    g.save();g.globalCompositeOperation='screen';
    for(const [tx,ty] of L.luces || []) {
      const x=(tx+.5)*T-cx,y=(ty+.4)*T-cy,r=T*(2.05+.12*Math.sin(reloj*5+tx));
      if(x<-r||x>IW+r||y<-r||y>AH+r)continue;
      const gl=g.createRadialGradient(x,y,0,x,y,r);
      gl.addColorStop(0,alfa(color,.22));gl.addColorStop(.24,alfa(color,.11));gl.addColorStop(1,alfa(color,0));
      circ(x,y,r,gl);
    }
    g.restore();
  }
  function deterioroDojo(tx,ty,x,y,hs,s) {
    if(hs%5===1) {
      const cx=x+(4+hs%12)*s,cy=y+(5+(hs>>>8)%12)*s;
      linea([cx-6*s,cy-4*s,cx-2*s,cy-2*s,cx,cy+1*s,cx+4*s,cy+2*s,cx+8*s,cy+7*s],'#221923',1.4*s);
      linea([cx,cy+1*s,cx+2*s,cy-4*s,cx+7*s,cy-6*s],'#32202a',.7*s);
      for(let i=0;i<4;i++){
        const px=cx+((hs>>>(i*4))%12-5)*s,py=cy+((hs>>>(i*5+7))%11-4)*s;
        poli([px-1.6*s,py+.4*s,px+.1*s,py-1.8*s,px+2*s,py+.8*s],i%2?'#998075':'#51414a');
      }
    }
    if(CONFIG.gore.sangre&&CONFIG.gore.intensidad>0&&hs%7<2) {
      const px=x+(6+(hs>>>7)%11)*s,py=y+(6+(hs>>>13)%10)*s;
      for(let i=0;i<8;i++){
        const dx=((hs>>>(i*3))%12-6)*s,dy=((hs>>>(i*3+2))%11-5)*s;
        elip(px+dx,py+dy,(1.1+(i%3)*1.2)*s,(.7+(i%4)*.56)*s,i%2?'#6415299e':'#3d0d1ab8');
      }
      linea([px-5*s,py-3*s,px+1*s,py,px+6*s,py+4*s],'#5c1226a6',1.2*s);
    }
  }

  const chascarrillos = {
    a:['El mochi no engorda. Te ensancha el destino.','Si ves a Dango, dile que su cena paga alquiler.'],
    b:['Yo antes era aventurero. Luego me dieron una escoba.','El Dojo abre siempre. Salir es otro servicio.'],
    c:['Mil grullas, un deseo. Debería haber pedido una impresora.'],
    d:['La iluminación empieza con agua caliente.','El té es gratis. La taza, como la rompas, no.'],
    e:['Mis precios flotan. Como los cadáveres.','No acepto pepinos usados. Tenemos dignidad.'],
    f:['El bosque te escucha. Procura decir algo interesante.'],
    j:['El gimnasio no vino al río. Fui yo al gimnasio.','Estas piernas no se saltan su día.'],
    l:['El arma no está oxidada. Está reflexionando.'],
    q:['Cien puertas y nadie encuentra la salida de emergencia.'],
    v:['Tengo el corazón de piedra. Es diagnóstico, no metáfora.'],
    w:['Una luciérnaga por viaje. El brillo extra se cobra.']
  };
  function prepararMonumentos() {
    L.monumentos=[];if(!L.exterior||zonaId==='aldea')return;
    const propuestas={bosque:[[8,18,3,3,3]],ribera:[[26,28,3,3,1]],manantial:[[9,20,3,4,0],[35,14,3,4,0]],paso:[[16,9,3,3,3]],santuario:[[22,3,4,3,3]]}[zonaId]||[];
    const z=zona(),protegidos=[L.inicio,...z.puntos,...z.pasos,...z.tesoros,...(z.sellos||[]),...(z.forja?[z.forja]:[])];
    const andar=(x,y)=>x>0&&y>0&&x<L.cols-1&&y<L.rows-1&&![1,2,6,7].includes(L.c[y][x]);
    const flood=()=>{const seen=new Set(),q=[L.inicio];seen.add(L.inicio.join(','));for(let k=0;k<q.length;k++)for(const[dx,dy]of DIRS){const x=q[k][0]+dx,y=q[k][1]+dy,key=x+','+y;if(andar(x,y)&&!seen.has(key)){seen.add(key);q.push([x,y]);}}return seen;};
    for(const[px,py,w,hh,sprite]of propuestas){
      const candidatos=[];for(let y=2;y<L.rows-hh-2;y++)for(let x=2;x<L.cols-w-2;x++)if(!protegidos.some(p=>p[0]>=x-2&&p[0]<=x+w+1&&p[1]>=y-2&&p[1]<=y+hh+1)){
        let caminos=0,agua=0;for(let yy=y;yy<y+hh;yy++)for(let xx=x;xx<x+w;xx++){if([5,7].includes(L.c[yy][xx]))caminos++;if(L.c[yy][xx]===2)agua++;}
        if(caminos||sprite===0&&agua<w*hh*.7||L.monumentos.some(m=>x<m.x+m.w+1&&x+w>m.x-1&&y<m.y+m.h+1&&y+hh>m.y-1))continue;
        candidatos.push({x,y,dist:hypot(x-px,y-py)+(sprite===1?Math.abs(x-25)*.3:0)});
      }
      candidatos.sort((a,b)=>a.dist-b.dist);const antes=flood();
      for(const{x,y}of candidatos.slice(0,35)){
        const prev=[];for(let yy=y;yy<y+hh;yy++)for(let xx=x;xx<x+w;xx++){prev.push([xx,yy,L.c[yy][xx]]);L.c[yy][xx]=1;}
        const despues=flood();const rompe=[...antes].some(key=>{const[a,b]=key.split(',').map(Number);return !(a>=x&&a<x+w&&b>=y&&b<y+hh)&&!despues.has(key)});
        if(rompe){for(const[a,b,t]of prev)L.c[b][a]=t;continue;}
        L.monumentos.push({x,y,w,h:hh,sprite});break;
      }
    }
    L.arboles=L.arboles.filter(([x,y])=>!L.monumentos.some(m=>x>=m.x&&x<m.x+m.w&&y>=m.y&&y<m.y+m.h));
  }
  function dibujaMundo() {
    if(!L||!h)return;
    const z=L.exterior?zona():null;
    const foco=esVillano()&&espectros[sel]?espectros[sel]:h;
    ARTE_ISO.render({g,L,T,IW,AH,clock:reloj,region:zonaId,images:estampas,h,foco,shake:temblor,
      buildings:ALDEA.edificios,landmarks:L.monumentos,enemies:espectros,gems:gemas,thrown:lanzadas,boosts:turbos,portals:portales,
      heroVisible:fase!=='menu'&&!(esVillano()&&!heroVisto()),
      exits:L.exterior?pasosMundo():[],torii:z?.torii,
      treasures:z?.tesoros.filter((p,i)=>!prog.tesoros[zonaId+':'+i]),seals:z?.sellos?.map((p,i)=>[...p,!!prog.sellos[i]]),forge:z?.forja,
      guide:guiaActual,workshop:TALLER,props:(fase==='aldea'?[...cofres.map(c=>({x:(c.tx+.5)*T,y:(c.ty+.5)*T,f:()=>dibujaCofre(c)})),...(((CONFIG.decoracion||{}).faroles||{})[zonaId]||[]).map(p=>({x:(p[0]+.5)*T,y:(p[1]+.5)*T,f:()=>dibujaFarolDecor(p)}))]:torre?torre.faro.map(f=>({x:(f.tx+.5)*T,y:(f.ty+.5)*T,f:()=>dibujaFarolillo(f)})):[]),goal:torre?progresoTorre().split(' · ')[1]:expedicion?gemasPiso+' / '+(ronda+1)+' gemas':puntos+' puntos',
      idle:!h.mueve,dialogue:!!dlg,banter:chascarrillos,energy:h.corre||h.energia<energiaMax()*.93?Math.max(.001,h.energia/energiaMax()):0
    },{
      guia:()=>dibujaRutaGuia(0,0,L.cols,L.rows),
      sangre:()=>{for(const m of manchas)elip(m.x,m.y,m.r,m.r*.6,col().sangre)},
      conos:()=>{if(CONFIG.mapa.mostrarConos)for(const e of espectros)if(!(e.muerto>0))dibujaCono(e)},
      hero:()=>tp?dibujaTP():dibujaHeroe(h.x,h.y),enemy:e=>dibujaEspectro(e,e.x,e.y,e.escala),npc:dibujaAldeano,object:dibujaObjeto,objectVisible:objetoVisible,
      gem:dibujaGema,boost:(x,y)=>{g.save();g.translate(x,y-2+Math.sin(reloj*3));dibujaMochi(0,0,T/24);g.restore()},portal:dibujaPortal,
      exitName:p=>p[2]==='aldea'?'ALDEA':nombreZona(p[2]).split(' ')[0].toUpperCase(),open:abierto,
      trunk:dibujaTronco,trunkEffects:dibujaGolpesTronco,
      juice:dibujaPuestoZumos,
      wheel:()=>{const b=TALLER.puesto,x=(b.x+.5)*T,y=(b.y+.75)*T;dibujaProp('puesto-ruleta',x,y,T*1.67);if(alAlcance(b))placaMundo(x,y-T*1.86,'RUEDA DEL CEDRO',prog.fichas+' fichas',80)},
      guideMarker:(x,y)=>marcadorGuia(x,y,4),plaque:placaMundo,effects:()=>dibujaEfectos(T/24)
    });
    if(destello>0)R(0,0,IW,AH,alfa(col().sangre,limita(destello,0,.35)));
    if(susto>0&&sustoE){
      const f=1-susto/.8,esc=3.4+f*1.4;
      R(0,0,IW,AH,'rgba(14,0,5,.87)');
      dibujaEspectro(sustoE,IW/2,AH*.48+39*(T/24)*esc,esc,true);
    }
  }

  function dibujaMundoAnterior() {
    const C = col(), MW = L.cols * T, MH = L.rows * T, s = T / 24, hW = (CONFIG.pantalla.alturaSeto == null ? 0.5 : CONFIG.pantalla.alturaSeto) * T;
    const foco = esVillano() && espectros[sel] ? espectros[sel] : h;
    let cx = MW <= IW ? (MW - IW) / 2 : limita(foco.x - IW / 2, 0, MW - IW);
    let cy = MH + hW <= AH ? (MH - hW - AH) / 2 : limita(foco.y - AH / 2, -hW, MH - AH);
    if (fase === 'menu') { cx = (MW - IW) / 2 + Math.sin(reloj * 0.2) * Math.max(0, (MW - IW) / 2); cy = (MH - AH) / 2 + Math.cos(reloj * 0.15) * Math.max(0, (MH - AH) / 2); }
    if (temblor > 0) { cx += azar(-4, 4) * temblor * 2; cy += azar(-4, 4) * temblor * 2; }
    g.save(); g.beginPath(); g.rect(0, 0, IW, AH); g.clip();
    R(0, 0, IW, AH, L.exterior ? '#293a2e' : dojo() ? tono(C.tejado,.55) : tono(C.seto,.7));
    g.save(); g.translate(-cx, -cy);
    const x0 = Math.max(0, floor(cx / T)), y0 = Math.max(0, floor(cy / T) - 1), x1 = Math.min(L.cols - 1, floor((cx + IW) / T)), y1 = Math.min(L.rows - 1, floor((cy + AH) / T) + 2);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) dibujaSuelo(tx, ty);
    const z = L.exterior && zona(), arte = z && estampas[zonaId];
    if (arte?.naturalWidth) {
      g.save(); g.globalAlpha = .19; g.globalCompositeOperation = 'soft-light';
      g.drawImage(arte, 0, 0, MW, MH); g.restore();
    }
    if (z) {
      for (let ty=y0;ty<=y1;ty++) for (let tx=x0;tx<=x1;tx++) {
        const c=L.c[ty][tx];
        if(c!==1&&c!==2) R(tx*T,ty*T,T+.3,T+.3,alfa(zonaId==='paso'?'#8d809f':zonaId==='santuario'?'#6a3158':z.color,.17));
      }
    }
    if (L.exterior) {
      g.drawImage(texturaSenderos(),0,0);
      dibujaRutaGuia(x0,y0,x1,y1);
    }
    for (const p of portales) dibujaPortal(p);
    if (L.base.length && !L.exterior) entregadas.slice(-L.base.length * 2).forEach((v, i) => { const b = L.base[i % L.base.length], o = i < L.base.length ? -.2 : .22; elip((b[0] + .5 + o) * T, (b[1] + .5 + o) * T + 3.4 * s, 3 * s, 1 * s, 'rgba(0,0,0,.22)'); dibujaGema((b[0] + .5 + o) * T, (b[1] + .5 + o) * T, 2.6 * s, v, true); });
    // rastro de sangre (charcos aplastados contra el suelo)
    for (const mm of manchas) { g.globalAlpha = limita(mm.v / mm.v0 * 1.4, 0, 0.88); elip(mm.x, mm.y, mm.r * s, mm.r * .62 * s, C.sangre); elip(mm.x + mm.r * .3 * s, mm.y - mm.r * .1 * s, mm.r * .45 * s, mm.r * .28 * s, C.sangreOscura); if (mm.r > 2) circ(mm.x - mm.r * 1.3 * s, mm.y + mm.r * .4 * s, mm.r * .28 * s, C.sangre); }
    g.globalAlpha = 1;
    if (CONFIG.mapa.mostrarConos) for (const e of espectros) if (!(e.muerto > 0)) dibujaCono(e);
    // todo lo que está de pie, ordenado de fondo a frente, intercalado con las filas de setos
    const cosas = [];
    for (const b of turbos) if (b.t <= 0) cosas.push({ y: (b.ty + .5) * T, f: () => {
      const x = (b.tx + .5) * T, y = (b.ty + .5) * T - 3 * s + Math.sin(reloj * 4) * 1.5 * s;
      elip(x, (b.ty + .5) * T + 6 * s, 5 * s, 1.8 * s, 'rgba(0,0,0,.22)');
      if (imagenes.botas) { g.drawImage(imagenes.botas, x - 8 * s, y - 8 * s, 16 * s, 16 * s); return; }
      if (CONFIG.gemas.estilo === 'reliquias') return dibujaMochi(x, y, s);
      for (let k = 0; k < 3; k++) poli([x - 3 * s, y - (1 - k * 1.6) * s, x - (9 - k) * s, y - (4.5 - k * 1.8) * s, x - 3 * s, y + (1 + k * 1.2) * s], k % 2 ? '#e8eef5' : '#ffffff');   // ala
      g.fillStyle = C.botas; g.beginPath(); g.moveTo(x - 3 * s, y - 6 * s); g.lineTo(x + 1.5 * s, y - 6 * s); g.lineTo(x + 1.5 * s, y); g.quadraticCurveTo(x + 6.5 * s, y + .5 * s, x + 6.5 * s, y + 4 * s); g.lineTo(x - 3 * s, y + 4 * s); g.closePath(); g.fill();
      R(x - 3 * s, y + 3 * s, 9.5 * s, 1.4 * s, tono(C.botas, .6)); R(x - 3 * s, y - 6 * s, 4.5 * s, 1.5 * s, tono(C.botas, 1.3));
    } });
    for (const gm of gemas) if (gm.estado === 'suelo') cosas.push({ y: (gm.ty + .5) * T, f: () => {
      const x = (gm.tx + .5) * T, y = (gm.ty + .5) * T;
      elip(x, y + 6.5 * s, 4.5 * s, 1.6 * s, 'rgba(0,0,0,.25)');
      dibujaGema(x, y - 3 * s + Math.sin(reloj * 3 + gm.tx) * 1.5 * s, (3.6 + gm.valor * .7) * s, gm.valor);
    } });
    for (const e of espectros) if (!(e.muerto > 0)) cosas.push({ y: e.y, f: () => dibujaEspectro(e, e.x, e.y) });
    if (L.exterior) {
      const visible = (x,y) => x >= x0-3 && x <= x1+3 && y >= y0-3 && y <= y1+4;
      if (!z) for (const b of ALDEA.edificios || []) {
        if (!visible(b.x+b.ancho/2,b.y+b.fondo)) continue;
        cosas.push({y:(b.y+b.fondo-.12)*T,f:()=>dibujaEdificio(b)});
      }
      if(!z) {
        const a=TALLER.tronco,b=TALLER.puesto;
        if(visible(a.x,a.y)) cosas.push({y:(a.y+.78)*T,f:dibujaTronco});
        if(visible(b.x,b.y)) cosas.push({y:(b.y+.75)*T,f:()=>{
          const x=(b.x+.5)*T,y=(b.y+.75)*T;
          dibujaProp('puesto-ruleta',x,y,T*1.67);
          if(alAlcance(b)) placaMundo(x,y-T*1.86,'RUEDA DEL CEDRO',prog.fichas+' fichas',80);
        }});
      }
      const marcador = ([tx,ty], color, tipo) => {
        if (tx < x0-2 || tx > x1+2 || ty < y0-2 || ty > y1+2) return;
        const x = (tx+.5)*T, y = (ty+.5)*T;
        cosas.push({y, f: () => {
          const luz = g.createRadialGradient(x,y,0,x,y,T*.85);
          luz.addColorStop(0,alfa(color,.45)); luz.addColorStop(1,alfa(color,0));
          circ(x,y,T*.85,luz);
          const f = (reloj*.75)%1;
          g.strokeStyle = alfa(color, .85 - .7*f); g.lineWidth = 1.1*s; g.beginPath();
          g.ellipse(x,y, (8+7*f)*s, (4+4*f)*s,0,0,2*PI); g.stroke();
          if (tipo === 'moneda') dibujaGema(x,y - (4+Math.sin(reloj*4)*2)*s,4*s,1);
          else escribe(tipo,x,y-9*s,9*s,color,'center',true);
        }});
      };
      for (const p of pasosMundo()) {
        marcador(p, abierto(p) ? '#d9edaa' : '#ef9f88', '↟');
        if (!visible(p[0],p[1])) continue;
        const x=(p[0]+.5)*T, y=(p[1]+.5)*T;
        cosas.push({ y: y+.16*T, f: () => {
          if (!z) dibujaProp('torii-pintado',x,y+.12*T,1.78*T);
          escribe(p[2] === 'aldea' ? 'ALDEA' : nombreZona(p[2]).split(' ')[0].toUpperCase(),x,y-.93*T,7.5*s,'#f1f7c0','center',true);
        }});
      }
      if (zonaId === 'manantial') for (const [tx,ty] of [[10,19],[36,12]]) {
        if (tx < x0-3 || tx > x1+3 || ty < y0-3 || ty > y1+4) continue;
        const x=(tx+.5)*T, y=(ty+.5)*T;
        cosas.push({y, f:()=>dibujaCascada(x,y)});
      }
      z?.sellos?.forEach((p,i) => marcador(p, prog.sellos[i] ? '#adf48b' : '#eaa6ff','✧'));
      if (z?.forja) marcador(z.forja,'#9cf2ff','✦');
      z?.tesoros.forEach((p,i) => { if (!prog.tesoros[zonaId+':'+i]) marcador(p,'#ffe199','moneda'); });
      z?.torii?.forEach(([tx,ty]) => {
        if (tx < x0-3 || tx > x1+3 || ty < y0-2 || ty > y1+2) return;
        const x=(tx+.5)*T, y=(ty+.5)*T;
        cosas.push({y, f:()=>dibujaTorii(x,y,T*2.2,'')});
      });
    }
    for (const a of L.arboles) if (a[0] >= x0-2 && a[0] <= x1+2 && a[1] >= y0-2 && a[1] <= y1+2) cosas.push({ y: (a[1] + .85) * T, f: () => dibujaArbol((a[0] + .5) * T, (a[1] + .5) * T) });
    if (L.exterior && guiaActual) {
      const {x,y,tipo}=guiaActual, px=(x+.5)*T, py=(y+.5)*T;
      if(x>=x0-1&&x<=x1+1&&y>=y0-1&&y<=y1+1)
        cosas.push({y:py+.8*T,f:()=>marcadorGuia(px,py-T*(tipo==='hablar'?2:.73)+Math.sin(reloj*4)*2,5.5)});
    }
    for (const n of L.npcs) cosas.push({ y: (n.ty + .5) * T, f: () => dibujaAldeano(n) });
    for (const o of L.objetos) if (objetoVisible(o)) cosas.push({ y: (o.ty + .5) * T, f: () => dibujaObjeto(o) });
    if (L.puertas.length) { const xs = L.puertas.map(p => p[0]), px = (Math.min(...xs) + Math.max(...xs) + 1) / 2 * T, py = L.puertas[0][1] * T + 2 * s; cosas.push({ y: py, f: () => dibujaTorii(px, py, (Math.max(...xs) - Math.min(...xs) + 1) * T) }); }
    if (fase !== 'menu' && !(esVillano() && !heroVisto())) cosas.push({ y: h.y + (tp ? 1 : 0), f: () => tp ? dibujaTP() : dibujaHeroe(h.x, h.y) });
    cosas.sort((a, b) => a.y - b.y);
    let k = 0;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) if (L.c[ty][tx] === 1) {
        const cimiento=L.exterior&&!z&&(ALDEA.edificios||[]).some(b=>tx>=b.x&&tx<b.x+b.ancho&&ty>=b.y&&ty<b.y+b.fondo);
        if (cimiento) R(tx*T,ty*T,T+.25,T+.25,'#6e6352');
        else dibujaSeto(tx,ty,hW);
      }
      while (k < cosas.length && cosas[k].y < (ty + 1) * T) cosas[k++].f();
    }
    while (k < cosas.length) cosas[k++].f();
    if(estaEnPueblo()) dibujaGolpesTronco();
    if (!L.exterior && !esVillano() && L.inicio && (fase==='jugando'||fase==='pausa')) {
      const x=(L.inicio[0]+.5)*T,y=(L.inicio[1]-.3)*T;
      if(hypot(h.x-x,h.y-y)<T*5) placaMundo(x,y,'ALTAR DEL DOJO',torre?progresoTorre():expedicion?gemasPiso+' / '+(ronda+1)+' gemas entregadas':puntos+' puntos',94);
    }
    if (fase==='jugando' && !esVillano() && (h.corre||h.energia<energiaMax()*.93)) {
      const w=14*s, ratio=limita(h.energia/energiaMax(),0,1);
      R(h.x-w/2,h.y+10*s,w,2*s,'#211927');
      R(h.x-w/2+.5*s,h.y+10.4*s,(w-s)*ratio,1.2*s,'#a8d3b1');
    }
    dibujaEfectos(s);
    for (const p of gotas) circ(p.x, p.y, 1.3 * s, C.sangre);
    g.restore();
    // pétalos de cerezo flotando
    if (z) {
      g.save();
      for (let i=0;i<26;i++) {
        const px=(i*67 + reloj*(3+i%4))%(IW+16)-8, py=(i*43+Math.sin(reloj*1.2+i)*11)%(AH+12);
        const pulso=.45+.4*Math.sin(reloj*2.8+i);
        circ(px,py,2.8*s,alfa(z.color,.18*pulso)); circ(px,py,.9*s,alfa(z.color,pulso));
      }
      g.restore();
    }
    if ((!z || zonaId === 'santuario' || zonaId === 'manantial') && (CONFIG.ambiente || {}).petalos) for (let i = 0; i < 16; i++) { const px = (i * 53 + reloj * 11 * (1 + (i % 3) * .35)) % (IW + 10) - 5, py = (i * 37 + reloj * 8 + Math.sin(reloj * 1.3 + i) * 7) % (AH + 10) - 5; g.fillStyle = i % 2 ? 'rgba(255,196,220,.85)' : 'rgba(255,158,203,.85)'; g.beginPath(); g.ellipse(px, py, 1.9, 1, reloj * 1.5 + i, 0, 2 * PI); g.fill(); }
    if (tp) { const a = limita(1 - abs(tp.t / tp.dur - 0.6) / 0.1, 0, 1); if (a > 0) { g.fillStyle = 'rgba(8,4,14,' + (a * .92) + ')'; g.fillRect(0, 0, IW, AH); } }
    // la oscuridad se cierra a tu alrededor cuando hay un espectro cerca
    if (L.exterior) {   // vida: sombras de nubes, mariposas y luz de sol
      luzExterior(cx,cy);
      for (let k = 0; k < 6; k++) { const bx = ((k * 97 + reloj * (9 + k * 2)) % (IW + 20)) - 10, by = 30 + ((k * 61) % (AH - 60)) + Math.sin(reloj * 2.2 + k * 1.7) * 9, al = abs(Math.sin(reloj * 14 + k)) * 2.6 + .4, cm = ['#ffe94a', '#ff9ecb', '#9fd8f5'][k % 3]; poli([bx, by, bx - al, by - 2.4, bx - al, by + 1.6], cm); poli([bx, by, bx + al, by - 2.4, bx + al, by + 1.6], cm); R(bx - .25, by - 1.4, .5, 2.8, '#2a2024'); }
    } else luzDojo(cx,cy,foco);
    const lx = fase === 'menu' ? IW / 2 : foco.x - cx, ly = fase === 'menu' ? AH / 2 : foco.y - cy;
    const osc = CONFIG.gore.oscuridad == null ? 0.6 : CONFIG.gore.oscuridad, a = limita((L.exterior?.15:.36) + miedo * osc, 0, 0.94), r0 = AH * (0.8 - miedo * 0.32);
    const gr = g.createRadialGradient(lx, ly, r0 * 0.35, lx, ly, r0 * 1.5); gr.addColorStop(0, 'rgba(10,0,8,0)'); gr.addColorStop(1, 'rgba(10,0,8,' + a + ')');
    g.fillStyle = gr; g.fillRect(0, 0, IW, AH);
    // ...pero sus ojos se siguen viendo
    for (const e of espectros) { if (e.muerto > 0) continue; const ex = e.x - cx, ey = e.y - cy - 39 * s, c = colorEstado(e), ge = g.createRadialGradient(ex, ey, 0, ex, ey, 9 * s); ge.addColorStop(0, alfa(c, .25 + miedo * .35)); ge.addColorStop(1, alfa(c, 0)); circ(ex, ey, 9 * s, ge); }
    if (CONFIG.gore.latido && fase === 'jugando' && espectros.some(e => e.estado === 'persigue')) {
      const p = 0.3 + 0.2 * Math.sin(reloj * 9), gv = g.createRadialGradient(IW / 2, AH / 2, AH * .35, IW / 2, AH / 2, IW * .62);
      gv.addColorStop(0, 'rgba(160,0,20,0)'); gv.addColorStop(1, 'rgba(160,0,20,' + p + ')'); g.fillStyle = gv; g.fillRect(0, 0, IW, AH);
    }
    if (destello > 0) { g.fillStyle = alfa(C.sangre, limita(destello * 1.6, 0, 0.7)); g.fillRect(0, 0, IW, AH); }
    // susto: te lo encuentras de cara
    if (susto > 0 && sustoE) {
      const f = 1 - susto / 0.8, esc = 3.4 + f * 1.4;
      R(0, 0, IW, AH, 'rgba(14,0,5,.9)');
      dibujaEspectro(sustoE, IW / 2 + azar(-2.5, 2.5), AH * 0.52 + 39 * (T / 24) * esc + azar(-2.5, 2.5), esc, true);
      const gv = g.createRadialGradient(IW / 2, AH / 2, AH * .3, IW / 2, AH / 2, IW * .6); gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(1, 'rgba(0,0,0,.85)'); g.fillStyle = gv; g.fillRect(0, 0, IW, AH);
    }
    g.restore();
  }

  function dibujaHUD() {
    if (fase === 'menu') return;
    if(fase==='aldea') {
      if((aviso.t>0||guiaActual)&&!mapaExplorador) {   // con el mapa abierto la pista se oculta para no taparse
        const texto=aviso.t>0?aviso.txt:guiaActual.texto;
        const tactil=cont.classList.contains('tactil');
        const disponible=IW-(tactil?60:14);
        const tam=Math.min(8.3,(disponible-23)/(texto.length*.57));
        const w=Math.min(disponible,Math.max(80,texto.length*tam*.61+23)), x=tactil?5:(IW-w)/2;
        R(x,AH-22,w,15,'#221b23dc');linea([x+3,AH-22,x+w-3,AH-22],'#aa825b',.5);
        marcadorGuia(x+8,AH-14.5,3.5);escribe(texto,x+16,AH-12,tam,'#ffe5ae');
      }
      return;
    }
    const crono=Math.ceil(tiempo)+' s', objetivo=torre?progresoTorre():expedicion?gemasPiso+'/'+(ronda+1)+' gemas':puntos+' pts';
    const anchoHud=torre?Math.min(IW-120,objetivo.length*4.3+40):65;
    R(IW-anchoHud-3,2,anchoHud,14,'#1d1420dc');
    escribe(crono,IW-anchoHud+1,11.6,7.7,tiempo<=10?'#ff777c':'#e6cbaa');
    escribe(objetivo,IW-6,11.6,7,'#dfc3a0','right');
    if(aviso.t>0) {
      const tam=Math.min(8.1,(IW-22)/(aviso.txt.length*.59));
      const w=Math.min(IW-12,aviso.txt.length*tam*.65+12);
      R((IW-w)/2,AH-20,w,13,'#211620db');escribe(aviso.txt,IW/2,AH-11,tam,'#f0d8ac','center');
    }
  }

  // el mapa: enseña espectros Y la ruta que van a seguir
  // ---------- v0.38 ZUMOS DE MOMO: minijuego de cortar fruta (lo editable está en zumos.js) ----------
  let fru = null;
  const ZU = () => (typeof ZUMOS !== 'undefined' ? ZUMOS : null);
  function empezarFruta() {
    const Z = ZU(); if (!Z) return;
    if ((Z.precioEntrada || 0) > prog.puntos) { decir('Te faltan monedas para la entrada (' + Z.precioEntrada + ')', 2.4); fru = null; fase = 'aldea'; pintarUI(); return; }
    prog.puntos -= Z.precioEntrada || 0; contar('partidasZumos'); guardarProg();
    const ataque = armaDePractica() ? atributo('ataque') : 0, bonus = Math.round(ataque * (Z.puntosPorAtaque ?? .08) * 10) / 10;
    fru = { bonus, ataque, ptsArma: 0, t: Z.duracion, puntos: 0, fallos: 0, piezas: [], mitades: [], gotas: [], salpicas: [], estela: [], textos: [], lanza: .6, tanda: 0, trazo: null, fin: false, cortadas: 0, mejorCombo: 0, sacudida: 0, flash: 0, manchas: null, fondo: null };
    fase = 'fruta'; dlg = null; pintarDlg(); soltarJoy(); pintarUI(); aconsejar('zumos');
  }
  function sorteaFruta() {
    const Z = ZU(), lista = Object.entries(Z.frutas), total = lista.reduce((a, [, f]) => a + f.peso, 0) + Z.petardo.peso;
    let r = Math.random() * total;
    for (const [id, f] of lista) { if (r < f.peso) return id; r -= f.peso; }
    return 'petardo';
  }
  function lanzarFruta() {
    const n = 1 + (Math.random() < .45 ? 1 : 0) + (Math.random() < .2 ? 1 : 0) + (fru.t < 25 && Math.random() < .3 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const id = sorteaFruta(), x = IW * (.18 + Math.random() * .64), alt = IH * (.55 + Math.random() * .3), g0 = IH * 1.25;
      fru.piezas.push({ id, x, y: IH + 24, vx: (IW / 2 - x) * (.25 + Math.random() * .35), vy: -Math.sqrt(2 * g0 * alt), g: g0, rot: Math.random() * 6, vr: (Math.random() - .5) * 5, r: id === 'petardo' ? 12 : ZU().frutas[id].radio });
    }
    pitido(180 + Math.random() * 60, .12, 'sine', .25, 320);
  }
  function cortar(p, ang) {
    const Z = ZU();
    if (p.id === 'petardo') {   // ¡pum!
      fru.t = Math.max(0, fru.t - Z.petardo.castigo); fru.sacudida = .5; fru.flash = .6;
      for (let i = 0; i < 40; i++) { const a = Math.random() * 2 * PI, v = 60 + Math.random() * 220; fru.gotas.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: .5 + Math.random() * .4, c: i % 3 ? '#ffb020' : '#3a3036', r: 1 + Math.random() * 2.4 }); }
      fru.textos.push({ x: p.x, y: p.y, txt: '-' + Z.petardo.castigo + ' s', t: 1.2, c: '#ff5a3a' });
      ruido(.5, 200, 2.4, .9); pitido(90, .5, 'square', 1, 30); return;
    }
    const f = Z.frutas[p.id], nx = Math.cos(ang + PI / 2), ny = Math.sin(ang + PI / 2);
    for (const lado of [-1, 1]) fru.mitades.push({ id: p.id, x: p.x + nx * lado * 2, y: p.y + ny * lado * 2, vx: p.vx * .4 + nx * lado * (60 + Math.random() * 40), vy: Math.min(p.vy, 0) * .3 - 30 + ny * lado * 40, g: p.g, rot: ang, vr: lado * (2 + Math.random() * 3), lado, r: p.r, t: 2 });
    for (let i = 0; i < 16; i++) { const a = ang + (Math.random() - .5) * 1.4 + (i % 2 ? PI : 0), v = 40 + Math.random() * 170; fru.gotas.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: .45 + Math.random() * .5, c: f.jugo, r: .8 + Math.random() * 1.8 }); }
    // mancha en la pared del puesto (se queda toda la partida)
    if (fru.manchas) { const c = fru.manchas.getContext('2d'); c.globalAlpha = .55; c.fillStyle = f.jugo; for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(p.x + (Math.random() - .5) * p.r * 3, p.y + (Math.random() - .5) * p.r * 2, 1 + Math.random() * p.r * .5, 1 + Math.random() * p.r * .35, Math.random() * 3, 0, 2 * PI); c.fill(); } c.globalAlpha = 1; }
    const extra = fru.bonus ? Math.max(0, Math.round(fru.bonus + (Math.random() < (fru.bonus % 1) ? 1 : 0) - (fru.bonus % 1))) : 0;
    fru.puntos += f.puntos + extra; fru.ptsArma += extra; fru.cortadas++; contar('frutas');
    if (extra) fru.textos.push({ x: p.x + 10, y: p.y - 14, txt: '+' + (f.puntos + extra), t: .8, c: '#ffe7a8' });
    if (f.brilla) { fru.textos.push({ x: p.x, y: p.y - 8, txt: '¡+' + f.puntos + '!', t: 1.3, c: '#ffe066' }); [988, 1319, 1568].forEach((q, i) => setTimeout(() => pitido(q, .18, 'triangle', .5), i * 70)); }
    // ¡SQUIRT! el melocotón maduro te salpica la pantalla
    if (f.squirt && Math.random() < f.squirt) {
      const cx = IW * (.3 + Math.random() * .4), cy = IH * (.3 + Math.random() * .3);
      for (let i = 0; i < 9; i++) fru.salpicas.push({ x: cx + (Math.random() - .5) * IW * .38, y: cy + (Math.random() - .5) * IH * .32, r: 6 + Math.random() * 16, t: 2.6 + Math.random() * .8, gote: Math.random() * 10, c: f.jugo, semilla: Math.random() });
      fru.puntos += ZU().puntosSquirt; fru.squirts = (fru.squirts || 0) + 1; contar('squirts');
      fru.textos.push({ x: cx, y: cy - 30, txt: '¡SQUIRT! +' + ZU().puntosSquirt, t: 1.4, c: '#fff1d0', grande: true });
      ruido(.35, 900, 2, 1.4); pitido(420, .25, 'sine', .7, 140); fru.sacudida = .2;
    }
    ruido(.12, 2600 + Math.random() * 800, 1.1, 1.2); pitido(300 + Math.random() * 120, .07, 'triangle', .35, 160);
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { }
  }
  function cerrarTrazo() {
    const tr = fru.trazo; fru.trazo = null; if (!tr || tr.n < 2) return;
    const C = ZU().combo, n = tr.n; if (n < C.minimo) return;
    const extra = n * C.extra; fru.puntos += extra; fru.mejorCombo = Math.max(fru.mejorCombo, n);
    fru.textos.push({ x: tr.x, y: tr.y, txt: 'COMBO x' + n + '  +' + extra, t: 1.5, c: '#ffd86a', grande: true });
    [523, 659, 784, 1047].slice(0, Math.min(4, n)).forEach((q, i) => setTimeout(() => pitido(q, .14, 'triangle', .45), i * 60));
  }
  function hojaMueve(x, y) {
    const e = fru.estela, ult = e[e.length - 1]; e.push({ x, y, t: .16 });
    if (!ult || fru.fin) return;
    const dx = x - ult.x, dy = y - ult.y, L2 = dx * dx + dy * dy; if (L2 < 4) return;
    if (!fru.trazo) fru.trazo = { n: 0, x, y, ult: 0 };
    if (L2 > 30 && Math.random() < .5) ruido(.06, 4200, .25, 1.5);   // silbido de la hoja
    const ang = Math.atan2(dy, dx);
    for (let i = fru.piezas.length - 1; i >= 0; i--) {
      const p = fru.piezas[i], t = limita(((p.x - ult.x) * dx + (p.y - ult.y) * dy) / L2, 0, 1), qx = ult.x + dx * t, qy = ult.y + dy * t;
      if (hypot(p.x - qx, p.y - qy) < p.r + 2) { fru.piezas.splice(i, 1); cortar(p, ang); if (p.id !== 'petardo') { fru.trazo.n++; fru.trazo.x = p.x; fru.trazo.y = p.y; fru.trazo.ult = 0; } }
    }
  }
  function actualizarFruta(dt) {
    if (!fru) return;
    for (const p of fru.estela) p.t -= dt; fru.estela = fru.estela.filter(p => p.t > 0);
    for (const s2 of fru.salpicas) { s2.t -= dt; s2.gote += dt * 9; } fru.salpicas = fru.salpicas.filter(s2 => s2.t > 0);
    for (const tx of fru.textos) { tx.t -= dt; tx.y -= dt * 14; } fru.textos = fru.textos.filter(tx => tx.t > 0);
    for (const q of fru.gotas) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 380 * dt; q.t -= dt; } fru.gotas = fru.gotas.filter(q => q.t > 0);
    for (const m of fru.mitades) { m.x += m.vx * dt; m.y += m.vy * dt; m.vy += m.g * dt; m.rot += m.vr * dt; } fru.mitades = fru.mitades.filter(m => m.y < IH + 60);
    if (fru.sacudida > 0) fru.sacudida -= dt; if (fru.flash > 0) fru.flash -= dt;
    if (fru.trazo) { fru.trazo.ult += dt; if (fru.trazo.ult > .28) cerrarTrazo(); }
    if (fru.fin) return;
    fru.t -= dt; fru.lanza -= dt;
    if (fru.lanza <= 0) { lanzarFruta(); fru.lanza = Math.max(.55, 1.25 - (ZU().duracion - fru.t) * .009) * (.8 + Math.random() * .4); }
    for (let i = fru.piezas.length - 1; i >= 0; i--) {
      const p = fru.piezas[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += p.vr * dt;
      if (p.y > IH + 40 && p.vy > 0) { fru.piezas.splice(i, 1); if (p.id !== 'petardo') { fru.fallos++; fru.textos.push({ x: limita(p.x, 20, IW - 20), y: IH - 18, txt: '✗', t: 1, c: '#ff6a5a' }); pitido(140, .2, 'sawtooth', .4, 90); } }
    }
    if (fru.t <= 0 || fru.fallos >= ZU().fallosMax) terminarFruta();
  }
  function terminarFruta() {
    if (fru.fin) return; fru.fin = true; fru.t = Math.max(0, fru.t); if (fru.trazo) cerrarTrazo();
    const P = ZU().premio, monedas = Math.round(fru.puntos * P.monedasPorPunto), ficha = fru.puntos >= P.marcaFicha ? P.fichasSiLlegas : 0;
    prog.puntos += monedas; prog.fichas += ficha; prog.recordZumos = Math.max(prog.recordZumos || 0, fru.puntos); guardarProg();
    fru.premio = { monedas, ficha };
    [659, 523, 392].forEach((q, i) => setTimeout(() => pitido(q, .2, 'triangle', .5), i * 140));
    setTimeout(() => { if (fase === 'fruta') pintarUI(); }, 700);
  }
  function htmlFruta() {
    if (!fru || !fru.fin || !fru.premio) return '';
    const Z = ZU(), pr = fru.premio;
    return `<div class="rq-hanko">果</div><h2>${esc(Z.nombre)}</h2><div class="rq-num">${fru.puntos} pts</div>
      ${fru.ptsArma ? `<p>⚔ Tu arma (ataque ${fru.ataque}) sumó <b>${fru.ptsArma} pts</b></p>` : `<p><small>Con un arma equipada cortas mejor: cada punto de ataque suma puntos por fruta. Mejórala en la fragua.</small></p>`}
      <p>${fru.cortadas} frutas cortadas${fru.squirts ? ' · ' + fru.squirts + ' squirt' + (fru.squirts > 1 ? 's' : '') : ''}${fru.mejorCombo >= Z.combo.minimo ? ' · mejor combo x' + fru.mejorCombo : ''} · récord ${prog.recordZumos}</p>
      <p>+${pr.monedas} monedas${pr.ficha ? ` · <span class="rq-pildora">✦ +${pr.ficha} ficha de la Rueda</span>` : ` · <small>ficha a partir de ${Z.premio.marcaFicha} pts</small>`}</p>
      <button class="rq-b" data-a="otraFruta"${prog.puntos < (Z.precioEntrada || 0) ? ' disabled' : ''}>Otra ronda · ${Z.precioEntrada || 0} monedas</button><button class="rq-b sec" data-a="salirFruta">Volver a la aldea</button>`;
  }
  // --- dibujo ---
  function fondoFruta() {
    const key = IW + 'x' + IH + ':' + K; if (fru.fondo && fru.fondo.key === key) return fru.fondo.cv;
    const res = Math.min(2, K), cv = document.createElement('canvas'); cv.width = Math.ceil(IW * res); cv.height = Math.ceil(IH * res);
    const c = cv.getContext('2d'), rnd = semilla(77); c.scale(res, res);
    const foto = estampas[ZU().fondoJuego];
    if (foto?.naturalWidth) {   // interior del puesto (imagen): se recorta para cubrir la pantalla sin deformarse
      const k = Math.max(IW / foto.naturalWidth, IH / foto.naturalHeight), w = foto.naturalWidth * k, hh = foto.naturalHeight * k;
      c.drawImage(foto, (IW - w) / 2, (IH - hh) * .6, w, hh);
      c.fillStyle = 'rgba(20,10,4,.28)'; c.fillRect(0, 0, IW, IH);   // un poco más oscuro para que la fruta destaque
      const vin = c.createRadialGradient(IW / 2, IH / 2, IH * .3, IW / 2, IH / 2, IW * .7); vin.addColorStop(0, 'rgba(0,0,0,0)'); vin.addColorStop(1, 'rgba(0,0,0,.5)'); c.fillStyle = vin; c.fillRect(0, 0, IW, IH);
      fru.fondo = { key, cv };
      if (!fru.manchas || fru.manchas.width !== Math.ceil(IW)) { fru.manchas = document.createElement('canvas'); fru.manchas.width = Math.ceil(IW); fru.manchas.height = Math.ceil(IH); }
      return cv;
    }
    const gr = c.createLinearGradient(0, 0, 0, IH); gr.addColorStop(0, '#3a2416'); gr.addColorStop(1, '#1d120b'); c.fillStyle = gr; c.fillRect(0, 0, IW, IH);
    for (let x = 0; x < IW; x += 22) { c.fillStyle = (x / 22) % 2 ? 'rgba(255,220,170,.035)' : 'rgba(0,0,0,.12)'; c.fillRect(x, 0, 21, IH); c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 21, 0, 1, IH); for (let k = 0; k < 6; k++) { c.strokeStyle = 'rgba(255,210,150,.05)'; c.lineWidth = .5; c.beginPath(); const y = rnd() * IH; c.moveTo(x + 2, y); c.quadraticCurveTo(x + 10, y + 6, x + 19, y + 2); c.stroke(); } }
    // noren con el kanji de fruta
    c.fillStyle = '#1f3a5c'; for (let k = 0; k < 5; k++) { const w = IW / 5; c.fillRect(k * w + 2, 0, w - 4, IH * .2 + (k % 2) * 3); } c.fillStyle = '#152a44'; c.fillRect(0, 0, IW, 5);
    c.fillStyle = '#f2e6cc'; c.font = '700 ' + (IH * .11) + 'px "Hiragino Mincho ProN","Yu Mincho",Georgia,serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('果 汁', IW / 2, IH * .1);
    // farolillos
    for (const fx of [.08, .92]) { const x = IW * fx, y = IH * .3, gl = c.createRadialGradient(x, y, 2, x, y, IH * .4); gl.addColorStop(0, 'rgba(255,170,80,.35)'); gl.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = gl; c.fillRect(x - IH * .4, y - IH * .4, IH * .8, IH * .8); c.fillStyle = '#d6402c'; c.beginPath(); c.ellipse(x, y, 9, 12, 0, 0, 2 * PI); c.fill(); c.fillStyle = '#ffb36b'; c.globalAlpha = .5; c.beginPath(); c.ellipse(x - 2, y - 2, 4, 7, 0, 0, 2 * PI); c.fill(); c.globalAlpha = 1; c.fillStyle = '#2a1a10'; c.fillRect(x - 6, y - 13, 12, 2); c.fillRect(x - 6, y + 11, 12, 2); }
    // mostrador con cajas de fruta
    c.fillStyle = '#4a2c18'; c.fillRect(0, IH * .86, IW, IH * .14); c.fillStyle = '#6b4226'; c.fillRect(0, IH * .86, IW, 3);
    for (let k = 0; k < 7; k++) { const x = IW * (.04 + k * .14), y = IH * .9; c.fillStyle = '#7a5230'; c.fillRect(x, y, IW * .11, IH * .1); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(x, y + IH * .045, IW * .11, 1); const cols = ['#f6a25e', '#ff9a1f', '#b8d65a', '#ff7a2a', '#3f8a3a', '#f6a25e', '#ff9a1f']; for (let j = 0; j < 4; j++) { c.fillStyle = cols[k]; c.beginPath(); c.arc(x + 6 + j * IW * .025, y + 2, 5, PI, 0); c.fill(); } }
    const vin = c.createRadialGradient(IW / 2, IH / 2, IH * .3, IW / 2, IH / 2, IW * .7); vin.addColorStop(0, 'rgba(0,0,0,0)'); vin.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = vin; c.fillRect(0, 0, IW, IH);
    fru.fondo = { key, cv };
    if (!fru.manchas || fru.manchas.width !== Math.ceil(IW)) { fru.manchas = document.createElement('canvas'); fru.manchas.width = Math.ceil(IW); fru.manchas.height = Math.ceil(IH); }
    return cv;
  }
  function pintaFruta(c, id, r, mitad) {   // origen en el centro
    if (id === 'petardo') {
      c.fillStyle = '#b3202c'; c.beginPath(); c.arc(0, 0, r, 0, 2 * PI); c.fill(); c.fillStyle = '#e8c15a'; c.fillRect(-r, -2, r * 2, 4);
      c.fillStyle = '#f2e6cc'; c.font = '700 ' + r + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('爆', 0, 1);
      c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(r * .5, -r * .8); c.quadraticCurveTo(r, -r * 1.5, r * .6, -r * 1.8); c.stroke();
      const ch = .6 + Math.random() * .6; c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(r * .6, -r * 1.85, 2.4 * ch, 0, 2 * PI); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(r * .6, -r * 1.85, 1 * ch, 0, 2 * PI); c.fill();
      return;
    }
    const f = ZU().frutas[id], gr = c.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r);
    gr.addColorStop(0, tono(f.piel, 1.25)); gr.addColorStop(.6, f.piel); gr.addColorStop(1, f.piel2);
    if (mitad) {   // media fruta: corteza + pulpa vista + semillas
      c.save(); c.beginPath(); c.rect(-r - 2, 0, r * 2 + 4, r + 2); c.clip();
      c.fillStyle = gr; c.beginPath(); c.arc(0, 0, r, 0, 2 * PI); c.fill(); c.restore();
      c.fillStyle = f.pulpa; c.beginPath(); c.ellipse(0, 0, r * .9, r * .26, 0, 0, 2 * PI); c.fill();
      c.fillStyle = tono(f.pulpa, 1.12); c.beginPath(); c.ellipse(0, -r * .03, r * .6, r * .13, 0, 0, 2 * PI); c.fill();
      if (f.estira) c.scale(f.estira, 1 / f.estira);
      if (id === 'sandia' || f.puntitosPulpa) { c.fillStyle = f.semilla; for (let k = -3; k <= 3; k++) { c.beginPath(); c.ellipse(k * r * .22, (k % 2) * r * .05, 1.1, .7, 0, 0, 2 * PI); c.fill(); } }
      else if (id === 'mikan') { c.strokeStyle = tono(f.pulpa, .8); c.lineWidth = .5; c.beginPath(); for (let k = 0; k < 8; k++) { const a = k * PI / 4; c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * .85, Math.sin(a) * r * .24); } c.stroke(); }
      else { c.fillStyle = f.semilla; c.beginPath(); c.ellipse(0, 0, r * .22, r * .1, 0, 0, 2 * PI); c.fill(); }
      return;
    }
    if (f.estira) c.scale(f.estira, 1 / f.estira);
    c.fillStyle = gr; c.beginPath(); c.arc(0, 0, r, 0, 2 * PI); c.fill();
    if (f.puntitos) { c.fillStyle = f.semilla; for (let k = 0; k < 14; k++) { const a = k * 2.39, d = r * Math.sqrt((k + .5) / 14) * .85; c.beginPath(); c.ellipse(Math.cos(a) * d, Math.sin(a) * d, .9, 1.4, a, 0, 2 * PI); c.fill(); } }
    if (f.rombos) { c.strokeStyle = tono(f.piel2, .7); c.lineWidth = .8; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(k * r * .35 - r, -r); c.lineTo(k * r * .35 + r, r); c.moveTo(k * r * .35 + r, -r); c.lineTo(k * r * .35 - r, r); c.stroke(); } }
    if (f.corona) { c.fillStyle = '#4e8a3a'; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * r * .18 - 2, -r * .9); c.lineTo(k * r * .32, -r * 1.75 + Math.abs(k) * r * .25); c.lineTo(k * r * .18 + 2, -r * .9); c.fill(); } }
    if (f.racimo) { for (let k = 0; k < 7; k++) { const a = k * 2.4, d = r * .55 * Math.sqrt(k / 7); c.fillStyle = k % 2 ? f.piel : f.piel2; c.beginPath(); c.arc(Math.cos(a) * d, Math.sin(a) * d - r * .1, r * .38, 0, 2 * PI); c.fill(); } }
    if (f.rayas) { c.strokeStyle = tono(f.piel2, .7); c.lineWidth = 1.6; for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(k * r * .35, 0, r * .12, r * .95, 0, 0, 2 * PI); c.stroke(); } }
    if (id === 'melocoton') { c.strokeStyle = tono(f.piel2, .8); c.lineWidth = .8; c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(r * .25, 0, 0, r * .9); c.stroke(); c.fillStyle = 'rgba(226,87,76,.35)'; c.beginPath(); c.arc(r * .3, r * .1, r * .55, 0, 2 * PI); c.fill(); }
    if (id === 'mikan') { c.fillStyle = tono(f.piel2, .9); for (let k = 0; k < 12; k++) { const a = k * 2.4, d = r * (.3 + (k % 3) * .2); c.fillRect(Math.cos(a) * d, Math.sin(a) * d, .7, .7); } }
    if (f.hoja || id === 'mikan') { c.fillStyle = '#3f7a33'; c.beginPath(); c.ellipse(r * .2, -r * .95, r * .35, r * .14, -.5, 0, 2 * PI); c.fill(); }
    if (id === 'caqui') { c.fillStyle = '#4d6b2a'; for (let k = 0; k < 4; k++) { const a = k * PI / 2 + .4; c.beginPath(); c.ellipse(Math.cos(a) * r * .22, -r * .82 + Math.sin(a) * r * .1, r * .2, r * .08, a, 0, 2 * PI); c.fill(); } }
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-r * .38, -r * .42, r * .22, r * .13, -.6, 0, 2 * PI); c.fill();
    if (f.brilla) { const a = reloj * 6; c.strokeStyle = 'rgba(255,250,200,.9)'; c.lineWidth = .8; for (let k = 0; k < 4; k++) { const q = a + k * PI / 2; c.beginPath(); c.moveTo(Math.cos(q) * r * 1.15, Math.sin(q) * r * 1.15); c.lineTo(Math.cos(q) * r * 1.5, Math.sin(q) * r * 1.5); c.stroke(); } }
  }
  function dibujaFruta() {
    if (!fru) return;
    const sh = fru.sacudida > 0 ? fru.sacudida * 8 : 0;
    g.save(); if (sh) g.translate((Math.random() - .5) * sh, (Math.random() - .5) * sh);
    g.drawImage(fondoFruta(), 0, 0, IW, IH); g.drawImage(fru.manchas, 0, 0, IW, IH);
    for (const m of fru.mitades) { g.save(); g.translate(m.x, m.y); g.rotate(m.rot + (m.lado < 0 ? PI : 0)); pintaFruta(g, m.id, m.r, true); g.restore(); }
    for (const p of fru.piezas) { elip(p.x + 4, p.y + p.r + 2, p.r * .7, p.r * .2, 'rgba(0,0,0,.25)'); g.save(); g.translate(p.x, p.y); g.rotate(p.rot * .3); pintaFruta(g, p.id, p.r, false); g.restore(); }
    for (const q of fru.gotas) { g.globalAlpha = Math.min(1, q.t * 2); circ(q.x, q.y, q.r, q.c); } g.globalAlpha = 1;
    // estela de la katana: un trazo blanco que se afina
    const e = fru.estela;
    if (e.length > 1) { g.lineCap = 'round'; for (let i = 1; i < e.length; i++) { const k = e[i].t / .16; g.strokeStyle = 'rgba(255,255,255,' + (.25 + k * .7) + ')'; g.lineWidth = 1 + k * 4; g.beginPath(); g.moveTo(e[i - 1].x, e[i - 1].y); g.lineTo(e[i].x, e[i].y); g.stroke(); } g.strokeStyle = fru.ataque >= 22 ? 'rgba(200,120,255,.4)' : fru.ataque >= 12 ? 'rgba(120,170,255,.4)' : 'rgba(160,220,255,.3)'; g.lineWidth = 9 + Math.min(6, fru.ataque / 5); g.beginPath(); g.moveTo(e[0].x, e[0].y); for (const p of e) g.lineTo(p.x, p.y); g.stroke(); }
    g.restore();
    // ¡squirt! en la pantalla: manchas que gotean y estorban
    for (const s2 of fru.salpicas) {
      const a = Math.min(.92, s2.t / 1.2);
      g.globalAlpha = a; g.fillStyle = s2.c; g.beginPath(); g.ellipse(s2.x, s2.y, s2.r, s2.r * .85, s2.semilla * 3, 0, 2 * PI); g.fill();
      for (let k = 0; k < 3; k++) { const ang = s2.semilla * 6 + k * 2.1; circ(s2.x + Math.cos(ang) * s2.r * 1.25, s2.y + Math.sin(ang) * s2.r * 1.1, s2.r * .28, s2.c); }
      const L2 = Math.min(s2.r * 3.2, s2.gote * s2.r * .35); g.fillRect(s2.x - s2.r * .12, s2.y, s2.r * .24, L2); circ(s2.x, s2.y + L2, s2.r * .2, s2.c);
      g.fillStyle = 'rgba(255,255,255,' + (.45 * a) + ')'; g.beginPath(); g.ellipse(s2.x - s2.r * .35, s2.y - s2.r * .35, s2.r * .25, s2.r * .14, -.6, 0, 2 * PI); g.fill();
    }
    g.globalAlpha = 1;
    if (fru.flash > 0) { g.fillStyle = 'rgba(255,220,150,' + Math.min(.6, fru.flash) + ')'; g.fillRect(0, 0, IW, IH); }
    for (const tx of fru.textos) { g.globalAlpha = Math.min(1, tx.t * 1.6); escribe(tx.txt, tx.x, tx.y, tx.grande ? 14 : 10, tx.c, 'center', true); } g.globalAlpha = 1;
    // marcador: tiempo, puntos y vidas como cuencos
    const Z = ZU();
    escribe(Math.ceil(fru.t) + ' s', 14, IH * .27, 12, fru.t <= 10 ? '#ff7a5a' : '#f2e6cc', 'left', true);
    escribe(fru.puntos + ' pts', IW / 2, IH * .27, 13, '#ffd86a', 'center', true);
    for (let k = 0; k < Z.fallosMax; k++) escribe(k < fru.fallos ? '✗' : '◯', IW - 14 - k * 14, IH * .27, 11, k < fru.fallos ? '#ff6a5a' : '#f2e6cc', 'center', true);
    if (fru.t > Z.duracion - 3 && !fru.fin) { g.globalAlpha = Math.min(1, (fru.t - Z.duracion + 3)); escribe('Pasa el dedo por la fruta', IW / 2, IH * .55, 11, '#f2e6cc', 'center', true); g.globalAlpha = 1; }
  }

  // ---------- v0.38 OPCIONES (se guardan en este navegador) ----------
  let opciones = false, borrarArmado = 0;
  const OPC = () => CONFIG.opciones || {};
  function leerOpciones() {
    let o = {}; try { o = JSON.parse(localStorage.getItem('reliquias-opciones') || '{}'); } catch (e) { }
    if (o.musica != null) CONFIG.sonido.musica = o.musica;
    if (o.efectos != null) CONFIG.sonido.volumen = o.efectos;
    if (o.calidad) CONFIG.pantalla.calidadMax = { alta: 3, media: 1.75, baja: 1.25 }[o.calidad] || CONFIG.pantalla.calidadMax;
    if (o.luz != null) (CONFIG.rendimiento = CONFIG.rendimiento || {}).rayosDeLuz = o.luz;
    if (o.sangre != null) CONFIG.gore.sangre = o.sangre;
    if (o.temblor != null) CONFIG.gore.temblor = o.temblor ? 1 : 0;
    if (o.texto != null) CONFIG.opcionesTexto = o.texto;
    return o;
  }
  function guardarOpcion(k, v) { const o = leerOpciones(); o[k] = v; try { localStorage.setItem('reliquias-opciones', JSON.stringify(o)); } catch (e) { } leerOpciones(); }
  function htmlOpciones() {
    const o = leerOpciones(), cal = o.calidad || 'media', vel = o.texto || 'normal';
    const fila = (titulo, sub, control) => `<div class="rq-op"><div><b>${titulo}</b><small>${sub}</small></div>${control}</div>`;
    const barra = (id, v) => `<input type="range" min="0" max="1" step="0.05" value="${v}" data-op="${id}" aria-label="${id}">`;
    const interruptor = (id, v) => `<button class="rq-sw${v ? ' on' : ''}" data-opsw="${id}" role="switch" aria-checked="${!!v}"><i></i></button>`;
    const elegir = (id, val, ops) => `<div class="rq-seg">${ops.map(([k, n]) => `<button data-opsel="${id}:${k}" class="${val === k ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    return `<div class="rq-hanko">設</div><h2>Ajustes del viajero</h2><p class="rq-op-sub">Escrito a pincel, guardado en tu farol.</p>
      <h3>Sonido</h3>
      ${fila('Música', 'Koto, shamisen y taiko', barra('musica', CONFIG.sonido.musica ?? .5))}
      ${fila('Efectos', 'Pasos, golpes y sustos', barra('efectos', CONFIG.sonido.volumen ?? .35))}
      <h3>Imagen</h3>
      ${fila('Nitidez', 'Baja si el móvil va a tirones', elegir('calidad', cal, [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']]))}
      ${fila('Rayos de sol', 'Luz entre los árboles', interruptor('luz', (CONFIG.rendimiento || {}).rayosDeLuz !== false))}
      ${fila('Sangre', 'Rastros y salpicaduras', interruptor('sangre', !!CONFIG.gore.sangre))}
      ${fila('Temblor', 'Sacudida al recibir golpes', interruptor('temblor', !!CONFIG.gore.temblor))}
      ${fila('Contador de FPS', 'Fotogramas por segundo', interruptor('fps', perfPanel.style.display !== 'none'))}
      <h3>Lectura</h3>
      ${fila('Diálogos', 'Velocidad del texto', elegir('texto', vel, [['lento', 'Lento'], ['normal', 'Normal'], ['rapido', 'Rápido']]))}
      <h3>Partida</h3>
      ${fila('Borrar progreso', 'Misiones, monedas y equipo', `<button class="rq-c rq-peligro" data-a="borrarTodo">${Date.now() - borrarArmado < 3000 ? '¿Seguro?' : 'Borrar'}</button>`)}
      <button class="rq-b" data-a="cerrarOpciones">Volver al camino</button>`;
  }
  function aplicarOpcionUI(ev) {
    const b = ev.target.closest('[data-opsw],[data-opsel]'); if (!b) return false;
    if (b.dataset.opsw) {
      const id = b.dataset.opsw, v = !b.classList.contains('on');
      if (id === 'fps') perfPanel.style.display = v ? 'block' : 'none'; else guardarOpcion(id, v);
    } else {
      const [id, v] = b.dataset.opsel.split(':'); guardarOpcion(id, v);
      if (id === 'calidad') { calidadDinamica = { alta: 1.75, media: 1.75, baja: 1.25 }[v]; medir(); }
    }
    pitido(700, .04, 'triangle', .3); pintarUI(); return true;
  }

  // ---------- v0.38 MAPA A LÁPIZ SOBRE PERGAMINO ----------
  // El papel y el terreno (grafito, aguadas de tinta, sendas punteadas) se dibujan UNA vez por mapa y
  // tamaño en un lienzo aparte; cada fotograma solo se copian y encima van los marcadores que se mueven.
  const pergaminos = new Map();
  function pergamino(ox, oy, w, hh, mx, my, ts, grande) {
    const res = Math.min(2, Math.max(1, K)), key = L.nombre + ':' + zonaId + ':' + Math.round(w) + 'x' + Math.round(hh) + ':' + ts.toFixed(2) + ':' + res + ':' + grande;
    let cv = pergaminos.get(key); if (cv) return cv;
    if (pergaminos.size > 8) pergaminos.clear();
    cv = document.createElement('canvas'); cv.width = Math.ceil(w * res); cv.height = Math.ceil(hh * res);
    const c = cv.getContext('2d'), rnd = semilla(L.cols * 131 + L.rows * 7 + zonaId.length * 977);
    c.scale(res, res); c.translate(-ox, -oy);
    const papel = '#e9d9b0', tinta = 'rgba(58,40,22,', grafito = 'rgba(52,46,40,';
    // papel: base, fibras, manchas de agua y bordes tostados
    c.fillStyle = papel; c.fillRect(ox, oy, w, hh);
    for (let i = 0; i < 14; i++) { const x = ox + rnd() * w, y = oy + rnd() * hh, r = 10 + rnd() * 40, gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rnd() < .5 ? 'rgba(150,112,60,.13)' : 'rgba(255,248,225,.16)'); gr.addColorStop(1, 'rgba(150,112,60,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); }
    c.strokeStyle = 'rgba(120,92,55,.10)'; c.lineWidth = .3; c.beginPath();
    for (let i = 0; i < 260; i++) { const x = ox + rnd() * w, y = oy + rnd() * hh, a = rnd() * PI; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); } c.stroke();
    const borde = c.createRadialGradient(ox + w / 2, oy + hh / 2, Math.min(w, hh) * .32, ox + w / 2, oy + hh / 2, Math.max(w, hh) * .72);
    borde.addColorStop(0, 'rgba(90,55,20,0)'); borde.addColorStop(.8, 'rgba(110,70,28,.22)'); borde.addColorStop(1, 'rgba(70,40,14,.6)'); c.fillStyle = borde; c.fillRect(ox, oy, w, hh);
    // terreno
    const cel = (x, y) => (x < 0 || y < 0 || x >= L.cols || y >= L.rows) ? 1 : L.c[y][x];
    c.save(); c.beginPath(); c.rect(mx - 2, my - 2, L.cols * ts + 4, L.rows * ts + 4); c.clip();
    // agua: aguada azulada + ondas a tinta
    for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) if (cel(x, y) === 2) { c.fillStyle = 'rgba(70,105,120,.28)'; c.fillRect(mx + x * ts - .2, my + y * ts - .2, ts + .4, ts + .4); }
    c.strokeStyle = 'rgba(40,70,90,.55)'; c.lineWidth = .35; c.beginPath();
    for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) if (cel(x, y) === 2 && (x + y * 3) % 2 === 0) { const px = mx + x * ts + ts * .15, py = my + (y + .55) * ts; c.moveTo(px, py); c.quadraticCurveTo(px + ts * .2, py - ts * .22, px + ts * .4, py); c.quadraticCurveTo(px + ts * .55, py + ts * .2, px + ts * .7, py); }
    c.stroke();
    // orilla del agua a tinta
    c.strokeStyle = tinta + '.7)'; c.lineWidth = .55; c.beginPath();
    for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) if (cel(x, y) === 2) for (const [dx, dy] of DIRS) if (cel(x + dx, y + dy) !== 2) {
      const X0 = mx + (x + (dx > 0 ? 1 : 0)) * ts, Y0 = my + (y + (dy > 0 ? 1 : 0)) * ts, j = (rnd() - .5) * .4;
      if (dx) { c.moveTo(X0 + j, Y0); c.lineTo(X0 - j, Y0 + ts); } else { c.moveTo(X0, Y0 + j); c.lineTo(X0 + ts, Y0 - j); }
    }
    c.stroke();
    // muros, rocas y casas: sombreado de grafito cruzado
    c.lineWidth = .3; c.strokeStyle = grafito + '.5)'; c.beginPath();
    for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) if (cel(x, y) === 1) {
      const X0 = mx + x * ts, Y0 = my + y * ts, n = Math.max(2, Math.round(ts / 1.1));
      for (let k = 0; k <= n; k++) { const u = k / n * ts; c.moveTo(X0 + u, Y0); c.lineTo(X0, Y0 + u); c.moveTo(X0 + ts, Y0 + u); c.lineTo(X0 + u, Y0 + ts); }
    }
    c.stroke();
    c.strokeStyle = grafito + '.3)'; c.beginPath();
    for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) if (cel(x, y) === 1 && (x + y) % 2 === 0) { const X0 = mx + x * ts, Y0 = my + y * ts; c.moveTo(X0, Y0); c.lineTo(X0 + ts, Y0 + ts); }
    c.stroke();
    // contorno de los bloques sólidos, trazo de lápiz algo tembloroso
    c.strokeStyle = grafito + '.85)'; c.lineWidth = .55; c.beginPath();
    for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) if (cel(x, y) === 1) for (const [dx, dy] of DIRS) if (cel(x + dx, y + dy) !== 1 && x + dx >= 0 && y + dy >= 0 && x + dx < L.cols && y + dy < L.rows) {
      const X0 = mx + (x + (dx > 0 ? 1 : 0)) * ts, Y0 = my + (y + (dy > 0 ? 1 : 0)) * ts, j = (rnd() - .5) * .5;
      if (dx) { c.moveTo(X0 + j, Y0 - .2); c.lineTo(X0 - j, Y0 + ts + .2); } else { c.moveTo(X0 - .2, Y0 + j); c.lineTo(X0 + ts + .2, Y0 - j); }
    }
    c.stroke();
    // sendas: doble línea discontinua
    c.strokeStyle = tinta + '.55)'; c.lineWidth = .4; c.setLineDash([1.2, 1]); c.beginPath();
    for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) if (cel(x, y) === 5) for (const [dx, dy] of DIRS) if (cel(x + dx, y + dy) !== 5) {
      const X0 = mx + (x + (dx > 0 ? .85 : dx < 0 ? .15 : 0)) * ts, Y0 = my + (y + (dy > 0 ? .85 : dy < 0 ? .15 : 0)) * ts;
      if (dx) { c.moveTo(X0, Y0); c.lineTo(X0, Y0 + ts); } else { c.moveTo(X0, Y0); c.lineTo(X0 + ts, Y0); }
    }
    c.stroke(); c.setLineDash([]);
    // árboles: copitas dibujadas a lápiz
    const arbol = (x, y, r) => { c.strokeStyle = grafito + '.7)'; c.lineWidth = .45; c.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 1.256 + rnd() * .4; c.moveTo(x + Math.cos(a) * r * .6 + r * .35, y + Math.sin(a) * r * .6); c.arc(x + Math.cos(a) * r * .6, y + Math.sin(a) * r * .6, r * .35, 0, 2 * PI); } c.moveTo(x, y + r * .4); c.lineTo(x, y + r * 1.2); c.stroke(); };
    for (const [x, y] of L.arboles || []) arbol(mx + (x + .5) * ts, my + (y + .3) * ts, Math.max(1.4, ts * .75));
    for (let y = 0; y < L.rows; y++) for (let x = 0; x < L.cols; x++) if (cel(x, y) === 6 && (x * 7 + y * 3) % 5 === 0) arbol(mx + (x + .5) * ts, my + (y + .3) * ts, Math.max(1.2, ts * .55));
    c.restore();
    // marco a pincel, título en tinta y rosa de los vientos
    c.strokeStyle = tinta + '.8)'; c.lineWidth = 1; c.strokeRect(ox + 4.5, oy + 4.5, w - 9, hh - 9); c.lineWidth = .4; c.strokeRect(ox + 6.5, oy + 6.5, w - 13, hh - 13);
    if (grande) {
      c.fillStyle = tinta + '.9)'; c.font = 'italic 700 9px Georgia, "Times New Roman", serif'; c.textAlign = 'left'; c.fillText(L.nombre, ox + 11, oy + 15);
      const rx = ox + w - 20, ry = oy + hh - 20; c.strokeStyle = tinta + '.75)'; c.lineWidth = .6; c.beginPath(); c.arc(rx, ry, 9, 0, 2 * PI); c.stroke();
      c.fillStyle = tinta + '.8)'; for (let k = 0; k < 4; k++) { const a = k * PI / 2 - PI / 2; c.beginPath(); c.moveTo(rx + Math.cos(a) * 12, ry + Math.sin(a) * 12); c.lineTo(rx + Math.cos(a + .35) * 3, ry + Math.sin(a + .35) * 3); c.lineTo(rx + Math.cos(a - .35) * 3, ry + Math.sin(a - .35) * 3); c.closePath(); c.fill(); }
      c.font = '700 6px Georgia, serif'; c.textAlign = 'center'; c.fillText('N', rx, ry - 13.5);
    }
    pergaminos.set(key, cv); return cv;
  }
  // marcador a tinta (los que se mueven, cada fotograma)
  function tintaPunto(x, y, r, color) { circ(x, y, r + .55, 'rgba(40,26,12,.85)'); circ(x, y, r, color); }

  function dibujaMapa(ox, oy, w, hh, grande) {
    const C = col();
    const minimo = L.exterior ? 0.5 : 2;
    const ts = grande ? Math.max(minimo, Math.min((w - 14) / L.cols, (hh - 26) / L.rows)) : Math.max(minimo, Math.min(84 / L.cols, 60 / L.rows));
    const mw = L.cols * ts, mh = L.rows * ts;
    let mx, my;
    if (grande) {
      mapaGeo = null;
      mx = ox + (w - mw) / 2; my = oy + 15 + (hh - 22 - mh) / 2;
      g.drawImage(pergamino(ox, oy, w, hh, mx, my, ts, true), ox, oy, w, hh);
      const leyenda = esVillano() ? 'Toca un espectro y arrastra' : L.exterior ? '● vecino  ◆ salida' : '▲ gema  ■ base  ● espectro';
      escribe(leyenda, ox + w - 34, oy + 14, 6, '#4a3218', 'right');
    } else {
      mx = ox + w - mw - 4; my = oy + 18;
      g.globalAlpha = 0.94; g.drawImage(pergamino(mx - 6, my - 6, mw + 12, mh + 12, mx, my, ts, false), mx - 6, my - 6, mw + 12, mh + 12); g.globalAlpha = 1;
    }
    // casillas especiales que cambian (refugios, base, agua lunar) a tinta suave
    for (let ty = 0; ty < L.rows; ty++) for (let tx = 0; tx < L.cols; tx++) {
      const c = L.c[ty][tx];
      if (c === 3 || c === 4 || c === 8) R(mx + tx * ts, my + ty * ts, ts + .15, ts + .15, c === 3 ? 'rgba(120,90,160,.35)' : c === 8 ? (lunaActiva() ? 'rgba(90,170,190,.5)' : 'rgba(110,95,115,.35)') : 'rgba(190,140,40,.45)');
    }
    for (const p of portales) { const x = mx + (p.tx + .5) * ts, y = my + (p.ty + .5) * ts; circ(x, y, ts * .5, '#120a1c'); g.strokeStyle = C.portal || '#b06cff'; g.lineWidth = ts * .16; g.beginPath(); g.arc(x, y, ts * .38, reloj * 3, reloj * 3 + 4.5); g.stroke(); }
    for (const b of turbos) if (b.t <= 0) R(mx + b.tx * ts + ts * 0.25, my + b.ty * ts + ts * 0.25, ts * 0.5, ts * 0.5, C.botas);
    for (const gm of gemas) if (gm.estado === 'suelo') {
      const x = mx + (gm.tx + .5) * ts, y = my + (gm.ty + .5) * ts, r = ts * 0.5;
      poli([x, y - r, x + r, y + r * 0.8, x - r, y + r * 0.8], C.tinta); poli([x, y - r * 0.6, x + r * 0.6, y + r * 0.55, x - r * 0.6, y + r * 0.55], C['gema' + gm.valor]);
    }
    if (L.exterior) for (const p of pasosMundo()) {
      const x=mx+(p[0]+.5)*ts, y=my+(p[1]+.5)*ts;
      tintaPunto(x,y,Math.max(ts*.5,1.3),abierto(p) ? '#3f6e4f' : '#9a3a36');
    }
    if(L.exterior&&guiaActual) marcadorGuia(mx+(guiaActual.x+.5)*ts,my+(guiaActual.y+.5)*ts,Math.max(2.7,ts*.74));
    if (L.exterior && zona()?.sellos) zona().sellos.forEach(([x,y],i) => {
      circ(mx+(x+.5)*ts,my+(y+.5)*ts,Math.max(ts*.55,1.35),prog.sellos[i] ? '#3a8b63' : '#943f89');
    });
    if (L.exterior && zona()?.forja) {
      const [x,y] = zona().forja;
      circ(mx+(x+.5)*ts,my+(y+.5)*ts,Math.max(ts*.55,1.4),'#158699');
    }
    for (const p of L.puertas) R(mx + p[0] * ts, my + p[1] * ts, ts, ts, C.ninjaCinta || '#d62f3a');
    for (const n of L.npcs) { const st = prog.m[n.id], x = mx + (n.tx + .5) * ts, y = my + (n.ty + .5) * ts; circ(x, y, Math.max(1.6, ts * .55), 'rgba(40,26,12,.9)'); circ(x, y, Math.max(1.1, ts * .38), n.p.tienda ? '#7fe0ff' : !st ? '#ffd23f' : st === 'hecha' ? '#ff8aa0' : prog.items[n.id] ? '#6fe07a' : '#ffffff'); }
    for (const o of L.objetos) if (objetoVisible(o) && floor(reloj * 3) % 2) circ(mx + (o.tx + .5) * ts, my + (o.ty + .5) * ts, ts * .35, '#ffd23f');
    const f = ts / T;
    if (CONFIG.mapa.mostrarRutas) for (const e of espectros) {
      if (!e.ruta.length) continue;
      g.strokeStyle = e.estado === 'persigue' ? C.persigue : C.sangre; g.lineWidth = grande ? 1.4 : .9; g.setLineDash(grande ? [3, 2] : [2, 1]);
      g.beginPath(); g.moveTo(mx + e.x * f, my + e.y * f);
      for (const p of e.ruta) g.lineTo(mx + (p[0] + .5) * ts, my + (p[1] + .5) * ts);
      g.stroke(); g.setLineDash([]);
    }
    if (grande) mapaGeo = { grande: true, mx, my, ts, ox, oy, w, hh };
    if (esVillano()) espectros.forEach((e, i) => {   // lo que ve y lo que oye cada uno (al héroe, nunca)
      if (e.muerto > 0) return; const P = PE(e), x = mx + e.x * f, y = my + e.y * f, a = P.angulo * PI / 360, c = colorEstado(e);
      g.fillStyle = alfa(c, .22); g.beginPath(); g.moveTo(x, y); g.arc(x, y, P.alcance * ts, e.dir - a, e.dir + a); g.closePath(); g.fill();
      g.strokeStyle = alfa(c, .7); g.lineWidth = .6; g.setLineDash([1.5, 1.5]); g.beginPath(); g.arc(x, y, P.oido * ts, 0, 2 * PI); g.stroke(); g.setLineDash([]);
      if (i === sel) { g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, ts * .95, 0, 2 * PI); g.stroke(); }
    });
    if (CONFIG.mapa.mostrarEspectros) for (const e of espectros) {
      if (e.muerto > 0) continue;
      const x = mx + e.x * f, y = my + e.y * f;
      circ(x, y, ts * 0.66, colorEstado(e)); circ(x, y, ts * 0.46, C.espectro); circ(x, y - ts * .08, ts * .16, colorEstado(e));
    }
    if (fase !== 'menu' && !esVillano()) {
      const x = mx + h.x * f, y = my + h.y * f, p = floor(reloj * 5) % 2;
      const rr = Math.max(1.6, ts * .6); g.strokeStyle = 'rgba(140,20,20,.85)'; g.lineWidth = .8; g.beginPath(); g.arc(x, y, rr * (p ? 1.5 : 1.25), 0, 2 * PI); g.stroke(); circ(x, y, rr, '#8c1d1d'); circ(x, y, rr * .45, '#f3e3c0');   // tú: sello rojo
      if (h.carga.length) circ(x, y - ts * 0.95, ts * 0.32, C['gema' + h.carga[0].valor]);
    }
  }

  function panelTactico() {
    return vertical ? {ox:0,oy:IH*.60,w:IW,hh:IH*.40} : {ox:IW*.60,oy:0,w:IW*.40,hh:IH};
  }
  function espectrosPorCercania() {
    return espectros.map((e,i)=>({i,e,d:h?hypot(e.x-h.x,e.y-h.y):Infinity}))
      .filter(({e})=>!(e.muerto>0)).sort((a,b)=>a.d-b.d||a.i-b.i).map(({i})=>i);
  }
  function siguienteCamara() {
    const disponibles=espectrosPorCercania();
    if (!disponibles.length) return;
    camarasVistas.add(sel);
    let siguiente=disponibles.find(i=>!camarasVistas.has(i));
    if (siguiente===undefined) {
      camarasVistas.clear(); camarasVistas.add(sel);
      siguiente=disponibles.find(i=>i!==sel) ?? disponibles[0];
    }
    sel=siguiente; pitido(460,.10,'triangle',.42);
  }
  function dibujaMapaTactico() {
    const {ox,oy,w,hh}=panelTactico(), centro=ox+w/2;
    const margen=Math.max(7,w*.045), cab=28, pie=20;
    const ts=Math.min((w-margen*2)/L.cols,(hh-cab-pie)/L.rows);
    if(ts<=0) { mapaGeo=null; return; }
    const mw=ts*L.cols,mh=ts*L.rows,mx=centro-mw/2,my=oy+cab+(hh-cab-pie-mh)/2;
    mapaGeo={mx,my,ts,ox,oy,w,hh};
    const fondo=g.createLinearGradient(ox,oy,ox+w,oy+hh);
    fondo.addColorStop(0,'#251e2a');fondo.addColorStop(.6,'#12161f');fondo.addColorStop(1,'#251518');
    R(ox,oy,w,hh,fondo);
    g.strokeStyle='#a7764c';g.lineWidth=.65;g.strokeRect(ox+3,oy+3,w-6,hh-6);
    for(const [dx,dy] of [[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const x=dx>0?ox+5:ox+w-5,y=dy>0?oy+5:oy+hh-5;
      linea([x,y+dy*11,x,y,x+dx*11,y],'#e8bd83',1.25);
    }
    escribe('TABLERO DE CAZA',centro,oy+13,8,'#f4d9a1','center');
    escribe(L.nombre,centro,oy+23,5.9,'#b6a2aa','center');
    R(mx-1.2,my-1.2,mw+2.4,mh+2.4,'#886749');
    for(let y=0;y<L.rows;y++) for(let x=0;x<L.cols;x++) {
      const c=celda(x,y),px=mx+x*ts,py=my+y*ts;
      const color=c===1?(hash(x,y)%3?'#4c3c47':'#564451'):c===2?'#1f4251':c===4?'#886a35':c===3?'#425574':c===8?(lunaActiva()?'#8faebe':'#444057'):(x+y)%2?'#242530':'#282832';
      R(px,py,ts+.04,ts+.04,color);
      if(c===1 && celda(x,y+1)!==1) R(px,py+ts*.8,ts,ts*.2,'#78616a');
      if(c===2 && (x+y)%3===0) linea([px+ts*.16,py+ts*.47,px+ts*.79,py+ts*.47],'#376475',.35);
    }
    const punto=([x,y])=>[mx+(x+.5)*ts,my+(y+.5)*ts];
    const pos=e=>[mx+e.x*ts/T,my+e.y*ts/T];
    const diamante=(x,y,r,color)=>poli([x,y-r,x+r,y,x,y+r,x-r,y],color);
    g.save();g.beginPath();g.rect(mx,my,mw,mh);g.clip();
    for(const gm of gemas) if(gm.estado==='suelo') diamante(...punto([gm.tx,gm.ty]),ts*.35,'#ebce8b');
    for(const portal of portales) circ(...punto([portal.tx,portal.ty]),ts*.32,'#af8fc5');
    for(const turbo of turbos) if(turbo.t<=0) R(mx+(turbo.tx+.32)*ts,my+(turbo.ty+.32)*ts,ts*.36,ts*.36,'#80b4a3');
    espectros.forEach((e,i)=>{
      if(e.muerto>0)return;
      const [x,y]=pos(e), activo=i===sel, alerta=e.estado==='persigue';
      const color=alerta?'#ff6a72':activo?'#f8c985':'#d394a2', p=PE(e), ang=p.angulo*PI/360;
      if(activo) {
        g.fillStyle=alfa(color,.19);g.beginPath();g.moveTo(x,y);
        g.arc(x,y,p.alcance*ts,e.dir-ang,e.dir+ang);g.closePath();g.fill();
      }
      if(e.ruta.length) {
        const trazoRuta=[x,y,...e.ruta.flatMap(punto)];
        g.setLineDash(activo?[2,1.4]:[1,2]);
        linea(trazoRuta,alfa(color,activo?.92:.35),activo?1.25:.65);
        g.setLineDash([]);
        if(activo) diamante(...punto(e.ruta.at(-1)),Math.max(1.7,ts*.42),color);
      }
      const radio=Math.max(2.8,ts*.56);
      if(activo) {
        g.beginPath();g.arc(x,y,radio+1.8+Math.sin(reloj*4)*.45,0,2*PI);
        g.strokeStyle='#f6d497';g.lineWidth=.8;g.stroke();
      }
      circ(x,y,radio,'#14141a');circ(x,y,radio*.77,color);
      escribe(String(i+1),x,y+1.55,4.6,'#20151e','center');
    });
    if(heroVisto()) {
      const [x,y]=pos(h);
      diamante(x,y,Math.max(2.6,ts*.66),'#c9f7d3');
      circ(x,y,Math.max(1.1,ts*.22),'#254739');
    }
    g.restore();
    const yPie=oy+hh-11;
    escribe('◆ Héroe visto',ox+margen,yPie,5.8,'#c9f7d3');
    escribe('● Espectro',centro,yPie,5.8,'#f1ba9f','center');
    escribe('◆ Gema',ox+w-margen,yPie,5.8,'#eacb8b','right');
  }
  function dibujaVistaVillano() {
    const ancho=IW, alto=AH, panel=panelTactico();
    IW=vertical?ancho:panel.ox; AH=vertical?panel.oy:IH;
    try {
      dibujaMundo();
      const e=espectros[sel], nombre=CONFIG.espectros?.[e?.tipo]?.nombre || 'Espectro';
      R(0,0,IW,15,'#131018ec');
      escribe('CÁMARA '+(sel+1)+' · '+nombre,5,10,Math.min(7.4,IW/34),'#efd1a0');
      escribe(Math.ceil(tiempo)+' s · '+capturas+' capt.',IW-5,10,7,'#eec3ca','right');
      const pie=AH-13;
      R(0,pie,IW,13,'#14111ced');
      escribe('Toca un espectro o arrastra su ruta',IW/2,pie+8.7,Math.min(7,IW/38),'#e4ccc9','center');
    } finally { IW=ancho; AH=alto; }
    dibujaMapaTactico();
  }

  function dibujaCeremoniaJade() {
    const { t } = ceremonia, w = IW, alto = IH, x = w / 2, y = alto * .43;
    const revelar = limita((t - 2.68) / .64, 0, 1), asentado = limita((t - 3.5) / .85, 0, 1);
    const esc = Math.min(w, alto), radio = esc * .27;
    g.save();
    R(0, 0, w, alto, '#07130f');
    const fondo = estampas.santuario;
    if (fondo?.naturalWidth) {
      const zoom = Math.max(w/fondo.naturalWidth, alto/fondo.naturalHeight) * (1.02 + revelar*.12);
      const fw = fondo.naturalWidth*zoom, fh = fondo.naturalHeight*zoom;
      g.globalAlpha = .29 + revelar*.13;
      g.drawImage(fondo, (w-fw)/2, (alto-fh)/2, fw, fh);
      g.globalAlpha = 1;
    }
    const halo = g.createRadialGradient(x,y,0,x,y,esc*.7);
    halo.addColorStop(0, 'rgba(183,245,91,' + (.2 + revelar*.33) + ')');
    halo.addColorStop(.42, 'rgba(52,144,86,.24)');
    halo.addColorStop(1, '#04100e');
    R(0,0,w,alto,halo);
    R(0,0,w,alto*.09,'#06120e');
    R(0,alto*.89,w,alto*.11,'#06120e');
    const borde = '#a4ba6b';
    linea([w*.12,alto*.095,w*.88,alto*.095],borde,.55);
    linea([w*.12,alto*.89,w*.88,alto*.89],borde,.55);

    // Dos círculos tallados y doce marcas que se encienden alrededor de la reliquia.
    const invocar = limita(t/2.65,0,1);
    for (let i = 0; i < 2; i++) {
      g.strokeStyle = alfa(i ? '#bafa7f' : '#f0dc85', .36 + revelar*.28);
      g.lineWidth = i ? .7 : 1.15; g.beginPath();
      g.arc(x,y,radio*(1+i*.13),-PI/2+i*t*.2,-PI/2+i*t*.2+2*PI*invocar); g.stroke();
    }
    for (let i = 0; i < Math.ceil(invocar*12); i++) {
      const a = i*PI/6 + t*.13, rx = x+Math.cos(a)*radio*1.13, ry=y+Math.sin(a)*radio*1.13;
      g.save(); g.translate(rx,ry); g.rotate(a); poli([-3,0,0,-2,5,0,0,2],i%3 ? '#b3ed8e' : '#f9df99'); g.restore();
    }

    // Las motas convergen, se dispersan al abrirse el sello y luego orbitan.
    for (let i=0;i<68;i++) {
      const a = i*2.39996 + t*(.17+i%5*.024);
      const fuerza = ((i*61)%100)/100;
      const entrada = esc*(.49+fuerza*.54)*(1-invocar*.86);
      const onda = Math.max(0, t-2.86);
      const dispersion = esc*(.15+fuerza*.55)*Math.min(1,onda*.84);
      const r = entrada + dispersion;
      const px=x+Math.cos(a)*r, py=y+Math.sin(a)*r*.77;
      const op=.36+Math.sin(t*3+i)*.28;
      linea([px-Math.cos(a)*4,py-Math.sin(a)*3,px,py],alfa('#b5ef7f',op),.62);
      circ(px,py,.65+fuerza*.85,alfa(i%3 ? '#d7ffb1' : '#ffe4a5',op+.1));
    }
    if (t < 3.62) {
      const k = Math.max(0,1-Math.abs(t-3.02)/.58);
      const centro = g.createRadialGradient(x,y,0,x,y,radio*1.72);
      centro.addColorStop(0,alfa('#efffb2',.77*k)); centro.addColorStop(1,alfa('#baff83',0));
      circ(x,y,radio*1.72,centro);
      for (let i=0;i<3;i++) {
        const avance=limita((t-2.7-i*.13)*1.05,0,1);
        if (!avance) continue;
        g.beginPath(); g.arc(x,y,radio*(.3+avance*2.4),0,2*PI);
        g.strokeStyle=alfa('#e5ffad',(1-avance)*.62);g.lineWidth=1.1;g.stroke();
      }
    }
    if (revelar) {
      const suavizar = 1 - Math.pow(1-revelar,3);
      const bob = t >= duracionJade ? 0 : Math.sin(t*2.2)*esc*.012;
      g.save();
      g.translate(x, y + (1-suavizar)*esc*.17 + bob);
      g.rotate((1-suavizar)*-.38);
      g.globalAlpha = suavizar;
      g.shadowColor = '#b8ff73'; g.shadowBlur = esc*.12;
      dibujaHuevo(g, 0, 0, radio*(.35+suavizar*.59), t);
      g.restore();
    }
    const aviso = t < 2.72 ? 'EL AGUA RECUERDA' : 'RELIQUIA OBTENIDA';
    escribe(aviso,x,alto*.185,esc*.04,'#e1e8ab','center',true);
    if (asentado > 0) {
      g.globalAlpha = asentado;
      g.font = 'bold ' + esc*.105 + 'px Georgia, serif';
      g.textAlign = 'center'; g.fillStyle = '#ebffc5';
      g.shadowColor = '#05120a'; g.shadowBlur = 8; g.fillText('Dofus verde',x,alto*.759);
      g.shadowBlur = 0;
      escribe('Bloquea cada cuarto ataque',x,alto*.823,esc*.041,'#cceca1','center',true);
    }
    g.restore();
  }

  let mapaExplorador=false,btnPlano;
  // v0.38: al cambiar de zona se tapa la pantalla con una cortina con el nombre del lugar mientras se
  // prepara el suelo nuevo (antes se veía congelado o negro). Dura lo que tarde en prepararse.
  // v0.38: mientras se prepara la zona, un velo oscuro breve; después, el nombre del lugar en blanco
  // hueso, sin fondo, en el centro, que se queda un momento y se desvanece despacio.
  function dibujaCortina(velo) {
    if (velo > 0) { g.save(); g.globalAlpha = velo; R(0, 0, IW, IH, '#0d0a0c'); g.restore(); }
    const A = (CONFIG.ambiente || {}).nombreZona || {}, quieto = A.quieto ?? 1.1, fundido = A.fundido ?? 1.6;
    const tt = Math.max(0, cortina.t - .15), a = tt < .35 ? tt / .35 : tt < quieto ? 1 : Math.max(0, 1 - (tt - quieto) / fundido);
    if (a <= 0) return;
    const tam = Math.min(30, IW / Math.max(6, cortina.nombre.length) * 1.5), y = IH * .42 + (1 - Math.min(1, tt / .5)) * 4;
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '400 ' + tam + 'px "Hiragino Mincho ProN", "Yu Mincho", Georgia, "Times New Roman", serif';
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 6; g.fillStyle = A.color || '#efe7d4';
    if (g.letterSpacing !== undefined) g.letterSpacing = (tam * .12) + 'px';
    g.fillText(cortina.nombre, IW / 2, y);
    g.shadowBlur = 0; g.globalAlpha = a * .7; g.fillRect(IW / 2 - tam * 1.6, y + tam * .72, tam * 3.2, .6);
    if (g.letterSpacing !== undefined) g.letterSpacing = '0px';
    g.restore();
  }
  function dibujar() {
    g.setTransform(K, 0, 0, K, 0, 0);
    if (fase === 'fruta') { dibujaFruta(); return; }
    if (cortina) {
      if (!cortina.preparada) { R(0, 0, IW, IH, '#0d0a0c'); cortina.preparada = 1; return; }   // 1º fotograma: velo
      if (cortina.preparada === 1) { cortina.preparada = 2; dibujaMundo(); R(0, 0, IW, IH, '#0d0a0c'); cortina.ult = performance.now(); return; }   // 2º: se prepara todo debajo
      const ahora = performance.now(); cortina.t += Math.min(.05, (ahora - cortina.ult) / 1000); cortina.ult = ahora;
    }
    if (ceremonia) { dibujaCeremoniaJade(); return; }
    R(0, 0, IW, IH, col().fondo);
    if (esVillano()) { dibujaVistaVillano(); return; }
    dibujaMundo(); dibujaHUD();
    if (cortina) { const A = (CONFIG.ambiente || {}).nombreZona || {}; if (cortina.t > .15 + (A.quieto ?? 1.1) + (A.fundido ?? 1.6)) cortina = null; else dibujaCortina(Math.max(0, 1 - cortina.t / .4)); }
    if(!mapaExplorador) mapaGeo=null;
    if(mapaExplorador&&(fase==='aldea'||fase==='jugando')) {
      const alto=Math.min(IH*.41,146), ancho=Math.min(IW-20,221);
      dibujaMapa((IW-ancho)/2,IH-alto-10,ancho,alto,true);
    }
  }

  // v0.19: perfil de rendimiento sin dependencias; F3 activa las métricas.
  let anterior = 0, calidadDinamica = 1.75, retratoAnterior = 0;
  let perfInicio = 0, perfFrames = 0, perfLentos = 0, perfFPS = 60;
  let perfUpdate = 0, perfRender = 0, perfAudio = 0, perfMuestras = 0, perfCuadros = [], tandasLentas = 0, ignorarHasta = 0;
  const perfPanel = document.createElement('div');
  perfPanel.style.cssText = 'position:fixed;top:5px;left:5px;z-index:99999;pointer-events:none;background:#000c;color:#bfffd1;font:11px monospace;padding:5px;white-space:pre;display:none';
  document.body.appendChild(perfPanel);
  window.addEventListener('keydown', e => { if (e.code === 'F3') { e.preventDefault(); perfPanel.style.display = perfPanel.style.display === 'none' ? 'block' : 'none'; } });
  function cuadro(ms) {
    requestAnimationFrame(cuadro);   // v0.20: primero se pide el siguiente fotograma; si algo falla, el juego sigue vivo
    try { pasoCuadro(ms); } catch (e) { console.error(e); }
  }
  function pasoCuadro(ms) {
    const dt = Math.min(0.05, (ms - anterior) / 1000 || 0); anterior = ms;
    if (dlg && dlgTxt && dlg.c < dlg.txt.length) { const a = floor(dlg.c); dlg.c = Math.min(dlg.txt.length, dlg.c + dt * ({ lento: 24, normal: 42, rapido: 90 }[CONFIG.opcionesTexto] || 42)); if (floor(dlg.c) !== a) { dlgTxt.textContent = dlg.txt.slice(0, floor(dlg.c)); if (floor(dlg.c) % 3 === 0) Banda.letra(); } }
    // El retrato respira a 24 Hz; no necesita recalcularse a 60/120 Hz.
    if (dlg && dlgCv && dlgCv.clientWidth && ms - retratoAnterior >= 1000 / 24) {
      retratoAnterior = ms;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75), w = dlgCv.clientWidth, hh = dlgCv.clientHeight;
      if (dlgCv.width !== Math.round(w * dpr) || dlgCv.height !== Math.round(hh * dpr)) { dlgCv.width = Math.round(w * dpr); dlgCv.height = Math.round(hh * dpr); }
      const c = dlgCv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, hh);
      if (dlg.dibujo === 'huevo') dibujaHuevo(c, w / 2, hh * .52, hh * .3, reloj); else if (PJ(dlg.dibujo)) PJ(dlg.dibujo).dibujar(c, dlg.dibujo, { x: w / 2, y: hh * 1.18, alto: hh * 1.3, t: reloj });
    }
    try {
      const t0 = performance.now(); Banda.tick(fase, silencio || !!ceremonia);
      const t1 = performance.now(); if (ceremonia) avanzarJade(dt); else actualizar(dt);
      const t2 = performance.now(); dibujar();
      const t3 = performance.now(); refrescarBoton();
      perfAudio += t1 - t0; perfUpdate += t2 - t1; perfRender += t3 - t2; perfMuestras++;
      perfCuadros.push(t3 - t0);
    } catch (e) { console.error(e); }
    // Solo bajar resolución ante carga sostenida; evitar cambios de tamaño continuos.
    if (!perfInicio) perfInicio = ms;
    perfFrames++;
    if (dt > 0.022) perfLentos++;
    if (ms - perfInicio >= 4000) {
      const segundos = (ms - perfInicio) / 1000;
      perfFPS = Math.round(perfFrames / segundos);
      // v0.38: la calidad automática solo BAJA (nunca sube y baja en bucle), mira la mediana de los
      // fotogramas (un parón suelto al cambiar de zona no cuenta) y pide dos tandas lentas seguidas.
      perfCuadros.sort((a, b) => a - b);
      const carga = perfCuadros.length ? perfCuadros[perfCuadros.length >> 1] : 0; perfCuadros = [];
      const R = CONFIG.rendimiento || {}, minimo = R.calidadMinima || 1.25;
      if (R.calidadAutomatica !== false && ms > ignorarHasta && carga > (R.umbralMs || 14) && calidadDinamica > minimo) {
        if (++tandasLentas >= 2) { calidadDinamica = Math.max(minimo, calidadDinamica - .25); tandasLentas = 0; medir(); }
      } else tandasLentas = 0;
      if (perfPanel.style.display !== 'none') perfPanel.textContent = 'Reliquias v0.38 | '+perfFPS+' FPS\nDPR '+Math.min(window.devicePixelRatio||1, calidadDinamica).toFixed(2)+' | update '+(perfUpdate/Math.max(1,perfMuestras)).toFixed(1)+' ms\nrender '+(perfRender/Math.max(1,perfMuestras)).toFixed(1)+' ms | audio '+(perfAudio/Math.max(1,perfMuestras)).toFixed(1)+' ms';
      perfInicio = ms; perfFrames = 0; perfLentos = 0; perfUpdate = perfRender = perfAudio = perfMuestras = 0;
    }
  }

  // ---------- pantalla: ajusta 356x192 a todos los píxeles reales del móvil ----------
  let redibujar = false, cortina = null, zonaPrevia = '';
  function medir() {
    const r = cont.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, CONFIG.pantalla.calidadMax || 3, calidadDinamica);
    if (!r.width || !r.height) return;
    layoutVillano=esVillano();
    vertical = r.height > r.width * 1.05;
    IW = vertical ? 302 : 500;
    IH = IW * r.height / r.width;
    AH = IH;
    const esc = Math.min(r.width / IW, r.height / IH), w = IW * esc, hh = IH * esc;
    const izq = (r.width - w) / 2, arr = vertical ? 0 : (r.height - hh) / 2;
    lienzo.style.width = w + 'px'; lienzo.style.height = hh + 'px'; lienzo.style.left = izq + 'px'; lienzo.style.top = arr + 'px';
    const nuevoW = Math.round(w * dpr), nuevoH = Math.round(hh * dpr);
    // Las texturas dependen de la escala; no invalidarlas si la pantalla no cambió.
    if (lienzo.width !== nuevoW || lienzo.height !== nuevoH) {
      // v0.38: al cambiar de tamaño solo se tiran las cachés baratas; el suelo ya proyectado se reaprovecha
      teselas = {}; escaladas.clear(); ARTE_ISO.escala();
      lienzo.width = nuevoW; lienzo.height = nuevoH;
      redibujar = true;
    }
    K = lienzo.width / IW;
    // redibuja en el acto: un lienzo recién redimensionado está vacío y se vería negro un instante
    if (redibujar && L && h && fase !== 'menu') { redibujar = false; try { dibujar(); } catch (e) { console.error(e); } }
    if (vertical) { mandos.style.top = (15 * esc) + 'px'; mandos.style.left = '8px'; mandos.style.right = '8px'; }
    else { mandos.style.top = (arr + 15 * esc) + 'px'; mandos.style.left = (izq + 4) + 'px'; mandos.style.right = 'auto'; }
  }

  // ---------- interfaz (menús) ----------
  const CSS = `
  .rq{position:relative;overflow:hidden;background:#0d0a10;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;font-family:ui-monospace,Menlo,Consolas,monospace;color:#fff}
  .rq canvas{position:absolute}
  .rq-ui{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;background:rgba(13,10,16,.55)}
  .rq-ui[hidden]{display:none}
  .rq-panel{background:rgba(27,20,32,.94);border:3px solid #8e0f1c;border-radius:10px;padding:16px 18px;max-width:340px;width:100%;max-height:100%;overflow:auto;touch-action:pan-y;overscroll-behavior:contain;text-align:center;box-sizing:border-box;box-shadow:0 0 0 3px #1b1420,0 10px 40px rgba(0,0,0,.6)}
  .rq-panel h1{margin:0 0 4px;font-size:30px;letter-spacing:4px;color:#ffe08a;text-shadow:2px 2px 0 #8e0f1c}
  .rq-panel h2{margin:0 0 8px;font-size:20px;color:#ffe08a}
  .rq-panel p{margin:6px 0;font-size:13px;line-height:1.4;color:#e8dfe9}
  .rq-panel .rq-num{font-size:40px;color:#fff;margin:6px 0}
  .rq-panel label{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px;margin:8px 0;text-align:left}
  .rq-panel input{font:inherit;font-size:16px;padding:10px;border-radius:6px;border:2px solid #5a3a5f;background:#2a2030;color:#fff;box-sizing:border-box;text-align:center}
  .rq-panel select{flex:1;max-width:190px;font:inherit;font-size:14px;padding:8px;border-radius:6px;border:2px solid #5a3a5f;background:#2a2030;color:#fff}
  .rq-b{display:block;width:100%;margin-top:10px;padding:13px;font:inherit;font-weight:700;font-size:16px;letter-spacing:1px;border:0;border-radius:8px;background:#f2c94c;color:#1b1420;cursor:pointer}
  .rq-b.sec{background:#3a2e42;color:#fff}
  .rq-b:focus-visible,.rq-m:focus-visible,.rq-panel select:focus-visible{outline:3px solid #7fe0ff;outline-offset:2px}
  .rq-mandos{position:absolute;display:flex;flex-wrap:wrap;gap:4px;z-index:2;pointer-events:none}
  .rq-mandos button{pointer-events:auto}
  .rq-m.rq-camara{color:#ffe2a6;background:#382632;border:1px solid #ae815c}
  .rq-m.rq-mundo{background:#193c2e;color:#def7ab;border:1px solid #9aae66}
  .rq-atlas{display:grid;gap:6px;list-style:none;padding:0;margin:6px 0;text-align:left}
  .rq-atlas li{display:flex;align-items:center;gap:8px;background:#ffffff0a;border-radius:6px;overflow:hidden;font-size:12px}
  .rq-atlas img{display:block;flex:none;width:86px;height:44px;object-fit:cover}
  .rq-atlas small{display:block;color:#c7dbab;font-size:10px;margin-top:3px}
  @media(max-width:440px){.rq-mandos .rq-m{height:32px}.rq-mandos .ancho{padding:0 7px;font-size:11px}}
  .rq-m{width:34px;height:34px;border-radius:8px;border:0;background:rgba(27,20,32,.75);color:#fff;font-size:16px;cursor:pointer}
  .rq-sprint{position:absolute;right:16px;bottom:22px;width:78px;height:78px;border-radius:50%;border:3px solid rgba(255,255,255,.5);background:rgba(127,224,255,.25);color:#fff;font:700 13px ui-monospace,monospace;z-index:2;display:none}
  .rq-sprint.on{background:rgba(127,224,255,.6)}
  .rq.tactil .rq-sprint{display:block}
  .rq-lanzar{position:absolute;right:104px;bottom:22px;width:64px;height:64px;border-radius:50%;border:2px solid #d5a875;background:#3a2a1cd9;color:#ffebc2;font:700 10px ui-monospace,monospace;z-index:2;display:none;box-shadow:0 4px 14px #0006}
  .rq-lanzar.on{display:block}
  .rq-cambiar{position:absolute;right:100px;bottom:120px;width:42px;height:42px;border-radius:50%;border:1px solid #c08a4e;background:#3a2a1cd9;color:#ffebc2;font:700 18px Georgia,serif;z-index:2;display:none}.rq-cambiar.on{display:block}.rq:not(.tactil) .rq-cambiar{right:100px;bottom:22px}.rq:not(.tactil) .rq-lanzar{right:16px;bottom:112px}
  .rq-accion{position:absolute;right:16px;bottom:112px;width:78px;height:78px;border-radius:50%;border:3px solid rgba(255,224,138,.8);background:rgba(142,15,28,.55);color:#fff;font:700 11px ui-monospace,monospace;z-index:2;display:none;cursor:pointer}
  .rq:not(.tactil) .rq-accion{bottom:22px}
  .rq-m.ancho{width:auto;padding:0 10px;font:700 12px ui-monospace,monospace;color:#ffe08a}
  .rq-dlg{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);width:min(94%,460px);box-sizing:border-box;background:rgba(246,236,212,.97);color:#2a2024;border:3px solid #5a3a22;border-radius:10px;padding:10px 34px 10px 14px;z-index:4;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.5)}
  .rq-dlg[hidden]{display:none!important}
  .rq-dlg small{display:block;margin-top:6px;font-size:10px;color:#8a6a48;letter-spacing:1px}
  .rq-dlg.grande{display:flex;gap:14px;align-items:stretch;width:min(96%,660px);padding:12px 38px 12px 12px;border-width:4px;background:linear-gradient(160deg,#f8efd6,#e9d7ad);box-shadow:0 0 0 2px #2a1a10,0 10px 40px rgba(0,0,0,.7);animation:rqd .25s ease-out}
  .rq-dlg.grande .rq-dtx{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
  .rq-dlg.grande b{font-size:15px;border-bottom:2px solid #c9a86a;padding-bottom:5px;margin-bottom:8px}
  .rq-dlg.grande p{font-size:16px;line-height:1.5;min-height:4.5em}
  .rq-marco{flex:none;width:150px;height:190px;border:3px solid #5a3a22;border-radius:8px;overflow:hidden;background:radial-gradient(circle at 50% 40%,#f3e6c2,#cdb685);box-shadow:inset 0 0 18px rgba(60,30,10,.45)}
  .rq-marco canvas{position:static;display:block;width:100%;height:100%}
  .rq.villano .rq-sprint{display:none!important}
  .rq-marco img{display:block;width:100%;height:100%;object-fit:cover;object-position:top;mix-blend-mode:multiply}
  .rq-item-icon{display:inline-block;width:42px;height:42px;object-fit:contain;vertical-align:middle;filter:drop-shadow(0 3px 3px #0005)}
  .rq-ranura i{display:flex;align-items:center;justify-content:center;height:46px}
  .rq-ranura i .rq-item-icon{width:46px;height:46px}
  .rq-objeto i .rq-item-icon{width:54px;height:54px}
  .rq-ficha>img{object-fit:contain!important;object-position:center;background:radial-gradient(ellipse,#e7d7a7,#7f6f4c)!important}
  .rq-recursos{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:14px 0}
  .rq-recurso{display:flex;flex-direction:column;align-items:center;gap:5px;background:linear-gradient(145deg,#f9edce,#e1c99c);border:1px solid #bca372;border-radius:12px;padding:12px 7px;color:#56462f;text-align:center;box-shadow:inset 0 1px #fff8}
  .rq-recurso .rq-item-icon{width:64px;height:64px}
  .rq-recurso b{font:600 12px Georgia,serif}.rq-recurso small{color:#776238;font-weight:bold}
  .rq-recurso.curio{max-width:270px;margin:auto}.rq-recurso p{font-size:12px}
  .rq-rueda i .rq-item-icon{width:28px;height:28px}.rq-lista .rq-item-icon{width:32px;height:32px}
  .rq-dlg.retrato-sprite img{object-fit:contain;object-position:center;mix-blend-mode:normal}
  .rq-cab{display:flex;gap:12px;align-items:center;text-align:left}.rq-cab .rq-marco{width:84px;height:104px}.rq-cab h2{margin-bottom:4px}
  @keyframes rqd{from{opacity:0;transform:translateX(-50%) translateY(14px)}}
  @media (max-width:520px){.rq-dlg.grande .rq-marco{width:104px;height:140px}.rq-dlg.grande p{font-size:14px}}
  @media (prefers-reduced-motion:reduce){.rq-dlg.grande{animation:none}}
  .rq-dlg b{display:block;font-size:12px;letter-spacing:1px;color:#8e0f1c;margin-bottom:3px}
  .rq-dlg p{margin:0;font-size:14px;line-height:1.4}
  .rq-dlg span{position:absolute;right:12px;bottom:8px;color:#8e0f1c;animation:rqp 1s infinite}
  @keyframes rqp{50%{opacity:.2}}
  @media (prefers-reduced-motion:reduce){.rq-dlg span{animation:none}}
  .rq-escena-jade{position:absolute;inset:0;z-index:8;display:flex;align-items:flex-end;justify-content:center;padding:0 0 14px;box-sizing:border-box}
  .rq-escena-jade[hidden]{display:none}
  .rq-escena-jade button{min-height:42px;background:#15281c;border:1px solid #87b47c;color:#e4ffbf;padding:0 22px}
  .rq-ficha{display:flex;align-items:center;gap:10px;background:#302a24;border:1px solid #6b583d;border-radius:7px;padding:7px;text-align:left}.rq-ficha img{width:51px;height:58px;object-fit:contain;background:#cfb884;border-radius:4px}.rq-ficha div{flex:1}
  .rq-equipo{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:12px 0}
  .rq-ranura,.rq-objeto{border:1px solid #665339;background:linear-gradient(155deg,#392d24,#201a1a);color:#f8e9be;border-radius:7px;padding:7px;font:inherit;cursor:pointer}
  .rq-ranura.actual{border-color:#f9da8a;background:#584429}
  .rq-ranura i,.rq-objeto i{font:normal 23px Georgia;color:#f6d98a;display:block}
  .rq-ranura small,.rq-ranura b,.rq-objeto small{display:block;font-size:10px;margin-top:2px}
  .rq-ranura b{font-size:9px;min-height:20px}
  .rq-objeto{display:flex;align-items:center;gap:10px;text-align:left;width:100%;margin-top:6px}
  .rq-objeto i{min-width:28px;text-align:center}
  .rq-objeto small{color:#d9c8a3}
  .rq-stats{padding:0;list-style:none}
  .rq-stats li{display:flex;justify-content:space-between;padding:5px 4px;border-bottom:1px solid #ffffff24;font-size:12px}
  .rq-panel progress{width:100%;accent-color:#bd9c53;height:8px}
  .rq-ritual{padding:16px 8px;background:radial-gradient(ellipse,#6d4326,#24191c 75%);border:1px solid #957354;border-radius:8px;animation:ecoFragua .65s ease-out}
  .rq-ritual span,.rq-ritual b,.rq-ritual small{display:block}
  .rq-ritual span{font-size:45px;color:#ffde8c;text-shadow:0 0 24px #ff8c48}
  .rq-ritual.eco-2,.rq-ritual.eco-3{background:radial-gradient(ellipse,#35624e,#15201a 75%)}
  @keyframes ecoFragua{0%{filter:brightness(1.65);transform:scale(.98)}100%{filter:brightness(1);transform:scale(1)}}
  @media(prefers-reduced-motion:reduce){.rq-ritual{animation:none}}
  .rq-paisaje{display:block;width:100%;aspect-ratio:1.75;object-fit:cover;border-radius:5px;margin-bottom:10px}
  .rq-guia{margin:10px 0;padding:10px;background:#30291e;border:1px solid #9c7c4d;border-radius:7px;color:#ffe3a1;text-align:left}
  .rq-lista .rq-c{display:block;margin-top:5px}
  .rq-lista .rq-objetivo{border-left:2px solid #e8ba70;padding-left:8px}
  .rq-lista{list-style:none;text-align:left;padding:0;margin:4px 0 12px}
  .rq-lista li{padding:5px 0;border-bottom:1px solid #ffffff22;font-size:12px}
  .rq-lista small{display:block;margin-top:2px;color:#ddd0df}
  .rq-panel button:disabled{opacity:.5;cursor:default}
  .rq-panel h3{margin:10px 0 2px;font-size:12px;color:#c79bff;text-align:left;letter-spacing:1px;text-transform:uppercase}
  .rq-item{display:flex;justify-content:space-between;gap:8px;align-items:center;text-align:left;padding:7px 0;border-top:1px dashed #4a3a52;font-size:12.5px}
  .rq-item span{color:#bfb2c4;font-size:11.5px}.rq-item small{color:#ffe08a;letter-spacing:1px}.rq-item em{font-style:normal;color:#6fe07a;font-weight:700;font-size:11px;flex:none}
  .rq-c{flex:none;min-width:66px;padding:10px 8px;border:0;border-radius:7px;background:#f2c94c;color:#1b1420;font:700 12px ui-monospace,monospace;cursor:pointer}.rq-c:disabled{opacity:.35;cursor:default}
  .rq-mini{flex:none;width:44px;height:58px;object-fit:cover;object-position:top;border-radius:5px;border:2px solid #c9a86a;background:#e8d9b5}
  .rq-heroes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;justify-items:stretch;margin:8px 0}
  .rq-heroes button{flex:1;max-width:96px;padding:0;border:3px solid #4a3a52;border-radius:8px;background:#e8d9b5;overflow:hidden;cursor:pointer;position:relative}
  .rq-heroes button.on{border-color:#f2c94c;box-shadow:0 0 0 2px #f2c94c}
  .rq-heroes button[disabled]{filter:grayscale(1) brightness(.55);cursor:default}
  .rq-heroes img{display:block;width:100%;height:92px;object-fit:cover;object-position:top}
  .rq-heroes span{display:block;font:700 9px ui-monospace,monospace;color:#2a2024;padding:2px 1px;background:#e8d9b5}
  .rq-pildora{display:inline-block;margin:4px auto;padding:6px 12px;border-radius:999px;background:linear-gradient(#f6d77a,#c98f2e);color:#2a1a0a;font-weight:700;box-shadow:0 0 0 2px #5a3a12,0 0 18px #f6d77a88;animation:rqf .6s ease-out}
  .rq-pildora small{font-weight:400;opacity:.8}
  @keyframes rqf{from{transform:scale(.4);opacity:0}60%{transform:scale(1.12)}}
  @media (prefers-reduced-motion:reduce){.rq-pildora{animation:none}}
  .rq-panel.rq-washi{position:relative;max-width:420px;text-align:left;color:#2b1d12;border:0;border-radius:4px;padding:22px 22px 18px;
    background:radial-gradient(ellipse at 20% 10%,#f6ecd2,#e6d3a8 60%,#d6bd88);box-shadow:0 0 0 1px #7a5a32,0 0 0 5px #2a1c12,0 18px 50px #000b,inset 0 0 40px rgba(120,80,30,.28)}
  .fruta .rq-sprint,.fruta .rq-accion,.fruta .rq-joy,.fruta .rq-m{display:none!important}
  .rq-panel.rq-washi h2,.rq-panel.rq-washi p,.rq-panel.rq-washi .rq-num{color:#2b1d12;text-shadow:none}.rq-panel.rq-washi .rq-num{color:#8c1d1d;font:700 34px Georgia,serif}
  .rq-washi::before{content:"";position:absolute;inset:8px;border:1px solid rgba(90,58,26,.45);pointer-events:none}
  .rq-washi h2{font:italic 700 22px Georgia,"Hiragino Mincho ProN","Yu Mincho",serif;color:#2b1d12;margin:0 0 2px;text-shadow:none}
  .rq-washi h3{font:700 11px Georgia,serif;letter-spacing:3px;color:#8c1d1d;border-bottom:1px solid rgba(90,58,26,.35);padding-bottom:3px;margin:14px 0 4px;text-transform:uppercase}
  .rq-washi .rq-op-sub{font:italic 12px Georgia,serif;color:#6b4c2c;margin:0 0 4px}
  .rq-hanko{position:absolute;top:14px;right:16px;width:38px;height:38px;border-radius:6px;background:#a3241d;color:#f6e9d0;font:700 22px "Hiragino Mincho ProN","Yu Mincho",serif;display:flex;align-items:center;justify-content:center;transform:rotate(6deg);box-shadow:inset 0 0 0 2px #f1d9b8aa;opacity:.92}
  .rq-op{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed rgba(90,58,26,.25)}
  .rq-op b{display:block;font:700 13.5px Georgia,serif;color:#2b1d12}.rq-op small{display:block;font:12px Georgia,serif;color:#6b4c2c}
  .rq-washi input[type=range]{width:130px;accent-color:#8c1d1d;height:28px}
  .rq-sw{flex:none;width:50px;height:28px;border-radius:14px;border:1px solid #5a3a22;background:#c9b48a;position:relative;cursor:pointer;padding:0}
  .rq-sw i{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#f6ecd2;box-shadow:0 1px 2px #0006;transition:left .15s}
  .rq-sw.on{background:#8c1d1d}.rq-sw.on i{left:25px}
  .rq-seg{display:flex;border:1px solid #5a3a22;border-radius:6px;overflow:hidden;flex:none}
  .rq-seg button{border:0;background:transparent;padding:8px 10px;font:700 12px Georgia,serif;color:#5a3a22;cursor:pointer;min-height:34px}
  .rq-seg button.on{background:#2b1d12;color:#f1e3c2}
  .rq-washi .rq-b{margin-top:16px;background:#2b1d12;color:#f1e3c2;border:0;font-family:Georgia,serif}
  .rq-peligro{background:#8c1d1d!important;color:#f6e9d0!important}
  @media (prefers-reduced-motion:reduce){.rq-sw i{transition:none}}
  .rq-fila{display:flex;gap:8px}.rq-fila .rq-b{font-size:13px;padding:11px 4px}
  .rq-joy{position:absolute;border-radius:50%;pointer-events:none;display:none;z-index:1}
  .rq-joy.base{width:96px;height:96px;margin:-48px 0 0 -48px;border:2px solid rgba(255,255,255,.4);background:rgba(255,255,255,.08)}
  .rq-joy.pomo{width:44px;height:44px;margin:-22px 0 0 -22px;background:rgba(255,255,255,.5)}
  .rq{color:#f5e5c8;font-family:system-ui,sans-serif}
  .rq-ui{padding:12px;background:radial-gradient(ellipse at 50% 48%,#17121a52,#0b090ec9)}
  .rq-panel{max-width:405px;border:1px solid #98734e;border-radius:13px;padding:19px;background:radial-gradient(ellipse at 24% 0%,#48302a,#221b24 72%);box-shadow:inset 0 0 0 4px #231820,inset 0 0 0 5px #8a64444f,0 20px 50px #000a}
  .rq-panel h1,.rq-panel h2{font-family:Georgia,serif;font-weight:600;color:#ffe6b3;text-shadow:none}
  .rq-panel h1{font-size:32px;letter-spacing:2px}.rq-panel h2{font-size:25px;letter-spacing:.1px}
  .rq-panel h3{color:#e0be87;border-bottom:1px solid #88674d72;padding-bottom:5px}
  .rq-panel p{color:#efddcc}
  .rq-panel-bolsa{max-width:475px}
  .rq-b{background:linear-gradient(155deg,#ebc47f,#b17d46);color:#22161a;border:1px solid #d7a66d;font-size:14px;font-weight:700;letter-spacing:.1px;box-shadow:inset 0 1px #ffe7a288}
  .rq-b.sec{background:#372933;color:#efd9b6;border-color:#836349;box-shadow:none}
  .rq-c{color:#f7ddb1;border-color:#8b694b;background:#493529}
  .rq-m{background:#211923b8;border:1px solid #9c78574f;backdrop-filter:blur(4px)}
  .rq-m.ancho{color:#ead4a7;font-size:10px;letter-spacing:.2px}
  .rq-accion{background:#312225d9;border:2px solid #d5a875;color:#ffebc2;box-shadow:0 4px 14px #0006}
  .rq-sprint{background:#20302ebd;border-color:#abcfaf88;color:#eff5dd}
  .rq-dlg.grande{border:1px solid #9d794f;background:linear-gradient(155deg,#f6e8ca,#dbbf96);box-shadow:0 0 0 3px #22171cca,0 14px 38px #0008;gap:10px}
  .rq-dlg.grande .rq-marco{border:1px solid #a47a55;box-shadow:inset 0 0 18px #4431252f;width:116px;height:152px}
  .rq-dlg.grande .rq-marco img{object-fit:contain;object-position:center;mix-blend-mode:multiply}
  .rq-dlg.grande b{font:700 16px Georgia,serif;color:#623c31}
  .rq-dlg.grande p{font-size:14px;min-height:3.7em;color:#372628}
  .rq-bolsa-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:11px 0 6px}
  .rq-bolsa-tabs button{padding:7px 4px;border:1px solid #916d4b;border-radius:6px;font-size:11px}
  .rq-bolsa-tabs .elegida{color:#261b20;background:#e0b67b}
  .rq-ranura{border-color:#7c5e45;background:linear-gradient(160deg,#44352a,#241c25)}
  .rq-ranura.actual{border-color:#e6be7d;box-shadow:inset 0 0 10px #ebad5b2e}
  .rq-objeto{background:linear-gradient(100deg,#4d372e,#2a2129)}
  .rq-tombola{position:relative;width:min(68vw,228px);aspect-ratio:1;margin:19px auto 10px}
  .rq-rueda{position:absolute;inset:0;border-radius:50%;border:5px double #e4b777;background:conic-gradient(var(--sectores));box-shadow:0 10px 24px #08050a88,inset 0 0 0 2px #593a31,inset 0 0 20px #170c163d;transform:rotate(var(--rot));box-sizing:border-box}
  .rq-rueda::before{content:"";position:absolute;inset:9px;border:1px dashed #f3d0a377;border-radius:50%}
  .rq-rueda i{position:absolute;left:calc(50% - 10px);top:calc(50% - 10px);width:20px;height:20px;font:normal 16px Georgia;color:#ffedc6;text-shadow:0 1px 3px #15101a;transform:rotate(var(--a)) translateY(clamp(-81px,-23vw,-47px)) rotate(calc(-1 * var(--a)))}
  .rq-rueda b{position:absolute;inset:41%;display:grid;place-items:center;border-radius:50%;background:#f0c281;color:#523033;border:2px solid #67443e}
  .rq-puntero{position:absolute;z-index:1;left:calc(50% - 8px);top:-7px;width:16px;height:23px;background:#ffe0a1;clip-path:polygon(0 0,100% 0,50% 100%);filter:drop-shadow(0 2px 3px #3b2222)}
  .rq-rueda.rodando{animation:ruedaCedro 2.4s cubic-bezier(.12,.74,.2,1) both}
  @keyframes ruedaCedro{from{transform:rotate(-70deg)}to{transform:rotate(calc(1440deg + var(--rot)))}}
  .rq-prob{margin:12px 0;color:#e6cc9c;font-size:12px;text-align:left}
  @media(max-width:520px){.rq-dlg.grande .rq-marco{width:84px;height:113px}.rq-dlg.grande p{font-size:13px}.rq-panel h2{font-size:22px}}
  @media(prefers-reduced-motion:reduce){.rq-rueda.rodando{animation:none}}
  /* v0.38 — un solo estilo: laca oscura, oro y sello rojo; misma letra en todo */
  .rq, .rq button, .rq input, .rq select{font-family:Georgia,"Hiragino Mincho ProN","Yu Mincho",serif}
  .rq-m,.rq-mandos .ancho,.rq-c,.rq-sprint,.rq-accion,.rq-lanzar{font-family:Georgia,serif!important;letter-spacing:.5px}
  .rq-mandos .ancho{font-size:12px;font-weight:700;color:#f1dfba}
  .rq-panel:not(.rq-washi){position:relative;border:1px solid #b08a55;box-shadow:inset 0 0 0 4px #1c141a,inset 0 0 0 5px #c79a5a55,0 20px 50px #000b}
  .rq-panel>h2:first-child,.rq-panel>h1:first-child{padding-right:34px;padding-left:34px}
  .rq-panel:not(.rq-washi) h2::after{content:"";display:block;width:56px;height:2px;margin:6px auto 2px;background:linear-gradient(90deg,transparent,#c79a5a,transparent)}
  .rq-x{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:50%;border:1px solid #b08a55;background:#2a1d22;color:#f1dfba;font:700 16px Georgia,serif;cursor:pointer;z-index:2;line-height:1;padding:0}
  .rq-washi .rq-x{background:#2b1d12;color:#f1e3c2;border-color:#2b1d12;right:52px}
  .rq-panel{max-height:calc(100% - 4px)}
  .rq.tactil .rq-m{min-width:40px;height:40px}.rq.tactil .rq-panel .rq-b{min-height:46px}
  .rq-ficha{background:#2a2023!important;border:1px solid #8a6a44!important;border-radius:9px!important;box-shadow:none!important}
  .rq-ficha>div{flex:1;min-width:0}.rq-ficha b{color:#ffe6b3;font-size:17px}.rq-ficha p{margin:2px 0!important;font-size:12px!important;color:#d9c4a6!important}

  /* v0.38 — PERGAMINO JAPONÉS para todos los menús: papel washi, marco de madera, tinta y sello rojo (con lo bueno de Dofus: medallones, rejilla de objetos, rarezas de color) */
  .rq-panel.rq-washi{max-width:440px;text-align:center;background:
     radial-gradient(ellipse at 20% 10%,#fbf3dc 0%,transparent 55%),radial-gradient(ellipse at 85% 90%,#d9bf8c55 0%,transparent 60%),
     repeating-linear-gradient(97deg,#0000 0 3px,#a0804a0d 3px 4px),linear-gradient(170deg,#f2e4c3,#e3cc9c)!important;
     box-shadow:0 0 0 3px #2e1a0e,0 0 0 7px #6b4024,0 0 0 8px #c08a4e,0 0 0 11px #3a2213,0 22px 50px #000c!important;border-radius:3px!important;padding:24px 22px 18px!important}
  .rq-washi::before{inset:7px!important;border:1px solid #8c1d1d66!important;outline:1px solid #5a3a1a33;outline-offset:3px}
  .rq-washi::after{content:"";position:absolute;left:50%;top:-14px;transform:translateX(-50%);width:62%;height:16px;border-radius:8px;background:linear-gradient(#7a4a28,#3a2213);box-shadow:0 2px 0 #00000055;pointer-events:none}
  .rq-washi h1,.rq-washi h2{color:#2b1d12!important;text-shadow:none!important;font-style:normal!important;font-weight:700!important;letter-spacing:1px}
  .rq-washi h2::after{content:"";display:block;width:70px;height:2px;margin:6px auto 4px;background:linear-gradient(90deg,transparent,#8c1d1d,transparent)}
  .rq-washi h3{color:#8c1d1d!important;border-bottom:1px solid #5a3a1a44!important;text-align:left}
  .rq-washi p,.rq-washi li,.rq-washi small,.rq-washi span,.rq-washi label,.rq-washi b{color:#3a2716}
  .rq-washi input:not([type=range]),.rq-washi select{background:#fbf4e2!important;border:1px solid #8a6a44!important;color:#2b1d12!important}
  .rq-washi .rq-b{background:linear-gradient(#a3241d,#7a1712)!important;color:#fbe9c2!important;border:1px solid #4a0d0a!important;box-shadow:inset 0 1px #ffffff33,0 2px 0 #4a0d0a!important;border-radius:6px!important}
  .rq-washi .rq-b.sec{background:linear-gradient(#6b4528,#4a2e1a)!important;color:#f3e2c0!important;border-color:#2e1a0e!important;box-shadow:inset 0 1px #ffffff22,0 2px 0 #2e1a0e!important}
  .rq-washi .rq-b:disabled{filter:grayscale(.6);opacity:.55}
  .rq-washi .rq-c{background:linear-gradient(#e8d4a8,#d2b682)!important;color:#3a2716!important;border:1px solid #8a6a44!important;font-weight:700}
  .rq-washi .rq-c.elegida,.rq-washi .rq-c[aria-pressed=true]{background:linear-gradient(#a3241d,#7a1712)!important;color:#fbe9c2!important;border-color:#4a0d0a!important}
  .rq-washi .rq-guia,.rq-washi .rq-mision,.rq-washi .rq-recurso,.rq-washi details{background:#fbf2dc99!important;border:1px solid #a88a5c!important;color:#3a2716!important;border-radius:6px}
  .rq-washi .rq-stats li{border-bottom:1px dashed #8a6a4466!important}.rq-washi .rq-stats b{color:#8c1d1d}
  .rq-washi progress{accent-color:#8c1d1d}
  .rq-washi .rq-x{right:12px!important;top:12px!important;background:#2b1d12!important;color:#f1e3c2!important}
  .rq-washi .rq-hanko{right:auto;left:16px;top:12px}
  .rq-mandos [hidden]{display:none!important}
  .rq-cartas{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0}.rq-carta{display:flex;flex-direction:column;gap:4px;padding:10px 6px;border:2px solid #7a5a36;border-radius:8px;background:linear-gradient(#fff6de,#e7d1a0);color:#2b1d12;font-family:Georgia,serif;cursor:pointer;box-shadow:0 3px 0 #5a3a1a66;transition:transform .15s}.rq-carta:hover,.rq-carta:active{transform:translateY(-3px);border-color:#a3241d}.rq-carta b{font-size:13px;color:#8c1d1d}.rq-carta small{font-size:11px;line-height:1.25}
  .rq-botin{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;margin:8px 0;padding:8px;border:1px dashed #8a6a44;border-radius:6px;background:#fbf2dc88}.rq-botin b{width:100%;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8c1d1d}.rq-botin span{padding:3px 8px;border-radius:999px;background:#2b1d12;color:#f6e3b8;font-size:13px}
  .rq-pop{display:flex;justify-content:space-between;opacity:0;animation:rqPop .45s ease-out forwards}@keyframes rqPop{0%{opacity:0;transform:scale(.7) translateY(8px)}70%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:none}}
  .rq-dias{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:10px 0}.rq-dia{display:flex;flex-direction:column;align-items:center;padding:6px 2px;border:1px solid #a88a5c;border-radius:6px;background:#fbf2dc}.rq-dia b{font-size:18px;color:#8c1d1d}.rq-dia small{font-size:9px}.rq-dia.hecho{opacity:.45}.rq-dia.hoy{border:2px solid #a3241d;box-shadow:0 0 10px #a3241d55;background:#fff6dc}
  .rq-logro{display:flex;align-items:center;gap:8px;text-align:left;padding:7px 9px;margin:5px 0;border:1px solid #a88a5c;border-radius:6px;background:#fbf2dc99}.rq-logro>div{flex:1;min-width:0}.rq-logro b{display:block;font-size:13px}.rq-logro small{display:block;font-size:11px;color:#5a3e22}.rq-logro progress{width:100%;height:5px}.rq-logro.listo{border-color:#a3241d;background:#fff3d8}.rq-logro.cobrado{opacity:.55}.rq-logro em{color:#3f7a33;font-style:normal;font-weight:700}
  .rq-rareza{font:700 13px Georgia,serif;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px!important;text-align:center}
  .rq-premios{list-style:none;padding:0;margin:8px 0}.rq-premios li{padding:8px 10px;margin:5px 0;background:#fbf2dc;border:1px solid #a88a5c;border-radius:6px;font-size:15px;color:#2b1d12;text-align:left}
  .rq-washi .rq-equipo{grid-template-columns:repeat(auto-fill,minmax(66px,1fr))!important}.rq-washi .rq-ranura i{height:24px!important;font-size:18px!important}.rq-washi .rq-ranura i .rq-item-icon{width:26px!important;height:26px!important}.rq-washi .rq-ranura b{min-height:0!important;margin:0!important}.rq-washi .rq-ranura small{margin:0!important}.rq-washi .rq-ranura{overflow:hidden;max-width:84px;justify-self:center;align-self:center;width:100%;height:auto!important;aspect-ratio:1/1!important;border-radius:50%!important}
  /* Bolsa: ficha a la izquierda, huecos alrededor (como Dofus) y rejilla de objetos abajo */
  .rq-panel-bolsa{max-width:620px!important;width:100%}
  .rq-washi .rq-ficha{background:linear-gradient(#f9efd6,#ead6aa)!important;border:1px solid #8a6a44!important;border-radius:6px!important;padding:8px!important;box-shadow:inset 0 0 0 3px #f9efd6,inset 0 0 0 4px #8c1d1d33!important}
  .rq-washi .rq-ficha img{width:64px!important;height:74px!important;background:radial-gradient(ellipse,#fff6dc,#d6bb86)!important;border:1px solid #8a6a44;border-radius:4px}
  .rq-washi .rq-ficha b{color:#2b1d12!important;font-size:18px}.rq-washi .rq-ficha p{color:#5a3e22!important}
  .rq-washi .rq-equipo{gap:8px}
  .rq-washi .rq-ranura{background:radial-gradient(circle at 50% 38%,#fff6de,#dcc394 70%)!important;border:2px solid #7a5a36!important;border-radius:50% / 46%!important;aspect-ratio:1;color:#3a2716!important;box-shadow:inset 0 -3px 0 #a88a5c88,0 2px 0 #5a3a1a55;padding:4px!important;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .rq-washi .rq-ranura.actual{border-color:#a3241d!important;box-shadow:0 0 0 3px #a3241d55,inset 0 -3px 0 #a88a5c88}
  .rq-washi .rq-ranura small{font-size:10px;color:#5a3e22!important}.rq-washi .rq-ranura b{font-size:9px;color:#8a6a44!important;font-weight:400}
  .rq-washi .rq-ranura i{font-style:normal;font-size:20px;color:#8c1d1d}
  .rq-rejilla{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px;margin-top:6px}
  .rq-washi .rq-rejilla .rq-objeto{margin:0;flex-direction:column;gap:3px;justify-content:center;aspect-ratio:1;padding:4px;background:linear-gradient(#5a3a22,#3a2414)!important;border:2px solid #2e1a0e!important;border-radius:5px;box-shadow:inset 0 0 0 1px #c08a4e55;text-align:center}
  .rq-washi .rq-rejilla .rq-objeto span small{display:none}.rq-washi .rq-rejilla .rq-objeto span b{font-size:9px;color:#f3e2c0!important;line-height:1.1}
  .rq-washi .rq-rejilla .rq-objeto i{font-style:normal;font-size:22px}
  .rq-washi .rq-rejilla .rq-objeto.raro{border-color:#3a6ab0!important}.rq-washi .rq-rejilla .rq-objeto.epico{border-color:#8a3ab0!important}.rq-washi .rq-rejilla .rq-objeto.legendario{border-color:#d9a520!important;box-shadow:0 0 8px #d9a52088}
  .rq-hueco{aspect-ratio:1;border-radius:5px;background:linear-gradient(#4a2e1a,#2e1a0e);border:2px solid #2e1a0e;box-shadow:inset 0 0 0 1px #c08a4e33,inset 0 4px 8px #0006}
  .rq-detalle{margin-top:8px;padding:8px 10px;text-align:left;background:#fbf2dc;border:1px solid #8a6a44;border-radius:6px;font-size:12px;color:#3a2716}
  @media(min-width:600px){.rq-panel-bolsa .rq-cuerpo{display:grid;grid-template-columns:200px 1fr;gap:14px;text-align:left}}
  /* barra de arriba: medallones redondos con icono, como Dofus */
  .rq-mandos .ancho{display:inline-flex;align-items:center;gap:6px;padding:0 12px 0 3px!important;border-radius:999px!important;background:linear-gradient(#5a3a22,#2e1a0e)!important;border:1px solid #c08a4e!important;color:#f3e2c0!important;box-shadow:0 2px 0 #1a0e06}
  .rq-ico{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe7a8,#c08a4e 60%,#6b4024);color:#3a1a0c;font:700 14px "Hiragino Mincho ProN","Yu Mincho",serif;box-shadow:inset 0 -2px 0 #6b402488,0 0 0 1px #2e1a0e}
  .rq-mandos .ancho.rq-mundo .rq-ico,.rq-mandos .ancho[aria-pressed=true] .rq-ico{background:radial-gradient(circle at 35% 30%,#ffb0a0,#a3241d 60%,#4a0d0a);color:#fbe9c2}
  .rq-mandos .rq-m:not(.ancho){border-radius:50%!important;background:radial-gradient(circle at 35% 30%,#7a4a28,#2e1a0e)!important;border:1px solid #c08a4e!important;color:#f3e2c0!important}`;

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function equipar(id) {
    if (id === 'quitar') delete prog.equipo[ranura];
    else {
      const objeto=EQUIPO.objetos[id];
      if (!objeto || !equipoPoseido(id) || !EQUIPO.encaja(objeto,ranura)) return;
      for (const [r,puesto] of Object.entries(prog.equipo)) if (puesto === id) delete prog.equipo[r];
      prog.equipo[ranura]=id;
    }
    recalcularEquipo(); guardarProg(); pintarUI();
  }
  const cerrarPanel = () => '<button class="rq-b sec" data-a="cerrarMundo">Cerrar</button>';
  const textoStats = atributos => Object.entries(atributos).map(([k,v]) =>
    '+'+v+(k==='aguante'?' s':k==='ataque'?'':' %')+' '+EQUIPO.stats[k]).join(' · ');
  const iconosBolsa={kasa:'kasa',sandalias:'sandalias',cinta:'cinta',katana:'katana',bokken:'katana',kanabo:'katana',capa:'capa',haori:'capa',shide:'capa',loto:'loto',escama:'anillo',lunario:'anillo',kintsugi:'anillo',sello:'jade',mascara:'mascara',carbon:'cobre',cobre:'cobre',jade:'jade',monedas:'monedas',huevo:'huevo',xp:'loto'};
  function iconoObjeto(id,fallback='◇') {
    const nombre=id==='dofus'?'dofus-verde':iconosBolsa[id]?'icono-'+iconosBolsa[id]:null;
    return nombre?'<img class="rq-item-icon" src="'+rutaArte(nombre)+'" alt="">':fallback;
  }
  function htmlEquipo() {
    const retrato=rutaArte('ronin-idle');
    const pestanas='<div class="rq-bolsa-tabs">'+[['equipo','Equipo'],['atributos','Atributos'],['materiales','Materiales']].map(([id,n])=>
      '<button class="rq-c '+(paginaBolsa===id?'elegida':'')+'" data-a="paginaBolsa" data-id="'+id+'" aria-pressed="'+(paginaBolsa===id)+'">'+n+'</button>').join('')+'</div>';
    const huecos=Object.entries(EQUIPO.ranuras).map(([id,nombre])=>{
      const puesto=EQUIPO.objetos[prog.equipo[id]];
      return '<button class="rq-ranura'+(id===ranura?' actual':'')+'" data-a="ranura" data-id="'+id+'" aria-pressed="'+(id===ranura)+'"><i>'+ iconoObjeto(prog.equipo[id],puesto?.icono||'◇') +'</i><small>'+nombre+'</small><b>'+esc(puesto?.nombre || 'Vacío')+'</b></button>';
    }).join('');
    const lista=Object.entries(EQUIPO.objetos).filter(([id,o])=>equipoPoseido(id)&&EQUIPO.encaja(o,ranura)).map(([id,o])=>{
      const puesto=prog.equipo[ranura]===id, mejora=prog.forjas[id];
      const juramento=EQUIPO.juramentos[mejora?.juramento];
      return '<button class="rq-objeto '+String(o.rareza||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')+'" title="'+esc(o.nombre+' · '+o.rareza+' · '+textoStats(o.atributos)+' — '+o.descripcion)+'" data-a="vestir" data-id="'+id+'" '+(puesto?'disabled':'')+'><i>'+iconoObjeto(id,o.icono)+'</i><span><b>'+esc(o.nombre)+(mejora?' +'+mejora.grado:'')+'</b><small>'+o.rareza+(puesto?' · Equipado':'')+'</small><small>'+esc(textoStats(o.atributos))+(juramento?' · '+juramento.nombre:'')+'</small><small>'+esc(o.descripcion)+'</small></span></button>';
    }).join('');
    const nivel=MUNDO.nivel(prog.xp), siguiente=55*nivel*nivel;
    const ficha=[
      ['Ataque',atributo('ataque'),'Potencia del arma en el cedro de entrenamiento'],
      ['Golpe al cedro',armaDePractica()?TALLER.dano(atributo('ataque'),false)+' / '+TALLER.dano(atributo('ataque'),true):'Equipa un arma','Daño normal / crítico'],
      ['Crítico','12 %','Probabilidad de crítico en el cedro'], 
      ['Velocidad',Math.round(CONFIG.heroe.velocidad*(1+efectoMejora('velocidad')+atributo('velocidad')/100))+' u/s','Velocidad al caminar'],
      ['Aguante',energiaMax().toFixed(1)+' s','Tiempo máximo de sprint'],
      ['Recuperación','+'+atributo('recarga')+' %','Recarga del aguante'],
      ['Sigilo','+'+(reduccionSigilo()*100).toFixed(1).replace('.',',')+' %','Reduce la vista y el oído enemigos'],
      ['Protección','+'+atributo('defensa')+' %','Reduce el tiempo perdido al ser atrapado en el dojo'],
      ['Hallazgo','+'+atributo('fortuna')+' %','Aumenta monedas del dojo'],
      ['Sabiduría','+'+atributo('sabiduria')+' %','Aumenta la experiencia ganada']
    ].map(([n,v,detalle])=>'<li title="'+detalle+'"><span>'+n+'</span><b>'+v+'</b></li>').join('');
    const bolsa='<p>Bolsa del Dojo: '+capacidadCarga()+(capacidadCarga()===1?' gema':' gemas')+'</p>';
    const materiales=Object.entries(EQUIPO.materiales).map(([k,n])=>'<div class="rq-recurso">'+iconoObjeto(k)+'<b>'+n+'</b><small>× '+(prog.materiales[k]||0)+'</small></div>').join('');
    const nObj=(lista.match(/rq-objeto/g)||[]).length, relleno='<div class="rq-hueco"></div>'.repeat(Math.max(0,10-nObj));
    const equipo='<div class="rq-equipo">'+huecos+'</div><h3>'+EQUIPO.ranuras[ranura]+'</h3>'+
      '<div class="rq-rejilla">'+lista+relleno+'</div>'+(lista?'':'<p class="rq-detalle">Aún no tienes nada para este hueco. El equipo sale de las plantas del Dojo y de la Rueda del Cedro.</p>')+
      (prog.equipo[ranura]?'<button class="rq-b sec" data-a="vestir" data-id="quitar">Desequipar</button>':'');
    const curio='<h3>Curiosidades</h3>'+(prog.curiosidades.huevo?'<div class="rq-recurso curio">'+iconoObjeto('huevo')+'<b>Huevo de gato disecado</b><small>× '+prog.curiosidades.huevo+'</small><p>Ni huevo, ni gato. El vendedor insiste en que es de temporada.</p></div>':'<p>Tu colección empieza en la Rueda del Cedro.</p>');
    const contenido=paginaBolsa==='equipo'?equipo:paginaBolsa==='atributos'?bolsa+'<ul class="rq-stats">'+ficha+'</ul>':'<h3>Minerales y componentes</h3><div class="rq-recursos">'+materiales+'</div>'+curio;
    const resumen='<ul class="rq-stats rq-resumen">'+[['Ataque',atributo('ataque')],['Velocidad',Math.round(CONFIG.heroe.velocidad*(1+efectoMejora('velocidad')+atributo('velocidad')/100))],['Aguante',energiaMax().toFixed(1)+' s'],['Sigilo','+'+(reduccionSigilo()*100).toFixed(0)+' %']].map(([n,v])=>'<li><span>'+n+'</span><b>'+v+'</b></li>').join('')+'</ul>';
    return '<div class="rq-hanko">袋</div><h2>Bolsa del viajero</h2><div class="rq-cuerpo"><div><div class="rq-ficha">'+(retrato?'<img src="'+esc(retrato)+'" alt="">':'')+
      '<div><b>'+esc(jugador)+'</b><p>Nv. '+nivel+' · '+prog.xp+' / '+siguiente+' XP</p><p>◈ '+prog.puntos+' monedas · '+prog.fichas+' fichas</p>'+
      '<progress value="'+(prog.xp-55*(nivel-1)**2)+'" max="'+(siguiente-55*(nivel-1)**2)+'"></progress></div></div>'+resumen+'</div><div>'+pestanas+contenido+'</div></div>'+cerrarPanel();
  }
  function htmlDescanso() {
    if (!recompensaPiso) return '<h2>La planta sigue en pie</h2><p>Entregaste '+gemasPiso+' de '+(ronda+1)+' gemas.</p><button class="rq-b" data-a="reintentar">Reintentar planta</button><button class="rq-b sec" data-a="aldea">Volver a la aldea</button>';
    const premio=recompensaPiso;
    const objetos=premio.nuevos.map(id=>'<li>'+iconoObjeto(id,EQUIPO.objetos[id].icono)+' '+esc(EQUIPO.objetos[id].nombre)+'</li>').join('');
    const materiales=Object.entries(premio.materiales).map(([id,n])=>'<li>'+n+' × '+EQUIPO.materiales[id]+'</li>').join('');
    return '<h2>'+(ronda===3?'Dojo completado':'Planta '+ronda+' superada')+'</h2><p>+'+premio.xp+' XP · +'+premio.monedas+' monedas</p>'+(premio.fichas?'<p class="rq-pildora">✦ +'+premio.fichas+' '+(premio.fichas===1?'ficha':'fichas')+' de la Rueda del Cedro <small>(tienes '+prog.fichas+')</small></p>':'')+'<ul class="rq-lista">'+objetos+materiales+'</ul>'+
      '<button class="rq-b sec" data-a="equipo">Equipar botín</button><button class="rq-b sec" data-a="fragua">Fragua de los Tres Ecos</button>'+
      (ronda<3?'<button class="rq-b" data-a="siguiente">Subir a la planta '+(ronda+1)+'</button>':'<button class="rq-b" data-a="aldea">Volver a la aldea</button>');
  }
  function estadoForja(id) {
    const arma=EQUIPO.objetos[id];
    if (!arma || arma.tipo !== 'arma' || !equipoPoseido(id)) return null;
    const actual=prog.forjas[id] || {grado:0};
    const proximo=EQUIPO.grados[actual.grado];
    const disponible=!!proximo && prog.puntos>=proximo.monedas &&
      (prog.materiales[proximo.material]||0)>0 && MUNDO.nivel(prog.xp)>=proximo.nivel;
    return {arma,actual,proximo,disponible};
  }
  function iniciarRitual(id, juramento) {
    if (!['forja','fragua'].includes(panelMundo) || ritual) return;
    const estado=estadoForja(id);
    if (!estado?.disponible || !EQUIPO.juramentos[juramento] ||
        (estado.actual.juramento && estado.actual.juramento!==juramento)) return;
    ritual={id,juramento,paso:0}; pintarUI(); pitido(110,.55,'sine',.6);
  }
  function pasoRitual() {
    if (!ritual || ritual.fin) return;
    const estado=estadoForja(ritual.id);
    if (!estado?.disponible) { ritual=null; pintarUI(); return; }
    if (++ritual.paso === estado.proximo.pasos.length) {
      prog.puntos-=estado.proximo.monedas; prog.materiales[estado.proximo.material]--;
      prog.forjas[ritual.id]={grado:estado.actual.grado+1,juramento:ritual.juramento};
      recalcularEquipo(); guardarProg(); ritual.fin=true; SON.entregar();
      [196,294,392,587,784].forEach((f,i)=>setTimeout(()=>pitido(f,.45,'triangle',.58),i*100));
    } else pitido(196*ritual.paso,.4,'triangle',.75);
    pintarUI();
  }
  function htmlFragua() {
    const encabezado='<img class="rq-paisaje" src="'+rutaArte('fragua-ancestral')+'" alt=""><h2>Fragua de los Tres Ecos</h2>';
    if (ritual) {
      const e=estadoForja(ritual.id);
      const paso=ritual.paso;
      return encabezado+'<div class="rq-ritual eco-'+paso+'"><span>✦</span><b>'+esc(e.arma.nombre)+'</b><small>'+esc(EQUIPO.juramentos[ritual.juramento].texto)+'</small></div>'+
        (ritual.fin?'<p>El arma ha respondido. Grado '+e.actual.grado+' / 3.</p>':
          '<p>Eco '+(paso+1)+' de 3</p><button class="rq-b" data-a="pasoRitual">'+esc(e.proximo.pasos[paso])+'</button>')+cerrarPanel();
    }
    const opciones=Object.entries(EQUIPO.objetos).filter(([id,o])=>o.tipo==='arma'&&equipoPoseido(id)).map(([id,o])=>{
      const {actual,proximo,disponible}=estadoForja(id);
      const juramentos=Object.entries(EQUIPO.juramentos).filter(([k])=>!actual.juramento||k===actual.juramento);
      const botones=juramentos.map(([k,j])=>'<button class="rq-b sec" data-a="iniciarRitual" data-id="'+id+'" data-juramento="'+k+'" '+(disponible?'':'disabled')+'>'+j.nombre+' · +'+j.valor+' '+EQUIPO.stats[j.atributo]+'</button>').join('');
      return '<h3>'+esc(o.nombre)+' · '+actual.grado+'/3</h3>'+
        (proximo?'<p>'+proximo.nombre+' · '+proximo.monedas+' monedas · '+EQUIPO.materiales[proximo.material]+' ('+(prog.materiales[proximo.material]||0)+') · Nv. '+proximo.nivel+'</p>'+botones:'<p>El arma conoce su nombre verdadero.</p>');
    }).join('');
    return encabezado+'<p>El primer juramento da forma a todos los temples del arma. Cada eco exige un material de las plantas del Dojo.</p>'+ (opciones || '<p>Consigue un arma en el cofre de la primera planta.</p>')+cerrarPanel();
  }

  function pintarUI() {
    const X = txt();
    let html = '';
    cont.classList.toggle('villano', esVillano()); cont.classList.toggle('fruta', fase === 'fruta');
    if (btnCamara) btnCamara.hidden=!esVillano();
    if (lienzo && layoutVillano!==esVillano()) medir();
    if (consejo) html = htmlConsejo();
    else if (panelEco === 'diaria') html = htmlDiaria();
    else if (panelEco === 'logros') html = htmlLogros();
    else if (cofreAbierto && cofreAbierto.mostrar <= 0) html = htmlCofre();
    else if (opciones) html = htmlOpciones();
    else if (fase === 'fruta') html = htmlFruta();
    else if(panelMundo==='ruleta') html=htmlRuleta();
    else if (panelMundo === 'equipo' || panelMundo === 'fragua' || (panelMundo === 'forja' && prog.m.l === 'hecha')) html = panelMundo === 'equipo' ? htmlEquipo() : htmlFragua();
    else if (fase === 'finRonda' && torre) html = htmlTorre();
    else if (fase === 'finRonda' && expedicion) html = htmlDescanso();
    else if ((fase === 'aldea' || fase === 'finRonda') && tienda) html = htmlTienda();
    else if (fase === 'aldea' && panelMundo) html = htmlMundo();
    else if (fase === 'menu' && !jugador) {
      html = `<h1>${esc(X.titulo)}</h1><p>${esc(X.subtitulo)}</p>
        <label style="display:block">${esc(X.pideNombre || '¿Cómo te llamas?')}<input data-nombre maxlength="14" autocomplete="off" autocapitalize="words" enterkeyhint="go" style="display:block;width:100%;margin-top:8px"></label>
        <button class="rq-b" data-a="entrar">${esc(X.entrar || 'ENTRAR')}</button>`;
    } else if (fase === 'menu') {
      const ops = Object.keys(CONFIG.dificultades).map(k => `<option value="${esc(k)}"${k === dif ? ' selected' : ''}>${esc((X.nombresDificultad || {})[k] || k)}</option>`).join('');
      const maps = NIVELES.map((n, i) => `<option value="${i}"${i === mapaIni ? ' selected' : ''}>${esc(n.nombre)}</option>`).join('');
      html = `<h1>${esc(X.titulo)}</h1><p>${esc(X.hola || 'Hola')}, <b>${esc(jugador)}</b>. ${esc(X.subtitulo)}</p>
        <button class="rq-b" data-a="expedicion">Torre del Dojo · 15 pisos y 3 jefes</button><button class="rq-b sec" data-a="equipo">Inventario y características</button>
        <h3>Práctica</h3>
        <label>${esc(X.dificultad)}<select data-s="dif">${ops}</select></label>
        <label>${esc(X.mapa)}<select data-s="mapa">${maps}</select></label>


        ${prog.armas.length ? `<label>${esc(X.arma || 'Arma')}<select data-s="arma">${prog.armas.map(a => `<option value="${esc(a)}"${a === prog.arma ? ' selected' : ''}>${esc((armas()[a] || {}).nombre || a)}</option>`).join('')}</select></label>` : `<p>${esc(X.sinArma || 'Sin arma todavía: ayuda a la gente de la aldea.')}</p>`}
        <p>${esc(X.comoJugar)}</p>
        <p>${esc(X.record)}: <b data-r>${leerRecord()}</b> · ◈ ${prog.puntos}</p>
        <div class="rq-fila"><button class="rq-b sec" data-a="practicaHeroe">Practicar como héroe</button><button class="rq-b" data-a="practicaVillano">Modo villano</button></div><div class="rq-fila">${hayAldea() ? `<button class="rq-b sec" data-a="aldea">${esc(X.aldea || 'ALDEA')}</button>` : ''}<button class="rq-b sec" data-a="nombre">${esc(X.cambiarNombre || 'Cambiar nombre')}</button></div>`;
    } else if (fase === 'pausa') {
      html = `<h2>${esc(X.pausa)}</h2><button class="rq-b" data-a="seguir">${esc(X.seguir)}</button><button class="rq-b sec" data-a="menu">${esc(X.menu)}</button>`;
    } else if (fase === 'finRonda') {
      html = `<h2>${esc(X.finRonda)} ${ronda}/${CONFIG.partida.rondas}</h2><div class="rq-num">${puntos} ${esc(X.puntos)}</div>${bando === 'villano' ? `<p>Capturas: ${capturas}</p>` : ''}<button class="rq-b" data-a="siguiente">${esc(X.siguiente)}</button>${bando !== 'villano' && hayAldea() ? `<button class="rq-b sec" data-a="tiendaRonda">${esc(X.tiendaRonda || 'PASAR POR LA TIENDA DEL KAPPA')}</button>` : ''}`;
    } else if (fase === 'fin') {
      html = `<h2>${esc(X.finPartida)}</h2><div class="rq-num">${puntos} ${esc(X.puntos)}</div>
        <p>${bando === 'villano' ? 'El héroe se llevó ' + puntos + ' puntos. Lo atrapaste ' + capturas + ' veces.' : L.nuevoRecord ? esc(X.nuevoRecord) : esc(X.record) + ': ' + leerRecord()}</p>
        <button class="rq-b" data-a="jugar">${esc(X.otraVez)}</button><div class="rq-fila">${hayAldea() ? `<button class="rq-b sec" data-a="aldea">${esc(X.aldea || 'ALDEA')}</button>` : ''}<button class="rq-b sec" data-a="menu">${esc(X.menu)}</button></div>`;
    }
    if (btnDiario) btnDiario.hidden = fase !== 'aldea';
    if (btnMundo) btnMundo.hidden = fase !== 'aldea';
    if (btnEquipo) btnEquipo.hidden = fase !== 'aldea';
    if (btnArte) btnArte.hidden = true;
    if(btnPlano)btnPlano.hidden=esVillano()||!['aldea','jugando'].includes(fase);
    if (btnDojo) btnDojo.style.display = fase === 'aldea' ? '' : 'none';
    ui.hidden = !html; ui.innerHTML = html ? `<div class="rq-panel rq-washi ${panelMundo==='equipo'&&!consejo&&!opciones?'rq-panel-bolsa':''}">${html}</div>` : '';
    {   // v0.38: una X arriba a la derecha que pulsa el botón de cerrar/volver del panel
      const pn = ui.querySelector('.rq-panel'), salir = pn && [...pn.querySelectorAll('button[data-a]')].reverse().find(b => /^(Cerrar|Volver|Seguir|Continuar|Salir)/i.test(b.textContent.trim()));
      if (salir) { const x = document.createElement('button'); x.className = 'rq-x'; x.textContent = '✕'; x.setAttribute('aria-label', 'Cerrar'); x.addEventListener('click', ev => { ev.stopPropagation(); salir.click(); }); pn.prepend(x); }
    }
    const b = ui.querySelector('.rq-b'); if (b && !cont.classList.contains('tactil')) b.focus({ preventScroll: true });
    soltarJoy();
  }
  function htmlMundo() {
    const z = zona(), cerrar = '<button class="rq-b" data-a="cerrarMundo">Continuar</button>';
    if (panelMundo === 'atlas') {
      const cards = Object.entries(MUNDO.zonas).map(([id, region]) => {
        const abierta = !['paso','santuario'].includes(id) || prog.m[id === 'paso' ? 'l' : 'q'] === 'hecha';
        const estado = zonaId === id ? 'Estás aquí' : prog.visitadas.includes(id) ? 'Visitado' : abierta ? 'Por explorar' : 'Cerrado por la historia';
        return '<li><img src="' + rutaArte(id) + '" alt=""><div><b>' + esc(region.nombre) + '</b><small>' + esc(estado) + '</small></div></li>';
      }).join('');
      const partida = zonaId==='aldea'?'<button class="rq-b" data-a="partirBosque">Entrar al bosque</button><p>Al este de la plaza: Cedro de los Mil Cortes. Al oeste: Rueda del Cedro.</p>':'<button class="rq-c" data-a="arte">Contemplar la región</button>';
      const rutas = pasosMundo().map(p => {
        const direccion = p[1] < L.rows/3 ? 'norte' : p[1] > L.rows*2/3 ? 'sur' : p[0] < L.cols/2 ? 'oeste' : 'este';
        return '<li>' + esc(nombreZona(p[2])) + ' · ' + (abierto(p) ? direccion : 'cerrado') + '</li>';
      }).join('');
      return '<h2>Mapa del mundo</h2>' + partida + '<h3>Salidas desde aquí</h3><ul class="rq-lista">' +
        rutas + '</ul><ol class="rq-atlas">' + cards + '</ol>' + cerrar;
    }
    if (panelMundo === 'llegada' && z) return '<img class="rq-paisaje" alt="" src="' + rutaArte(zonaId) + '"><h2>' + esc(z.nombre) + '</h2><p>' + esc(z.texto) + '</p>' + cerrar;
    const selector = prog.armas.length ? '<label>Arma equipada <select data-s="arma">' +
      prog.armas.map(id => '<option value="' + esc(id) + '"' + (id === prog.arma ? ' selected' : '') + '>' + esc(armas()[id]?.nombre || id) + '</option>').join('') + '</select></label>' : '';
    if (panelMundo === 'forja') return '<h2>Fragua de los Tres Ecos</h2><p>Ayuda a Aya a recuperar el cobre de la primera compuerta o supera la primera planta del Dojo para usar la fragua.</p>'+cerrar;
    const favores = Object.entries(MUNDO.favores).map(([id,favor]) =>
      prog.favores[id] ? '<li><b>'+esc(favor.nombre)+'</b><small>'+esc(favor.desc)+'</small></li>' : '').join('');
    const aliados = '<h3>Favores de los viajeros</h3><ul class="rq-lista">'+(favores || '<li>Habla con los viajeros que llevan un rombo dorado.</li>')+'</ul>';
    const lista = misiones();
    const tareas = lista.map(([id,p]) => {
      const m=p.mision, estado=prog.m[id], hecha=estado==='hecha', activa=estado==='activa', objeto=prog.items[id];
      const bloqueada=!hecha&&!misionDisponible(id,p);
      const pista=hecha?'Entregada':objeto?'Vuelve con '+p.nombre:activa?m.recuerda[0]:bloqueada?'Completa primero la misión anterior':'Habla con '+p.nombre;
      const siguiendo=guiaActual?.id===id;
      return '<li class="'+(siguiendo?'rq-objetivo':'')+'"><b>'+(hecha?'✓ ':'')+esc(m.titulo||m.nombreObjeto)+'</b>'+
        '<small>'+esc(nombreZona(regionMision(id)))+' · '+(hecha?'Completada':activa?'En curso':bloqueada?'Pendiente':'Disponible')+'</small><small>'+esc(pista)+'</small>'+
        (!hecha&&!bloqueada?'<button class="rq-c" data-a="seguirMision" data-id="'+id+'">'+(siguiendo?'Ver ruta':'Marcar ruta')+'</button>':'')+'</li>';
    }).join('');
    const cabGuia = '<div class="rq-guia"><b>'+(guiaActual?'◆ '+esc(guiaActual.titulo):'Guía de misiones')+'</b>'+
      (guiaActual?'<p>'+esc(guiaActual.texto)+'</p>':'')+
      '<button class="rq-c" data-a="alternarGuia">'+(prog.guia===false?'Activar guía':'Ocultar guía')+'</button></div>';
    const rutas = pasosMundo().map(p => '<li>' + esc(nombreZona(p[2])) + (abierto(p) ? ' · ' + (p[1] < L.rows/3 ? 'norte' : p[1] > L.rows*2/3 ? 'sur' : p[0] < L.cols/2 ? 'oeste' : 'este') : ' · cerrado') + '</li>').join('');
    const nLog = logrosPorCobrar();
    return '<h2>Diario del viajero</h2><p>' + esc(rango().nombre) + ' · nivel ' + MUNDO.nivel(prog.xp) + ' · ' + prog.xp + ' XP · ◈ ' + prog.puntos + ' monedas</p>' + (EC() ? '<button class="rq-b" data-a="verLogros">🏮 Recompensas' + (nLog ? ' · ' + nLog + ' por cobrar' : '') + '</button>' : '') + cabGuia + '<h3>Misiones</h3><ul class="rq-lista">' + tareas + '</ul>' + aliados +
      (prog.huevo ? '<p>Dofus verde · ' + prog.cargaJade + '/4 hacia el próximo bloqueo</p><button class="rq-b sec" data-a="verJade">Volver a ver la entrega</button>' : '') +
      '<h3>Salidas desde ' + esc(L.nombre) + '</h3><ul class="rq-lista">' + rutas + '</ul>' + cerrar;
  }
  function irMenu() { expedicion=false; torre=null; ritual=null; panelMundo = ''; zonaId = 'aldea'; dlg = null; pintarDlg(); tienda = false; fase = 'menu'; cargarNivel(mapaIni); pintarUI(); }
  function pausar() { if (fase === 'jugando') fase = 'pausa'; else if (fase === 'pausa') fase = 'jugando'; else return; pintarUI(); }
  function soltarJoy() { joy.id = null; joy.x = joy.y = 0; joy.sprint = false; if (joyBase) { joyBase.style.display = 'none'; joyPomo.style.display = 'none'; } }

  function cargarImagenes() {
    for (const id of [...Object.keys(MUNDO.zonas), ...Object.values({...ALDEA.personajes,...MUNDO.personajes}).map(p=>p.sprite).filter(Boolean), 'dofus-verde', 'casa-pintada', 'cedro-pintado', 'cerezo-pintado', 'torii-pintado', 'fragua-ancestral','cedro-entrenamiento','puesto-ruleta','ninja-shhh','cofre','farol-torre','farol-torre-apagado','farol-piedra','ronin-correr','ronin-quieto','ronin-cargar','ronin-lanzar',(typeof ZUMOS!=='undefined'?ZUMOS.imagen:'puesto-ruleta'),(typeof ZUMOS!=='undefined'&&ZUMOS.gato||'puesto-ruleta'),(typeof ZUMOS!=='undefined'?ZUMOS.fondoJuego:'puesto-ruleta'),'atlas-casas','atlas-naturaleza','atlas-monumentos','atlas-suelos','ronin-idle','ronin-paso1','ronin-paso2','muro-shoji','muro-piedra','enemigo-monje','enemigo-cesta','enemigo-ogro','enemigo-cabeza']) {
      if (estampas[id]) continue;
      const img = new Image(); img.src = rutaArte(id); estampas[id] = img;
    }
    for (const k of Object.keys(CONFIG.sprites)) {
      delete imagenes[k]; const src = CONFIG.sprites[k]; if (!src) continue;
      const im = new Image(); im.onload = () => { imagenes[k] = im; }; im.src = src;
    }
  }

  // v0.38: kanji en un medallón delante de cada botón de arriba (se cambian aquí)
  const ICONOS_BARRA = { dojo: '道', diario: '巻', atlas: '地', equipo: '袋', plano: '図' };
  function ponerIconos() {
    for (const b of mandos.querySelectorAll('.rq-m.ancho')) { const ic = ICONOS_BARRA[b.dataset.a]; if (!ic || b.querySelector('.rq-ico')) continue; const t = b.textContent; b.textContent = ''; const sp = document.createElement('span'); sp.className = 'rq-ico'; sp.textContent = ic; b.append(sp, document.createTextNode(t)); }
  }
  function montar(el) {
    leerOpciones();
    cont = el; cont.classList.add('rq');
    if (!document.getElementById('rq-css')) { const st = document.createElement('style'); st.id = 'rq-css'; st.textContent = CSS; document.head.appendChild(st); }
    cont.innerHTML = '';
    lienzo = document.createElement('canvas'); ctx = lienzo.getContext('2d'); cont.appendChild(lienzo);
    g = ctx;
    joyBase = document.createElement('div'); joyBase.className = 'rq-joy base'; joyPomo = document.createElement('div'); joyPomo.className = 'rq-joy pomo';
    mandos = document.createElement('div'); mandos.className = 'rq-mandos';
    mandos.innerHTML = '<button class="rq-m" data-a="opciones" aria-label="Ajustes"><svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm8.4 2.3l-1.9-.4a6.9 6.9 0 00-.7-1.7l1.1-1.6-1.9-1.9-1.6 1.1c-.5-.3-1.1-.6-1.7-.7L13.3 3h-2.6l-.4 1.9c-.6.1-1.2.4-1.7.7L7 4.5 5.1 6.4l1.1 1.6c-.3.5-.6 1.1-.7 1.7l-1.9.4v2.6l1.9.4c.1.6.4 1.2.7 1.7l-1.1 1.6 1.9 1.9 1.6-1.1c.5.3 1.1.6 1.7.7l.4 1.9h2.6l.4-1.9c.6-.1 1.2-.4 1.7-.7l1.6 1.1 1.9-1.9-1.1-1.6c.3-.5.6-1.1.7-1.7l1.9-.4z" fill="currentColor"/></svg></button><button class="rq-m" data-a="pausa" aria-label="Pausa">Ⅱ</button><button class="rq-m" data-a="silencio" aria-label="Sonido">♪</button><button class="rq-m" data-a="completa" aria-label="Pantalla completa">⛶</button>';
    btnSprint = document.createElement('button'); btnSprint.className = 'rq-sprint'; btnSprint.textContent = 'SPRINT'; btnSprint.setAttribute('aria-label', 'Sprint');
    ui = document.createElement('div'); ui.className = 'rq-ui';
    btnAccion = document.createElement('button'); btnAccion.className = 'rq-accion'; btnAccion.dataset.a = 'accion';
    btnLanzar = document.createElement('button'); btnLanzar.className = 'rq-lanzar'; btnLanzar.textContent = 'LANZAR'; btnLanzar.setAttribute('aria-label', 'Lanzar reliquia');
    btnLanzar.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); lanzar(); });
    btnCambiar = document.createElement('button'); btnCambiar.className = 'rq-cambiar'; btnCambiar.textContent = '⇄'; btnCambiar.setAttribute('aria-label', 'Cambiar pergamino');
    btnCambiar.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); siguienteArma(); });
    dlgEl = document.createElement('div'); dlgEl.className = 'rq-dlg'; dlgEl.hidden = true; dlgEl.setAttribute('role', 'status'); dlgEl.addEventListener('click', avanzarDlg);
    btnCamara = document.createElement('button'); btnCamara.className='rq-m ancho rq-camara';
    btnCamara.dataset.a='camara'; btnCamara.textContent='Cambiar cámara'; btnCamara.hidden=true; mandos.appendChild(btnCamara);
    btnDojo = document.createElement('button'); btnDojo.className = 'rq-m ancho'; btnDojo.dataset.a = 'dojo'; btnDojo.textContent = 'DOJO'; mandos.appendChild(btnDojo);
    btnDiario = document.createElement('button'); btnDiario.className = 'rq-m ancho'; btnDiario.dataset.a = 'diario'; btnDiario.textContent = 'MISIONES'; mandos.appendChild(btnDiario);
    btnMundo = document.createElement('button'); btnMundo.className = 'rq-m ancho rq-mundo';
    btnMundo.dataset.a = 'atlas'; btnMundo.textContent = 'MUNDO'; mandos.appendChild(btnMundo);
    btnEquipo = document.createElement('button'); btnEquipo.className = 'rq-m ancho';
    btnEquipo.dataset.a = 'equipo'; btnEquipo.textContent = 'EQUIPO'; mandos.appendChild(btnEquipo);
    btnPlano = document.createElement('button');btnPlano.className='rq-m ancho';btnPlano.dataset.a='plano';btnPlano.textContent='MAPA';mandos.appendChild(btnPlano);
    ponerIconos();
    btnArte = document.createElement('button'); btnArte.className = 'rq-m'; btnArte.dataset.a = 'arte'; btnArte.textContent = '❈'; btnArte.setAttribute('aria-label','Contemplar la región'); mandos.appendChild(btnArte);
    escenaJade = document.createElement('div'); escenaJade.className = 'rq-escena-jade'; escenaJade.hidden = true;
    escenaJade.setAttribute('role','dialog'); escenaJade.setAttribute('aria-modal','true'); escenaJade.setAttribute('aria-label','Dofus verde obtenido');
    escenaJade.innerHTML = '<button class="rq-m ancho" data-a="cerrarJade">Saltar</button>';
    cont.append(joyBase, joyPomo, mandos, btnSprint, btnLanzar, btnCambiar, btnAccion, dlgEl, ui, escenaJade);
    etiquetaAccion = null; leerProg();
    if (window.matchMedia && matchMedia('(pointer:coarse)').matches) cont.classList.add('tactil');

    // botones
    cont.addEventListener('click', ev => {
      if (ceremonia) { if (ev.target.closest('[data-a="cerrarJade"]')) cerrarJade(); return; }

      const cp = ev.target.closest('[data-compra]'); if (cp) { comprar(cp.dataset.compra); return; }
      const b = ev.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'entrar') { const i = ui.querySelector('[data-nombre]'), n = (i.value || '').trim().slice(0, 14); if (!n) { i.focus(); return; } jugador = n; try { localStorage.setItem('reliquias-jugador', n); } catch (e) { } irAldea(); }
      else if (a === 'nombre') { jugador = ''; pintarUI(); }
      else if (['jugar','practicaHeroe','practicaVillano'].includes(a)) { const s1 = ui.querySelector('[data-s=dif]'), s2 = ui.querySelector('[data-s=mapa]'); if (s1) dif = s1.value; if (s2) mapaIni = +s2.value; if (a !== 'jugar') bando = a==='practicaVillano' ? 'villano' : 'heroe'; pitido(1, 0.01, 'sine', 0.01); empezar(); }
      else if (a === 'siguiente' && (!expedicion || (recompensaPiso && ronda<3))) { ronda++; iniciarRonda(); }
      else if (a === 'menu' || a === 'dojo') irMenu();
      else if (a === 'aldea') irAldea();
      else if (a === 'equipo' && !dlg && ['aldea','finRonda','menu'].includes(fase)) { tienda=false; panelMundo='equipo'; pintarUI(); aconsejar('equipo'); }
      else if (a==='plano' && !esVillano()) mapaExplorador=!mapaExplorador;
      else if (a==='paginaBolsa' && panelMundo==='equipo' && ['equipo','atributos','materiales'].includes(b.dataset.id)) {paginaBolsa=b.dataset.id;pintarUI();}
      else if (a==='girarRueda') girarRueda();
      else if (a === 'ranura' && panelMundo === 'equipo' && EQUIPO.ranuras[b.dataset.id]) { ranura=b.dataset.id; pintarUI(); }
      else if (a === 'vestir' && panelMundo === 'equipo') equipar(b.dataset.id);
      else if (a === 'fragua' && fase === 'finRonda' && recompensaPiso) { panelMundo='fragua'; ritual=null; pintarUI(); }
      else if (a === 'iniciarRitual') iniciarRitual(b.dataset.id, b.dataset.juramento);
      else if (a === 'pasoRitual') pasoRitual();
      else if (a === 'expedicion' && fase === 'menu') empezar({expedicion:true,torre:true,bando:'heroe',difficulty:'normal'});
      else if (a === 'reintentar' && fase === 'finRonda' && expedicion && !recompensaPiso) iniciarRonda();
      else if (a === 'atlas' && fase === 'aldea' && !dlg) { tienda = false; panelMundo = panelMundo === 'atlas' ? '' : 'atlas'; pintarUI(); }
      else if (a === 'partirBosque' && fase === 'aldea' && zonaId === 'aldea' && panelMundo === 'atlas') irAldea('bosque');
      else if (a === 'seguirMision' && panelMundo==='diario' && misiones().some(([id,p])=>id===b.dataset.id&&misionDisponible(id,p))) {
        prog.guia=b.dataset.id; actualizarGuia(); guardarProg(); panelMundo=''; pintarUI();
      }
      else if (a === 'alternarGuia' && panelMundo==='diario') { prog.guia=prog.guia===false?null:false; actualizarGuia(); guardarProg(); pintarUI(); }
      else if (a === 'diario' && fase === 'aldea' && !dlg) { tienda = false; panelMundo = panelMundo === 'diario' ? '' : 'diario'; pintarUI(); }
      else if (a === 'arte' && fase === 'aldea' && !dlg && zona()) { tienda = false; panelMundo = 'llegada'; pintarUI(); }
      else if (a === 'verJade' && fase === 'aldea' && prog.huevo) { panelMundo = ''; pintarUI(); abrirJade(); }
      else if (a === 'cerrarMundo') { panelMundo = ''; ritual = null; pintarUI(); }
      else if (a === 'cerrarTienda') { tienda = false; pintarUI(); }
      else if (a === 'tiendaRonda') { tienda = true; const P = (hayAldea() && ALDEA.personajes) || {}; retratoTienda = ''; for (const k in P) if (P[k].tienda) retratoTienda = P[k].sprite ? rutaArte(P[k].sprite) : P[k].retrato || ''; pintarUI(); }
      else if (a === 'camara' && esVillano()) siguienteCamara();
      else if (a === 'accion') accion();
      else if (a === 'seguir' || a === 'pausa') pausar();
      else if (a === 'opciones') { opciones = !opciones; if (opciones && fase === 'jugando') { fase = 'pausa'; opciones = 'pausa'; } else if (!opciones && fase === 'pausa') fase = 'jugando'; pintarUI(); }
      else if (a === 'cartaTorre' && torre) elegirCarta(b.dataset.id);
      else if (a === 'seguirTorre' && torre && torre.elegida && fase === 'finRonda') { ronda++; iniciarRonda(); }
      else if (a === 'cobrarTorre' && torre && fase === 'finRonda') cobrarTorre(+b.dataset.id);
      else if (a === 'cobrarDiaria') { const p = EC().diaria[(prog.rachaDiaria || 1) - 1]; const L2 = darPremio(p, rango().mult); prog.diaCobrado = hoy(); guardarProg(); panelEco = null; decir('Día ' + prog.rachaDiaria + ': ' + L2.join(' · '), 3.5); SON.entregar(); pintarUI(); }
      else if (a === 'cobrarLogro') { const l = EC().logros.find(x => x.id === b.dataset.id); prog.cobrados = prog.cobrados || {}; if (l && !prog.cobrados[l.id] && (prog.stats?.[l.stat] || 0) >= l.meta) { prog.cobrados[l.id] = true; const L2 = darPremio(l.premio, rango().mult); guardarProg(); decir(l.nombre + ': ' + L2.join(' · '), 3.2); SON.entregar(); } pintarUI(); }
      else if (a === 'verLogros') { panelEco = 'logros'; pintarUI(); }
      else if (a === 'cerrarEco') { panelEco = null; pintarUI(); }
      else if (a === 'comprarOferta') comprarOferta(b.dataset.id);
      else if (a === 'venderMaterial') venderMaterial(b.dataset.id);
      else if (a === 'cerrarCofre') { cofreAbierto = null; pintarUI(); }
      else if (a === 'entendido') { consejo = null; pintarUI(); }
      else if (a === 'otraFruta') empezarFruta();
      else if (a === 'salirFruta') { fru = null; fase = 'aldea'; pintarUI(); }
      else if (a === 'cerrarOpciones') { if (opciones === 'pausa' && fase === 'pausa') fase = 'jugando'; opciones = false; pintarUI(); }
      else if (a === 'borrarTodo') { if (Date.now() - borrarArmado > 3000) { borrarArmado = Date.now(); pintarUI(); } else { borrarArmado = 0; try { localStorage.removeItem('reliquias-progreso'); localStorage.removeItem('reliquias-jugador'); } catch (e) { } location.reload(); } }
      else if (a === 'silencio') { silencio = !silencio; b.style.opacity = silencio ? 0.4 : 1; }
      else if (a === 'completa') { try { (document.fullscreenElement ? document.exitFullscreen() : cont.requestFullscreen()).catch(() => { }); } catch (e) { } }
      b.blur && a !== 'jugar' && b.blur();
    });
    ui.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.matches('[data-nombre]')) { ev.preventDefault(); const b = ui.querySelector('[data-a=entrar]'); if (b) b.click(); } });
    ui.addEventListener('click', ev => { if (aplicarOpcionUI(ev)) ev.stopPropagation(); }, true);
    ui.addEventListener('input', ev => { const r = ev.target; if (r.dataset.op) { guardarOpcion(r.dataset.op, +r.value); if (r.dataset.op === 'efectos') pitido(660, .05, 'triangle', .5); } });
    ui.addEventListener('change', ev => { const s = ev.target; if (s.dataset.s === 'arma') { prog.arma = s.value; guardarProg(); if (panelMundo) pintarUI(); } if (s.dataset.s === 'dif') dif = s.value; if (s.dataset.s === 'mapa') { mapaIni = +s.value; cargarNivel(mapaIni); } const r = ui.querySelector('[data-r]'); if (r) r.textContent = leerRecord(); });

    // táctil / ratón: joystick flotante donde pongas el dedo. Doble toque = sprint
    const sp = on => { sprintBoton = on; btnSprint.classList.toggle('on', on); };
    btnAccion.addEventListener('pointerdown',ev=>{
      if(!cerca?.tronco||ev.button>0)return;
      pulsandoGolpe=true;golpearTronco();
      try{btnAccion.setPointerCapture(ev.pointerId);}catch(e){}
    });
    for(const tipo of ['pointerup','pointercancel','lostpointercapture']) btnAccion.addEventListener(tipo,()=>{pulsandoGolpe=false;});
    btnSprint.addEventListener('pointerdown', ev => { ev.preventDefault(); sp(true); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => btnSprint.addEventListener(n, () => sp(false)));
    cont.addEventListener('pointerdown', ev => {
      if (fase === 'fruta' && fru && !ev.target.closest('button,.rq-panel')) { ev.preventDefault(); const [x, y] = aUnidades(ev); fru.hoja = ev.pointerId; fru.estela = [{ x, y, t: .16 }]; try { cont.setPointerCapture(ev.pointerId); } catch (e) { } return; }
      if (ev.pointerType === 'touch') cont.classList.add('tactil');
      Banda.reanudar();
      if (ceremonia || panelMundo || tienda) return;
      if(!esVillano()&&mapaExplorador&&mapaGeo) {
        const [x,y]=aUnidades(ev),m=mapaGeo;
        if(x>=m.ox&&x<=m.ox+m.w&&y>=m.oy&&y<=m.oy+m.hh)return;
      }
      if (esVillano()) { if (!ev.target.closest('button,select,.rq-panel,.rq-dlg')) { trazoIni(ev); ev.preventDefault(); } return; }
      if ((fase !== 'jugando' && fase !== 'aldea') || dlg || ev.target.closest('button,select,.rq-panel,.rq-dlg') || joy.id !== null) return;
      const r = cont.getBoundingClientRect();
      joy.id = ev.pointerId; joy.ox = ev.clientX - r.left; joy.oy = ev.clientY - r.top; joy.x = joy.y = 0;
      const ahora = performance.now(); joy.sprint = ahora - joy.ultimoToque < 300; joy.ultimoToque = ahora;
      joyBase.style.left = joyPomo.style.left = joy.ox + 'px'; joyBase.style.top = joyPomo.style.top = joy.oy + 'px';
      joyBase.style.display = joyPomo.style.display = 'block';
      try { cont.setPointerCapture(ev.pointerId); } catch (e) { }
      ev.preventDefault();
    });
    cont.addEventListener('pointermove', ev => {
      if (fase === 'fruta' && fru && ev.pointerId === fru.hoja) { const [x, y] = aUnidades(ev); hojaMueve(x, y); return; }
      if (trazo && ev.pointerId === trazo.id) { trazoSigue(ev); return; }
      if (ev.pointerId !== joy.id) return;
      const r = cont.getBoundingClientRect(); let dx = ev.clientX - r.left - joy.ox, dy = ev.clientY - r.top - joy.oy;
      const d = hypot(dx, dy), max = 42;
      if (d > max) { dx *= max / d; dy *= max / d; }
      joy.x = d < 7 ? 0 : dx / max; joy.y = d < 7 ? 0 : dy / max;
      joyPomo.style.left = (joy.ox + dx) + 'px'; joyPomo.style.top = (joy.oy + dy) + 'px';
    });
    ['pointerup', 'pointercancel'].forEach(n => cont.addEventListener(n, ev => { if (fru && ev.pointerId === fru.hoja) { fru.hoja = null; if (fru.trazo) cerrarTrazo(); } if (trazo && ev.pointerId === trazo.id) trazo = null; if (ev.pointerId === joy.id) soltarJoy(); }));
    cont.addEventListener('contextmenu', ev => ev.preventDefault());

    // teclado
    window.addEventListener('keydown', ev => {
      Banda.reanudar();
      if (ceremonia) { if (ev.code === 'Escape') { ev.preventDefault(); cerrarJade(); } return; }
      if (/INPUT|TEXTAREA|SELECT/.test((ev.target.tagName || ''))) return;
      teclas.add(ev.code);
      const Ct = CONFIG.controles;
      if (esVillano() && ev.code==='KeyC' && !ev.repeat) siguienteCamara();
      if (Ct.pausa.includes(ev.code)) pausar();
      if ((Ct.accion || ['KeyE', 'Enter']).includes(ev.code) && !ev.repeat && ev.target.tagName !== 'BUTTON') accion();
      if ((Ct.lanzar || ['KeyF', 'KeyQ']).includes(ev.code) && !ev.repeat) lanzar();
      if ((Ct.cambiarArma || ['KeyR', 'Tab']).includes(ev.code) && !ev.repeat && fase === 'jugando') { ev.preventDefault(); siguienteArma(); }
      if (Ct.silencio.includes(ev.code)) silencio = !silencio;
      if ((fase === 'jugando' || fase === 'aldea') && (ev.code.startsWith('Arrow') || ev.code === 'Space')) ev.preventDefault();
    });
    window.addEventListener('keyup', ev => teclas.delete(ev.code));
    window.addEventListener('blur', () => { pulsandoGolpe=false;teclas.clear(); if (fase === 'jugando') pausar(); });

    if (window.ResizeObserver) new ResizeObserver(medir).observe(cont);
    window.addEventListener('resize', medir); window.addEventListener('orientationchange', () => setTimeout(medir, 200));
    recargar();
    requestAnimationFrame(cuadro);
  }
  // vuelve a leer config.js y niveles.js (lo usa el editor)
  function recargar() { teselas = {}; if (!jugador) { try { jugador = localStorage.getItem('reliquias-jugador') || ''; } catch (e) { } } dif = CONFIG.dificultades[dif] ? dif : (CONFIG.dificultadInicial || Object.keys(CONFIG.dificultades)[0]); if (mapaIni >= NIVELES.length) mapaIni = 0; cargarImagenes(); fase = 'menu'; cargarNivel(mapaIni); medir(); if (jugador && hayAldea()) irAldea(); else pintarUI(); }

  // comprueba que los mapas están bien hechos
  function validar(lista) {
    const errores = [];
    (lista || NIVELES).forEach((n, i) => {
      const nom = 'Mapa ' + (i + 1) + ' (' + n.nombre + '): ', f = n.mapa, W = f[0].length, Hh = f.length;
      const E = m => errores.push(nom + m);
      let nh = 0, ng = 0, ne = 0; const nt = f.join('').split('T').length - 1; if (nt % 2) E('los portales (T) van por parejas y hay ' + nt);
      f.forEach((fila, y) => {
        if (fila.length !== W) E('la fila ' + (y + 1) + ' tiene ' + fila.length + ' letras y debería tener ' + W);
        [...fila].forEach((ch, x) => {
          if (ch === 'H') nh++; if (ch === 'G') ng++; if (ch >= '1' && ch <= '9') ne++;
          if ((y === 0 || y === Hh - 1 || x === 0 || x === W - 1) && ch !== '#' && ch !== 'A') E('el borde está abierto en fila ' + (y + 1) + ', columna ' + (x + 1));
          if (!'#A.HGSVTM123456789 '.includes(ch)) E('letra desconocida "' + ch + '" en fila ' + (y + 1));
        });
      });
      if (!nh) E('falta la base (H)'); if (!ng) E('no hay gemas (G)'); if (!ne) E('no hay espectros (1-9)');
      if (errores.length) return;
      const pared = (x, y) => { const c = (f[y] || '')[x]; return c === undefined || c === '#' || c === 'A'; };
      const alcanza = (sx, sy, bloque) => { const v = new Set([sx + ',' + sy]), q = [[sx, sy]]; for (let k = 0; k < q.length; k++) for (const [dx, dy] of DIRS) { const x = q[k][0] + dx, y = q[k][1] + dy, id = x + ',' + y; if (v.has(id) || bloque(x, y)) continue; v.add(id); q.push([x, y]); } return v; };
      let hx, hy; f.forEach((fila, y) => { const x = fila.indexOf('H'); if (x >= 0 && hx === undefined) { hx = x; hy = y; } });
      const vh = alcanza(hx, hy, pared);
      f.forEach((fila, y) => [...fila].forEach((ch, x) => {
        if ('GSVTM'.includes(ch) && !vh.has(x + ',' + y)) E('el ladrón no puede llegar a "' + ch + '" de fila ' + (y + 1) + ', columna ' + (x + 1));
        if (ch >= '1' && ch <= '9') { const ve = alcanza(x, y, (a, b) => pared(a, b) || 'SH'.includes(f[b][a])); f.forEach((fl, yy) => [...fl].forEach((c2, xx) => { if (c2 === 'G' && !ve.has(xx + ',' + yy)) E('el espectro ' + ch + ' no puede llegar a la gema de fila ' + (yy + 1) + ', columna ' + (xx + 1)); })); }
      }));
    });
    console.log(errores.length ? errores.join('\n') : 'Mapas correctos ✔');
    return errores;
  }

  window.Reliquias = {
    musica: Banda, get bando() { return bando; }, set bando(v) { bando = v; },
    montar, recargar, validar, _validateMaps: validar,
    probarEntrega: () => abrirJade(true),
    probarRegion: id => { if (MUNDO.zonas[id] || id === 'aldea') irAldea(id); },
    _portales: () => portales.map(p => [p.tx, p.ty]),
    _agua: () => h && [h.enAgua, +h.energia.toFixed(2), floor(h.x / T), floor(h.y / T)],
    _ganarPiso: () => { if (torre) { gemasPiso = 99; torre.obj.hechos = 99; } },
    _torre: () => torre && { piso: ronda, obj: torre.obj, mods: torre.mods, botin: torre.botin, jefe: torre.jefe && torre.jefe.jefe.nombre, espectros: espectros.length, faro: torre.faro.length, faroPos: torre.faro.map(f => [f.tx, f.ty, f.apagado]) },
    _cofres: () => cofres.map(c => [c.tx, c.ty, c.abierto]),
    _gemas: () => gemas.filter(g2 => g2.estado === 'suelo').map(g2 => [g2.tx, g2.ty, g2.valor]),
    _tp: (x, y) => { if (h) { h.x = (x + .5) * T; h.y = (y + .5) * T; } },   // solo para pruebas: coloca al héroe en una casilla
    setPlayer: n => { jugador = String(n || '').slice(0, 14); pintarUI(); }, aldea: irAldea, accion,
    get progreso() { return prog; }, borrarProgreso: () => { prog = progNuevo(); recalcularEquipo(); guardarProg(); }, darPuntos: n => { prog.puntos += n; guardarProg(); },
    start: empezar, menu: irMenu, pause: pausar,
    get state() { return { zone: zonaId, phase: fase, side: bando, captures: capturas, egg: !!prog.huevo, music: Banda.sonando, dialog: dlg && dlg.lineas[dlg.i], near: cerca && (cerca.npc ? cerca.npc.id : 'puerta'), weapon: prog.arma, weaponCd: armaCd, player: jugador, teleporting: !!tp, mode: 'solo', score: puntos, round: ronda, timeLeft: tiempo, map: nivelActual, hero: h && { x: h.x, y: h.y, tx: floor(h.x / T), ty: floor(h.y / T), carga: h.carga[0]?.valor ?? null, gemas: h.carga.length, capacidad: capacidadCarga() }, espectros: espectros.map(e => ({ estado: e.estado, tx: floor(e.x / T), ty: floor(e.y / T) })) }; }
  };
  document.addEventListener('DOMContentLoaded', () => { const el = document.getElementById('juego'); if (el && el.dataset.auto !== 'no') montar(el); });
})();
