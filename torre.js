// ============================================================
//  TORRE.JS — la Torre del Dojo: 15 pisos, 3 jefes, cartas y botín
//  Todo lo editable de la incursión está aquí. Los mapas se generan solos
//  en cada partida (laberinto con salas), así que nunca son iguales.
//
//  objetivo:
//    reliquias  → entrega 'meta' reliquias en la base
//    sigilo     → entrega 'meta' reliquias; si te ven, la meta sube 1 (una vez)
//    farolillos → apaga 'meta' farolillos pasando por encima
//    idolo      → coge el ídolo del fondo y tráelo a la base: al cogerlo, todos te buscan
//    jefe       → entrega 'meta' reliquias mientras el jefe te caza
// ============================================================
const TORRE = {
  nombre: 'Torre del Dojo',
  tamano: { ancho: 35, alto: 25 },      // tamaño de los mapas generados (impares)
  // cada piso: objetivo, meta, espectros (cuántos), tiempo (s), tipos de espectro que pueden salir, jefe
  pisos: [
    { objetivo: 'reliquias',  meta: 2, espectros: 3, tiempo: 60, tipos: ['monje'] },
    { objetivo: 'farolillos', meta: 3, espectros: 3, tiempo: 55, tipos: ['monje', 'cesta'] },
    { objetivo: 'sigilo',     meta: 2, espectros: 4, tiempo: 60, tipos: ['monje', 'cesta'] },
    { objetivo: 'idolo',      meta: 1, espectros: 4, tiempo: 55, tipos: ['monje', 'cesta', 'ogro'] },
    { objetivo: 'jefe',       meta: 3, espectros: 2, tiempo: 80, tipos: ['monje'], jefe: 'kuroni' },
    { objetivo: 'reliquias',  meta: 3, espectros: 5, tiempo: 60, tipos: ['cesta', 'ogro'] },
    { objetivo: 'farolillos', meta: 4, espectros: 5, tiempo: 55, tipos: ['monje', 'ogro', 'cabeza'] },
    { objetivo: 'sigilo',     meta: 3, espectros: 5, tiempo: 60, tipos: ['cesta', 'cabeza'] },
    { objetivo: 'idolo',      meta: 1, espectros: 6, tiempo: 55, tipos: ['monje', 'cesta', 'ogro', 'cabeza'] },
    { objetivo: 'jefe',       meta: 4, espectros: 3, tiempo: 85, tipos: ['cesta', 'ogro'], jefe: 'hitotsu' },
    { objetivo: 'reliquias',  meta: 4, espectros: 6, tiempo: 60, tipos: ['ogro', 'cabeza'] },
    { objetivo: 'farolillos', meta: 5, espectros: 6, tiempo: 55, tipos: ['monje', 'cesta', 'ogro', 'cabeza'] },
    { objetivo: 'sigilo',     meta: 4, espectros: 7, tiempo: 65, tipos: ['cesta', 'cabeza'] },
    { objetivo: 'idolo',      meta: 1, espectros: 7, tiempo: 50, tipos: ['monje', 'cesta', 'ogro', 'cabeza'] },
    { objetivo: 'jefe',       meta: 5, espectros: 4, tiempo: 95, tipos: ['ogro', 'cabeza'], jefe: 'akakubi' }
  ],

  // textos de cada objetivo ({m} = meta)
  textos: {
    reliquias: 'Entrega {m} reliquias en la base',
    sigilo: 'Entrega {m} reliquias sin que te vean (si te ven, una más)',
    farolillos: 'Apaga {m} farolillos pasando por encima',
    idolo: 'Roba el ídolo dorado y tráelo a la base. Al cogerlo, todos irán a por ti',
    jefe: 'Entrega {m} reliquias. El jefe te está cazando'
  },

  // jefes: tipo de espectro, tamaño, vista y habilidad
  jefes: {
    kuroni:  { nombre: 'Kuroni el Grande',      tipo: 'ogro',   escala: 1.7, vista: 1.3, vel: 1.1, habilidad: 'embestida', cada: 6,
               frase: 'El suelo tiembla. Kuroni embiste en línea recta: apártate de su camino.' },
    hitotsu: { nombre: 'Hitotsu, Ojo del Templo', tipo: 'monje', escala: 1.6, vista: 1.4, vel: 1,   habilidad: 'mirada',    cada: 9,
               frase: 'Cuando su ojo brille, escóndete en una zona segura: verá dónde estás y se lo dirá a todos.' },
    akakubi: { nombre: 'Akakubi, la Luna Roja',  tipo: 'cabeza', escala: 1.8, vista: 1.3, vel: 1.1, habilidad: 'luna',      cada: 7,
               frase: 'Akakubi atraviesa las sombras y aparece cerca de ti. A mitad del piso llama a sus crías.' }
  },

  // botín que se acumula por piso superado (se cobra al retirarte o al terminar la torre)
  botinPorPiso: { monedas: 10, subida: 4, materialCada: 2, fichasEnJefe: 2, xp: 40 },
  perdidaPorCaptura: 0.1,   // al atraparte pierdes este % de las monedas acumuladas
  siFallas: 0.5,            // si se acaba el tiempo, te llevas este % de lo acumulado

  // cartas: al superar un piso eliges 1 de 3. Se acumulan durante la incursión
  cartas: [
    { id: 'pulmon',   nombre: 'Pulmón de buzo',     desc: '+30 % de aguante',                        mod: { aguante: 0.3 } },
    { id: 'liebre',   nombre: 'Pies de liebre',     desc: '+12 % de velocidad',                      mod: { velocidad: 0.12 } },
    { id: 'niebla',   nombre: 'Niebla baja',        desc: 'Los espectros ven un 15 % menos',          mod: { vista: 0.15 } },
    { id: 'reloj',    nombre: 'Arena del reloj',    desc: '+12 s en cada piso',                       mod: { tiempo: 12 } },
    { id: 'codicia',  nombre: 'Codicia',            desc: 'Botín ×1,5 pero un espectro más por piso', mod: { botin: 0.5, espectroExtra: 1 } },
    { id: 'sombra',   nombre: 'Paso de sombra',     desc: 'Al salir de una zona segura, 2 s invisible', mod: { sombra: 2 } },
    { id: 'piel',     nombre: 'Piel de tortuga',    desc: 'Pierdes la mitad de botín y tiempo al ser atrapado', mod: { piel: 0.5 } },
    { id: 'iman',     nombre: 'Manos de mono',      desc: 'Coges las reliquias desde una casilla de distancia', mod: { iman: 1 } },
    { id: 'avaricia', nombre: 'Bolsa sin fondo',    desc: 'Llevas una reliquia más a la vez',          mod: { bolsa: 1 } },
    { id: 'apuesta',  nombre: 'Doble o nada',       desc: 'Botín ×2, pero si fallas un piso lo pierdes todo', mod: { botin: 1, todoONada: 1 } }
  ]
};
