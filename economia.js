// ============================================================
//  ECONOMIA.JS — recompensas, mercado y progreso
//  Todo lo editable de cómo se gana y se gasta está aquí.
//  · rangos: según tu nivel cambian el título, lo que vende el mercado y los premios
//  · diaria: premio por entrar cada día (racha de 7 días)
//  · logros: metas que se cumplen jugando y se cobran en el Diario > Recompensas
//  · mercado: ofertas del día del kappa (cambian cada día y según tu rango) y precio de venta de materiales
// ============================================================
const ECONOMIA = {
  // Rango según el nivel del viajero. mult = multiplica las monedas de cofres, logros y premio diario
  rangos: [
    { desde: 1, nombre: 'Aprendiz',        mult: 1 },
    { desde: 3, nombre: 'Viajero',         mult: 1.25 },
    { desde: 5, nombre: 'Rōnin',           mult: 1.5 },
    { desde: 8, nombre: 'Leyenda del cedro', mult: 2 }
  ],

  // Premio por entrar un día (si fallas un día, vuelve a empezar). El día 7 es el gordo y luego se repite
  diaria: [
    { monedas: 15 },
    { monedas: 25 },
    { monedas: 30, material: ['carbon', 2] },
    { monedas: 40 },
    { fichas: 1, monedas: 30 },
    { monedas: 60, material: ['cobre', 2] },
    { fichas: 2, monedas: 100, objeto: ['Raro', 'Épico'] }
  ],

  // Logros. stat = lo que se cuenta · meta = cuántas veces · premio = lo que das
  // stats posibles: frutas, squirts, cofres, plantas, reliquias, lanzamientos, cortes, misiones, partidasZumos, aguaCruzada
  logros: [
    { id: 'fruta1',  nombre: 'Primer zumo',          stat: 'frutas',      meta: 25,  premio: { monedas: 20 } },
    { id: 'fruta2',  nombre: 'Mano de Momo',         stat: 'frutas',      meta: 200, premio: { monedas: 80, fichas: 1 } },
    { id: 'fruta3',  nombre: 'Tormenta de pulpa',    stat: 'frutas',      meta: 800, premio: { monedas: 200, objeto: ['Épico'] } },
    { id: 'squirt',  nombre: 'Ponte de lado',        stat: 'squirts',     meta: 10,  premio: { monedas: 40 } },
    { id: 'cofre1',  nombre: 'Buscatesoros',         stat: 'cofres',      meta: 5,   premio: { monedas: 40 } },
    { id: 'cofre2',  nombre: 'Llaves en el bolsillo', stat: 'cofres',     meta: 25,  premio: { fichas: 2, material: ['jade', 1] } },
    { id: 'planta1', nombre: 'Primer piso',          stat: 'plantas',     meta: 1,   premio: { monedas: 30 } },
    { id: 'planta2', nombre: 'El dojo te conoce',    stat: 'plantas',     meta: 10,  premio: { monedas: 120, fichas: 1 } },
    { id: 'planta3', nombre: 'Señor de las plantas', stat: 'plantas',     meta: 40,  premio: { monedas: 300, objeto: ['Legendario', 'Épico'] } },
    { id: 'reliq1',  nombre: 'Manos rápidas',        stat: 'reliquias',   meta: 30,  premio: { monedas: 50 } },
    { id: 'reliq2',  nombre: 'Coleccionista',        stat: 'reliquias',   meta: 300, premio: { monedas: 250, fichas: 2 } },
    { id: 'lanza',   nombre: 'Brazo de grulla',      stat: 'lanzamientos', meta: 20, premio: { monedas: 40 } },
    { id: 'corte',   nombre: 'Saludo por la espalda', stat: 'cortes',     meta: 10,  premio: { monedas: 120, material: ['jade', 1] } },
    { id: 'agua',    nombre: 'Pies de araña',        stat: 'aguaCruzada', meta: 5,   premio: { monedas: 60 } },
    { id: 'mision',  nombre: 'Buen vecino',          stat: 'misiones',    meta: 4,   premio: { monedas: 100, fichas: 1 } }
  ],

  // Mercado del día (en la tienda del kappa). Se eligen 'ofertas' al azar entre las que permite tu rango.
  // tipo: material | fichas | objeto | xp · rango = rango mínimo (0 = Aprendiz) · cantidad · precio
  mercado: {
    ofertas: 4,
    stock: [
      { tipo: 'material', id: 'carbon', cantidad: 3, precio: 18, rango: 0 },
      { tipo: 'material', id: 'cobre',  cantidad: 2, precio: 25, rango: 0 },
      { tipo: 'fichas',   cantidad: 1,  precio: 45, rango: 0 },
      { tipo: 'xp',       cantidad: 120, precio: 35, rango: 0 },
      { tipo: 'material', id: 'jade',   cantidad: 1, precio: 60, rango: 1 },
      { tipo: 'fichas',   cantidad: 3,  precio: 120, rango: 1 },
      { tipo: 'objeto',   rarezas: ['Raro'], precio: 140, rango: 1 },
      { tipo: 'objeto',   rarezas: ['Épico'], precio: 320, rango: 2 },
      { tipo: 'xp',       cantidad: 600, precio: 150, rango: 2 },
      { tipo: 'objeto',   rarezas: ['Legendario'], precio: 900, rango: 3 }
    ],
    // lo que te paga el kappa por cada material que le vendas
    venta: { carbon: 4, cobre: 7, jade: 20 }
  }
};
