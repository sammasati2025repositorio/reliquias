// Reliquias · La deuda del agua. Coordenadas en casillas, desde cero.
const MUNDO = (() => {
  const mision = (titulo, objeto, nombreObjeto, xp, monedas, pide, recuerda, gracias, luego, requisitos = []) => ({
    titulo, objeto, nombreObjeto, xp, monedas, pide, recuerda, gracias, luego, requisitos
  });
  const personajeNuevo = (id, nombre, alto, frases) => ({
    nombre, alto, sprite: id, retrato: arteIntegrado['assets/mundo/' + id + '.webp'], favor: id, frases
  });
  const personajes = {
    u: personajeNuevo('brizna', 'Brizna, el porteador de madera', 1.65, ['Si alguien te dice que todos los caminos llevan al mismo sitio, pídele que vuelva descalzo.', 'Escondí un alijo hacia el suroeste. Ahora que te lo he contado, voy a llamarlo regalo.']),
    z: personajeNuevo('tizne', 'Tizne, el del farol índigo', 1.45, ['Mi farol es más grande que yo. De noche nadie sabe quién lleva a quién.', 'Si buscas la barca de Narel, mira las luces que no se mueven. Las demás tienen alas.']),
    y: personajeNuevo('miga', 'Miga, el muñeco de raíz', 1.55, ['Mi bastón tuvo hojas antes que yo dientes. Lo entierro cuando llueve para que no se olvide de cómo era tener raíces.', 'Los pasos lentos se oyen mejor. Sobre todo si eres una piedra.']),
    i: personajeNuevo('salvia', 'Salvia, el mago del charco', 1.85, ['Quise separar el agua del ruido que hace al caer. Ahora tengo un cubo lleno de estruendo. No lo abras.', 'El círculo azul templa tu arma equipada. Aya necesita cobre antes de poder encenderlo.']),
    n: personajeNuevo('sapo', 'Goro, el tallador de remos', 2, ['Tallé el río de orilla a orilla en este remo. Si vuelve a cambiar de rumbo, tendré que fabricar otro.', 'Para cruzar, busca el puente por el centro de la Ribera.']),
    r: personajeNuevo('pedernal', 'Pedernal, el custodio de las piedras', 2.45, ['Mi primer maestro era una piedra. De él aprendí a esperar. Lo de hablar lo aprendí por mi cuenta.', 'Hay tres sellos: oeste, este y terraza norte. Las piedras se entienden mejor si las dejas hablar una a una.']),
    f: { nombre: 'Iria, espíritu de las raíces', retrato: arteIntegrado['assets/mundo/iria.webp'], tipo: 'elfa', color: '#39775c', mision: mision(
      'El cauce bajo la corteza', 'F', 'Semilla de agua', 95, 45,
      ['No bebas de la corteza. Lo que parece rocío son gotas del manantial subiendo al revés.',
       'La aldea nos pidió que calláramos sobre el desvío. Callamos. El bosque lleva años pagando esa promesa.',
       'Busca la semilla azul al norte. Las raíces la han dejado fuera para que alguien por fin la vea.'],
      ['Ve al norte del bosque, hasta el claro que queda más allá del sendero de raíces.'],
      ['Está tibia. El agua todavía recuerda por dónde iba.', 'Llévale esta noticia a Narel en la Ribera. Siempre dice que no teme a las corrientes. A las disculpas sí.'],
      ['Si te pierdes, escucha el agua. Todavía se puede seguir una cosa que va al revés.']) },
    j: { nombre: 'Narel, el sapo barquero', retrato: arteIntegrado['assets/mundo/narel.webp'], tipo: 'elfo', color: '#a7854f', mision: mision(
      'El nombre de la crecida', 'J', 'Acta del desvío', 120, 55,
      ['Mi madre cobraba un verso por cruzar. A los del templo les cobró dos porque insistían en que tenían prisa.',
       'El acta que firmaron sigue en el embarcadero del este. Tiene nuestros nombres y explica quién pidió cerrar la compuerta.'],
      ['El embarcadero está al este de la Ribera. Cruza el puente y sigue la orilla.'],
      ['Aquí está mi firma. Yo también quise salvar las casas. Pensé que abriríamos la compuerta al día siguiente.',
       'Aya sabrá usar el sello del acta. Ve al manantial y dile que ya no pienso esconder el mío.'],
      ['El próximo que cruce paga con un verso. Tengo que empezar por algún sitio.'], ['f']) },
    l: { nombre: 'Aya, maga del manantial', retrato: arteIntegrado['assets/mundo/aya.webp'], tipo: 'elfa', color: '#538eaa', mision: mision(
      'Templar la memoria', 'L', 'Cobre de la primera compuerta', 145, 65,
      ['La firma de Narel sigue siendo legible. Menos mal: el agua no sabe perdonar una rúbrica borrosa.',
       'Recoge cobre en la poza norte. Con él puedo devolverle el filo a cualquier arma que hayas ganado.'],
      ['La poza del cobre está en el claro norte, detrás de las dos lenguas de agua.'],
      ['Listo. El manantial ya puede templar tus armas. Cada temple cuesta monedas y reduce el tiempo de recarga.',
       'La campana del Paso de los Torii sigue al revés. Si suena desde abajo, algo nos está contestando desde el santuario.'],
      ['El agua ya está lista. Si quieres templar un arma, acércate al círculo azul.'], ['j']) },
    q: { nombre: 'Sora, espíritu del paso', tipo: 'elfo', color: '#926482', mision: mision(
      'La campana enterrada', 'Q', 'Badajo de piedra', 175, 80,
      ['Cada puerta se levantó para recordar a alguien que no volvió. Desde que desviamos el agua, las puertas están olvidando sus nombres.',
       'Los espectros guardan el badajo en la explanada norte. Si te ven, cambia de sendero y usa el arma para distraerlos.'],
      ['Busca el badajo en la explanada norte. Los caminos laterales permiten rodear a los espectros.'],
      ['Ahora suena hacia el valle. ¿Lo oyes? El templo vuelve a responder.',
       'El Santuario del Cerezo Negro ha abierto su paso. Lleva allí lo que hemos descubierto.'],
      ['La piedra no había olvidado el sonido. Solo necesitaba que alguien la escuchara.'], ['l']) },
    v: { nombre: 'Ren, gólem del santuario', retrato: arteIntegrado['assets/mundo/ren.webp'], tipo: 'elfo', color: '#9a544e', mision: mision(
      'Lo que el agua devuelve', 'X', 'Clavija de la compuerta', 230, 110,
      ['Fui yo quien dio la orden. El agua iba a llevarse las casas y le pedí al bosque que aguantara una noche.',
       'Esa noche ha durado treinta años. Enciende los tres sellos de las terrazas y recupera la clavija al norte. Abriré el cauce delante de todos.'],
      ['Enciende los tres sellos al oeste, al este y en la terraza norte. Después recoge la clavija en esa terraza.'],
      ['Ya está. El primer ruido es pequeño. Mañana, cuando se llene el estanque, hasta Ume tendrá que levantar la voz.',
       'Hay algo verde bajo las raíces. El bosque lo cuidó durante esos treinta años. Está esperando a que termines de ayudar a todos.'],
      ['Las puertas del santuario seguirán abiertas. Quiero que se pueda venir a comprobar lo que prometimos.'], ['q']) },
    w: { nombre: 'Lúa, aprendiz de barquera', tipo: 'elfa', color: '#58896d',
      frases: ['Si ves una luciérnaga inmóvil, es un farol. Si te sigue, es una luciérnaga. Si te cobra por seguirte, es mi tío.'] }
  };
  const zonas = {
    bosque: {
      nombre: 'Bosque de las Raíces Altas', imagen: 'bosque', color: '#bada82',
      entrada: [24,39], centro: [22,23], ruta: [[24,39],[24,32],[16,28],[22,23],[28,16],[19,11],[19,5]],
      puntos: [[22,23,'f'],[19,5,'F'],[39,20,'w'],[12,27,'u'],[31,13,'y']],
      pasos: [[24,40,'aldea',[12,14]],[44,14,'ribera']],
      tesoros: [[9,28],[36,32],[34,8]],
      texto: 'La luz atraviesa los cedros. El agua corre hacia las raíces.'
    },
    ribera: {
      nombre: 'Ribera de las Luciérnagas', imagen: 'ribera', color: '#82dbc7',
      entrada: [4,24], centro: [22,23], ruta: [[4,24],[12,24],[18,29],[22,23],[31,23],[38,17],[43,17]],
      puntos: [[22,23,'j'],[42,17,'J'],[13,26,'z'],[35,18,'n']],
      pasos: [[3,24,'bosque',[43,14]],[28,4,'manantial']],
      tesoros: [[8,9],[29,31],[41,30]],
      texto: 'Un puente de madera une las dos orillas. Las barcas llevan treinta años amarradas.'
    },
    manantial: {
      nombre: 'Manantial de las Dos Caídas', imagen: 'manantial', color: '#8ae8ff',
      entrada: [23,39], centro: [24,23], ruta: [[23,39],[23,32],[16,28],[24,23],[31,16],[25,10],[25,5]],
      puntos: [[23,23,'l'],[25,5,'L'],[19,25,'i']],
      pasos: [[23,40,'ribera',[28,5]],[44,18,'paso',null,'l']],
      tesoros: [[12,14],[38,29],[37,8]], forja: [26,23],
      texto: 'El agua cae en dos pozas y arrastra vetas de cobre hacia la superficie.'
    },
    paso: {
      nombre: 'Paso de los Cien Torii', imagen: 'paso', color: '#eeb49c',
      entrada: [24,39], centro: [24,27], ruta: [[24,39],[24,33],[24,27],[24,21],[24,15],[24,8]],
      puntos: [[24,29,'q'],[24,8,'Q'],[22,16,'1'],[28,11,'2']],
      pasos: [[24,40,'manantial',[43,18]],[24,3,'santuario',null,'q']],
      tesoros: [[10,17],[37,22],[34,7]], torii: [[24,34],[24,24],[24,18],[24,10]],
      texto: 'Los faroles señalan el camino central. Los senderos laterales ofrecen refugio.'
    },
    santuario: {
      nombre: 'Santuario del Cerezo Negro', imagen: 'santuario', color: '#bff095',
      entrada: [24,39], centro: [24,28], ruta: [[24,39],[24,35],[24,28],[16,23],[24,16],[24,7]],
      puntos: [[24,31,'v'],[24,7,'X'],[25,13,'3'],[31,19,'2'],[14,16,'1'],[27,35,'r']],
      pasos: [[24,40,'paso',[24,4]]], sellos: [[13,29],[36,20],[24,11]], tesoros: [[8,25],[39,27],[38,10]], torii: [[24,36],[24,19],[24,9]],
      texto: 'El cerezo negro florece junto a una compuerta que aún conserva su sello.'
    }
  };
  const W = 48, H = 43;
  function mapa(z, id) {
    const semilla = Object.keys(zonas).indexOf(id) + 1;
    const ruido = (x, y) => ((Math.imul(x + semilla * 61, 73856093) ^ Math.imul(y + 31, 19349663)) >>> 0) % 100;
    const c = Array.from({length:H}, (_, y) => Array.from({length:W}, (_, x) => {
      if (!x || !y || x === W-1 || y === H-1) return '#';
      const r = ruido(x, y);
      if (id === 'ribera' && Math.abs(x - 25 - Math.sin(y / 6) * 4) < 3.5) return 'A';
      if (id === 'manantial' && ((x-11)**2/47+(y-24)**2/122 < 1 || (x-37)**2/40+(y-17)**2/106 < 1)) return 'A';
      if (id === 'paso' && x > 14 && x < 34 && (y % 9 === 0 || y % 9 === 1)) return '#';
      return r < (id === 'bosque' ? 23 : 12) ? 't' : r > 95 ? '#' : '.';
    }));
    const claro = ([x,y], radio, tile = '.') => {
      for (let b=-radio; b<=radio; b++) for (let a=-radio; a<=radio; a++) {
        const xx=x+a, yy=y+b;
        if (xx>0 && yy>0 && xx<W-1 && yy<H-1 && a*a+b*b<=radio*radio) c[yy][xx]=tile;
      }
    };
    const unir = (a,b,radio = 1,tile = ':') => {
      const pasos = Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]),1);
      for (let i=0;i<=pasos;i++) claro(a.map((v,k)=>Math.round(v+(b[k]-v)*i/pasos)),radio,tile);
    };
    const enlaces = [...z.pasos, ...z.puntos, ...z.tesoros, ...(z.sellos || []), ...(z.forja ? [z.forja] : [])];
    claro(z.centro,5);
    for (let i=1;i<z.ruta.length;i++) unir(z.ruta[i-1],z.ruta[i],2);
    for (const p of enlaces) {
      const dist = a => Math.hypot(a[0]-p[0],a[1]-p[1]);
      const cerca = z.ruta.reduce((a,b)=>dist(a)<dist(b)?a:b);
      unir(cerca,p);
      claro(p,2);
    }
    if (id === 'paso' || id === 'santuario') {
      for (const x of [13,36]) {
        unir([24,34],[x,30]); unir([x,30],[x,12]); unir([x,12],[24,8]);
      }
    }
    c[z.entrada[1]][z.entrada[0]] = 'H';
    for (const [x,y,k] of z.puntos) c[y][x]=k;
    return c.map(f=>f.join(''));
  }
  for (const [id,z] of Object.entries(zonas)) z.mapa = mapa(z,id);
  const favores = {
    brizna: {nombre:'Nudo del porteador', desc:'Lleva dos gemas a la vez en el Dojo.'},
    tizne: {nombre:'Paso sin eco', desc:'+0,5 % de sigilo.', atributo:'sigilo', valor:.5},
    miga: {nombre:'Aliento de raíz', desc:'+0,3 s de aguante.', atributo:'aguante', valor:.3},
    salvia: {nombre:'Pulso del manantial', desc:'+6 % de recuperación.', atributo:'recarga', valor:6},
    sapo: {nombre:'Cuenta de la ribera', desc:'+5 % de hallazgo.', atributo:'fortuna', valor:5},
    pedernal: {nombre:'Pacto de la piedra', desc:'+6 % de protección.', atributo:'defensa', valor:6}
  };
  const variantes = { f:'mision-miga', j:'mision-sapo', l:'mision-salvia', q:'mision-tizne', v:'mision-pedernal', w:'tizne' };
  for (const [id,sprite] of Object.entries(variantes)) {
    const p = personajes[id];
    p.sprite = sprite; p.retrato = 'assets/mundo/' + sprite + '.webp'; p.alto = 1.62;
  }
  return { zonas, personajes, favores, pasosAldea: [[12,15,'bosque']], nivel: xp => 1 + Math.floor(Math.sqrt(xp / 55)) };
})();
