/* ============================================================
   PERSONAJES.JS  v2  ·  Reliquias / Score, Run and Chase
   ------------------------------------------------------------
   TODOS los personajes están DIBUJADOS EN CÓDIGO. Ni una imagen:
   cero bytes de assets, nítido a cualquier resolución, y lo
   cambias todo desde este archivo.

   QUÉ CAMBIA RESPECTO A LA v1
     · Trazo de pincel (engorda y adelgaza) en vez de línea plana
     · Sombreado con rayado de tinta
     · Asimetría: nada es simétrico, que es lo que daba aire a icono
     · Sangre lila que gotea de los espectros
     · Cientos de detallitos: remiendos, cuentas, cascabeles,
       cicatrices, etiquetas de precio, telarañas...

   CÓMO SE USA DESDE EL JUEGO
     PERSONAJES.dibujar(ctx, 'ronin', { x, y, alto, t, mirando });
       x, y    = el suelo justo bajo los pies
       alto    = cuánto mide de pies a cabeza, en píxeles
       t       = segundos (para que respire y gotee)
       mirando = 1 mira a la derecha · -1 a la izquierda

   DÓNDE SE CAMBIA QUÉ
     · Colores de un personaje .... FICHAS.<id>.color
     · Nombre y descripción ....... FICHAS.<id>.nombre / .desc
     · La forma de un personaje ... su función de dibujo
     · Tinta, grosor y sangre ..... las tres constantes de aquí abajo
   ============================================================ */

const PERSONAJES = (function () {

  // ---- Estilo común de todo el juego --------------------------
  const TINTA  = '#17131b';     // color del contorno de todo
  const GROSOR = 2.0;           // grosor base del contorno
  const SANGRE = '#a855f7';     // el lila que chorrean los espectros
  const SANGRE_OSC = '#5b1f96';
  const SOMBRA = 'rgba(0,0,0,0.3)';

  const sen = Math.sin, cos = Math.cos, PI = Math.PI;

  // ============================================================
  //  UTILIDADES DE DIBUJO
  //  Una "ruta" es una lista de puntos:
  //    [x,y]                 → línea recta
  //    [cx,cy,x,y]           → curva suave
  //    [c1x,c1y,c2x,c2y,x,y] → curva doble
  // ============================================================
  function ruta(c, pts, cerrar) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.length === 2) c.lineTo(p[0], p[1]);
      else if (p.length === 4) c.quadraticCurveTo(p[0], p[1], p[2], p[3]);
      else c.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
    }
    if (cerrar) c.closePath();
  }

  function pieza(c, pts, relleno, grosor) {
    ruta(c, pts, true);
    if (relleno) { c.fillStyle = relleno; c.fill(); }
    if (grosor !== 0) {
      c.strokeStyle = TINTA; c.lineWidth = grosor || GROSOR;
      c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
    }
  }
  function masa(c, pts, relleno) { ruta(c, pts, true); c.fillStyle = relleno; c.fill(); }
  function linea(c, pts, color, grosor, cerrar) {
    ruta(c, pts, !!cerrar);
    c.strokeStyle = color; c.lineWidth = grosor;
    c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke();
  }
  function circ(c, x, y, r, relleno, grosor) {
    c.beginPath(); c.arc(x, y, r, 0, PI * 2);
    if (relleno) { c.fillStyle = relleno; c.fill(); }
    if (grosor) { c.strokeStyle = TINTA; c.lineWidth = grosor; c.stroke(); }
  }
  function elip(c, x, y, rx, ry, relleno, grosor, giro) {
    c.beginPath(); c.ellipse(x, y, rx, ry, giro || 0, 0, PI * 2);
    if (relleno) { c.fillStyle = relleno; c.fill(); }
    if (grosor) { c.strokeStyle = TINTA; c.lineWidth = grosor; c.stroke(); }
  }
  function sombraSuelo(c, x, y, rx, ry) {
    c.save(); elip(c, x, y, rx, ry, SOMBRA, 0); c.restore();
  }
  function dentro(c, pts, f) { c.save(); ruta(c, pts, true); c.clip(); f(); c.restore(); }

  // ---- reparte puntos a lo largo de una ruta ------------------
  function enTramo(s, u) {
    const v = 1 - u;
    if (s.t === 'l') return [s.a[0] * v + s.b[0] * u, s.a[1] * v + s.b[1] * u];
    if (s.t === 'q') return [s.a[0]*v*v + s.c[0]*2*v*u + s.b[0]*u*u,
                             s.a[1]*v*v + s.c[1]*2*v*u + s.b[1]*u*u];
    return [s.a[0]*v*v*v + s.c1[0]*3*v*v*u + s.c2[0]*3*v*u*u + s.b[0]*u*u*u,
            s.a[1]*v*v*v + s.c1[1]*3*v*v*u + s.c2[1]*3*v*u*u + s.b[1]*u*u*u];
  }
  function muestrear(pts, n) {
    const tramos = []; let prev = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.length === 2) { tramos.push({ t:'l', a:prev, b:[p[0],p[1]] }); prev = [p[0],p[1]]; }
      else if (p.length === 4) { tramos.push({ t:'q', a:prev, c:[p[0],p[1]], b:[p[2],p[3]] }); prev = [p[2],p[3]]; }
      else { tramos.push({ t:'b', a:prev, c1:[p[0],p[1]], c2:[p[2],p[3]], b:[p[4],p[5]] }); prev = [p[4],p[5]]; }
    }
    const por = Math.max(2, Math.ceil(n / tramos.length)), out = [];
    for (const s of tramos) for (let i = 0; i <= por; i++) out.push(enTramo(s, i / por));
    return out;
  }

  // ---- TRAZO DE PINCEL: fino, gordo, fino ---------------------
  // gA = grosor al empezar · gB = al acabar · panza = cuánto engorda en medio
  function pincel(c, pts, color, gA, gB, panza) {
    const m = muestrear(pts, 30);
    c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let i = 1; i < m.length; i++) {
      const u = i / (m.length - 1);
      c.lineWidth = gA * (1 - u) + gB * u + (panza || 0) * sen(PI * u);
      c.beginPath(); c.moveTo(m[i-1][0], m[i-1][1]); c.lineTo(m[i][0], m[i][1]); c.stroke();
    }
  }

  // ---- RAYADO de sombra dentro de una forma -------------------
  // El rayado NO cubre toda la figura: se amontona en el lado de sombra
  // y se desvanece hacia la luz. Si no, todo parece un pijama de rayas.
  //   lado = 1 sombra abajo-derecha · -1 sombra arriba-izquierda
  function rayado(c, forma, color, sep, grosor, ang, alfa, lado) {
    c.save(); ruta(c, forma, true); c.clip();
    c.strokeStyle = color; c.lineWidth = grosor; c.lineCap = 'round';
    c.translate(50, 70); c.rotate(ang || -0.6); c.translate(-50, -70);
    const A = alfa === undefined ? 0.22 : alfa, L = lado === undefined ? 1 : lado;
    for (let y = -90; y < 90; y += sep) {
      let u = (y + 90) / 180; if (L < 0) u = 1 - u;
      const a = A * Math.pow(Math.max(0, (u - 0.42) / 0.58), 1.7);
      if (a <= 0.015) continue;
      c.globalAlpha = a;
      c.beginPath(); c.moveTo(-130, y + 70); c.lineTo(230, y + 70); c.stroke();
    }
    c.restore();
  }

  // ---- MOTEADO: textura de grano, siempre igual (con semilla) --
  function moteado(c, forma, color, n, semilla) {
    c.save(); ruta(c, forma, true); c.clip();
    let s = (semilla || 1) * 7919 % 2147483647;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    c.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x = rnd() * 100, y = rnd() * 145, r = rnd() * 1.3 + 0.3;
      c.globalAlpha = rnd() * 0.35 + 0.08;
      c.beginPath(); c.arc(x, y, r, 0, PI * 2); c.fill();
    }
    c.restore();
  }

  // ---- GOTEO de sangre lila -----------------------------------
  // reguero pegado al cuerpo + una gota que cae y se repite
  function goteo(c, x, y, largo, t, fase, color) {
    const col = color || SANGRE;
    c.save();
    c.lineCap = 'round';
    pincel(c, [[x, y], [x + sen(fase) * 1.2, y + largo * 0.6, x + sen(fase) * 1.8, y + largo]], col, 1.8, 0.8, 0.5);
    circ(c, x + sen(fase) * 1.8, y + largo, 1.3, col, 0);
    // la gota que se desprende
    const ciclo = ((t * 0.55 + fase) % 1);
    const cy = y + largo + ciclo * 26;
    c.globalAlpha = 1 - ciclo * 0.75;
    elip(c, x + sen(fase) * 1.8, cy, 1.1, 1.8 + ciclo * 1.2, col, 0);
    c.restore();
  }

  // ---- CHARCO con brillo --------------------------------------
  function charco(c, x, y, rx, color, t) {
    c.save(); c.globalAlpha = 0.75;
    elip(c, x, y, rx + sen(t * 1.4) * 0.8, rx * 0.3, color, 0);
    c.globalAlpha = 0.5;
    elip(c, x - rx * 0.3, y - 1, rx * 0.25, rx * 0.08, '#ffffff', 0);
    c.restore();
  }

  // ---- COSTURA / remiendo -------------------------------------
  function remiendo(c, x, y, w, h, color) {
    pieza(c, [[x, y], [x + w, y - 1], [x + w + 1, y + h], [x - 1, y + h - 1]], color, 1.3);
    for (let i = 0; i < Math.floor(w / 3); i++) {
      linea(c, [[x + 1 + i * 3, y - 1], [x + 2.4 + i * 3, y + 2]], 'rgba(0,0,0,0.45)', 0.9);
      linea(c, [[x + 1 + i * 3, y + h - 2], [x + 2.4 + i * 3, y + h + 1]], 'rgba(0,0,0,0.45)', 0.9);
    }
  }

  // ---- CORDÓN con cuentas / cascabel --------------------------
  function cuentas(c, pts, n, color, r) {
    linea(c, pts, '#4a3a28', 1.3);
    const m = muestrear(pts, n * 2);
    for (let i = 0; i < n; i++) {
      const p = m[Math.floor(i / (n - 1) * (m.length - 1))];
      circ(c, p[0], p[1], r || 1.6, color, 1);
    }
  }
  function cascabel(c, x, y, color) {
    circ(c, x, y, 2.6, color, 1.3);
    linea(c, [[x - 1.8, y + 0.6], [x + 1.8, y + 0.6]], 'rgba(0,0,0,0.5)', 1);
    circ(c, x - 0.8, y - 1, 0.8, 'rgba(255,255,255,0.6)', 0);
  }

  // ---- TELARAÑA en un rincón ----------------------------------
  function telarana(c, x, y, r, giro) {
    c.save(); c.translate(x, y); c.rotate(giro || 0); c.globalAlpha = 0.28;
    c.strokeStyle = '#e8e0cf'; c.lineWidth = 0.7;
    for (let i = 0; i < 5; i++) {
      c.beginPath(); c.moveTo(0, 0);
      c.lineTo(cos(i * 0.4) * r, sen(i * 0.4) * r); c.stroke();
    }
    for (let k = 1; k <= 3; k++) {
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const rr = r * k / 3.4;
        const px = cos(i * 0.4) * rr, py = sen(i * 0.4) * rr;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.stroke();
    }
    c.restore();
  }

  // ============================================================
  //  FICHAS: nombre, tipo, descripción y colores de cada uno
  //  (esto es lo único que hay que tocar para recolorear)
  // ============================================================
  const FICHAS = {

    // ---------- LOS TRES HÉROES ----------
    ronin: {
      nombre: 'Rōnin del sombrero roto',
      tipo: 'héroe',
      desc: 'Bajo el ala rota no hay cara: solo dos rendijas de luz y un hilo de vaho. Lleva tantos años sin dueño que ya ni recuerda a quién servía. El kimono está más remendado que entero.',
      rasgo: 'Equilibrado. El de siempre.',
      detalles: ['Ala del sombrero partida de un tajo', 'Omamori de tela gastada en la faja', 'Dos remiendos cosidos a mano', 'Sandalias deshilachadas y llenas de polvo'],
      color: {
        ropa: '#f3ecdc', ropaSombra: '#c9bda4', hakama: '#6b665c', hakamaSombra: '#4a463e',
        faja: '#e2574c', cara: '#120e13', ojos: '#fff6d8', detalle: '#8a5a34',
        vaina: '#15171d', piel: '#c9a483', paja: '#d8b979', pajaSombra: '#9b7e45', amuleto: '#d8b24c'
      }
    },
    lluvia: {
      nombre: 'Lluvia sin paraguas',
      tipo: 'héroe',
      desc: 'Una máscara azul lisa, sin ojos ni boca, con una grieta fina que le cruza la frente. Nadie le ha oído hablar. Va empapado siempre, llueva o no, y donde se para deja un charco.',
      rasgo: 'Rápido y silencioso. Dos filos.',
      detalles: ['Gotea sin parar y deja charco', 'Grieta en la máscara', 'Campanilla muda en la faja', 'La ropa, más oscura de cintura para abajo'],
      color: {
        ropa: '#eef0f4', ropaSombra: '#b9c0cc', hakama: '#262c45', hakamaSombra: '#171c30',
        faja: '#3d5a9b', cara: '#33518f', ojos: '#9fc4ff', detalle: '#c9a04a',
        vaina: '#161b2e', piel: '#aab6cc', paja: '#cdd4e0', pajaSombra: '#8e97a8', amuleto: '#9fc4ff'
      }
    },
    ciervo: {
      nombre: 'Ciervo carmesí',
      tipo: 'héroe',
      desc: 'Se puso el cráneo de un ciervo y no se lo ha vuelto a quitar. Las astas le crecieron después, y una ya se la han partido. De las cuencas le sale un vaho rojo cuando se enfada.',
      rasgo: 'Lento, pesado, imparable.',
      detalles: ['Asta derecha partida', 'Cuerdas rojas con papelitos atados a las astas', 'Musgo y grietas en el hueso', 'Vaho rojo saliendo de las cuencas'],
      color: {
        ropa: '#efe7dc', ropaSombra: '#c3b8a8', hakama: '#2a2026', hakamaSombra: '#181216',
        faja: '#c42230', cara: '#e6ddc8', ojos: '#ff4a3d', detalle: '#c9a04a',
        vaina: '#8e1b24', piel: '#b8262f', paja: '#ded3bb', pajaSombra: '#a99e86', amuleto: '#c42230'
      }
    },

    // ---------- LOS ESPECTROS ----------
    monje: {
      nombre: 'Hitotsu, el monje tuerto',
      tipo: 'espectro',
      desc: 'Altísimo y seco como un junco. Un ojo que no parpadea y una sonrisa que le llega a la sien. No corre: se estira hacia ti. Del ojo le cae algo lila que no es una lágrima.',
      rasgo: 'Patrulla despacio. Ve lejísimos.',
      detalles: ['Le chorrea lila del ojo y de la boca', 'Rosario de cuentas al cuello', 'Dedos de un palmo con uñas amarillas', 'La túnica se le deshace en jirones'],
      color: {
        piel: '#6f93b8', pielSombra: '#41628a', tunica: '#1b1620',
        tunicaLuz: '#30293a', ojo: '#fdf6e3', iris: '#7a5a3a',
        diente: '#d8c9a8', boca: '#2a1418', una: '#c9b472', estola: '#6d6250'
      }
    },
    cesta: {
      nombre: 'Mekura, la cesta que mira',
      tipo: 'espectro',
      desc: 'Un párpado de mimbre del tamaño de un barreño, con un ojo húmedo dentro y cuatro patas de ave. Corre a tirones y se para en seco. El mimbre está reventado por varios sitios.',
      rasgo: 'Nerviosa y rapidísima en línea recta.',
      detalles: ['Llora sangre lila por el lagrimal', 'Hebras de mimbre rotas y de punta', 'Cascabeles atados a las patas', 'Telarañas entre las patas traseras'],
      color: {
        mimbre: '#c39a5e', mimbreLuz: '#e0bd80', mimbreOsc: '#7d5a2f',
        ojo: '#f6f1e4', iris: '#8a6a3f', pata: '#e8b9a4', pataSombra: '#bf8d78',
        garra: '#c4514a', una: '#55505c', cascabel: '#d8b24c'
      }
    },
    ogro: {
      nombre: 'Kuroni, el ogro de carbón',
      tipo: 'espectro',
      desc: 'Negro de pies a cabeza, con cuernos trenzados como soga de barco y uno de ellos astillado. Camina pisando fuerte porque no le hace falta esconderse. Babea lila.',
      rasgo: 'Lento. Si te alcanza, no hay segunda.',
      detalles: ['Pupilas rectangulares, de cabra', 'Argolla en la nariz y grilletes rotos', 'Cuerno izquierdo astillado', 'Mechones de pelo en hombros y brazos'],
      color: {
        cuerpo: '#1e1a20', cuerpoLuz: '#3a3340', cuerno: '#c9a86e', cuernoOsc: '#8d7245',
        ojo: '#ffb52e', boca: '#7d1b1f', colmillo: '#efe6d2',
        garra: '#e2d8c0', oreja: '#7a2b26', cola: '#2a7a5c', metal: '#8d94a3'
      }
    },
    cabeza: {
      nombre: 'Akakubi, la boca roja',
      tipo: 'espectro',
      desc: 'Rojo encendido, con una melena que arrastra por el suelo y la boca abierta de par en par. Lleva un cuchillo pequeño en alto y no lo baja nunca. De la hoja le gotea.',
      rasgo: 'Errática. Cambia de idea a mitad del pasillo.',
      detalles: ['Chorrea lila de la boca y de la hoja', 'Cuentas de hueso trenzadas en el pelo', 'Venas marcadas por todo el cuerpo', 'Geta de madera con la correa roja'],
      color: {
        piel: '#c0372e', pielLuz: '#dd6052', pielSombra: '#8a2119', pelo: '#15121a',
        ojo: '#f4ecd8', pupila: '#1a1016', boca: '#3c0d12',
        diente: '#e6dcc4', tela: '#efe7d6', hoja: '#cfd6de', madera: '#8a6535'
      }
    },

    // ---------- EL COMERCIANTE ----------
    kappa: {
      nombre: 'Kaappa, el del platito',
      tipo: 'tendero', seccion: 'aldea',
      desc: 'Lleva la tienda a la espalda: el caparazón es un mueble de cajones con etiquetas de precio colgando. En la cabeza, un platito de agua con una hoja flotando. Si se le derrama, se queda tieso.',
      rasgo: 'Te vende pergaminos y mejoras. No admite reverencias.',
      detalles: ['Cajones con etiquetas de precio escritas a mano', 'Una hoja flotando en el platito', 'Pipa y ábaco colgados del caparazón', 'Delantal remendado y barro en los pies'],
      color: {
        piel: '#5e9a52', pielLuz: '#86c472', pielOsc: '#38632f',
        caparazon: '#7a5a33', caparazonOsc: '#55401f', panza: '#e6d79a', pico: '#e3c25c',
        ojo: '#f6efdc', pupila: '#b6372f', pelo: '#16131a',
        agua: '#8fd6e8', plato: '#d8cdae', tela: '#bf4b3a', moneda: '#e8c15a', etiqueta: '#efe7d6'
      }
    },

    // ---------- LA ALDEA ----------
    hina: {
      nombre: 'Hina, la de las grullas',
      tipo: 'niña', seccion: 'aldea',
      desc: 'Dobla grullas de papel y las deja por los rincones del dojo "para que no esté solo". Va descalza siempre y tiene los dedos manchados de tinta. Es la que dobló la que te llevas.',
      rasgo: 'Misión 3. Te da la grulla de papel.',
      detalles: ['Lleva una grulla recién doblada en las manos', 'Tres más colgando de un hilo en la manga', 'Un papel doblado atado al pelo', 'Dedos manchados de tinta'],
      color: {
        kimono: '#8fbcd4', kimonoSombra: '#6a93a9', faja: '#e8c15a', piel: '#f0cfae',
        pielSombra: '#cfa782', pelo: '#1d1822', ojo: '#ffffff', pupila: '#2f4858',
        papel: '#fbf6e8', tinta: '#3a3550', boca: '#c4635c'
      }
    },
    genzo: {
      nombre: 'Genzo, el de la puerta',
      tipo: 'guardián', seccion: 'aldea',
      desc: 'Lleva treinta años barriendo la entrada del templo y no se ha movido de ahí. Grandote, con capa de paja y un farol que no apaga ni de día. Habla poco y siempre con los ojos medio cerrados.',
      rasgo: 'Te abre el templo. Y te cuenta cosas si insistes.',
      detalles: ['Capa de paja deshilachada', 'Farol de papel encendido a todas horas', 'Escoba gastada por un lado', 'Soga gruesa a la cintura con papelitos'],
      color: {
        ropa: '#4a5b6b', ropaSombra: '#33414e', paja: '#c9a86e', pajaSombra: '#8d7245',
        piel: '#d9ab82', pielSombra: '#b1855f', pelo: '#2b2630', soga: '#e0d6bd',
        farol: '#f2d98a', farolLuz: '#ffe9a8', papel: '#f3ecdc', madera: '#6b4d27'
      }
    },
    rokuro: {
      nombre: 'Rokuro, el del té',
      tipo: 'abuelo', seccion: 'aldea',
      desc: 'Encorvado del todo, con una barba que le llega a la faja y unas gafas diminutas. Siempre lleva la tetera de hierro en la mano, y siempre está tibia. Nunca explica de dónde venía con tanta prisa.',
      rasgo: 'Misión 2. Te da la tetera de hierro.',
      detalles: ['Tetera de hierro echando vapor', 'Gafas redondas minúsculas', 'Bastón de madera retorcida', 'Barba blanca hasta la faja'],
      color: {
        haori: '#6b4a36', haoriSombra: '#4a3123', kimono: '#d8cdae', faja: '#3f5a4a',
        piel: '#dcb18a', pielSombra: '#b4885f', pelo: '#eae4d6',
        metal: '#4a4f58', madera: '#8a6535', vapor: '#ffffff', ojo: '#2f2a35'
      }
    },
    ume: {
      nombre: 'Ume, la del mochi',
      tipo: 'abuela', seccion: 'aldea',
      desc: 'Bajita y redonda, con el pañuelo siempre torcido y harina hasta en las cejas. Machaca mochi desde antes de que existiera el dojo. Te mete uno en el bolsillo aunque le digas que no.',
      rasgo: 'Te da el mochi que te hace correr más.',
      detalles: ['Mazo de mochi apoyado en el hombro', 'Mortero de madera a sus pies', 'Harina en las manos y en la cara', 'Los ojos cerrados de tanto reírse'],
      color: {
        kimono: '#b5556a', kimonoSombra: '#8c3e50', delantal: '#f3ecdc', pañuelo: '#e8dcc0',
        piel: '#e8c4a0', pielSombra: '#c09a74', pelo: '#e4ded0',
        madera: '#9b7444', maderaOsc: '#6b4d27', mejilla: '#e0867f', harina: '#ffffff'
      }
    }
  };

  const LISTA = ['ronin', 'lluvia', 'ciervo', 'monje', 'cesta', 'ogro', 'cabeza', 'kappa', 'hina', 'genzo', 'rokuro', 'ume'];

  // ============================================================
  //  LOS TRES HÉROES
  //  Comparten cuerpo de samurái; cambian cabeza, sombrero, armas
  //  y los detalles propios de cada uno. Así parecen del mismo juego.
  // ============================================================
  function samurai(c, t, col, op) {
    const resp  = sen(t * 1.7) * 0.7;
    const vaiv  = sen(t * 1.05) * 1.6;
    const vaiv2 = sen(t * 1.05 + 0.8) * 2.2;

    sombraSuelo(c, 51, 137, 25, 5);
    if (op.mojado) charco(c, 50, 137, 26, '#5d7fb8', t);

    // ---------- PIERNAS Y HAKAMA ----------
    c.save(); c.translate(0, resp * 0.3);
    // piernas por debajo
    pieza(c, [[37, 100], [47, 100], [46, 132], [36, 132]], '#2b252f', 1.7);
    pieza(c, [[53, 100], [63, 100], [64, 132], [54, 132]], '#2b252f', 1.7);
    linea(c, [[39, 106], [38, 128]], 'rgba(255,255,255,0.09)', 1.4);
    // sandalias de paja
    for (const s of [[31, 49], [51, 69]]) {
      pieza(c, [[s[0], 130], [s[1], 130], [s[1], 137], [s[0], 137]], '#43362b', 1.7);
      for (let i = 0; i < 5; i++)
        linea(c, [[s[0] + 1.5 + i * 3.4, 131], [s[0] + 1.5 + i * 3.4, 136]], 'rgba(255,255,255,0.14)', 1);
      // hebras sueltas
      linea(c, [[s[0] + 1, 136], [s[0] - 1.5, 139]], '#6d5a40', 1);
      linea(c, [[s[1] - 1, 136], [s[1] + 2, 138.5]], '#6d5a40', 1);
    }
    linea(c, [[40, 130], [40, 125]], '#d8c9a8', 1.6);
    linea(c, [[60, 130], [60, 125]], '#d8c9a8', 1.6);

    // falda-pantalón
    const hak = [[31, 70], [69, 70], [74, 104, 79, 133], [60, 135], [50, 108, 40, 135], [21, 133], [26, 104, 31, 70]];
    pieza(c, hak, col.hakama, 0);
    rayado(c, hak, col.hakamaSombra, 3.2, 1.7, -0.55, 0.5);
    dentro(c, hak, () => {              // oscurece el bajo, como polvo
      const g = c.createLinearGradient(0, 100, 0, 136);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,45,30,0.45)');
      c.fillStyle = g; c.fillRect(0, 95, 100, 45);
    });
    pincel(c, [[31, 70], [26, 104, 21, 133]], TINTA, 1.4, 2.6, 0.8);
    pincel(c, [[69, 70], [74, 104, 79, 133]], TINTA, 1.4, 2.6, 0.8);
    linea(c, [[21, 133], [40, 135]], TINTA, 2.2);
    linea(c, [[60, 135], [79, 133]], TINTA, 2.2);
    pincel(c, [[50, 108], [45, 122, 40, 135]], TINTA, 1, 2, 0.6);
    pincel(c, [[50, 108], [55, 122, 60, 135]], TINTA, 1, 2, 0.6);
    // pliegues marcados
    pincel(c, [[40, 74], [36, 130]], 'rgba(0,0,0,0.3)', 0.6, 1.8, 0.7);
    pincel(c, [[60, 74], [64, 130]], 'rgba(0,0,0,0.3)', 0.6, 1.8, 0.7);
    pincel(c, [[50, 82], [50, 106]], 'rgba(0,0,0,0.2)', 0.5, 1.2, 0.5);
    linea(c, [[23, 128], [37, 132]], 'rgba(255,255,255,0.12)', 2);
    c.restore();

    // ---------- TORSO ----------
    c.save(); c.translate(0, resp);
    const torso = [[34, 47], [66, 47], [71, 60, 72, 79], [28, 79], [29, 60, 34, 47]];
    pieza(c, torso, col.ropa, 0);
    rayado(c, torso, col.ropaSombra, 3, 1.5, -0.5, 0.35);
    dentro(c, torso, () => {            // luz por el hombro izquierdo
      const g = c.createLinearGradient(28, 0, 72, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.55, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.16)');
      c.fillStyle = g; c.fillRect(28, 45, 44, 36);
    });
    pincel(c, [[34, 47], [29, 60, 28, 79]], TINTA, 1.4, 2.4, 0.7);
    pincel(c, [[66, 47], [71, 60, 72, 79]], TINTA, 1.4, 2.4, 0.7);
    linea(c, [[34, 47], [66, 47]], TINTA, 2);
    // un remiendo cosido en el costado
    remiendo(c, 62, 62, 9, 8, col.ropaSombra);
    // cuello cruzado
    masa(c, [[43, 47], [57, 47], [50, 66]], 'rgba(0,0,0,0.12)');
    pincel(c, [[43, 47], [50, 66]], TINTA, 2.2, 1, 0.5);
    pincel(c, [[57, 47], [50, 66]], TINTA, 2.2, 1, 0.5);
    linea(c, [[46, 49], [50, 62]], col.detalle, 1.4);
    linea(c, [[54, 49], [51, 58]], col.detalle, 1.1);

    // ---------- MANGAS (una rasgada) ----------
    const mIzq = [[34, 50], [20 + vaiv, 56], [15 + vaiv * 1.5, 88], [32 + vaiv * 0.6, 85], [33, 66, 34, 50]];
    pieza(c, mIzq, col.ropa, 0);
    rayado(c, mIzq, col.ropaSombra, 3, 1.5, -0.5, 0.35);
    pincel(c, [[34, 50], [20 + vaiv, 56], [15 + vaiv * 1.5, 88]], TINTA, 1.6, 2.6, 0.8);
    linea(c, [[15 + vaiv * 1.5, 88], [32 + vaiv * 0.6, 85]], TINTA, 2.2);
    linea(c, [[22 + vaiv, 60], [19 + vaiv * 1.3, 84]], 'rgba(0,0,0,0.18)', 1.4);
    // manga derecha, con el bajo roto en pico
    const mDer = [[66, 50], [80 - vaiv2 * 0.5, 56], [85 - vaiv2, 88], [79, 83], [75, 89], [70, 84], [68 - vaiv2 * 0.4, 88], [67, 66, 66, 50]];
    pieza(c, mDer, col.ropa, 0);
    rayado(c, mDer, col.ropaSombra, 3, 1.5, -0.5, 0.4);
    pincel(c, [[66, 50], [80 - vaiv2 * 0.5, 56], [85 - vaiv2, 88]], TINTA, 1.6, 2.6, 0.8);
    linea(c, [[85 - vaiv2, 88], [79, 83], [75, 89], [70, 84], [68 - vaiv2 * 0.4, 88]], TINTA, 1.8);
    linea(c, [[78 - vaiv2 * 0.5, 60], [81 - vaiv2 * 0.8, 84]], 'rgba(0,0,0,0.18)', 1.4);
    // hilos sueltos del roto
    linea(c, [[77, 86], [76.5, 91]], col.ropaSombra, 0.9);
    linea(c, [[72, 86], [71.5, 90]], col.ropaSombra, 0.9);

    // ---------- MANOS ----------
    for (const m of [[19 + vaiv * 1.4, 1], [81 - vaiv2 * 0.9, -1]]) {
      pieza(c, [[m[0] - 3.4, 84], [m[0] + 3.4, 84], [m[0] + 3.8, 93], [m[0] - 3.8, 93]], col.piel, 1.6);
      linea(c, [[m[0] - 2.6, 87], [m[0] + 2.6, 87]], 'rgba(0,0,0,0.2)', 0.9);
      for (let i = 0; i < 3; i++)
        linea(c, [[m[0] - 2.4 + i * 2.4, 92], [m[0] - 2.8 + i * 2.6, 97]], col.piel, 2.1);
    }

    // ---------- FAJA ----------
    pieza(c, [[28, 72], [72, 72], [72, 83], [28, 83]], col.faja, GROSOR);
    linea(c, [[30, 75.5], [70, 75.5]], 'rgba(255,255,255,0.25)', 1.3);
    linea(c, [[30, 80], [70, 80]], 'rgba(0,0,0,0.22)', 1.2);
    pieza(c, [[44, 71], [56, 71], [57, 85], [43, 85]], col.faja, 1.6);
    linea(c, [[46, 74], [54, 81]], 'rgba(0,0,0,0.28)', 1.3);
    pieza(c, [[45, 83], [43 + vaiv, 98], [47 + vaiv, 110], [52 + vaiv * 0.6, 97], [52, 83]], col.faja, 1.7);
    // amuleto colgando (omamori)
    const ax = 64, ay = 84 + sen(t * 1.3) * 0.8;
    linea(c, [[62, 78], [ax, ay]], '#4a3a28', 1.2);
    pieza(c, [[ax - 3.4, ay], [ax + 3.4, ay], [ax + 3.4, ay + 8], [ax - 3.4, ay + 8]], col.amuleto, 1.4);
    linea(c, [[ax - 2, ay + 3], [ax + 2, ay + 3]], 'rgba(0,0,0,0.4)', 0.9);
    linea(c, [[ax, ay + 4.5], [ax, ay + 6.5]], 'rgba(0,0,0,0.4)', 0.9);
    if (op.campana) cascabel(c, 34, 86 + sen(t * 1.6) * 0.7, col.detalle);

    // ---------- KATANA(S) EN LA FAJA ----------
    for (let k = 0; k < (op.katanas || 1); k++) {
      const ang = -0.30 - k * 0.17, y = 86 + k * 7;
      c.save(); c.translate(50, y); c.rotate(ang); c.translate(-50, -y);
      pieza(c, [[21, y - 2.2], [63, y - 2.2], [66, y, 63, y + 2.2], [21, y + 2.2]], col.vaina, 1.4);
      linea(c, [[24, y - 1], [59, y - 1]], 'rgba(255,255,255,0.22)', 1);
      pieza(c, [[63, y - 4.4], [66.4, y - 4.4], [66.4, y + 4.4], [63, y + 4.4]], col.detalle, 1.3);
      pieza(c, [[66.4, y - 2.6], [81, y - 2.6], [81, y + 2.6], [66.4, y + 2.6]], '#2b2b30', 1.4);
      for (let i = 0; i < 4; i++) {
        linea(c, [[68 + i * 3.4, y - 2.3], [70.4 + i * 3.4, y + 2.3]], 'rgba(255,255,255,0.28)', 0.9);
        linea(c, [[70.4 + i * 3.4, y - 2.3], [68 + i * 3.4, y + 2.3]], 'rgba(255,255,255,0.12)', 0.9);
      }
      // cordón de la vaina (sageo)
      if (k === 0) linea(c, [[30, y + 1.6], [25, y + 10, 32, y + 15]], col.faja, 1.3);
      c.restore();
    }
    c.restore();

    // ---------- CABEZA ----------
    c.save(); c.translate(0, resp * 1.3);
    pieza(c, [[44, 42], [56, 42], [56, 50], [44, 50]], col.cara, 1.5);
    if (op.cara === 'calavera') craneoCiervo(c, t, col);
    else {
      elip(c, 50, 34, 11.5, 13.5, col.cara, GROSOR);
      elip(c, 46, 29, 4, 5.5, 'rgba(255,255,255,0.07)', 0);
      if (op.cara === 'vacia') {
        const brillo = 0.72 + sen(t * 2.4) * 0.22;
        // vaho saliendo de la oscuridad
        c.save(); c.globalAlpha = 0.14;
        for (let i = 0; i < 3; i++)
          elip(c, 50 + sen(t * 0.9 + i * 2) * 3, 42 - ((t * 7 + i * 5) % 15), 2.5, 1.6, '#fff6d8', 0);
        c.restore();
        c.save(); c.globalAlpha = brillo;
        masa(c, [[42, 35], [48, 33.2], [48, 36], [42, 37.2]], col.ojos);
        masa(c, [[58, 35.4], [52, 33.6], [52, 36.2], [58, 37.4]], col.ojos);
        c.shadowColor = col.ojos; c.shadowBlur = 8;
        masa(c, [[42.6, 35], [47.4, 33.9], [47.4, 35.6], [42.6, 36.5]], col.ojos);
        masa(c, [[57.4, 35.4], [52.6, 34.3], [52.6, 36], [57.4, 36.9]], col.ojos);
        c.restore();
      } else {
        // máscara lisa con una grieta
        linea(c, [[50, 22], [50, 46]], 'rgba(255,255,255,0.09)', 1.2);
        linea(c, [[41, 37], [59, 37]], 'rgba(0,0,0,0.22)', 1.1);
        pincel(c, [[44, 21], [46, 28, 43, 34]], 'rgba(0,0,0,0.5)', 0.4, 1.4, 0.5);
        linea(c, [[45, 26], [48, 28]], 'rgba(0,0,0,0.4)', 0.8);
        c.save(); c.globalAlpha = 0.35 + sen(t * 1.3) * 0.15;
        linea(c, [[43, 32], [47, 32]], col.ojos, 1.1);
        linea(c, [[57, 32.4], [53, 32.4]], col.ojos, 1.1);
        c.restore();
      }
    }
    if (op.kasa === 'paja') kasaPaja(c, t, col);
    else if (op.kasa === 'plano') kasaPlano(c, t, col);
    c.restore();

    // ---------- GOTAS (solo el de la lluvia) ----------
    if (op.mojado) {
      for (let i = 0; i < 5; i++) {
        const fx = [22, 38, 55, 71, 84][i], fy = [92, 112, 118, 92, 92][i];
        const ciclo = ((t * 0.8 + i * 0.37) % 1);
        c.save(); c.globalAlpha = 0.7 - ciclo * 0.5;
        elip(c, fx, fy + ciclo * (136 - fy), 1.2, 2.4, '#8fb4e8', 0);
        c.restore();
      }
    }
  }

  // ---- sombrero de paja, con el ala partida de un tajo --------
  function kasaPaja(c, t, col) {
    const giro = sen(t * 0.9) * 0.9;
    c.save(); c.translate(50, 30); c.rotate(-0.045 + giro * 0.012); c.translate(-50, -30);
    const forma = [[7, 31], [20, 9, 50, 7], [78, 9, 93, 31],
                   [88, 34], [84, 29], [79, 35], [74, 30], [70, 34],
                   [50, 41, 12, 34], [7, 31]];
    pieza(c, forma, col.paja, 0);
    // vetas de paja
    dentro(c, forma, () => {
      for (let i = -7; i <= 7; i++) {
        c.save(); c.globalAlpha = 0.38;
        linea(c, [[50, 8], [50 + i * 6.6, 34]], col.pajaSombra, 1.1);
        c.restore();
      }
      const g = c.createLinearGradient(0, 7, 0, 36);
      g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
      c.fillStyle = g; c.fillRect(0, 5, 100, 34);
    });
    moteado(c, forma, '#6b5230', 70, 3);
    pincel(c, [[7, 31], [20, 9, 50, 7]], TINTA, 2.4, 1.4, 0.6);
    pincel(c, [[50, 7], [78, 9, 93, 31]], TINTA, 1.4, 2.4, 0.6);
    linea(c, [[93, 31], [88, 34], [84, 29], [79, 35], [74, 30], [70, 34]], TINTA, 1.8);
    pincel(c, [[70, 34], [50, 41, 12, 34]], TINTA, 1.8, 2.4, 0.8);
    linea(c, [[12, 34], [7, 31]], TINTA, 2);
    linea(c, [[14, 30], [45, 36, 86, 30]], 'rgba(0,0,0,0.3)', 1.4);
    // hebras sueltas del roto
    linea(c, [[84, 29], [87, 25]], col.pajaSombra, 1);
    linea(c, [[79, 35], [80, 39]], col.pajaSombra, 1);
    circ(c, 50, 8.5, 3.2, col.paja, 1.5);
    // cordón bajo la barbilla
    linea(c, [[32, 32], [36, 45]], '#6b5230', 1.3);
    linea(c, [[68, 32], [64, 45]], '#6b5230', 1.3);
    linea(c, [[36, 45], [50, 49, 64, 45]], '#6b5230', 1.2);
    // sombra del ala sobre la cara
    c.save(); c.globalAlpha = 0.35;
    masa(c, [[36, 29], [64, 29], [62, 38], [38, 38]], '#000'); c.restore();
    c.restore();
  }

  // ---- sombrero plano, limpio, empapado ----------------------
  function kasaPlano(c, t, col) {
    const giro = sen(t * 0.8) * 0.8;
    c.save(); c.translate(50, 28); c.rotate(0.03 + giro * 0.01); c.translate(-50, -28);
    const forma = [[4, 30], [22, 13, 50, 12], [78, 13, 96, 30], [50, 38, 4, 30]];
    pieza(c, forma, col.paja, 0);
    dentro(c, forma, () => {
      for (let i = -6; i <= 6; i++) {
        c.save(); c.globalAlpha = 0.3;
        linea(c, [[50, 12], [50 + i * 7.6, 31]], col.pajaSombra, 1); c.restore();
      }
      const g = c.createLinearGradient(0, 12, 0, 36);
      g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
      c.fillStyle = g; c.fillRect(0, 10, 100, 30);
    });
    pincel(c, [[4, 30], [22, 13, 50, 12]], TINTA, 2.4, 1.4, 0.6);
    pincel(c, [[50, 12], [78, 13, 96, 30]], TINTA, 1.4, 2.4, 0.6);
    pincel(c, [[96, 30], [50, 38, 4, 30]], TINTA, 2.2, 2.2, 0.8);
    linea(c, [[10, 29], [50, 34, 90, 29]], 'rgba(0,0,0,0.28)', 1.5);
    circ(c, 50, 13, 2.6, col.pajaSombra, 1.4);
    linea(c, [[36, 31], [40, 44]], 'rgba(0,0,0,0.42)', 1.2);
    linea(c, [[64, 31], [60, 44]], 'rgba(0,0,0,0.42)', 1.2);
    // gotas colgando del ala
    for (const gx of [12, 30, 68, 88]) {
      const f = ((t * 0.9 + gx) % 1);
      c.save(); c.globalAlpha = 0.8 - f * 0.6;
      elip(c, gx, 33 + f * 5, 1, 1.8, '#8fb4e8', 0); c.restore();
    }
    c.save(); c.globalAlpha = 0.32;
    masa(c, [[37, 29], [63, 29], [61, 36], [39, 36]], '#000'); c.restore();
    c.restore();
  }

  // ---- cráneo de ciervo, con un asta partida -----------------
  function craneoCiervo(c, t, col) {
    const pulso = 0.7 + sen(t * 3.1) * 0.3;
    // astas
    for (const s of [-1, 1]) {
      c.save(); c.translate(50, 24); c.scale(s, 1);
      const tronco = [[6, 0], [15, -8, 17, -22]];
      pincel(c, tronco, TINTA, 9, 6, 1);
      pincel(c, tronco, col.cara, 6, 3.4, 0.8);
      const ramas = s < 0
        ? [[[11, -7], [20, -10, 27, -12]], [[14, -13], [24, -18, 31, -21]], [[16, -19], [21, -27, 22, -34]]]
        : [[[11, -7], [20, -10, 26, -13]], [[14, -13], [21, -16, 24, -17]]];   // la derecha, partida
      for (const r of ramas) { pincel(c, r, TINTA, 6, 4, 0.6); pincel(c, r, col.cara, 3.4, 2, 0.5); }
      if (s < 0) { pincel(c, [[17, -22], [18, -29, 15, -35]], TINTA, 5, 3.4, 0.5);
                   pincel(c, [[17, -22], [18, -29, 15, -35]], col.cara, 2.8, 1.6, 0.4); }
      else {       // el muñón astillado
        linea(c, [[24, -17], [27, -18]], '#b5aa92', 2);
        linea(c, [[24, -17], [26, -14]], '#b5aa92', 1.4);
        linea(c, [[17, -22], [19, -25], [17, -27]], col.cara, 3);
      }
      c.save(); c.globalAlpha = 0.3;
      linea(c, [[8, -2], [15, -9, 16, -20]], '#8d8268', 1.6); c.restore();
      // cuerdas rojas con papelitos
      if (s < 0) {
        linea(c, [[13, -11], [19, -9]], col.faja, 1.4);
        masa(c, [[17, -8], [21, -8], [21, -2], [17, -2]], '#f3ecdc');
        linea(c, [[17, -5], [21, -5]], 'rgba(0,0,0,0.3)', 0.7);
      }
      c.restore();
    }
    // vaho rojo de las cuencas
    c.save(); c.globalAlpha = 0.2;
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.6 + i * 0.33) % 1;
      elip(c, 44 + sen(t + i) * 2, 29 - u * 16, 3 - u, 2.4 - u, col.ojos, 0);
      elip(c, 56 + sen(t + i + 1) * 2, 29 - u * 16, 3 - u, 2.4 - u, col.ojos, 0);
    }
    c.restore();
    // cráneo
    const cr = [[39, 22], [45, 15, 50, 15], [55, 15, 61, 22], [63, 32], [58, 44, 54, 50], [46, 50], [42, 44, 37, 32], [39, 22]];
    pieza(c, cr, col.cara, 0);
    rayado(c, cr, '#b5aa92', 2.6, 1.3, -0.5, 0.3);
    dentro(c, cr, () => {
      const g = c.createLinearGradient(37, 0, 63, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0.2)');
      c.fillStyle = g; c.fillRect(35, 14, 30, 38);
      // musgo
      c.globalAlpha = 0.5; c.fillStyle = '#6f8a4a';
      c.beginPath(); c.arc(40, 40, 3.2, 0, PI * 2); c.fill();
      c.beginPath(); c.arc(59, 20, 2.4, 0, PI * 2); c.fill();
    });
    moteado(c, cr, '#9d9078', 50, 11);
    pincel(c, [[39, 22], [45, 15, 50, 15]], TINTA, 2.2, 1.4, 0.5);
    pincel(c, [[50, 15], [55, 15, 61, 22]], TINTA, 1.4, 2.2, 0.5);
    pincel(c, [[61, 22], [63, 32], [58, 44, 54, 50]], TINTA, 2, 2.4, 0.6);
    linea(c, [[54, 50], [46, 50]], TINTA, 2.2);
    pincel(c, [[46, 50], [42, 44, 37, 32], [39, 22]], TINTA, 2.4, 2, 0.6);
    // cuencas
    elip(c, 44, 29, 4.6, 5.2, '#14101a', 1.4);
    elip(c, 56, 29.4, 4.2, 4.8, '#14101a', 1.4);
    c.save(); c.globalAlpha = pulso; c.shadowColor = col.ojos; c.shadowBlur = 9;
    circ(c, 44, 29.5, 1.9, col.ojos, 0);
    circ(c, 56, 29.8, 1.7, col.ojos, 0);
    c.restore();
    linea(c, [[46, 39], [50, 41, 54, 39]], 'rgba(0,0,0,0.35)', 1.3);
    circ(c, 47.5, 44, 1.3, '#14101a', 0);
    circ(c, 52.5, 44.2, 1.2, '#14101a', 0);
    for (let i = 0; i < 5; i++) linea(c, [[45 + i * 2.5, 47], [45 + i * 2.5, 50 - (i % 2) * 0.8]], 'rgba(0,0,0,0.5)', 1);
    // grietas
    pincel(c, [[41, 24], [43, 21, 45, 19]], 'rgba(0,0,0,0.35)', 0.4, 1.2, 0.4);
    pincel(c, [[58, 26], [60, 24, 62, 23]], 'rgba(0,0,0,0.3)', 0.4, 1, 0.3);
  }

  // ============================================================
  //  ESPECTRO 1 · Hitotsu, el monje tuerto
  // ============================================================
  function monje(c, t, col) {
    const flota = sen(t * 1.15) * 3.2;
    const vaiv  = sen(t * 0.8) * 2.4;
    const mira  = sen(t * 0.55) * 2.4;
    const parpadeo = Math.max(0, sen(t * 0.42 - 1.4)) > 0.985 ? 0.08 : 1;

    c.save(); c.globalAlpha = 0.45; sombraSuelo(c, 50, 136, 15, 4); c.restore();
    c.translate(0, flota);

    // jirones que se deshacen por abajo
    c.save(); c.globalAlpha = 0.55;
    for (let i = 0; i < 9; i++) {
      const x = 29 + i * 5, d = sen(t * 1.6 + i) * 2.2;
      masa(c, [[x, 110], [x + 3.4, 110], [x + 2 + d, 130 + (i % 3) * 5], [x + 0.6 + d, 126]], col.tunica);
    }
    c.restore();

    // ---------- BRAZOS LARGUÍSIMOS ----------
    for (const s of [-1, 1]) {
      const b = vaiv * s * 0.5;
      c.save(); c.translate(50, 0); c.scale(s, 1);
      const manga = [[14, 48], [30, 52], [34 + b, 86], [8 + b, 92], [8, 68, 14, 48]];
      pieza(c, manga, col.tunica, 0);
      rayado(c, manga, col.tunicaLuz, 3, 1.4, -0.5, 0.55);
      pincel(c, [[14, 48], [8, 68, 8 + b, 92]], TINTA, 1.6, 2.6, 0.8);
      linea(c, [[8 + b, 92], [34 + b, 86]], TINTA, 2);
      linea(c, [[18, 56], [13 + b, 88]], col.tunicaLuz, 1.8);
      // antebrazo
      const ante = [[14 + b, 88], [26 + b, 88], [30 + b * 1.4, 114], [19 + b * 1.4, 114]];
      pieza(c, ante, col.piel, 1.7);
      rayado(c, ante, col.pielSombra, 2.6, 1.3, -0.5, 0.45);
      // mano
      pieza(c, [[17 + b * 1.4, 111], [32 + b * 1.4, 111], [33 + b * 1.4, 120], [18 + b * 1.4, 120]], col.piel, 1.6);
      linea(c, [[20 + b * 1.4, 115], [30 + b * 1.4, 115]], col.pielSombra, 1);
      for (let i = 0; i < 4; i++) {
        const x = 19 + i * 4 + b * 1.4;
        pincel(c, [[x, 119], [x + 1, 128, x + 1 + b * 0.4, 136]], col.piel, 3, 2, 0.4);
        linea(c, [[x + 1 + b * 0.4, 136], [x + 1.6 + b * 0.4, 140]], col.una, 1.8);
      }
      c.restore();
    }

    // ---------- TÚNICA ----------
    const tun = [[36, 48], [64, 48], [70, 82, 72, 118],
                 [66, 110], [58, 120], [50, 108], [42, 120], [34, 110], [28, 118],
                 [30, 82, 36, 48]];
    pieza(c, tun, col.tunica, 0);
    rayado(c, tun, col.tunicaLuz, 3.4, 1.6, -0.55, 0.5);
    dentro(c, tun, () => {
      const g = c.createLinearGradient(28, 0, 72, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
      c.fillStyle = g; c.fillRect(26, 46, 48, 76);
    });
    moteado(c, tun, '#6a6076', 60, 5);
    pincel(c, [[36, 48], [30, 82, 28, 118]], TINTA, 1.6, 2.6, 0.9);
    pincel(c, [[64, 48], [70, 82, 72, 118]], TINTA, 1.6, 2.6, 0.9);
    linea(c, [[28, 118], [34, 110], [42, 120], [50, 108], [58, 120], [66, 110], [72, 118]], TINTA, 2);
    linea(c, [[42, 56], [37, 106]], col.tunicaLuz, 2);
    linea(c, [[58, 56], [64, 106]], col.tunicaLuz, 2);
    remiendo(c, 55, 78, 10, 9, col.tunicaLuz);
    // estola
    pieza(c, [[44, 50], [56, 50], [58, 78], [42, 78]], col.estola, 1.6);
    for (let i = 0; i < 5; i++) linea(c, [[43, 55 + i * 5], [57, 55 + i * 5]], 'rgba(0,0,0,0.32)', 1);
    // rosario de cuentas
    cuentas(c, [[40, 52], [50, 72, 60, 52]], 11, '#8a6a4a', 1.6);

    // ---------- CUELLO Y CABEZA ----------
    pieza(c, [[45, 38], [55, 38], [56, 52], [44, 52]], col.piel, 1.7);
    linea(c, [[47, 42], [47, 51]], col.pielSombra, 1.3);
    const cab = [[37, 16], [38, 1, 50, 1], [62, 1, 63, 16], [64, 30], [58, 46, 50, 46], [42, 46, 36, 30], [37, 16]];
    pieza(c, cab, col.piel, 0);
    dentro(c, cab, () => {
      const g = c.createLinearGradient(36, 0, 64, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.2)'); g.addColorStop(0.6, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(20,10,40,0.45)');
      c.fillStyle = g; c.fillRect(35, 0, 30, 48);
      // venas
      c.globalAlpha = 0.3; c.strokeStyle = '#2d4e7a'; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(40, 7); c.quadraticCurveTo(44, 11, 42, 17); c.stroke();
      c.beginPath(); c.moveTo(60, 9); c.quadraticCurveTo(56, 14, 59, 20); c.stroke();
    });
    moteado(c, cab, '#3c5c84', 40, 7);
    pincel(c, [[37, 16], [38, 1, 50, 1]], TINTA, 2.2, 1.4, 0.5);
    pincel(c, [[50, 1], [62, 1, 63, 16], [64, 30]], TINTA, 1.4, 2.4, 0.6);
    pincel(c, [[64, 30], [58, 46, 50, 46]], TINTA, 2.4, 2, 0.5);
    pincel(c, [[50, 46], [42, 46, 36, 30], [37, 16]], TINTA, 2, 2.2, 0.6);
    linea(c, [[41, 5], [50, 2, 59, 5]], 'rgba(255,255,255,0.2)', 1.6);

    // ---------- EL OJO ----------
    c.save(); c.translate(50, 19); c.scale(1, parpadeo); c.translate(-50, -19);
    elip(c, 50, 19, 10.5, 9, col.ojo, 0);
    dentro(c, [[39.5, 19], [39.5, 10, 50, 10], [60.5, 10, 60.5, 19], [60.5, 28, 50, 28], [39.5, 28, 39.5, 19]], () => {
      const g = c.createRadialGradient(46.5, 15, 1, 50, 19, 11);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(120,100,80,0.35)');
      c.fillStyle = g; c.fillRect(38, 9, 24, 20);
    });
    elip(c, 50, 19, 10.5, 9, null, 2.4);
    circ(c, 50 + mira, 19, 5.3, col.iris, 1.4);
    for (let a = 0; a < PI * 2; a += 0.26) {
      c.save(); c.globalAlpha = 0.45;
      linea(c, [[50 + mira + cos(a) * 2.2, 19 + sen(a) * 2.2], [50 + mira + cos(a) * 5.1, 19 + sen(a) * 5.1]], '#4a3418', 0.9);
      c.restore();
    }
    circ(c, 50 + mira, 19, 2.4, '#0d0a10', 0);
    circ(c, 47.5 + mira, 16.5, 1.8, 'rgba(255,255,255,0.95)', 0);
    circ(c, 52.6 + mira, 21.4, 0.9, 'rgba(255,255,255,0.5)', 0);
    c.restore();
    c.save(); c.globalAlpha = 0.35;
    linea(c, [[40.5, 17], [43.5, 18]], '#b4433a', 1);
    linea(c, [[59.5, 21], [56.5, 21]], '#b4433a', 1);
    linea(c, [[42.5, 24], [45.5, 23]], '#b4433a', 0.9); c.restore();
    pincel(c, [[37.5, 12], [50, 6, 62.5, 12]], TINTA, 1.6, 2.6, 1.2);

    // ---------- LA SONRISA ----------
    masa(c, [[33, 31], [50, 47, 67, 31], [50, 36]], col.boca);
    for (let i = 0; i < 11; i++) {
      const x = 34.4 + i * 3;
      const y = 32.4 + sen((i / 10) * PI) * 6.2 - (i % 2) * 0.9;
      masa(c, [[x, 32], [x + 2.3, 32], [x + 1.8, y], [x + 0.4, y]], col.diente);
    }
    pincel(c, [[33, 31], [50, 47, 67, 31]], TINTA, 2.2, 2.6, 0.9);
    pincel(c, [[33, 31], [30.5, 25]], TINTA, 2.4, 0.8, 0.4);
    pincel(c, [[67, 31], [70, 24]], TINTA, 2.4, 0.8, 0.4);

    // ---------- SANGRE LILA ----------
    goteo(c, 40.5, 25, 10, t, 0.1);   // por el lagrimal
    goteo(c, 31, 32, 11, t, 0.6);     // por la comisura izquierda
    goteo(c, 69, 31, 15, t, 1.3);     // por la comisura derecha
    c.save(); c.globalAlpha = 0.45;
    masa(c, [[47, 44], [55, 44], [53, 56], [49, 56]], SANGRE_OSC); c.restore();
  }

  // ============================================================
  //  ESPECTRO 2 · Mekura, la cesta que mira
  // ============================================================
  function cesta(c, t, col) {
    const tiron = sen(t * 7.5) * 1.4;
    const bote  = Math.abs(sen(t * 7.5)) * 2.6;
    const darte = sen(t * 2.9) * 3.2;

    sombraSuelo(c, 50, 136, 22, 4.5);
    telarana(c, 34, 124, 13, 0.4);
    telarana(c, 68, 126, 10, 2.4);
    c.translate(0, -bote);

    // ---------- PATAS TRASERAS ----------
    for (const s of [-1, 1]) {
      const f = sen(t * 7.5 + (s > 0 ? 0 : PI)) * 5;
      c.save(); c.translate(50, 0); c.scale(s, 1);
      pieza(c, [[8, 86], [16, 86], [22 + f * 0.4, 112], [14 + f * 0.4, 114]], col.pata, 1.7);
      pieza(c, [[14 + f * 0.4, 110], [22 + f * 0.4, 110], [20 + f, 130], [13 + f, 130]], col.pata, 1.7);
      rayado(c, [[13 + f, 130], [14 + f * 0.4, 110], [22 + f * 0.4, 110], [20 + f, 130]], col.pataSombra, 2.4, 1.2, -0.5, 0.4);
      for (let i = 0; i < 6; i++) linea(c, [[14 + f * 0.6, 114 + i * 2.6], [21 + f * 0.6, 114 + i * 2.6]], col.pataSombra, 0.8);
      cascabel(c, 17 + f * 0.5, 108, col.cascabel);
      garraAve(c, 16 + f, 130, 1, col);
      c.restore();
    }

    // ---------- EL PÁRPADO DE MIMBRE ----------
    c.save(); c.translate(50, 62); c.rotate(0.03 + tiron * 0.016); c.translate(-50, -62);
    const cu = [[23, 62], [23, 24, 50, 24], [77, 24, 77, 62], [77, 100, 50, 100], [23, 100, 23, 62]];
    elip(c, 50, 62, 27, 38, col.mimbre, 0);
    dentro(c, cu, () => {
      for (let y = 26; y < 100; y += 4.2) {
        linea(c, [[22, y], [50, y + 2.6, 78, y]], col.mimbreOsc, 1.6);
        linea(c, [[22, y + 1.9], [50, y + 4.5, 78, y + 1.9]], col.mimbreLuz, 1.1);
      }
      const g = c.createLinearGradient(23, 0, 77, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.55, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.3)');
      c.fillStyle = g; c.fillRect(22, 22, 56, 80);
    });
    moteado(c, cu, '#5e441f', 80, 13);
    elip(c, 50, 62, 27, 38, null, 3.4);
    // soga del borde
    for (let a = 0; a < PI * 2; a += 0.2) {
      const x = 50 + cos(a) * 25.6, y = 62 + sen(a) * 36.6;
      linea(c, [[x - 1.5, y - 1.5], [x + 1.5, y + 1.5]], col.mimbreOsc, 1.3);
    }
    // hebras reventadas que sobresalen
    for (const h of [[25, 46, -6, -4], [74, 76, 7, 3], [40, 98, -3, 7], [70, 36, 6, -5]]) {
      pincel(c, [[h[0], h[1]], [h[0] + h[2] * 0.7, h[1] + h[3] * 0.4, h[0] + h[2], h[1] + h[3]]], col.mimbreLuz, 1.6, 0.6, 0.3);
    }

    // ---------- EL OJO ----------
    elip(c, 50, 62, 15.5, 14, '#c2ab84', 0);
    circ(c, 50, 62, 13.5, col.ojo, 0);
    dentro(c, [[36.5, 62], [36.5, 48, 50, 48], [63.5, 48, 63.5, 62], [63.5, 76, 50, 76], [36.5, 76, 36.5, 62]], () => {
      const g = c.createRadialGradient(45, 56, 1, 50, 62, 15);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(150,120,80,0.4)');
      c.fillStyle = g; c.fillRect(35, 47, 30, 30);
    });
    circ(c, 50, 62, 13.5, null, 2.4);
    circ(c, 50 + darte, 62 + darte * 0.3, 7.2, col.iris, 1.6);
    for (let a = 0; a < PI * 2; a += 0.28) {
      const x = 50 + darte, y = 62 + darte * 0.3;
      c.save(); c.globalAlpha = 0.45;
      linea(c, [[x + cos(a) * 3, y + sen(a) * 3], [x + cos(a) * 6.8, y + sen(a) * 6.8]], '#4f3a1e', 1);
      c.restore();
    }
    circ(c, 50 + darte, 62 + darte * 0.3, 3.4, '#120d10', 0);
    circ(c, 46.3 + darte, 57.8 + darte * 0.3, 2.5, 'rgba(255,255,255,0.95)', 0);
    circ(c, 54.2 + darte, 66.2, 1.2, 'rgba(255,255,255,0.55)', 0);
    c.save(); c.globalAlpha = 0.4;
    linea(c, [[38, 58], [43, 60]], '#b4433a', 1.1);
    linea(c, [[62, 67], [56, 65]], '#b4433a', 1.1);
    linea(c, [[41, 70], [45, 67]], '#b4433a', 1);
    linea(c, [[59, 54], [55, 56]], '#b4433a', 0.9); c.restore();
    // llora lila por el lagrimal
    goteo(c, 40, 70, 13, t, 0.3);

    // antenitas y cordones
    pieza(c, [[46, 20], [54, 20], [54, 25], [46, 25]], '#6b4a26', 1.5);
    pincel(c, [[47, 20], [44, 16, 42.5, 12]], TINTA, 2, 1, 0.3);
    pincel(c, [[53, 20], [56, 16, 57.5, 12]], TINTA, 2, 1, 0.3);
    circ(c, 42.5, 11.5, 1.6, '#6b4a26', 1.2);
    circ(c, 57.5, 11.5, 1.4, '#6b4a26', 1.2);
    pincel(c, [[47, 24], [31, 34, 30, 58]], TINTA, 2.6, 1.4, 0.4);
    pincel(c, [[53, 24], [69, 34, 70, 56]], TINTA, 2.6, 1.4, 0.4);
    c.restore();

    // ---------- PATAS DELANTERAS ----------
    for (const s of [-1, 1]) {
      const f = sen(t * 7.5 + (s > 0 ? PI : 0)) * 6;
      c.save(); c.translate(50, 0); c.scale(s, 1);
      pieza(c, [[24, 48], [32, 44], [44 + f * 0.3, 28], [38 + f * 0.3, 22]], col.pata, 1.8);
      pieza(c, [[38 + f * 0.3, 26], [45 + f * 0.3, 22], [52 + f, 38], [45 + f, 42]], col.pata, 1.8);
      for (let i = 0; i < 4; i++)
        linea(c, [[39 + f * 0.6 + i * 2.4, 27 + i * 2.6], [45 + f * 0.6 + i * 2.4, 24 + i * 2.6]], col.pataSombra, 0.8);
      garraAve(c, 49 + f, 40, -1, col);
      c.restore();
    }
  }

  // garra de ave con verrugas y uñas
  function garraAve(c, x, y, dir, col) {
    c.save(); c.translate(x, y); c.scale(1, dir);
    for (let i = 0; i < 3; i++) {
      const a = -0.75 + i * 0.75;
      const px = sen(a) * 9, py = cos(a) * 7;
      pincel(c, [[0, 0], [px, py]], col.garra, 4.2, 2.6, 0.5);
      pincel(c, [[px, py], [px * 1.3, py * 1.22]], col.una, 2.6, 0.8, 0.3);
    }
    circ(c, 0, 0, 3.5, col.garra, 1.4);
    for (let i = 0; i < 6; i++) circ(c, -2.6 + i * 1.2, -1.2 + (i % 2) * 2.2, 0.8, 'rgba(0,0,0,0.22)', 0);
    c.restore();
  }

  // ============================================================
  //  ESPECTRO 3 · Kuroni, el ogro de carbón
  // ============================================================
  function ogro(c, t, col) {
    const resp = sen(t * 1.25) * 2;
    const cola = sen(t * 1.5);
    const brillo = 0.75 + sen(t * 2.6) * 0.25;

    sombraSuelo(c, 50, 136, 33, 6);

    // cola
    pincel(c, [[26, 118], [4 + cola * 5, 126, 10 + cola * 7, 138]], col.cuerpo, 7, 4, 1);
    pincel(c, [[26, 118], [4 + cola * 5, 126, 10 + cola * 7, 138]], col.cola, 3, 1.6, 0.6);
    pincel(c, [[74, 124], [92 - cola * 5, 118, 88 - cola * 6, 102]], col.cuerpo, 6.5, 3.5, 1);
    pincel(c, [[88 - cola * 6, 104], [86 - cola * 6, 96]], col.cuerno, 3.4, 1.6, 0.4);

    // cuartos traseros
    const ancas = [[22, 92], [78, 92], [84, 118, 76, 130], [24, 130], [16, 118, 22, 92]];
    pieza(c, ancas, col.cuerpo, GROSOR);
    rayado(c, ancas, col.cuerpoLuz, 4, 1.6, -0.5, 0.3);
    linea(c, [[30, 100], [34, 124]], col.cuerpoLuz, 2.2);
    linea(c, [[70, 100], [66, 124]], col.cuerpoLuz, 2.2);

    // ---------- TORSO ----------
    c.save(); c.translate(0, resp);
    const tor = [[16, 56], [34, 44], [66, 44], [84, 56], [88, 86, 80, 108], [20, 108], [12, 86, 16, 56]];
    pieza(c, tor, col.cuerpo, 0);
    rayado(c, tor, col.cuerpoLuz, 4.4, 1.8, -0.5, 0.28);
    dentro(c, tor, () => {
      const g = c.createLinearGradient(12, 0, 88, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0.07)');
      c.fillStyle = g; c.fillRect(10, 42, 80, 70);
    });
    pincel(c, [[16, 56], [34, 44]], TINTA, 2.4, 1.6, 0.6);
    pincel(c, [[66, 44], [84, 56], [88, 86, 80, 108]], TINTA, 1.6, 2.6, 0.8);
    pincel(c, [[20, 108], [12, 86, 16, 56]], TINTA, 2.4, 2, 0.7);
    linea(c, [[32, 60], [28, 90]], col.cuerpoLuz, 2.8);
    linea(c, [[68, 60], [72, 90]], col.cuerpoLuz, 2.8);
    linea(c, [[42, 72], [50, 78, 58, 72]], col.cuerpoLuz, 2);
    linea(c, [[44, 86], [50, 90, 56, 86]], col.cuerpoLuz, 1.8);
    // cicatrices
    pincel(c, [[36, 66], [48, 74]], '#5e5260', 0.5, 1.6, 0.6);
    for (let i = 0; i < 4; i++) linea(c, [[38 + i * 3, 66 + i * 2.2], [40 + i * 3, 70 + i * 2.2]], '#5e5260', 0.9);
    // mechones de pelo en los hombros
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
      const x = 50 + s * (18 + i * 3.4), y = 48 + i * 1.6;
      pincel(c, [[x, y], [x + s * 3, y - 7, x + s * 1.5, y - 12]], col.cuerpoLuz, 2.4, 0.6, 0.3);
    }
    c.restore();

    // ---------- BRAZOS ----------
    for (const s of [-1, 1]) {
      c.save(); c.translate(50, 0); c.scale(s, 1);
      const br = [[22, 56], [38, 58], [40, 100], [20, 104], [14, 80, 22, 56]];
      pieza(c, br, col.cuerpo, GROSOR);
      rayado(c, br, col.cuerpoLuz, 4, 1.6, -0.5, 0.26);
      linea(c, [[26, 66], [24, 94]], col.cuerpoLuz, 2.2);
      for (let i = 0; i < 4; i++) pincel(c, [[18, 62 + i * 5], [13, 58 + i * 5, 11, 53 + i * 5]], col.cuerpoLuz, 2, 0.5, 0.3);
      // grillete roto
      pieza(c, [[16, 94], [38, 94], [38, 101], [16, 101]], col.metal, 1.5);
      linea(c, [[18, 97.5], [36, 97.5]], 'rgba(255,255,255,0.3)', 1);
      for (let i = 0; i < 3; i++) circ(c, 13 - i * 3.6, 104 + i * 3.2, 1.7, col.metal, 1);
      // mano
      pieza(c, [[16, 100], [40, 100], [40, 118], [14, 118]], col.cuerpo, 1.9);
      for (let i = 0; i < 4; i++) {
        const x = 18 + i * 7;
        pieza(c, [[x, 114], [x + 5, 114], [x + 4.5, 126], [x + 2.5, 131], [x + 0.5, 126]], col.garra, 1.6);
        linea(c, [[x + 2.5, 118], [x + 2.5, 126]], 'rgba(0,0,0,0.28)', 1);
      }
      c.restore();
    }

    // ---------- CABEZA ----------
    c.save(); c.translate(0, resp * 1.2);
    for (const s of [-1, 1]) {
      c.save(); c.translate(50, 0); c.scale(s, 1);
      pieza(c, [[17, 38], [33, 16], [25, 36]], col.cuerpo, 1.8);
      masa(c, [[19, 35], [29, 21], [24, 33]], col.oreja);
      c.restore();
    }
    // cuernos trenzados (el izquierdo, astillado)
    for (const s of [-1, 1]) {
      c.save(); c.translate(50, 0); c.scale(s, 1);
      const roto = s < 0;
      const p1 = [[11, 22], [21, 10, 19, -2]];
      const p2 = roto ? [[19, -2], [17, -8, 21, -11]] : [[19, -2], [16, -14, 27, -19]];
      pincel(c, p1, TINTA, 12, 11, 0); pincel(c, p1, col.cuerno, 9, 8, 0);
      pincel(c, p2, TINTA, 11, roto ? 9 : 7, 0); pincel(c, p2, col.cuerno, 8, roto ? 7 : 4.5, 0);
      for (let i = 0; i <= 10; i++) {
        const u = i / 10, v = 1 - u;
        const x = 11*v*v + 21*2*v*u + 19*u*u, y = 22*v*v + 10*2*v*u + (-2)*u*u;
        c.save(); c.translate(x, y); c.rotate(-0.6);
        linea(c, [[-4.4, -2.2], [4.4, 2.2]], 'rgba(0,0,0,0.55)', 2.2); c.restore();
      }
      if (roto) {   // astillas
        linea(c, [[20, -11], [23, -14]], col.cuernoOsc, 2);
        linea(c, [[19, -11], [18, -15]], col.cuernoOsc, 1.6);
        linea(c, [[22, -10], [25, -11]], col.cuernoOsc, 1.4);
      }
      c.restore();
    }
    const cr = [[30, 30], [34, 16, 50, 16], [66, 16, 70, 30], [72, 42], [62, 56, 50, 56], [38, 56, 28, 42], [30, 30]];
    pieza(c, cr, col.cuerpo, 0);
    rayado(c, cr, col.cuerpoLuz, 3.4, 1.4, -0.5, 0.22);
    pincel(c, [[30, 30], [34, 16, 50, 16]], TINTA, 2.2, 1.6, 0.5);
    pincel(c, [[50, 16], [66, 16, 70, 30], [72, 42]], TINTA, 1.6, 2.4, 0.6);
    pincel(c, [[72, 42], [62, 56, 50, 56]], TINTA, 2.4, 2, 0.5);
    pincel(c, [[50, 56], [38, 56, 28, 42], [30, 30]], TINTA, 2, 2.2, 0.6);
    pincel(c, [[31, 36], [33, 22, 46, 17]], col.cuerpoLuz, 1.4, 3.4, 0.8);
    linea(c, [[69, 36], [67, 22, 54, 17]], 'rgba(255,255,255,0.1)', 2.2);
    c.save(); c.globalAlpha = 0.5; linea(c, [[36, 54], [50, 58, 64, 54]], '#000', 3); c.restore();
    masa(c, [[30, 26], [70, 26], [70, 32], [30, 32]], 'rgba(0,0,0,0.32)');
    // ojos con pupila de cabra
    c.save(); c.globalAlpha = brillo; c.shadowColor = col.ojo; c.shadowBlur = 14;
    masa(c, [[33, 34], [46, 29], [46, 36], [35, 39]], col.ojo);
    masa(c, [[67, 34], [54, 29.4], [54, 36.4], [65, 39]], col.ojo);
    c.restore();
    masa(c, [[38.6, 31], [42, 31], [42, 38], [38.6, 38]], '#120d10');
    masa(c, [[61.4, 31.4], [58, 31.4], [58, 38.4], [61.4, 38.4]], '#120d10');
    pincel(c, [[31, 28], [47, 26]], TINTA, 2, 3.4, 0.8);
    pincel(c, [[69, 28], [53, 26]], TINTA, 2, 3.4, 0.8);
    // hocico
    pieza(c, [[36, 44], [50, 41, 64, 44], [61, 56, 50, 60], [39, 56, 36, 44]], col.boca, 0);
    dentro(c, [[36, 44], [50, 41, 64, 44], [61, 56, 50, 60], [39, 56, 36, 44]], () => {
      const g = c.createLinearGradient(0, 41, 0, 60);
      g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(216,85,79,0.5)');
      c.fillStyle = g; c.fillRect(34, 40, 32, 22);
    });
    masa(c, [[38, 45], [44, 45], [42, 54]], col.colmillo);
    masa(c, [[62, 45], [56, 45], [58, 54]], col.colmillo);
    masa(c, [[45, 59], [49, 59], [47, 51]], col.colmillo);
    masa(c, [[55, 59], [51, 59], [53, 51]], col.colmillo);
    pincel(c, [[36, 44], [50, 41, 64, 44]], TINTA, 2.2, 2.4, 0.6);
    pincel(c, [[64, 44], [61, 56, 50, 60]], TINTA, 2.2, 2, 0.4);
    pincel(c, [[50, 60], [39, 56, 36, 44]], TINTA, 2, 2.2, 0.4);
    // argolla en la nariz
    c.save(); c.strokeStyle = col.metal; c.lineWidth = 2;
    c.beginPath(); c.arc(50, 44, 5.5, 0.25, PI - 0.25); c.stroke(); c.restore();
    // babea lila
    goteo(c, 44, 56, 11, t, 0.2);
    goteo(c, 57, 55, 8, t, 1.1);
    c.restore();
  }

  // ============================================================
  //  ESPECTRO 4 · Akakubi, la boca roja
  // ============================================================
  function cabezaRoja(c, t, col) {
    const tic  = sen(t * 11) * 0.9 + sen(t * 3.3) * 1.6;
    const pelo = sen(t * 1.1) * 3;
    const grito = 0.82 + Math.abs(sen(t * 2.2)) * 0.3;

    sombraSuelo(c, 50, 136, 27, 5);
    c.translate(tic * 0.35, 0);

    // melena por detrás
    const mel = [[26, 30], [10 + pelo, 70], [14 + pelo, 120], [26 + pelo * 0.6, 134],
                 [50, 126], [74 - pelo * 0.6, 134], [86 - pelo, 120], [90 - pelo, 70], [74, 30]];
    masa(c, mel, col.pelo);
    for (let i = 0; i < 14; i++) {
      const x = 17 + i * 5;
      c.save(); c.globalAlpha = 0.55;
      pincel(c, [[x, 38], [x - 3 + pelo * 0.5, 88, x + 1 + pelo, 132]], '#312a3c', 1.6, 0.5, 0.5);
      c.restore();
    }
    // cuentas de hueso trenzadas
    cuentas(c, [[22 + pelo * 0.4, 70], [19 + pelo, 92, 23 + pelo, 110]], 5, '#d8cdae', 1.6);

    // geta altas
    for (const s of [-1, 1]) {
      c.save(); c.translate(50, 0); c.scale(s, 1);
      pieza(c, [[6, 122], [24, 122], [24, 127], [6, 127]], col.madera, 1.7);
      linea(c, [[8, 124.4], [22, 124.4]], 'rgba(0,0,0,0.25)', 1);
      pieza(c, [[9, 127], [13, 127], [13, 137], [9, 137]], '#6b4d27', 1.5);
      pieza(c, [[18, 127], [22, 127], [22, 137], [18, 137]], '#6b4d27', 1.5);
      linea(c, [[10, 121], [15, 117]], col.piel, 2);  // correa
      c.restore();
    }
    pieza(c, [[30, 112], [44, 112], [44, 123], [30, 123]], col.piel, 1.7);
    pieza(c, [[56, 112], [70, 112], [70, 123], [56, 123]], col.piel, 1.7);

    // piernas
    for (const p of [[32, 46], [54, 68]]) {
      const pi = [[p[0], 88], [p[1], 88], [p[1] + 1, 116], [p[0] - 1, 116]];
      pieza(c, pi, col.piel, GROSOR);
      rayado(c, pi, col.pielSombra, 3, 1.4, -0.5, 0.35);
      linea(c, [[p[0] + 4, 94], [p[0] + 3, 112]], col.pielLuz, 1.8);
    }

    // paño blanco
    const pan = [[28, 80], [72, 80], [74, 100], [60, 96], [50, 102], [40, 96], [26, 100]];
    pieza(c, pan, col.tela, GROSOR);
    rayado(c, pan, '#c6bda8', 3, 1.3, -0.5, 0.35);
    linea(c, [[34, 84], [33, 98]], 'rgba(0,0,0,0.2)', 1.4);
    linea(c, [[66, 84], [67, 98]], 'rgba(0,0,0,0.2)', 1.4);

    // torso nervudo
    const tor = [[32, 44], [68, 44], [74, 64, 72, 84], [28, 84], [26, 64, 32, 44]];
    pieza(c, tor, col.piel, 0);
    rayado(c, tor, col.pielSombra, 3.4, 1.5, -0.5, 0.4);
    dentro(c, tor, () => {
      const g = c.createLinearGradient(26, 0, 74, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
      c.fillStyle = g; c.fillRect(24, 42, 52, 44);
      // venas
      c.globalAlpha = 0.3; c.strokeStyle = '#6e1410'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(36, 50); c.quadraticCurveTo(42, 58, 38, 68); c.stroke();
      c.beginPath(); c.moveTo(64, 52); c.quadraticCurveTo(58, 60, 63, 70); c.stroke();
    });
    pincel(c, [[32, 44], [26, 64, 28, 84]], TINTA, 1.6, 2.4, 0.7);
    pincel(c, [[68, 44], [74, 64, 72, 84]], TINTA, 1.6, 2.4, 0.7);
    for (let i = 0; i < 4; i++) linea(c, [[40, 58 + i * 6], [60, 58 + i * 6]], 'rgba(0,0,0,0.18)', 1.2);
    linea(c, [[40, 54], [38, 78]], col.pielLuz, 2);

    // brazo izquierdo colgando
    pieza(c, [[32, 48], [20, 54], [14, 86], [26, 88], [30, 66, 32, 48]], col.piel, GROSOR);
    pieza(c, [[14, 84], [27, 84], [26, 96], [13, 96]], col.piel, 1.7);
    for (let i = 0; i < 4; i++) {
      pincel(c, [[15 + i * 3.6, 95], [14 + i * 3.8, 106]], col.piel, 2.8, 1.8, 0.3);
      linea(c, [[14 + i * 3.8, 106], [13.6 + i * 3.9, 110]], '#2b2228', 1.6);
    }

    // brazo derecho con el cuchillo
    c.save(); c.translate(70, 48); c.rotate(tic * 0.03); c.translate(-70, -48);
    pieza(c, [[68, 46], [80, 42], [86, 18], [74, 14], [68, 30, 68, 46]], col.piel, GROSOR);
    pieza(c, [[72, 16], [84, 12], [86, 2], [74, 4]], col.piel, 1.7);
    c.save(); c.translate(80, 6); c.rotate(-0.35);
    pieza(c, [[-2, 0], [3, 0], [3, 8], [-2, 8]], '#4a3a24', 1.4);
    pieza(c, [[-3.5, -1], [4.5, -1], [4.5, 1], [-3.5, 1]], col.hoja, 1.2);
    pieza(c, [[-1.5, -22], [1.5, -22], [2.5, -1], [-2.5, -1]], col.hoja, 1.4);
    linea(c, [[0, -21], [0, -3]], 'rgba(255,255,255,0.7)', 1);
    c.restore();
    c.restore();
    // gotea de la hoja
    goteo(c, 78, 20, 9, t, 1.7);

    // ---------- CABEZA ----------
    c.save(); c.translate(tic * 0.5, 0);
    masa(c, [[28, 32], [30, 10, 50, 8], [70, 10, 72, 32], [64, 24], [56, 30], [50, 22], [42, 30], [36, 24]], col.pelo);
    const cab = [[32, 26], [36, 10, 50, 10], [64, 10, 68, 26], [69, 40], [60, 52, 50, 52], [40, 52, 31, 40], [32, 26]];
    pieza(c, cab, col.piel, 0);
    dentro(c, cab, () => {
      const g = c.createLinearGradient(31, 0, 69, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
      c.fillStyle = g; c.fillRect(30, 8, 40, 46);
    });
    moteado(c, cab, '#7d1c15', 40, 17);
    pincel(c, [[32, 26], [36, 10, 50, 10]], TINTA, 2.2, 1.6, 0.5);
    pincel(c, [[50, 10], [64, 10, 68, 26], [69, 40]], TINTA, 1.6, 2.4, 0.6);
    pincel(c, [[69, 40], [60, 52, 50, 52]], TINTA, 2.4, 2, 0.5);
    pincel(c, [[50, 52], [40, 52, 31, 40], [32, 26]], TINTA, 2, 2.2, 0.5);
    masa(c, [[30, 24], [24, 46], [28, 62], [36, 40]], col.pelo);
    masa(c, [[70, 24], [76, 46], [72, 62], [64, 40]], col.pelo);
    c.save(); c.globalAlpha = grito;
    circ(c, 41, 28, 5.6, col.ojo, 2);
    circ(c, 59, 28.4, 5.2, col.ojo, 2);
    c.restore();
    circ(c, 41 + tic * 0.12, 29, 2.4, col.pupila, 0);
    circ(c, 59 + tic * 0.12, 29.4, 2.2, col.pupila, 0);
    circ(c, 39.4, 26.4, 1.3, 'rgba(255,255,255,0.85)', 0);
    circ(c, 57.5, 26.8, 1.2, 'rgba(255,255,255,0.85)', 0);
    c.save(); c.globalAlpha = 0.4;
    linea(c, [[37, 30], [39, 32]], '#8a2119', 0.9);
    linea(c, [[63, 31], [61, 33]], '#8a2119', 0.9); c.restore();
    pincel(c, [[34, 20], [46, 23]], TINTA, 1.6, 3, 0.8);
    pincel(c, [[66, 19], [54, 23]], TINTA, 1.6, 3, 0.8);
    // boca de par en par
    const h = 14 * grito;
    elip(c, 50, 42, 9, h, col.boca, 0);
    dentro(c, [[41, 42], [41, 42 - h, 50, 42 - h], [59, 42 - h, 59, 42], [59, 42 + h, 50, 42 + h], [41, 42 + h, 41, 42]], () => {
      const g = c.createRadialGradient(50, 42, 1, 50, 42, h);
      g.addColorStop(0, '#15060a'); g.addColorStop(1, '#4e1218');
      c.fillStyle = g; c.fillRect(40, 42 - h, 20, h * 2);
    });
    elip(c, 50, 42, 9, h, null, 2.4);
    for (let i = 0; i < 6; i++) {
      const x = 43 + i * 2.8, d = (i % 2) * 0.8;
      masa(c, [[x, 42 - h + 1], [x + 2.2, 42 - h + 1], [x + 1.6, 42 - h + 5 - d], [x + 0.6, 42 - h + 5 - d]], col.diente);
      masa(c, [[x, 42 + h - 1], [x + 2.2, 42 + h - 1], [x + 1.6, 42 + h - 5 + d], [x + 0.6, 42 + h - 5 + d]], col.diente);
    }
    c.save(); c.globalAlpha = 0.7;
    masa(c, [[46, 42 + h - 7], [54, 42 + h - 7], [52, 42 + h - 1], [48, 42 + h - 1]], '#d8554f');
    c.restore();
    // chorrea de la boca
    goteo(c, 46, 42 + h - 2, 16, t, 0.4);
    goteo(c, 54, 42 + h - 3, 10, t, 1.4);
    c.restore();
  }

  // ============================================================
  //  EL TENDERO · Kaappa, el del platito
  //  Lleva la tienda a cuestas: el caparazón es un mueble.
  // ============================================================
  function kappa(c, t, col) {
    const resp = sen(t * 1.5) * 1.1;
    const onda = sen(t * 2.2);
    const parpadeo = Math.max(0, sen(t * 0.5 - 1.3)) > 0.97 ? 0.1 : 1;

    sombraSuelo(c, 50, 136, 26, 5);

    // ---------- EL CAPARAZÓN-MUEBLE ----------
    const cap = [[12, 84], [12, 50, 50, 50], [88, 50, 88, 84], [88, 118, 50, 118], [12, 118, 12, 84]];
    elip(c, 50, 84, 38, 33, col.caparazon, 0);
    dentro(c, cap, () => {
      // vetas de madera
      for (let i = -3; i <= 3; i++) {
        linea(c, [[50 + i * 12, 50], [50 + i * 12, 118]], col.caparazonOsc, 1.7);
        linea(c, [[12, 84 + i * 11], [88, 84 + i * 11]], col.caparazonOsc, 1.7);
      }
      const g = c.createLinearGradient(12, 0, 88, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.55, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.32)');
      c.fillStyle = g; c.fillRect(10, 48, 80, 72);
      // cajoncitos con tirador, a los dos lados
      for (const s of [-1, 1]) for (let j = 0; j < 3; j++) {
        const x = 50 + s * 29 - 5.5, y = 62 + j * 14;
        pieza(c, [[x, y], [x + 11, y], [x + 11, y + 11], [x, y + 11]], '#95703c', 1.3);
        circ(c, x + 5.5, y + 5.5, 1.5, col.moneda, 0);
        // etiqueta de precio colgando
        const bal = sen(t * 1.6 + j + s) * 0.6;
        linea(c, [[x + 5.5, y + 7], [x + 5.5 + bal, y + 12]], '#6b5230', 0.8);
        masa(c, [[x + 3 + bal, y + 12], [x + 8 + bal, y + 12], [x + 8 + bal, y + 16], [x + 3 + bal, y + 16]], col.etiqueta);
        linea(c, [[x + 4 + bal, y + 14], [x + 7 + bal, y + 14]], 'rgba(0,0,0,0.5)', 0.7);
      }
    });
    moteado(c, cap, '#4a3418', 70, 23);
    elip(c, 50, 84, 38, 33, null, GROSOR);
    // ábaco y pipa colgados del borde
    c.save(); c.translate(84, 96); c.rotate(0.3 + sen(t * 1.2) * 0.03);
    pieza(c, [[0, 0], [12, 0], [12, 9], [0, 9]], '#6b5230', 1.2);
    for (let i = 0; i < 3; i++) { linea(c, [[1, 2.4 + i * 2.6], [11, 2.4 + i * 2.6]], '#3f2f1c', 0.7);
      for (let k = 0; k < 3; k++) circ(c, 2.5 + k * 3.4, 2.4 + i * 2.6, 0.9, col.moneda, 0); }
    c.restore();
    c.save(); c.translate(14, 98); c.rotate(-0.4);
    linea(c, [[0, 0], [9, 0]], '#4a3a24', 1.8); circ(c, 10.5, 0.5, 2, '#2b2228', 1.1); c.restore();

    // ---------- PIERNAS Y PIES ----------
    c.save(); c.translate(0, resp * 0.4);
    pieza(c, [[34, 108], [46, 108], [45, 128], [33, 128]], col.piel, GROSOR);
    pieza(c, [[54, 108], [66, 108], [67, 128], [55, 128]], col.piel, GROSOR);
    for (const x of [39, 61]) {
      pieza(c, [[x - 11, 126], [x + 9, 126], [x + 11, 136], [x - 13, 136]], col.pielOsc, 1.8);
      for (let i = 0; i < 3; i++) linea(c, [[x - 8 + i * 7, 128], [x - 9 + i * 8, 136]], 'rgba(0,0,0,0.3)', 1.2);
      // barro
      c.save(); c.globalAlpha = 0.4;
      masa(c, [[x - 12, 133], [x + 10, 133], [x + 11, 136], [x - 13, 136]], '#6b5230'); c.restore();
    }
    c.restore();

    // ---------- CUERPO ----------
    c.save(); c.translate(0, resp);
    const cue = [[30, 54], [70, 54], [76, 78, 74, 110], [26, 110], [24, 78, 30, 54]];
    pieza(c, cue, col.piel, 0);
    rayado(c, cue, col.pielOsc, 3.4, 1.5, -0.5, 0.3);
    dentro(c, cue, () => {
      const g = c.createLinearGradient(24, 0, 76, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0.26)');
      c.fillStyle = g; c.fillRect(22, 52, 56, 60);
    });
    moteado(c, cue, '#2f5528', 50, 29);
    pincel(c, [[30, 54], [24, 78, 26, 110]], TINTA, 1.6, 2.4, 0.7);
    pincel(c, [[70, 54], [76, 78, 74, 110]], TINTA, 1.6, 2.4, 0.7);
    // panza de escudos
    const pan = [[36, 66], [64, 66], [66, 90, 62, 104], [38, 104], [34, 90, 36, 66]];
    pieza(c, pan, col.panza, 1.8);
    for (let i = 1; i < 3; i++) linea(c, [[36, 66 + i * 12.5], [64, 66 + i * 12.5]], 'rgba(0,0,0,0.24)', 1.4);
    linea(c, [[50, 66], [50, 104]], 'rgba(0,0,0,0.24)', 1.4);
    rayado(c, pan, '#c3b57c', 3, 1.2, 0.6, 0.3);

    // mandil remendado
    const man = [[36, 88], [64, 88], [66, 106], [34, 106]];
    pieza(c, man, col.tela, 1.8);
    linea(c, [[36, 92], [64, 92]], 'rgba(255,255,255,0.3)', 1.4);
    remiendo(c, 38, 96, 8, 7, '#a33e2f');
    circ(c, 54, 98, 4.4, col.moneda, 1.5);
    circ(c, 54, 98, 1.5, col.tela, 0);
    // sarta de monedas al cuello
    linea(c, [[40, 56], [50, 66, 60, 56]], '#8a6535', 1.6);
    for (let i = 0; i < 5; i++) {
      const u = i / 4, x = 40 + 20 * u, y = 56 + (1 - Math.abs(u - 0.5) * 2) * 9;
      circ(c, x, y, 2.7, col.moneda, 1.2);
      circ(c, x, y, 0.9, '#8a6535', 0);
    }
    // brazos y manos palmeadas
    for (const s of [-1, 1]) {
      const b = sen(t * 1.5 + (s > 0 ? 0 : 1.2)) * 1.5;
      c.save(); c.translate(50, 0); c.scale(s, 1);
      pieza(c, [[20, 58], [30, 58], [32, 86], [22 + b, 88], [16 + b, 72]], col.piel, GROSOR);
      linea(c, [[24, 64], [21 + b, 84]], col.pielLuz, 1.8);
      pieza(c, [[16 + b, 84], [30, 84], [32, 96], [14 + b, 96]], col.piel, 1.8);
      for (let i = 0; i < 3; i++) {
        pincel(c, [[18 + b + i * 6, 95], [16 + b + i * 7, 104]], col.piel, 3.2, 2.2, 0.4);
        // membrana entre dedos
        if (i < 2) { c.save(); c.globalAlpha = 0.55;
          masa(c, [[18 + b + i * 6, 97], [24 + b + i * 6, 97], [22 + b + i * 7, 102]], col.pielOsc); c.restore(); }
      }
      c.restore();
    }
    c.restore();

    // ---------- CABEZA ----------
    c.save(); c.translate(0, resp * 1.3);
    const cab = [[32, 36], [34, 18, 50, 18], [66, 18, 68, 36], [66, 48], [56, 56, 50, 56], [44, 56, 34, 48], [32, 36]];
    pieza(c, cab, col.piel, 0);
    dentro(c, cab, () => {
      const g = c.createLinearGradient(32, 0, 68, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0.26)');
      c.fillStyle = g; c.fillRect(30, 16, 40, 42);
    });
    moteado(c, cab, '#2f5528', 35, 31);
    pincel(c, [[32, 36], [34, 18, 50, 18]], TINTA, 2.2, 1.6, 0.5);
    pincel(c, [[50, 18], [66, 18, 68, 36], [66, 48]], TINTA, 1.6, 2.4, 0.6);
    pincel(c, [[66, 48], [56, 56, 50, 56]], TINTA, 2.4, 2, 0.5);
    pincel(c, [[50, 56], [44, 56, 34, 48], [32, 36]], TINTA, 2, 2.2, 0.5);
    // corona de pelo de monje
    masa(c, [[30, 30], [32, 16, 50, 14], [68, 16, 70, 30], [66, 28], [62, 22], [50, 19], [38, 22], [34, 28]], col.pelo);
    for (let i = 0; i < 11; i++)
      pincel(c, [[31 + i * 3.8, 24], [30 + i * 3.9, 32 + (i % 3) * 3]], col.pelo, 2.2, 0.8, 0.3);
    // el platito con agua y una hoja
    elip(c, 50, 16, 13, 5.2, col.plato, 2);
    c.save(); ruta(c, [[37, 16], [50, 10, 63, 16], [50, 21, 37, 16]], true); c.clip();
    masa(c, [[37, 14 + onda * 0.8], [50, 18 + onda, 63, 14 - onda * 0.8], [63, 22], [37, 22]], col.agua);
    c.globalAlpha = 0.5;
    linea(c, [[40, 16 + onda * 0.5], [50, 19 + onda, 60, 16 - onda * 0.5]], '#ffffff', 1);
    c.restore();
    elip(c, 50, 16, 13, 5.2, null, 2);
    // hoja flotando
    c.save(); c.translate(45 + onda * 1.5, 15.5); c.rotate(onda * 0.25);
    masa(c, [[-3, 0], [0, -2, 3, 0], [0, 2, -3, 0]], '#6f9a4a');
    linea(c, [[-3, 0], [3, 0]], '#4e7030', 0.6); c.restore();
    c.save(); c.globalAlpha = 0.55;
    linea(c, [[42, 14.2 + onda * 0.5], [47, 13.4 + onda * 0.5]], '#ffffff', 1.4); c.restore();
    // ojos
    c.save(); c.translate(50, 34); c.scale(1, parpadeo); c.translate(-50, -34);
    circ(c, 42, 34, 5.8, col.ojo, 0);
    circ(c, 58, 34.3, 5.4, col.ojo, 0);
    dentro(c, [[36, 34], [36, 28, 42, 28], [48, 28, 48, 34], [48, 40, 42, 40], [36, 40, 36, 34]], () => {
      const g = c.createRadialGradient(40, 31, 0.5, 42, 34, 6);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(190,175,140,0.6)');
      c.fillStyle = g; c.fillRect(35, 27, 14, 14);
    });
    circ(c, 42, 34, 5.8, null, 2);
    circ(c, 58, 34.3, 5.4, null, 2);
    circ(c, 42.6, 34.6, 2.7, col.pupila, 0);
    circ(c, 58.6, 34.9, 2.5, col.pupila, 0);
    circ(c, 40.6, 32, 1.5, 'rgba(255,255,255,0.95)', 0);
    circ(c, 56.8, 32.4, 1.3, 'rgba(255,255,255,0.95)', 0);
    c.restore();
    // pico
    pieza(c, [[44, 40], [56, 40], [52, 48], [48, 48]], col.pico, 1.8);
    linea(c, [[46, 43.5], [54, 43.5]], 'rgba(0,0,0,0.32)', 1.2);
    linea(c, [[47, 41], [53, 41]], 'rgba(255,255,255,0.4)', 1);
    // la sonrisa de más dientes de la cuenta
    pincel(c, [[38, 48], [50, 54, 62, 48]], TINTA, 1.6, 1.6, 0.8);
    for (let i = 0; i < 11; i++) {
      const u = i / 10, x = 39 + 22 * u;
      const y = 48 + sen(u * PI) * 5.2;
      linea(c, [[x, y - 2.8], [x, y]], '#f3ecdc', 1.4);
    }
    c.restore();
  }


  // ============================================================
  //  LA ALDEA · los cuatro vecinos
  //  Cada uno es el dueño de un objeto que ya existe en config.js:
  //  Hina dobló la grulla, Rokuro dejó la tetera tibia, Ume hace
  //  el mochi del turbo, y Genzo te abre el templo.
  // ============================================================

  // ---- HINA, la de las grullas (es una niña: baja y cabezona) --
  function hina(c, t, col) {
    const resp = sen(t * 1.9) * 0.8;
    const bal  = sen(t * 1.2) * 1.4;

    sombraSuelo(c, 50, 137, 18, 4);

    // pies descalzos
    pieza(c, [[39, 130], [48, 130], [48, 137], [38, 137]], col.piel, 1.6);
    pieza(c, [[52, 130], [61, 130], [62, 137], [52, 137]], col.piel, 1.6);
    for (let i = 0; i < 3; i++) {
      circ(c, 40 + i * 2.6, 131.5, 0.7, col.pielSombra, 0);
      circ(c, 53.5 + i * 2.6, 131.5, 0.7, col.pielSombra, 0);
    }
    // piernas cortas
    pieza(c, [[40, 112], [47, 112], [47, 131], [39, 131]], col.piel, 1.6);
    pieza(c, [[53, 112], [60, 112], [61, 131], [53, 131]], col.piel, 1.6);

    c.save(); c.translate(0, resp);
    // kimono acampanado
    const kim = [[36, 74], [64, 74], [70, 96, 73, 118], [27, 118], [30, 96, 36, 74]];
    pieza(c, kim, col.kimono, 0);
    rayado(c, kim, col.kimonoSombra, 3.2, 1.4, -0.5, 0.3);
    dentro(c, kim, () => {
      const g = c.createLinearGradient(27, 0, 73, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0.2)');
      c.fillStyle = g; c.fillRect(26, 72, 48, 48);
      // estampado de puntitos
      c.globalAlpha = 0.5; c.fillStyle = '#f3ecdc';
      for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) {
        c.beginPath(); c.arc(31 + x * 8 + (y % 2) * 4, 80 + y * 8, 1.1, 0, PI * 2); c.fill();
      }
    });
    pincel(c, [[36, 74], [30, 96, 27, 118]], TINTA, 1.5, 2.4, 0.6);
    pincel(c, [[64, 74], [70, 96, 73, 118]], TINTA, 1.5, 2.4, 0.6);
    linea(c, [[27, 118], [73, 118]], TINTA, 2);
    // cuello cruzado
    masa(c, [[44, 74], [56, 74], [50, 88]], 'rgba(0,0,0,0.12)');
    pincel(c, [[44, 74], [50, 88]], TINTA, 1.8, 0.9, 0.4);
    pincel(c, [[56, 74], [50, 88]], TINTA, 1.8, 0.9, 0.4);
    // faja
    pieza(c, [[30, 92], [70, 92], [70, 101], [30, 101]], col.faja, 1.8);
    linea(c, [[32, 95], [68, 95]], 'rgba(255,255,255,0.3)', 1.2);
    pieza(c, [[45, 91], [55, 91], [55, 103], [45, 103]], col.faja, 1.5);
    // mangas cortas
    pieza(c, [[36, 76], [26 + bal, 80], [24 + bal, 98], [34, 96]], col.kimono, 1.7);
    pieza(c, [[64, 76], [74 - bal, 80], [76 - bal, 98], [66, 96]], col.kimono, 1.7);
    // hilo con grullas colgando de la manga
    linea(c, [[27 + bal, 97], [25 + bal, 108]], '#b9ad92', 1);
    for (let i = 0; i < 3; i++) grulla(c, 25 + bal + sen(t * 1.6 + i) * 1.2, 110 + i * 8, 4.2, col, -0.2 + i * 0.3);
    // manos
    circ(c, 33, 100, 4, col.piel, 1.6);
    circ(c, 67, 100, 4, col.piel, 1.6);
    c.save(); c.globalAlpha = 0.45;   // tinta en los dedos
    circ(c, 32, 102.5, 1.5, col.tinta, 0); circ(c, 35, 101, 1, col.tinta, 0); c.restore();
    // la grulla que te da, en las manos
    grulla(c, 50, 99 + sen(t * 1.5) * 0.6, 9, col, sen(t * 0.9) * 0.08);
    c.restore();

    // ---------- CABEZA (grande, de cría) ----------
    c.save(); c.translate(0, resp * 1.4);
    const cab = [[36, 56], [36, 36, 50, 36], [64, 36, 64, 56], [63, 68], [50, 76], [37, 68], [36, 56]];
    pieza(c, cab, col.piel, 0);
    dentro(c, cab, () => {
      const g = c.createLinearGradient(36, 0, 64, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
      c.fillStyle = g; c.fillRect(34, 34, 32, 44);
    });
    pincel(c, [[36, 56], [36, 36, 50, 36]], TINTA, 2.2, 1.5, 0.5);
    pincel(c, [[50, 36], [64, 36, 64, 56], [63, 68]], TINTA, 1.5, 2.2, 0.5);
    pincel(c, [[63, 68], [50, 76], [37, 68]], TINTA, 2.2, 2.2, 0.5);
    // pelo: casquete con flequillo y dos mechones
    masa(c, [[34, 56], [33, 33, 50, 32], [67, 33, 66, 56],
             [63, 48], [58, 43], [52, 49], [46, 42], [40, 48], [36, 44]], col.pelo);
    masa(c, [[34, 50], [31, 66], [35, 72], [38, 58]], col.pelo);
    masa(c, [[66, 50], [69, 66], [65, 72], [62, 58]], col.pelo);
    c.save(); c.globalAlpha = 0.3;
    linea(c, [[40, 38], [52, 35, 62, 40]], '#5a5270', 1.6); c.restore();
    // papel doblado atado al pelo
    c.save(); c.translate(64, 42); c.rotate(0.4 + bal * 0.03);
    masa(c, [[0, 0], [7, -3], [6, 4], [-1, 5]], col.papel);
    linea(c, [[0, 0], [6, 4]], 'rgba(0,0,0,0.25)', 0.8);
    linea(c, [[7, -3], [-1, 5]], 'rgba(0,0,0,0.18)', 0.7); c.restore();
    // cara
    circ(c, 44, 56, 3.4, col.ojo, 1.5);
    circ(c, 57, 56, 3.4, col.ojo, 1.5);
    circ(c, 44.5, 56.6, 1.9, col.pupila, 0);
    circ(c, 57.5, 56.6, 1.9, col.pupila, 0);
    circ(c, 43.3, 54.8, 1, '#ffffff', 0);
    circ(c, 56.3, 54.8, 1, '#ffffff', 0);
    linea(c, [[40.5, 50.5], [46.5, 51.5]], TINTA, 1.4);
    linea(c, [[60.5, 50.5], [54.5, 51.5]], TINTA, 1.4);
    c.save(); c.globalAlpha = 0.4;
    elip(c, 40, 61, 3, 1.8, col.boca, 0); elip(c, 61, 61, 3, 1.8, col.boca, 0); c.restore();
    linea(c, [[47, 65], [50, 67, 53, 65]], col.boca, 1.6);
    c.restore();
  }

  // una grulla de papel, que se usa en varios sitios
  function grulla(c, x, y, s, col, giro) {
    c.save(); c.translate(x, y); c.rotate(giro || 0); c.scale(s / 10, s / 10);
    masa(c, [[-10, 0], [-2, -6], [10, -2], [2, 3]], col.papel);        // ala izquierda
    masa(c, [[-8, 2], [2, 3], [9, 8], [-3, 7]], '#e4dcc6');            // ala derecha
    masa(c, [[-2, -6], [2, 3], [-3, 7], [-6, -1]], col.papel);         // cuerpo
    pieza(c, [[-2, -6], [-9, -9], [-6, -4]], col.papel, 0.8);          // cuello y pico
    pieza(c, [[2, 3], [10, 5], [5, 6]], col.papel, 0.8);               // cola
    linea(c, [[-2, -6], [-3, 7]], 'rgba(0,0,0,0.25)', 0.8);
    linea(c, [[-10, 0], [2, 3]], 'rgba(0,0,0,0.18)', 0.7);
    linea(c, [[-10, 0], [-2, -6], [10, -2]], TINTA, 0.9);
    c.restore();
  }

  // ---- GENZO, el de la puerta del templo (grande y ancho) -----
  function genzo(c, t, col) {
    const resp = sen(t * 1.3) * 0.9;
    const luz  = 0.8 + sen(t * 2.1) * 0.2;
    const bal  = sen(t * 1.1) * 1.2;

    sombraSuelo(c, 50, 137, 30, 5.5);

    // escoba, apoyada detrás
    c.save(); c.translate(76, 90); c.rotate(0.14 + bal * 0.012); c.translate(-76, -90);
    linea(c, [[76, 44], [78, 120]], col.madera, 3.2);
    masa(c, [[72, 118], [84, 118], [88, 136], [68, 136]], col.paja);
    for (let i = 0; i < 9; i++) linea(c, [[73 + i * 1.4, 120], [70 + i * 2.2, 135]], col.pajaSombra, 1);
    linea(c, [[72, 121], [84, 121]], col.madera, 2); c.restore();

    // pies y piernas
    pieza(c, [[26, 129], [45, 129], [45, 137], [25, 137]], '#43362b', 1.8);
    pieza(c, [[55, 129], [74, 129], [75, 137], [55, 137]], '#43362b', 1.8);
    for (let i = 0; i < 5; i++) {
      linea(c, [[27.5 + i * 3.4, 130], [27.5 + i * 3.4, 136]], 'rgba(255,255,255,0.15)', 1);
      linea(c, [[56.5 + i * 3.4, 130], [56.5 + i * 3.4, 136]], 'rgba(255,255,255,0.15)', 1);
    }

    c.save(); c.translate(0, resp * 0.4);
    const hak = [[28, 80], [72, 80], [78, 106, 80, 130], [58, 132], [50, 112, 42, 132], [20, 130], [22, 106, 28, 80]];
    pieza(c, hak, col.ropa, 0);
    rayado(c, hak, col.ropaSombra, 3.6, 1.7, -0.55, 0.35);
    pincel(c, [[28, 80], [22, 106, 20, 130]], TINTA, 1.5, 2.6, 0.8);
    pincel(c, [[72, 80], [78, 106, 80, 130]], TINTA, 1.5, 2.6, 0.8);
    linea(c, [[20, 130], [42, 132]], TINTA, 2.2);
    linea(c, [[58, 132], [80, 130]], TINTA, 2.2);
    pincel(c, [[50, 112], [46, 122, 42, 132]], TINTA, 1, 2, 0.5);
    pincel(c, [[50, 112], [54, 122, 58, 132]], TINTA, 1, 2, 0.5);
    linea(c, [[38, 84], [34, 128]], 'rgba(0,0,0,0.26)', 1.5);
    linea(c, [[62, 84], [66, 128]], 'rgba(0,0,0,0.26)', 1.5);
    c.restore();

    // torso ancho
    c.save(); c.translate(0, resp);
    const tor = [[26, 46], [74, 46], [78, 62, 77, 86], [23, 86], [22, 62, 26, 46]];
    pieza(c, tor, col.ropa, 0);
    rayado(c, tor, col.ropaSombra, 3.4, 1.5, -0.5, 0.3);
    pincel(c, [[26, 46], [22, 62, 23, 86]], TINTA, 1.5, 2.4, 0.7);
    pincel(c, [[74, 46], [78, 62, 77, 86]], TINTA, 1.5, 2.4, 0.7);

    // soga gruesa a la cintura, con papelitos
    pieza(c, [[22, 76], [78, 76], [78, 85], [22, 85]], col.soga, 1.8);
    for (let i = 0; i < 12; i++) {
      c.save(); c.translate(25 + i * 4.6, 80.5); c.rotate(-0.55);
      linea(c, [[-4, -2], [4, 2]], 'rgba(0,0,0,0.28)', 1.6); c.restore();
    }
    for (let i = 0; i < 4; i++) {
      const px = 30 + i * 13, b = sen(t * 1.5 + i) * 0.8;
      linea(c, [[px, 85], [px + b, 88]], '#b9ad92', 0.9);
      masa(c, [[px - 2.6 + b, 88], [px + 2.6 + b, 88], [px + 2.6 + b, 94], [px - 1 + b, 94], [px - 1 + b, 97], [px - 2.6 + b, 97]], col.papel);
    }

    // capa de paja: el bajo va en picos irregulares, si no parece pana
    const capa = [[16, 54], [34, 42], [66, 42], [84, 54], [86, 70]];
    for (let i = 0; i <= 14; i++) {
      const x = 86 - i * 5.1;
      capa.push([x, i % 2 ? 88 - (i % 3) * 3 : 74 + (i % 4)]);
    }
    capa.push([14, 70]);
    pieza(c, capa, col.paja, 0);
    dentro(c, capa, () => {
      // hebras sueltas, cada una con su inclinación: eso es lo que la hace paja
      for (let i = 0; i < 30; i++) {
        const x = 14 + i * 2.5, d = ((i * 37) % 11) / 11;
        linea(c, [[x, 40], [x - 2 - d * 3, 92]], col.pajaSombra, 0.9 + d);
      }
      const g = c.createLinearGradient(14, 0, 86, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');
      c.fillStyle = g; c.fillRect(12, 40, 76, 54);
    });
    moteado(c, capa, '#6b5230', 70, 41);
    pincel(c, [[16, 54], [34, 42], [66, 42], [84, 54]], TINTA, 2.4, 2.4, 0.8);
    // puntas de paja asomando por debajo
    for (let i = 0; i < 16; i++) {
      const x = 16 + i * 4.6, l = 4 + ((i * 29) % 7);
      linea(c, [[x, 80], [x - 2, 82 + l]], col.paja, 1.5);
      linea(c, [[x, 80], [x - 2, 82 + l]], col.pajaSombra, 0.7);
    }

    // brazos
    for (const s of [-1, 1]) {
      c.save(); c.translate(50, 0); c.scale(s, 1);
      pieza(c, [[22, 56], [32, 56], [34, 88], [22, 90], [18, 72]], col.ropa, GROSOR);
      linea(c, [[25, 62], [24, 84]], 'rgba(255,255,255,0.1)', 1.6);
      pieza(c, [[21, 86], [33, 86], [34, 96], [20, 96]], col.piel, 1.7);
      c.restore();
    }

    // farol de papel colgando de la mano izquierda
    const fy = 100 + sen(t * 1.4) * 1.2;
    linea(c, [[26, 94], [21, fy - 5]], col.madera, 1.8);
    circ(c, 21, fy - 6, 1.6, col.madera, 1);
    c.save(); c.globalAlpha = 0.22 * luz;
    circ(c, 21, fy + 6, 16, col.farolLuz, 0); c.restore();
    elip(c, 21, fy + 6, 9, 11, col.farol, 2);
    for (let i = -2; i <= 2; i++) linea(c, [[12.5, fy + 6 + i * 4], [29.5, fy + 6 + i * 4]], 'rgba(0,0,0,0.2)', 1.1);
    pieza(c, [[16, fy - 5], [26, fy - 5], [26, fy - 2], [16, fy - 2]], col.madera, 1.3);
    pieza(c, [[16, fy + 14], [26, fy + 14], [26, fy + 17], [16, fy + 17]], col.madera, 1.3);
    c.save(); c.globalAlpha = 0.8 * luz;
    elip(c, 21, fy + 6, 5, 7, col.farolLuz, 0); c.restore();
    c.restore();

    // ---------- CABEZA ----------
    c.save(); c.translate(0, resp * 1.2);
    pieza(c, [[43, 36], [57, 36], [57, 46], [43, 46]], col.piel, 1.6);
    const cab = [[36, 26], [38, 12, 50, 12], [62, 12, 64, 26], [64, 36], [57, 46, 50, 46], [43, 46, 36, 36], [36, 26]];
    pieza(c, cab, col.piel, 0);
    dentro(c, cab, () => {
      const g = c.createLinearGradient(36, 0, 64, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.26)'); g.addColorStop(1, 'rgba(0,0,0,0.26)');
      c.fillStyle = g; c.fillRect(34, 10, 32, 40);
    });
    pincel(c, [[36, 26], [38, 12, 50, 12]], TINTA, 2.2, 1.5, 0.5);
    pincel(c, [[50, 12], [62, 12, 64, 26], [64, 36]], TINTA, 1.5, 2.2, 0.5);
    pincel(c, [[64, 36], [57, 46, 50, 46]], TINTA, 2.2, 2, 0.4);
    pincel(c, [[50, 46], [43, 46, 36, 36], [36, 26]], TINTA, 2, 2.2, 0.4);
    // pelo corto y revuelto
    masa(c, [[35, 26], [37, 10, 50, 9], [63, 10, 65, 26],
             [62, 20], [56, 15], [50, 20], [44, 14], [38, 20]], col.pelo);
    for (let i = 0; i < 7; i++) linea(c, [[38 + i * 4, 11], [37 + i * 4.2, 6 + (i % 3) * 2]], col.pelo, 1.8);
    // cinta atada en la frente, con las dos puntas al viento
    masa(c, [[34, 22], [66, 20], [66, 26], [34, 27]], col.papel);
    linea(c, [[35, 24], [65, 22.5]], 'rgba(0,0,0,0.22)', 1.2);
    const pb = sen(t * 1.4) * 1.5;
    masa(c, [[65, 21], [74 + pb, 17 + pb], [73 + pb, 23 + pb], [65, 26]], col.papel);
    masa(c, [[65, 23], [72 + pb * 0.6, 27 + pb], [70 + pb * 0.6, 31 + pb], [65, 27]], col.papel);
    linea(c, [[65, 21], [74 + pb, 17 + pb]], 'rgba(0,0,0,0.18)', 0.9);
    // ojos medio cerrados
    pincel(c, [[40, 31], [46, 32.5]], TINTA, 1.4, 2.4, 0.6);
    pincel(c, [[60, 31], [54, 32.5]], TINTA, 1.4, 2.4, 0.6);
    circ(c, 43, 33.6, 1.1, TINTA, 0);
    circ(c, 57, 33.6, 1.1, TINTA, 0);
    linea(c, [[38, 26], [46, 27.5]], TINTA, 2);
    linea(c, [[62, 26], [54, 27.5]], TINTA, 2);
    // barba corta y boca
    masa(c, [[42, 40], [58, 40], [56, 48], [44, 48]], col.pelo);
    c.save(); c.globalAlpha = 0.5;
    for (let i = 0; i < 7; i++) linea(c, [[43 + i * 2.3, 40], [42.5 + i * 2.4, 47]], '#4a4450', 0.8);
    c.restore();
    linea(c, [[45, 39], [50, 40.5, 55, 39]], TINTA, 1.6);
    c.restore();
  }

  // ---- ROKURO, el del té (encorvado y diminuto) ---------------
  function rokuro(c, t, col) {
    const resp = sen(t * 1.4) * 0.7;
    const barba = sen(t * 0.9) * 1.1;

    sombraSuelo(c, 50, 137, 19, 4);

    // bastón
    linea(c, [[70, 54], [76, 136]], col.madera, 3);
    linea(c, [[71, 60], [74, 100]], 'rgba(255,255,255,0.2)', 1.2);
    circ(c, 70, 54, 2.8, col.madera, 1.4);

    // pies
    pieza(c, [[36, 130], [48, 130], [48, 137], [35, 137]], '#43362b', 1.6);
    pieza(c, [[53, 130], [65, 130], [66, 137], [53, 137]], '#43362b', 1.6);
    // piernas cortas
    pieza(c, [[38, 110], [47, 110], [47, 131], [37, 131]], col.kimono, 1.7);
    pieza(c, [[54, 110], [63, 110], [64, 131], [54, 131]], col.kimono, 1.7);

    c.save(); c.translate(0, resp);
    // espalda encorvada: el torso se inclina hacia delante
    const tor = [[32, 66], [62, 60], [70, 84], [66, 112], [34, 112], [28, 88]];
    pieza(c, tor, col.haori, 0);
    rayado(c, tor, col.haoriSombra, 3.2, 1.5, -0.5, 0.35);
    dentro(c, tor, () => {
      const g = c.createLinearGradient(28, 0, 70, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0.26)');
      c.fillStyle = g; c.fillRect(26, 58, 46, 56);
    });
    pincel(c, [[32, 66], [28, 88], [34, 112]], TINTA, 1.5, 2.4, 0.7);
    pincel(c, [[62, 60], [70, 84], [66, 112]], TINTA, 1.5, 2.4, 0.7);
    linea(c, [[34, 112], [66, 112]], TINTA, 2);
    // la joroba, bien marcada
    pincel(c, [[32, 66], [40, 58, 56, 58], [62, 60]], TINTA, 2, 2.4, 1);
    // kimono por dentro
    masa(c, [[44, 64], [56, 62], [52, 96], [42, 96]], col.kimono);
    pincel(c, [[44, 64], [42, 96]], TINTA, 1.6, 1.2, 0.3);
    pincel(c, [[56, 62], [52, 96]], TINTA, 1.6, 1.2, 0.3);
    // faja
    pieza(c, [[30, 92], [68, 92], [68, 101], [30, 101]], col.faja, 1.8);
    linea(c, [[32, 95], [66, 95]], 'rgba(255,255,255,0.22)', 1.2);
    // brazos
    pieza(c, [[34, 68], [24, 76], [22, 98], [33, 98], [34, 82]], col.haori, GROSOR);
    pieza(c, [[60, 64], [70, 70], [72, 86], [62, 88]], col.haori, GROSOR);
    circ(c, 27, 100, 4, col.piel, 1.6);
    circ(c, 68, 88, 3.8, col.piel, 1.6);

    // tetera de hierro, en la mano izquierda
    const ty = 104 + sen(t * 1.3) * 0.7;
    c.save();
    elip(c, 26, ty + 6, 10, 8, col.metal, 2);
    dentro(c, [[16, ty + 6], [16, ty - 2, 26, ty - 2], [36, ty - 2, 36, ty + 6], [36, ty + 14, 26, ty + 14], [16, ty + 14, 16, ty + 6]], () => {
      const g = c.createLinearGradient(16, 0, 36, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
      c.fillStyle = g; c.fillRect(15, ty - 3, 22, 18);
      c.globalAlpha = 0.35; c.fillStyle = '#9aa0ab';
      for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(18 + (i % 5) * 4, ty + (i % 4) * 3.5, 0.8, 0, PI * 2); c.fill(); }
    });
    pieza(c, [[33, ty + 2], [39, ty + 5], [37, ty + 9]], col.metal, 1.5);   // pitorro
    pieza(c, [[22, ty - 2], [30, ty - 2], [30, ty + 1], [22, ty + 1]], col.metal, 1.4);
    c.strokeStyle = col.metal; c.lineWidth = 2;
    c.beginPath(); c.arc(26, ty - 2, 8, PI + 0.3, -0.3); c.stroke();
    c.restore();
    // vapor
    c.save(); c.globalAlpha = 0.3;
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.5 + i * 0.33) % 1;
      elip(c, 38 + sen(t * 1.4 + i * 2) * 3, ty + 4 - u * 22, 2.6 - u * 1.4, 2 - u, col.vapor, 0);
    }
    c.restore();
    c.restore();

    // ---------- CABEZA (adelantada, por la joroba) ----------
    c.save(); c.translate(0, resp * 1.3);
    pieza(c, [[42, 52], [54, 52], [54, 62], [42, 62]], col.piel, 1.5);
    const cab = [[34, 40], [35, 26, 47, 26], [59, 26, 60, 40], [59, 50], [52, 58, 46, 58], [40, 58, 34, 50], [34, 40]];
    pieza(c, cab, col.piel, 0);
    dentro(c, cab, () => {
      const g = c.createLinearGradient(34, 0, 60, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.26)'); g.addColorStop(1, 'rgba(0,0,0,0.24)');
      c.fillStyle = g; c.fillRect(32, 24, 30, 36);
      c.globalAlpha = 0.25; c.strokeStyle = '#9a7050'; c.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(38, 32 + i * 2.4); c.lineTo(56, 32 + i * 2.4); c.stroke(); }
    });
    pincel(c, [[34, 40], [35, 26, 47, 26]], TINTA, 2.2, 1.5, 0.5);
    pincel(c, [[47, 26], [59, 26, 60, 40], [59, 50]], TINTA, 1.5, 2.2, 0.5);
    pincel(c, [[59, 50], [52, 58, 46, 58]], TINTA, 2.2, 2, 0.4);
    pincel(c, [[46, 58], [40, 58, 34, 50], [34, 40]], TINTA, 2, 2.2, 0.4);
    // calvo, con pelo blanco solo a los lados
    masa(c, [[33, 38], [31, 50], [36, 54], [37, 40]], col.pelo);
    masa(c, [[61, 38], [63, 50], [58, 54], [57, 40]], col.pelo);
    for (let i = 0; i < 5; i++) {
      linea(c, [[33, 40 + i * 3], [29, 42 + i * 3.4]], col.pelo, 1.4);
      linea(c, [[61, 40 + i * 3], [65, 42 + i * 3.4]], col.pelo, 1.4);
    }
    // cejas largas y caídas
    pincel(c, [[36, 38], [42, 36, 47, 40]], col.pelo, 1.4, 2.6, 0.8);
    pincel(c, [[58, 38], [52, 36, 47, 40]], col.pelo, 1.4, 2.6, 0.8);
    // gafas redondas minúsculas
    circ(c, 42, 43, 3.6, 'rgba(230,240,255,0.35)', 1.5);
    circ(c, 52, 43, 3.6, 'rgba(230,240,255,0.35)', 1.5);
    linea(c, [[45.6, 43], [48.4, 43]], TINTA, 1.2);
    linea(c, [[38.4, 42], [34, 41]], TINTA, 1.1);
    linea(c, [[55.6, 42], [60, 41]], TINTA, 1.1);
    linea(c, [[40, 43.5], [44, 43.5]], TINTA, 1.3);
    linea(c, [[50, 43.5], [54, 43.5]], TINTA, 1.3);
    // nariz y boca
    linea(c, [[47, 46], [46, 49]], 'rgba(0,0,0,0.3)', 1.1);
    linea(c, [[44, 52], [47, 53.5, 50, 52]], TINTA, 1.4);
    // barba larga hasta la faja
    const bar = [[42, 54], [40 + barba, 70], [44 + barba, 88], [47 + barba, 74], [50, 54]];
    pieza(c, bar, col.pelo, 1.6);
    c.save(); c.globalAlpha = 0.4;
    for (let i = 0; i < 4; i++) linea(c, [[43 + i, 56], [42 + i + barba, 84]], '#c4bda8', 0.9);
    c.restore();
    c.restore();
  }

  // ---- UME, la del mochi (bajita y redonda) -------------------
  function ume(c, t, col) {
    const resp = sen(t * 1.6) * 0.9;
    const bal  = sen(t * 1.1) * 1.3;

    sombraSuelo(c, 50, 137, 23, 4.5);

    // mortero de madera a sus pies
    c.save();
    pieza(c, [[70, 114], [92, 114], [89, 134], [73, 134]], col.madera, 1.9);
    elip(c, 81, 114, 11, 4, col.maderaOsc, 1.7);
    elip(c, 81, 114, 7.5, 2.4, '#4a3418', 0);
    dentro(c, [[70, 114], [92, 114], [89, 134], [73, 134]], () => {
      for (let i = 0; i < 5; i++) linea(c, [[70 + i * 5, 114], [71 + i * 4.6, 134]], col.maderaOsc, 1.2);
    });
    // una bola de mochi asomando
    elip(c, 81, 113, 5, 3, '#f6f1e4', 1.3);
    c.restore();

    // pies
    pieza(c, [[38, 130], [48, 130], [48, 137], [37, 137]], '#43362b', 1.6);
    pieza(c, [[52, 130], [62, 130], [63, 137], [52, 137]], '#43362b', 1.6);

    c.save(); c.translate(0, resp);
    // cuerpo: un huevo. Es lo que la hace ella.
    const cue = [[34, 86], [30, 108], [34, 130], [66, 130], [70, 108], [66, 86], [50, 80]];
    pieza(c, cue, col.kimono, 0);
    rayado(c, cue, col.kimonoSombra, 3.2, 1.5, -0.5, 0.35);
    dentro(c, cue, () => {
      const g = c.createLinearGradient(30, 0, 70, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.26)'); g.addColorStop(1, 'rgba(0,0,0,0.24)');
      c.fillStyle = g; c.fillRect(28, 78, 44, 54);
    });
    pincel(c, [[34, 86], [30, 108], [34, 130]], TINTA, 1.6, 2.4, 0.7);
    pincel(c, [[66, 86], [70, 108], [66, 130]], TINTA, 1.6, 2.4, 0.7);
    linea(c, [[34, 130], [66, 130]], TINTA, 2.2);
    // delantal
    const del = [[40, 92], [60, 92], [64, 112], [62, 128], [38, 128], [36, 112]];
    pieza(c, del, col.delantal, 1.8);
    linea(c, [[40, 96], [60, 96]], 'rgba(0,0,0,0.16)', 1.2);
    remiendo(c, 44, 114, 9, 8, '#e0d6bd');
    linea(c, [[40, 92], [44, 84]], col.delantal, 2);
    linea(c, [[60, 92], [56, 84]], col.delantal, 2);
    // harina salpicada
    moteado(c, del, col.harina, 40, 53);
    // faja
    pieza(c, [[32, 100], [68, 100], [68, 109], [32, 109]], col.kimonoSombra, 1.8);
    // brazos cortos
    pieza(c, [[34, 88], [26 + bal, 94], [25 + bal, 110], [34, 108]], col.kimono, 1.8);
    pieza(c, [[66, 88], [74 - bal, 92], [76 - bal, 104], [66, 104]], col.kimono, 1.8);
    circ(c, 28 + bal, 112, 4.2, col.piel, 1.6);
    circ(c, 75 - bal, 105, 4.2, col.piel, 1.6);
    c.save(); c.globalAlpha = 0.6;   // harina en las manos
    circ(c, 27 + bal, 110, 1.4, col.harina, 0); circ(c, 30 + bal, 113, 1, col.harina, 0);
    circ(c, 74 - bal, 103, 1.2, col.harina, 0); c.restore();

    // mazo de mochi al hombro
    c.save(); c.translate(70, 76); c.rotate(-0.5 + bal * 0.02); c.translate(-70, -76);
    linea(c, [[70, 76], [96, 104]], col.madera, 3.4);
    pieza(c, [[58, 68], [76, 68], [78, 84], [56, 84]], col.madera, 1.9);
    dentro(c, [[58, 68], [76, 68], [78, 84], [56, 84]], () => {
      for (let i = 0; i < 4; i++) linea(c, [[58 + i * 5.5, 68], [57 + i * 5.8, 84]], col.maderaOsc, 1.2);
    });
    c.save(); c.globalAlpha = 0.5;
    circ(c, 66, 70, 2, col.harina, 0); circ(c, 72, 73, 1.4, col.harina, 0); c.restore();
    c.restore();
    c.restore();

    // ---------- CABEZA ----------
    c.save(); c.translate(0, resp * 1.3);
    const cab = [[36, 58], [36, 42, 50, 42], [64, 42, 64, 58], [63, 70], [50, 80], [37, 70], [36, 58]];
    pieza(c, cab, col.piel, 0);
    dentro(c, cab, () => {
      const g = c.createLinearGradient(36, 0, 64, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0.2)');
      c.fillStyle = g; c.fillRect(34, 40, 32, 42);
    });
    pincel(c, [[36, 58], [36, 42, 50, 42]], TINTA, 2.2, 1.5, 0.5);
    pincel(c, [[50, 42], [64, 42, 64, 58], [63, 70]], TINTA, 1.5, 2.2, 0.5);
    pincel(c, [[63, 70], [50, 80], [37, 70]], TINTA, 2.2, 2.2, 0.5);
    // pelo blanco recogido
    masa(c, [[34, 56], [33, 42, 50, 40], [67, 42, 66, 56], [62, 50], [50, 46], [38, 50]], col.pelo);
    // pañuelo, siempre torcido
    c.save(); c.translate(50, 46); c.rotate(-0.07); c.translate(-50, -46);
    masa(c, [[33, 50], [34, 38, 50, 36], [66, 38, 67, 50], [33, 50]], col.pañuelo);
    pincel(c, [[33, 50], [34, 38, 50, 36], [66, 38, 67, 50]], TINTA, 2, 2, 0.5);
    linea(c, [[34, 48], [50, 45, 66, 48]], 'rgba(0,0,0,0.2)', 1.3);
    masa(c, [[64, 42], [73, 38], [72, 46], [64, 48]], col.pañuelo);
    pincel(c, [[64, 42], [73, 38], [72, 46]], TINTA, 1.6, 1.6, 0.3);
    c.restore();
    // los ojos, cerrados de tanto reírse
    pincel(c, [[38, 60], [43, 56, 48, 60]], TINTA, 1.2, 1.2, 1.4);
    pincel(c, [[52, 60], [57, 56, 62, 60]], TINTA, 1.2, 1.2, 1.4);
    // mejillas
    c.save(); c.globalAlpha = 0.4;
    elip(c, 39, 66, 4, 2.6, col.mejilla, 0);
    elip(c, 61, 66, 4, 2.6, col.mejilla, 0); c.restore();
    // arrugas
    c.save(); c.globalAlpha = 0.3;
    for (let i = 0; i < 3; i++) {
      linea(c, [[35 - i * 0.5, 58 + i * 2], [32 - i, 57 + i * 2.4]], '#a07a56', 0.9);
      linea(c, [[65 + i * 0.5, 58 + i * 2], [68 + i, 57 + i * 2.4]], '#a07a56', 0.9);
    }
    linea(c, [[44, 52], [48, 53]], '#a07a56', 0.9);
    linea(c, [[56, 52], [52, 53]], '#a07a56', 0.9); c.restore();
    // nariz y sonrisa
    elip(c, 50, 66, 2.6, 2, col.pielSombra, 1.2);
    pincel(c, [[44, 71], [50, 76, 56, 71]], TINTA, 1.4, 1.4, 0.9);
    c.save(); c.globalAlpha = 0.5;
    masa(c, [[46, 72], [54, 72], [52, 75], [48, 75]], '#c4635c'); c.restore();
    // harina en la ceja
    c.save(); c.globalAlpha = 0.55;
    circ(c, 42, 56, 1.3, col.harina, 0); circ(c, 58, 67, 1, col.harina, 0); c.restore();
    c.restore();
  }

  // ============================================================
  //  TABLA DE DIBUJOS
  // ============================================================
  const DIBUJOS = {
    ronin:  (c, t, col) => samurai(c, t, col, { kasa: 'paja',  cara: 'vacia',    katanas: 1 }),
    lluvia: (c, t, col) => samurai(c, t, col, { kasa: 'plano', cara: 'lisa',     katanas: 2, mojado: true, campana: true }),
    ciervo: (c, t, col) => samurai(c, t, col, { kasa: null,    cara: 'calavera', katanas: 1 }),
    monje:  monje,
    cesta:  cesta,
    ogro:   ogro,
    cabeza: cabezaRoja,
    kappa:  kappa,
    hina:   hina,
    genzo:  genzo,
    rokuro: rokuro,
    ume:    ume
  };

  // ============================================================
  //  LA FUNCIÓN QUE USA EL JUEGO
  // ============================================================
  function dibujar(c, id, op) {
    op = op || {};
    const ficha = FICHAS[id]; if (!ficha) return;
    const esc = (op.alto || 70) / 140;
    c.save();
    c.translate(op.x || 0, op.y || 0);
    c.scale(esc * (op.mirando === -1 ? -1 : 1), esc);
    c.translate(-50, -140);
    c.lineJoin = 'round'; c.lineCap = 'round';
    DIBUJOS[id](c, op.t || 0, op.color || ficha.color);
    c.restore();
  }

  return { fichas: FICHAS, lista: LISTA, dibujar: dibujar, tinta: TINTA, sangre: SANGRE };
})();

if (typeof window !== 'undefined') window.PERSONAJES = PERSONAJES;
