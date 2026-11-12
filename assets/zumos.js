// ============================================================
//  ZUMOS.JS — El puesto de zumos de la aldea y su minijuego de cortar fruta
//  Todo lo editable está aquí: dónde está el puesto, qué frutas salen,
//  cuánto valen, cada cuánto salpican y qué premio da.
// ============================================================
const ZUMOS = {
  nombre: 'Zumos de Momo',
  vendedora: 'Momo',
  gato: 'momo-gato',                 // assets/mundo/momo-gato.webp: Momo, la gata que atiende el puesto
  retrato: 'assets/momo.jpg',        // imagen grande de Momo en el diálogo
  altoGato: 1.0,                    // lo alto que se dibuja Momo, en casillas
  puesto: { x: 3, y: 8, ancho: 2, fondo: 2 },   // casillas que ocupa en la aldea (esquina de arriba-izquierda y tamaño)
  imagen: 'puesto-zumos',            // assets/mundo/puesto-zumos.webp: el carrito que se ve en la aldea
  altoPuesto: 2.6,                   // lo alto que se dibuja el carrito, en casillas (súbelo para hacerlo más grande)
  fondoJuego: 'zumos-interior',      // assets/mundo/zumos-interior.webp: el interior donde se corta la fruta
  duracion: 60,                      // segundos que dura una partida
  fallosMax: 3,                      // frutas que se te pueden caer sin cortar antes de acabar
  frasesEntrada: [
    '¡Miau! Bienvenido a Zumos de Momo. El que corta, bebe.',
    'Pasa el dedo por la fruta en el aire. Cuantas más de un tajo, mejor.',
    'Ojo con las pócimas malditas. Y si cortas un melocotón maduro... ponte de lado.'
  ],

  // Frutas. peso = lo a menudo que sale · puntos = lo que vale · radio en píxeles de juego
  // piel / pulpa / semilla = colores · jugo = color de las gotas y manchas
  frutas: {
    melocoton: { nombre: 'Melocotón', peso: 22, puntos: 1, radio: 15, piel: '#f6a25e', piel2: '#e2574c', pulpa: '#ffd08a', semilla: '#8a4a2a', jugo: '#ffb36b',
                 squirt: 0.45 },          // probabilidad de que te salpique la pantalla al cortarlo
    mikan:     { nombre: 'Mikan',     peso: 22, puntos: 1, radio: 13, piel: '#ff9a1f', piel2: '#e07010', pulpa: '#ffc04a', semilla: '#f3e2a0', jugo: '#ffb030', gajos: true },
    sandia:    { nombre: 'Sandía',    peso: 12, puntos: 2, radio: 22, piel: '#3f8a3a', piel2: '#2b5f28', pulpa: '#ff4d5e', semilla: '#1c1414', jugo: '#ff3b4e', rayas: true },
    caqui:     { nombre: 'Caqui',     peso: 16, puntos: 1, radio: 14, piel: '#ff7a2a', piel2: '#d94e12', pulpa: '#ffab52', semilla: '#6a3a1a', jugo: '#ff8c3a', hoja: true },
    ume:       { nombre: 'Ciruela ume', peso: 14, puntos: 2, radio: 10, piel: '#b8d65a', piel2: '#7fa63a', pulpa: '#eaf2a0', semilla: '#a08040', jugo: '#dcef7a' },
    manzana:   { nombre: 'Manzana',   peso: 16, puntos: 1, radio: 13, piel: '#d8323a', piel2: '#8f1a22', pulpa: '#fbf0c8', semilla: '#4a2a14', jugo: '#f3e6b0', hoja: true },
    fresa:     { nombre: 'Fresa',     peso: 12, puntos: 2, radio: 10, piel: '#e8283a', piel2: '#a01424', pulpa: '#ff8a90', semilla: '#ffe27a', jugo: '#ff4a5a', puntitos: true, hoja: true },
    kiwi:      { nombre: 'Kiwi',      peso: 10, puntos: 2, radio: 11, piel: '#9a7448', piel2: '#5f4628', pulpa: '#8fcf3a', semilla: '#1c1a10', jugo: '#b4e05a', puntitosPulpa: true },
    platano:   { nombre: 'Plátano',   peso: 10, puntos: 1, radio: 12, piel: '#ffd84a', piel2: '#c79a1a', pulpa: '#fff4c8', semilla: '#8a6a30', jugo: '#fff0a0', estira: 1.7 },
    pina:      { nombre: 'Piña',      peso: 7,  puntos: 3, radio: 17, piel: '#e0a832', piel2: '#9a6a18', pulpa: '#ffe066', semilla: '#c89a30', jugo: '#ffe680', rombos: true, corona: true },
    melon:     { nombre: 'Melón',     peso: 7,  puntos: 3, radio: 20, piel: '#d9c860', piel2: '#8f8a30', pulpa: '#ffab5a', semilla: '#f6e6b0', jugo: '#ffc07a', rayas: true },
    uvas:      { nombre: 'Uvas',      peso: 8,  puntos: 2, radio: 13, piel: '#7a3a9a', piel2: '#4a1a66', pulpa: '#d8f0a0', semilla: '#5a3a20', jugo: '#9a4ab8', racimo: true },
    lichi:     { nombre: 'Lichi',     peso: 10, puntos: 2, radio: 12, piel: '#e0485a', piel2: '#a8283a', pulpa: '#f7ecdf', semilla: '#6a2a14', jugo: '#f6e8e0' },
    dorada:    { nombre: 'Níspero dorado', peso: 3, puntos: 10, radio: 12, piel: '#ffe066', piel2: '#d9a520', pulpa: '#fff2b0', semilla: '#8a5a20', jugo: '#ffe680', brilla: true }
  },
  puntosSquirt: 6,
  puntosPorAtaque: 0.08,             // puntos extra por fruta cortada por cada punto de ataque del arma equipada (katana 12 → +1 por fruta)                   // puntos extra cada vez que un melocotón te salpica la pantalla
  petardo: { peso: 9, castigo: 8 },   // petardo: no lo cortes. castigo = segundos que pierdes
  combo: { minimo: 3, extra: 2 },     // cortar 3 o más de un tajo da 2 puntos más por fruta

  // Premio al terminar: monedas por punto y fichas de la Rueda del Cedro si llegas a la marca
  // Zumos para la Torre: según los puntos, Momo te da uno (el mejor que alcances). Se beben solos al entrar a la Torre.
  // desde = puntos mínimos · mod = mejora durante esa incursión (igual que las cartas de torre.js) · max = cuántos puedes guardar
  zumos: [
    { id: 'melocoton', nombre: 'Zumo de melocotón', desc: '+20 % de aguante en tu próxima Torre', desde: 40, mod: { aguante: 0.2 }, max: 3 },
    { id: 'sandia',    nombre: 'Zumo de sandía',    desc: '+8 % de velocidad en tu próxima Torre', desde: 70, mod: { velocidad: 0.08 }, max: 3 },
    { id: 'dorado',    nombre: 'Néctar dorado',     desc: 'Los espectros ven un 10 % menos en tu próxima Torre', desde: 100, mod: { vista: 0.1 }, max: 2 }
  ],
  precioEntrada: 25,                 // monedas que cuesta cada partida
  sinDinero: 'La entrada son {p} monedas. Vuelve cuando las tengas, miau.',
  premio: { monedasPorPunto: 0.5, fichasSiLlegas: 1, marcaFicha: 70, comboFicha: 4 },   // ficha si llegas a 70 pts O si haces un combo de 4 de un tajo
  // Gran premio: muy difícil. unaVez = solo se cobra una vez por jugador
  granPremio: { puntos: 450, monedas: 100000, unaVez: true },
  tamanoImagen: 2.7,
  gravedad: 1.05,                    // lo rápido que caen las frutas (más bajo = más tiempo en el aire)                 // tamaño de las frutas con imagen (veces su radio)
  cortesTrozos: 3,                   // cuántas veces se puede cortar una fruta (1 = entera→mitades, 2 = cuartos, 3 = trocitos)
  puntosTrozo: 0,                    // puntos por cortar un trozo ya cortado (0 = solo por gusto)   // 0.5 = 1 moneda cada 2 puntos: con 50 pts recuperas la entrada
};
