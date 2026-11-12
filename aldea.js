// ============================================================
//  ALDEA.JS — el pueblo, sus vecinos y sus misiones
//
//  LEYENDA DEL MAPA
//    #  casa (pared)      .  hierba        :  camino de piedra
//    A  estanque          t  cerezo        H  donde apareces
//    D  puerta del dojo (entra al minijuego)
//    a b c d ...  vecinos (la letra es la de "personajes" más abajo)
//    la letra de "objeto" de cada misión = dónde está lo que te piden
//
//  Un vecino con  tienda: true  abre la tienda (lo que vende está en config.js > tienda, armas y aspectos).
//  dibujo = personaje de personajes.js · alto = cuánto mide en casillas
//  Cada vecino: nombre, tipo de dibujo (abuela, herrero, nina, monje), color del kimono
//  y una misión: lo que pide, lo que dice mientras tanto, cómo da las gracias y qué arma regala.
//  Las armas (duración, radio, espera...) se ajustan en config.js, apartado "armas".
//  {nombre} se sustituye por el nombre del jugador.
// ============================================================
const ALDEA = {
  nombre: 'Aldea del Cerezo Dormido',
  edificios: [
    {x:2,y:3,ancho:3,fondo:2}, {x:19,y:3,ancho:3,fondo:2},
    {x:2,y:12,ancho:3,fondo:2}, {x:19,y:12,ancho:3,fondo:2},
    {x:9,y:1,ancho:6,fondo:2,templo:true}
  ],
  mapa: [
    '########################',
    '#t...t...######...t...t#',
    '#........######........#',
    '#.###......DD......###.#',
    '#.###..a...::...b..###.#',
    '#......::::::::::......#',
    '#.t....:...t...:..e..t.#',
    '#......:..AAA..:.......#',
    '#.k....:.AAAAA.:....o..#',
    '#......:..AAA.g:.......#',
    '#.t....:.......:.....t.#',
    '#......::::H:::::......#',
    '#.###..c...::...d..###.#',
    '#.###......::......###.#',
    '#......t...::..m.t.....#',
    '#t.........::.........t#',
    '########################'
  ],
  personajes: {
    // retrato = imagen que sale en grande cuando hablas con él (cualquier vecino puede tener una)
    e: {
      nombre: 'Kappa Pepinillo', tipo: 'kappa', dibujo: 'kappa', alto: 1.7, color: '#5f9e5a', tienda: true, sprite: 'kappa-nuevo', retrato: arteIntegrado['assets/mundo/kappa-nuevo.webp'],
      frases: [
        '...Glup. No te acerques tanto, {nombre}. Hueles a dojo y a miedo.',
        'Llevo trescientos años en este estanque. He visto entrar a muchos como tú por esa puerta. Salir, a menos.',
        'No me inclino ante nadie: si se me derrama el agua del plato, me quedo seco y tú sin tienda. Así que tampoco me hagas reverencias, listo.',
        'Vendo lo que los muertos ya no necesitan. Mejoras, pergaminos, trapitos. Se paga en monedas. Gánalas en el dojo o búscalas fuera de la aldea; los pepinos ya los pongo yo.',
        'Mira lo que quieras. Tocar es gratis. Romper, no.'
      ]
    },
    a: {
      nombre: 'Ume, la del mochi', tipo: 'abuela', dibujo: 'ume', retrato: arteIntegrado['assets/ume.jpg'], alto: 1.45, color: '#8e5a9b',
      mision: {
        objeto: 'g', tipoObjeto: 'gato', nombreObjeto: 'Dango (el gato)', premio: 'humo',
        pide: ['¡Ay, {nombre}! Dango se ha vuelto a escapar.', 'Es blanco con una mancha en el ojo. Le encanta mirar los peces del estanque.', '¿Me lo traes? Tengo algo guardado para quien me ayude.'],
        recuerda: ['Dango estará junto al estanque, mirando los peces como un bobo.'],
        gracias: ['¡Dango! Sinvergüenza... Gracias, {nombre}.', 'Toma. Era de mi marido: con un golpe de abanico no te ve ni tu sombra.'],
        luego: ['Dango ya solo se escapa los martes. Algo es algo.']
      }
    },
    b: {
      nombre: 'Genzo, el de la puerta', tipo: 'herrero', dibujo: 'genzo', sprite: 'genzo-nuevo', retrato: arteIntegrado['assets/mundo/genzo-nuevo.webp'], alto: 1.9, color: '#3d5a80',
      mision: {
        objeto: 'k', tipoObjeto: 'carbon', nombreObjeto: 'Saco de carbón', premio: 'geta',
        pide: ['Treinta años barriendo esta puerta y hoy se me apaga el brasero. Tiene guasa.', 'Dejé un saco de carbón al oeste, entre los cerezos. Yo de aquí no me muevo. ¿Me lo acercas?'],
        recuerda: ['El saco está al oeste. Pesa menos de lo que parece. O eso digo siempre.'],
        gracias: ['¡Eso es! Ya huele a brasa.', 'Toma estas geta. Las forjé una noche de guardia. Pesan como yunques: pisa fuerte y verás temblar a quien tengas cerca.'],
        luego: ['Si las geta te hacen rozadura, eso ya no es cosa mía.']
      }
    },
    c: {
      nombre: 'Hina, la de las grullas', tipo: 'nina', dibujo: 'hina', retrato: arteIntegrado['assets/hina.jpg'], alto: 1.25, color: '#e07a5f',
      mision: {
        objeto: 'o', tipoObjeto: 'grulla', nombreObjeto: 'Grulla de papel', premio: 'paraguas',
        pide: ['Hice mil grullas menos una. La última se la llevó el viento.', 'Voló hacia el este. ¿La buscas? Yo no puedo ir tan lejos sola.'],
        recuerda: ['Mi grulla voló hacia el este. Es la más bonita, la reconocerás.'],
        gracias: ['¡Mil! ¡Ya son mil! Ahora puedo pedir mi deseo.', 'Te regalo mi paraguas. Si te escondes debajo y andas despacito, nadie te ve. Lo he probado con mamá.'],
        luego: ['Mi deseo no te lo digo, que si no no se cumple.']
      }
    },
    d: {
      nombre: 'Rokuro, el del té', tipo: 'monje', dibujo: 'rokuro', retrato: arteIntegrado['assets/rokuro.jpg'], alto: 1.45, color: '#c08a3e',
      mision: {
        objeto: 'm', tipoObjeto: 'campanilla', nombreObjeto: 'Campanilla del templo', premio: 'senuelo',
        pide: ['He perdido la campanilla con la que aviso de que el té está listo. Y sin campanilla, nadie viene.', 'Creo que se me cayó al sur, cerca del camino. Con estas gafas no veo ni la tetera.'],
        recuerda: ['Al sur, junto al camino. O eso me dice el viento.'],
        gracias: ['Ah, ahí estaba. Mira, quédatela: a mí ya me oyen roncar desde el dojo.', 'Déjala sonando y los curiosos irán hacia ella. Los espectros son muy curiosos.'],
        luego: ['Ahora aviso del té a gritos. Viene menos gente, pero más despierta.']
      }
    }
  }
};

for(const [id,sprite] of [["a","ume-nueva"],["c","hina-nueva"],["d","rokuro-nuevo"]]) { ALDEA.personajes[id].sprite=sprite;ALDEA.personajes[id].retrato="assets/mundo/"+sprite+".webp"; }
