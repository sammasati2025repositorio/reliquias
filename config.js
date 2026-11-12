// ============================================================
//  CONFIG.JS — TODO lo que se puede cambiar sin tocar el motor
//  Cambia un número, guarda y recarga la página. Nada más.
//  (También puedes cambiarlo todo con ratón desde editor.html)
// ============================================================
const CONFIG = {

  // --- PANTALLA -------------------------------------------------
  pantalla: {
    ancho: 356,        // cuánto mundo se ve (unidades). Se dibuja a la resolución completa del móvil
    alto: 192,
    tile: 24,          // tamaño de cada casilla en unidades (más grande = cámara más cerca)
    alturaSeto: 0.46,   // falso 3D: altura de los setos en casillas (0 = plano)
    calidadMax: 3      // tope de nitidez (baja a 2 si un móvil viejo va lento)
  },

  // --- PARTIDA --------------------------------------------------
  partida: {
    rondas: 3,               // número de rondas
    duracionRonda: 90,       // segundos por ronda
    penalizacionCaptura: 5,  // segundos que pierdes cuando te atrapan
    subidaPorRonda: 0.08,    // los espectros son un 8 % más rápidos cada ronda
    cambiarMapaCadaRonda: true, // true = cada ronda usa el mapa siguiente
    reaparicionGema: 12,     // segundos que tarda una reliquia entregada en volver a salir
    bonoRacha: 1,            // puntos extra por cada entrega seguida sin que te atrapen
    tiempoPorEntrega: 2,     // segundos que ganas con cada entrega
    monedasPorPunto: 2       // monedas que ganas por cada punto entregado en el dojo
  },

  // --- SAMURÁI (jugador) -----------------------------------------
  heroe: {
    velocidad: 80,       // píxeles internos por segundo
    sprint: 1.55,        // multiplicador al esprintar
    energiaMax: 3,       // segundos de sprint
    recargaEnergia: 0.6, // energía recuperada por segundo
    frenoPorCarga: 0.09, // cada punto de la gema que llevas te frena un 9 %
    radio: 0.3,          // tamaño del cuerpo (en casillas)
    invulnerable: 1.5    // segundos a salvo tras reaparecer
  },

  // --- GEMAS ----------------------------------------------------
  gemas: {
    puntos: [1, 2, 3],   // puntos de la cercana, la media y la lejana
    estilo: 'reliquias', // 'reliquias' = objetos hechos a mano · 'gemas' = cristales
    // nombre y frase de cada una (sin comas dentro de la frase)
    nombres: ['Grulla de papel', 'Tetera de hierro', 'Daruma tuerto'],
    frases: ['La dobló una niña para que el dojo no estuviera solo', 'Aún está tibia: alguien se fue con prisa', 'Le pintarás el otro ojo cuando lo lleves a casa']
  },

  // --- MOCHI DE LA ABUELA (turbo) --------------------------------------------
  turbo: {
    multiplicador: 1.4,  // "¡Eres un poco más rápido... por un rato!"
    duracion: 5,
    reaparicion: 20
  },

  // --- ARMAS Y PERGAMINOS (se usan en el dojo con el botón de acción) ---
  // Las que NO tienen precio se ganan en misiones. Las que tienen precio son pergaminos de la tienda.
  // duracion y espera en segundos · radio en casillas · boton = texto del botón
  armas: {
    humo:      { nombre: 'Abanico de humo',    boton: 'HUMO',     desc: 'Una nube y los espectros te pierden',      duracion: 3, radio: 5,   espera: 20 },
    senuelo:   { nombre: 'Campanilla señuelo', boton: 'CAMPANA',  desc: 'La dejas sonando y van hacia ella',        duracion: 5, radio: 9,   espera: 20 },
    paraguas:  { nombre: 'Paraguas de papel',  boton: 'PARAGUAS', desc: 'Te tapas: no te ven pero andas despacio',  duracion: 4, freno: 0.45, espera: 18 },
    geta:      { nombre: 'Geta de hierro',     boton: 'PISOTÓN',  desc: 'Un pisotón que aturde a los de cerca',     duracion: 3, radio: 2.8, espera: 22 },
    shuriken:  { nombre: 'Pergamino: Estrellas que no pinchan', boton: 'ESTRELLA', desc: 'No hace ni cosquillas pero el ruido los despista', duracion: 4, radio: 7, espera: 8,  precio: 35 },
    pasoHumo:  { nombre: 'Pergamino: Paso de humo',             boton: 'TRASPASAR', desc: 'Atraviesas la pared que tengas delante',          duracion: 0.6, radio: 3, espera: 25, precio: 80 },
    asesinato: { nombre: 'Pergamino: Saludo por la espalda',    boton: 'CORTE',    desc: 'Acaba con un espectro por detrás. Vuelve al rato', duracion: 14, radio: 1.7, espera: 50, precio: 150 }
  },

  // --- TÉCNICAS (se aprenden una vez en la tienda y funcionan solas) ---
  tecnicas: {
    mizugumo: { nombre: 'Pergamino: Paso del mizugumo', desc: 'Esprinta y corre sobre el agua. Encima no puedes parar: si te quedas sin aguante, al agua.', precio: 110,
                gasto: 1.4,                           // sobre el agua el aguante baja 1,4 veces más rápido que esprintando en tierra
                alCaer: '¡Chof! Hay que salir antes de cansarse' }
  },

  // --- TIENDA DEL KAPPA ------------------------------------------
  tienda: {
    nombre: 'El Platito Lleno',
    saludo: 'Todo a precio de pepino. No admito reverencias: se me derrama el agua.',
    precios: [10, 25, 45, 75, 120],   // lo que cuesta cada nivel de una mejora
    mejoras: {                   // efecto = cuánto mejora cada nivel
      sigilo:    { nombre: 'Pies de gato',      desc: 'Reduce un 0,5 % el alcance de detección por mejora', efecto: 0.005 },
      velocidad: { nombre: 'Piernas de liebre', desc: 'Corres un poco más',                 efecto: 0.04 },
      aguante:   { nombre: 'Pulmón de buzo',    desc: 'Aguantas más rato esprintando',      efecto: 0.5 },
      fuerza:    { nombre: 'Lomo de buey',      desc: 'Las reliquias te frenan menos',      efecto: 0.15 }
    }
  },

  // --- ASPECTOS DEL HÉROE ----------------------------------------
  // retrato = imagen que sale al elegirlo y en la tienda
  // dibujo = personaje de personajes.js (si quitas esa línea se usa el dibujo sencillo de sombrero)
  // sombrero: 'paja', 'plano' o 'mascara' · precio 0 = lo tienes desde el principio
  aspectos: {
    ronin: { nombre: 'Rōnin del sombrero roto', desc: 'El de siempre', precio: 0,  dibujo: 'ronin', retrato: arteIntegrado['assets/ronin.jpg'], sombrero: 'paja',    ropa: '#f3ecdc', hakama: '#6b665c', faja: '#e2574c', cara: '#2a2224', detalle: '#8a5a34', ojos: '#ffffff', vaina: '#15171d' },
    azul:  { nombre: 'Lluvia sin paraguas',     desc: 'Azul y callado', precio: 120, dibujo: 'lluvia', retrato: arteIntegrado['assets/lluvia.jpg'], sombrero: 'plano',   ropa: '#f1f1f4', hakama: '#2c3350', faja: '#3d5a9b', cara: '#2f4a85', detalle: '#c9a04a', ojos: '#dfe9ff', vaina: '#1c2238' },
    rojo:  { nombre: 'Ciervo carmesí',          desc: 'Rojo y con astas', precio: 160, dibujo: 'ciervo', retrato: arteIntegrado['assets/ciervo.jpg'], sombrero: 'mascara', ropa: '#f4f1ea', hakama: '#3a3a42', faja: '#d62f3a', cara: '#1a1216', detalle: '#c9a04a', ojos: '#ff5a5a', vaina: '#b3202c', mano: '#d62f3a' }
  },

  // --- CARÁCTER DE CADA ESPECTRO ---------------------------------
  // El 1 del mapa es el primero de esta lista, el 2 el segundo, etc. (el dibujo sale de personajes.js)
  // Los números multiplican la ficha de la dificultad: 1 = normal, 1.5 = un 50 % más.
  // recta = acelera en línea recta · erratico = cambia de idea (veces por segundo) · castigo = multiplica el tiempo que pierdes
  espectros: {
    monje:  { nombre: 'Hitotsu, el monje tuerto',   vel: 0.8,  velCaza: 0.85, alcance: 1.5, angulo: 0.7, oido: 0.8, alto: 2.6 },
    cesta:  { nombre: 'Mekura, la cesta que mira',  vel: 1.05, velCaza: 1.0,  alcance: 0.9, angulo: 1,   oido: 1.2, recta: 1.5, alto: 2.0 },
    ogro:   { nombre: 'Kuroni, el ogro de carbón',  vel: 0.75, velCaza: 0.9,  alcance: 1,   angulo: 1,   oido: 0.7, castigo: 2, alto: 2.7 },
    cabeza: { nombre: 'Akakubi, la boca roja',      vel: 1.05, velCaza: 1.05, alcance: 1,   angulo: 1.3, oido: 1,   erratico: 0.4, alto: 2.1 , flota: true}
  },

  // --- HÉROE AUTOMÁTICO (cuando tú juegas de villano) ------------
  bot: {
    prudencia: 2,     // a cuántas casillas de un espectro prefiere no pasar (más = más cobarde)
    reaccion: 0.35    // cada cuántos segundos se replantea el camino (menos = más listo)
  },

  // --- HUEVO DE DRAGÓN (premio por completar las 4 misiones) -----
  huevo: {
    nombre: 'Huevo de dragón de jade',
    probabilidad: 0.25,   // 0.25 = 1 de cada 4 golpes no te hace nada
    freno: 0.5,           // el espectro que te golpeó va a la mitad de velocidad...
    duracion: 2.2,        // ...durante estos segundos
    aviso: '¡El huevo late y te protege!',
    frases: ['Bajo el cerezo, donde nadie había mirado, algo late despacio.', 'Es un huevo verde y tibio, con escamas que no son de ningún animal que conozcas.', 'La aldea entera te lo confía: mientras lo lleves, uno de cada cuatro golpes no te hará nada, y quien te golpee se quedará medio dormido un par de segundos.']
  },

  // --- MÚSICA -----------------------------------------------------
  // Los temas (koto, shamisen, taiko) están escritos en musica.js y suenan solos según dónde estés.
  // Para usar TU instrumental: guarda el archivo en assets/ y escribe aquí 'assets/aldea.mp3' (o dojo).
  // Desde código: Audio.play('aldea') · Audio.play('dojo') · Audio.stop() · Audio.auto()   (con fundido y en bucle)
  // El volumen de la música está en "sonido" > musica.
  musica: { activada: true, aldea: '', dojo: '' },

  // --- ESPECTROS: una ficha por dificultad ----------------------
  // velocidades en píxeles/seg · alcance y oído en casillas · ángulo en grados
  dificultadInicial: 'normal',
  dificultades: {
    facil:   { velPatrulla: 36, velBusca: 50, velPersigue: 70,  alcance: 4.5, angulo: 60, oido: 1.2, memoria: 1.5 },
    normal:  { velPatrulla: 44, velBusca: 60, velPersigue: 86,  alcance: 5.5, angulo: 70, oido: 1.6, memoria: 2.5 },
    dificil: { velPatrulla: 54, velBusca: 72, velPersigue: 100, alcance: 6.5, angulo: 85, oido: 2.0, memoria: 3.5 }
  },

  // --- GORE Y AMBIENTE ------------------------------------------
  gore: {
    sangre: true,        // los espectros gotean y dejan rastro
    intensidad: 1,       // 0 = nada, 1 = normal, 2 = carnicería
    temblor: 1,          // sacudida de pantalla al atraparte (0 = sin sacudida)
    latido: true,        // borde rojo y latido de corazón cuando te persiguen
    oscuridad: 0.6,      // cuánto se oscurece todo cuando hay un espectro cerca (0 = nada, 1 = casi negro)
    susto: true          // primer plano del espectro cuando te atrapa
  },

  // --- AMBIENTACIÓN --------------------------------------------
  ambiente: {
    tema: 'dojo',        // 'dojo' = tatamis, paredes de papel y tejados · 'jardin' = césped y setos
    petalos: true,       // pétalos de cerezo flotando
    nombreZona: { color: '#efe7d4', quieto: 1.1, fundido: 1.6 }   // nombre del lugar al entrar: color, segundos quieto, segundos en desvanecerse
  },

  // --- TELETRANSPORTE (el ninja) --------------------------------
  teletransporte: {
    duracion: 1.5,       // segundos que dura la escena del ninja
    espera: 4            // segundos hasta que el portal vuelve a funcionar
  },

  // --- MAPA -----------------------------------------------------
  mapa: {
    mostrarEspectros: true, // el mapa enseña dónde están
    mostrarRutas: true,     // ...y por dónde van a pasar (clave para planear el robo)
    mostrarConos: true      // cono de visión en la vista de juego
  },

  // --- SONIDO ---------------------------------------------------
  // --- RUEDA DEL CEDRO (ruleta de la aldea) ----------------------
  ruleta: {
    fichasPorPlanta: 1,    // fichas que ganas al superar cada planta del Dojo
    fichasExtraDojo: 0     // fichas de más al completar las 3 plantas
  },

  // --- RENDIMIENTO ------------------------------------------------
  // Si un móvil va a tirones: baja pantalla.calidadMax a 1.5 y pon rayosDeLuz en false.
  // Animación del héroe al moverse: assets/mundo/ronin-correr.webp es UNA fila de fotogramas iguales
  animacionHeroe: {
    activa: true,
    altoPersonaje: 156,     // píxeles que mide el personaje quieto dentro de cada casilla (casillas de 192 px)
    lineaPies: 180,         // píxel de la casilla donde tocan los pies el suelo
    escala: 1.08,           // tamaño en pantalla
    altoManos: 0.97,        // a qué altura (0-1 del dibujo) se pone la reliquia que lleva en alto
    // cada tira: imagen (assets/mundo/<imagen>.webp, UNA fila de casillas iguales), fotogramas y ritmo
    tiras: {
      quieto: { imagen: 'ronin-quieto', fotogramas: 22, fps: 11 },          // respira (unos 2 s por ciclo)
      correr: { imagen: 'ronin-correr', fotogramas: 22, velocidad: 2.75 },  // 30 fotogramas/s andando, más al esprintar
      cargar: { imagen: 'ronin-cargar', fotogramas: 22, velocidad: 2.75 },  // con la reliquia en alto, estilo Zelda
      lanzar: { imagen: 'ronin-lanzar', fotogramas: 22, duracion: 0.55 }    // se ve una vez al lanzar
    }
  },


  // Decoración: faroles de piedra (assets/mundo/farol-piedra.webp) por zona, en casillas [columna, fila]
  decoracion: {
    altoFarol: 1.7,
    faroles: { aldea: [[6, 4], [17, 4], [6, 12], [17, 12]] }
  },
  // Cofres repartidos por las zonas del mundo. Salen en sitios al azar (cambian cada día si cadaDia = true)
  cofres: {
    porZonaDefecto: 2,                 // cofres en cada zona
    porZona: { aldea: 2 },             // o un número distinto para una zona concreta
    cadaDia: true,                     // al día siguiente vuelven a salir, en otros sitios
    tamano: 1.8,                       // tamaño en casillas
    fotogramas: 24,                    // assets/mundo/cofre.webp: fila de 24 casillas de 192 px
    duracionApertura: 1.4,             // segundos que tarda en abrirse
    // peso = lo a menudo que sale (suman 100). monedas/n = [mínimo, máximo]. objeto = rarezas que puede dar
    rarezas: [
      { nombre: 'Común',      peso: 55,  color: '#6b4a2a', monedas: [8, 15] },
      { nombre: 'Poco común', peso: 25,  color: '#3f7a33', monedas: [18, 30], material: { n: [1, 2], tipos: ['carbon', 'cobre'] } },
      { nombre: 'Raro',       peso: 13,  color: '#2f5fa8', fichas: 1, material: { n: [2, 3] } },
      { nombre: 'Épico',      peso: 5.5, color: '#7a2f9a', monedas: [30, 50], objeto: ['Raro', 'Épico'], siRepetido: 40 },
      { nombre: 'Fenomenal',  peso: 1.5, color: '#c8901a', monedas: [100, 160], fichas: 3, xp: 300, objeto: ['Legendario', 'Épico'], siRepetido: 120, fenomenal: true }
    ]
  },
  // Consejos que salen UNA vez la primera vez que ves cada cosa. Cambia los textos aquí.
  // Para no verlos nunca: consejosApagados: true. Para volver a verlos: Opciones > Borrar progreso.
  consejosApagados: false,
  consejos: {
    dojo:   { titulo: 'El dojo', lineas: ['Coge las reliquias (▲) y llévalas a la base dorada antes de que acabe el tiempo.', 'Los centinelas ven en un cono delante de ellos. Amarillo patrulla, naranja busca, rojo te persigue.', 'En las zonas verdes y en la base no pueden verte. Si te atrapan, pierdes la reliquia y tiempo.'] },
    lanzar: { titulo: 'Puedes lanzarla', lineas: ['Pulsa LANZAR (o F) para tirar la reliquia hacia donde miras.', 'La grulla vuela 4 casillas; la tetera y el daruma, 2. Al caer hacen ruido y los centinelas van a mirar: úsalo para despistarlos.'] },
    tienda: { titulo: 'La tienda del kappa', lineas: ['Aquí cambias monedas por mejoras (sigilo, velocidad, fuerza) y por técnicas en pergamino.', 'Las monedas se ganan en el dojo, en las misiones y en el puesto de zumos.'] },
    ruleta: { titulo: 'La Rueda del Cedro', lineas: ['Cada giro cuesta 1 ficha y da equipo, materiales o curiosidades.', 'Las fichas se ganan al superar cada planta del dojo y en el puesto de zumos.'] },
    equipo: { titulo: 'Tu bolsa', lineas: ['Toca un hueco (sombrero, arma, anillo…) para ver lo que puedes ponerte ahí.', 'En Atributos ves cómo te mejora el equipo. En Materiales, lo que llevas para la forja.'] },
    zumos:  { titulo: 'Zumos de Momo', lineas: ['Pasa el dedo por la fruta para cortarla. Varias de un tajo dan combo.', 'Si se te caen 3, se acaba. No cortes los petardos. Los melocotones a veces salpican: ¡eso da puntos extra!'] }
  },
  // Lanzar reliquias en el dojo. Orden: [grulla (1 punto), tetera (2), daruma (3)]
  lanzar: {
    alcance: [4, 2, 2],             // casillas que vuela cada una (se para antes de una pared)
    duracion: 0.55,                 // segundos que tarda en caer un lanzamiento de 4 casillas
    ruidoCasillas: [2, 3.5, 4]      // a cuántas casillas oyen el golpe los centinelas (lo pesado suena más)
  },
  rendimiento: {
    rayosDeLuz: true,      // haces de sol con mezcla de luz (bonitos pero costosos en móviles viejos)
    calidadAutomatica: true, // si el móvil va lento, baja la nitidez sola (solo baja, nunca sube y baja)
    calidadMinima: 1.25,   // hasta dónde puede bajar (1 = mínima)
    umbralMs: 14           // milisegundos por fotograma a partir de los que se considera lento
  },

  sonido: { activado: true, volumen: 0.35, musica: 0.5 },   // volumen: efectos · musica: volumen de la música (0 = sin música)

  // --- IMÁGENES PROPIAS (opcional) ------------------------------
  // Deja '' para usar el dibujo hecho en código.
  // Para usar una imagen: guárdala en assets/ y escribe su nombre, p. ej. 'assets/espectro.png'
  sprites: {
    heroe: '',
    espectro: '',
    gema: '',
    botas: ''
  },

  // --- COLORES --------------------------------------------------
  colores: {
    hierba1: '#5fae3e', hierba2: '#57a338', flor: '#fff4a8',
    seto: '#4f9a3a', setoLuz: '#6fbf52', tierra: '#8a5a34', tierraSombra: '#5f3b20',
    agua: '#4aa8e0', aguaLuz: '#9fd8f5',
    tatami1: '#c9c48a', tatami2: '#bdb97c', tatamiBorde: '#3d4a2c',
    madera: '#5a3a22', shoji: '#f6ecd4', tejado: '#39414f',
    ninja: '#2a2440', ninjaCinta: '#d62f3a', portal: '#b06cff',
    seguro1: '#c9b6f2', seguro2: '#e6dcfb',
    base1: '#f2c94c', base2: '#ffe08a',
    heroe: '#2b2f3a', heroeCapucha: '#1c1f27', heroePiel: '#f3c9a0', heroeBufanda: '#d62f3a', heroeMetal: '#e8c15a',   // armadura, casco, piel, detalles rojos, dorados
    espectro: '#1d1320', espectroHueso: '#d9cfc0', sangre: '#a12645', sangreOscura: '#460d21', ojo: '#ffe94a',
    gema1: '#ffd23f', gema2: '#3fd0ff', gema3: '#ff4f6e',
    botas: '#ff8a3d',
    patrulla: '#ffe94a', busca: '#ff9d2e', persigue: '#ff2e3f',
    papel: '#e8cf9a', papelBorde: '#a8742f', tinta: '#5a3a1a', mapaMuro: '#b98a4a',
    hud: '#1b1420', hudTexto: '#ffffff', fondo: '#0d0a10'
  },

  // --- TEXTOS ---------------------------------------------------
  textos: {
    titulo: 'RELIQUIAS',
    subtitulo: 'Recupera las reliquias. Que los onryō no te vean.',
    pideNombre: '¿Cómo te llamas, samurái?', entrar: 'ENTRAR', hola: 'Hola', cambiarNombre: 'Cambiar nombre', aldea: 'ALDEA', arma: 'Arma', bando: 'Bando', bandoHeroe: 'Héroe', bandoVillano: 'Villano (en pruebas)', tiendaRonda: 'PASAR POR LA TIENDA DEL KAPPA', sinArma: 'Sin arma todavía: ayuda a la gente de la aldea.', shhh: 'shhh…',
    jugar: 'JUGAR',
    dificultad: 'Dificultad',
    mapa: 'Mapa',
    comoJugar: 'Coge una gema y llévala a la BASE dorada. En los cojines lilas no pueden verte. Pisa un shuriken y el ninja te lleva al otro extremo. Mira el mapa: enseña por dónde van a pasar.',
    ronda: 'RONDA',
    puntos: 'Pts',
    finRonda: 'Fin de la ronda',
    siguiente: 'SIGUIENTE RONDA',
    finPartida: 'Fin de la partida',
    record: 'Récord',
    nuevoRecord: '¡Nuevo récord!',
    otraVez: 'OTRA VEZ',
    menu: 'MENÚ',
    pausa: 'PAUSA',
    seguir: 'SEGUIR',
    atrapado: '¡TE HAN ATRAPADO!',
    turbo: '¡Mochi de la abuela! Piernas ligeras un rato', racha: '¡Racha',
    entregada: '¡Reliquia a salvo!',
    nombresDificultad: { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' }
  },

  // --- CONTROLES DE TECLADO -------------------------------------
  // Nombres de tecla: https://keycode.info (campo "code")
  controles: {
    arriba: ['ArrowUp', 'KeyW'],
    abajo: ['ArrowDown', 'KeyS'],
    izquierda: ['ArrowLeft', 'KeyA'],
    derecha: ['ArrowRight', 'KeyD'],
    sprint: ['ShiftLeft', 'ShiftRight', 'Space'],
    accion: ['KeyE', 'Enter'],
    lanzar: ['KeyF', 'KeyQ'],
    cambiarArma: ['KeyR', 'Tab'], // cambiar de pergamino en el dojo     // lanzar la reliquia que llevas (en el dojo)     // hablar, entrar y usar el arma
    pausa: ['KeyP', 'Escape'],
    silencio: ['KeyM']
  }
};
