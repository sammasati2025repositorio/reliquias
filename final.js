// ============================================================
//  FINAL.JS — el capítulo final: «La Noche de los Treinta Años»
//  Se desbloquea al conseguir el Huevo de jade (todas las misiones hechas).
//  Usa el mismo motor que la Torre del Dojo (mapas generados, cartas y jefes),
//  así que se edita igual que torre.js. Todo lo de aquí se puede cambiar.
// ============================================================
const FINAL = {
  nombre: 'La Noche de los Treinta Años',
  boton: '⛩ Capítulo final · La Noche de los Treinta Años',
  bloqueado: 'Capítulo final: ayuda a todos en la aldea y en el mundo para desbloquearlo.',
  tamano: { ancho: 35, alto: 25 },

  // 5 pisos: la noche en que el agua vuelve a su cauce y los onryō intentan cerrarlo otra vez
  pisos: [
    { objetivo: 'reliquias',  meta: 3, espectros: 4, tiempo: 70, tipos: ['monje', 'cesta'],
      frase: 'El agua vuelve a correr y arrastra las reliquias del templo. Rescátalas antes de que se hundan.' },
    { objetivo: 'farolillos', meta: 5, espectros: 5, tiempo: 65, tipos: ['monje', 'cesta', 'ogro'],
      frase: 'Los faroles del desvío guían a los onryō hacia la compuerta. Apágalos.' },
    { objetivo: 'sigilo',     meta: 3, espectros: 6, tiempo: 70, tipos: ['cesta', 'cabeza'],
      frase: 'Las cabezas vigilan el cauce. Que no te vean: cada mirada les da fuerza.' },
    { objetivo: 'idolo',      meta: 1, espectros: 6, tiempo: 60, tipos: ['monje', 'ogro', 'cabeza'],
      frase: 'El sello de Ume está al fondo. Cuando lo cojas, toda la noche irá a por ti.' },
    { objetivo: 'jefe',       meta: 5, espectros: 4, tiempo: 110, tipos: ['ogro', 'cabeza'], jefe: 'mizuchi' }
  ],

  textos: {
    reliquias: 'Rescata {m} reliquias y llévalas a la base',
    sigilo: 'Entrega {m} reliquias sin que te vean (si te ven, una más)',
    farolillos: 'Apaga {m} faroles del desvío',
    idolo: 'Coge el sello de Ume y tráelo a la base',
    jefe: 'Entrega {m} reliquias mientras Mizuchi te caza'
  },

  // el jefe final usa las tres habilidades por turnos: embiste, abre el ojo y atraviesa las sombras
  jefes: {
    mizuchi: { nombre: 'Mizuchi, el Agua Retenida', tipo: 'ogro', escala: 2.1, vista: 1.4, vel: 1.15, habilidad: 'tormenta', cada: 6,
               frase: 'Treinta años de agua quieta se levantan. Mizuchi embiste, mira y aparece a tu lado: escóndete en las zonas seguras.' }
  },

  botinPorPiso: { monedas: 40, subida: 15, materialCada: 1, fichasEnJefe: 10, xp: 120 },
  perdidaPorCaptura: 0.1,
  siFallas: 0.5,
  cartas: null,              // null = usa las cartas de la Torre del Dojo

  // premio al terminar la historia (además del botín)
  premio: { monedas: 2000, fichas: 20, xp: 1500, objeto: ['Legendario'] },

  // ---------- la escena final: cada lámina es un texto con el retrato de quien habla ----------
  // retrato: id de personaje (aldea.js / mundo.js) o vacío para narrador
  epilogo: [
    { retrato: '',  titulo: 'Amanece', texto: 'El agua baja por su cauce viejo por primera vez en treinta años. Suena distinto: como algo que por fin respira.' },
    { retrato: 'v', titulo: 'Ren',     texto: 'Di la orden de cerrar la compuerta para salvar las casas. Hoy la abro delante de todos. Las promesas también se pagan.' },
    { retrato: 'f', titulo: 'Iria',    texto: 'Las raíces ya no beben al revés. El bosque dormirá esta noche sin hacer ruido.' },
    { retrato: 'j', titulo: 'Narel',   texto: 'He cobrado mi primer verso. Era malísimo. Lo he guardado igualmente.' },
    { retrato: 'l', titulo: 'Aya',     texto: 'El cobre de la compuerta brilla otra vez. Lo dejaremos sin barnizar: que se vea el tiempo que ha pasado.' },
    { retrato: '',  titulo: 'La aldea', texto: 'Esa noche nadie esconde nada. Se cuentan las historias en voz alta, con los nombres verdaderos.' },
    { retrato: '',  titulo: 'Y tú',    texto: 'Un rōnin sin señor ha devuelto el agua a su sitio. Algunos dicen que fue suerte. Las grullas de papel dicen otra cosa.' }
  ],

  creditos: [
    'RELIQUIAS',
    'Una historia de agua, promesas y grullas de papel',
    '',
    'Idea, dirección y mundo · Sammasati',
    'Programación · Claude',
    'Música y sonido · sintetizados en el propio juego',
    '',
    'Gracias por jugar.',
    'El agua recuerda a quien la escucha.'
  ],

  // después de la historia: Modo Leyenda (más difícil, mejor botín) en la Torre y en el capítulo final
  leyenda: {
    nombre: 'Modo Leyenda',
    desc: 'Un espectro más por piso, los espectros ven un 15 % más y el botín se dobla.',
    mods: { espectroExtra: 1, vista: -0.15, botin: 1 }
  }
};
