// ============================================================
//  COMBATE.JS — combates por turnos, minería y refinado (v0.69)
//  Todo lo editable está aquí: monstruos, zonas, pasos entre combates,
//  técnicas, picos, minerales y probabilidades.
// ============================================================
const COMBATE = {
  // ---------- ENCUENTROS: cada cuántos pasos (casillas) salta un combate en cada zona ----------
  // [mínimo, máximo] · la aldea nunca tiene combates
  pasos: { bosque: [35, 45], ribera: [32, 42], manantial: [26, 34], paso: [18, 24], santuario: [16, 22] },
  fondos: { bosque: 'fondo-bosque', ribera: 'fondo-bosque', manantial: 'fondo-bosque', paso: 'fondo-santuario', santuario: 'fondo-santuario' },
  grupo: { bosque: [1, 2], ribera: [1, 2], manantial: [1, 3], paso: [2, 3], santuario: [2, 3] },   // cuántos monstruos salen

  // ---------- TIPOS: cada arma golpea fuerte (×1,5) a un tipo ----------
  tipos: {
    planta:   { nombre: 'Planta',   icono: '葉', color: '#5e9a3a' },
    hongo:    { nombre: 'Hongo',    icono: '茸', color: '#c05a3a' },
    piedra:   { nombre: 'Piedra',   icono: '石', color: '#5aa6b8' },
    espiritu: { nombre: 'Espíritu', icono: '霊', color: '#9a6ab8' }
  },
  fuerteContra: { katana: ['planta', 'hongo'], bokken: ['espiritu'], kanabo: ['piedra', 'hongo'] },
  multiplicadorTipo: 1.5,

  // ---------- EL HÉROE ----------
  heroe: {
    pvBase: 40, pvPorNivel: 9,            // vida = pvBase + pvPorNivel × (nivel - 1) + Protección
    golpeBase: 5, golpePorNivel: 1.3,     // daño = golpeBase + golpePorNivel × nivel + Ataque × porAtaque
    porAtaque: 0.55,
    critico: 0.1, multCritico: 1.6,
    espirituMax: 5, espirituPorTurno: 1, espirituAlDefender: 2,
    huida: 0.65                           // probabilidad de huir
  },

  // ---------- TÉCNICAS (cuestan espíritu ✦) ----------
  tecnicas: [
    { id: 'certero', nombre: 'Golpe certero', icono: '一', coste: 2, mult: 1.9, objetivo: 'uno', desc: 'Un tajo limpio: casi el doble de daño' },
    { id: 'viento',  nombre: 'Tajo del viento', icono: '風', coste: 3, mult: 0.8, objetivo: 'todos', desc: 'Golpea a todos los enemigos' },
    { id: 'calma',   nombre: 'Respiración del cedro', icono: '息', coste: 2, cura: 0.3, objetivo: 'yo', desc: 'Recuperas un 30 % de vida' }
  ],

  // ---------- OBJETOS ----------
  te: { nombre: 'Té verde', cura: 0.45, precio: 18, desc: 'Cura un 45 % de tu vida' },

  // ---------- MONSTRUOS ----------
  // imagen = assets/combate/m-<imagen>.webp · hab: fuerte (carga y pega doble) · coraza (se protege) · cura (se cura) · doble (ataca dos veces) · drena (roba vida)
  monstruos: {
    seta:        { nombre: 'Setita andante',       tipo: 'hongo',    pv: 12, atq: 3,  xp: 8,  monedas: 4,  hab: [] },
    osezno:      { nombre: 'Osezno de musgo',      tipo: 'planta',   pv: 16, atq: 4,  xp: 10, monedas: 5,  hab: ['fuerte'] },
    espiral:     { nombre: 'Bola espiral',         tipo: 'planta',   pv: 14, atq: 3,  xp: 9,  monedas: 5,  hab: ['cura'] },
    cervato:     { nombre: 'Cervatillo de corteza', tipo: 'espiritu', pv: 15, atq: 4,  xp: 10, monedas: 6,  hab: [] },
    pelusa:      { nombre: 'Seta pelusa',          tipo: 'hongo',    pv: 18, atq: 4,  xp: 11, monedas: 6,  hab: ['coraza'] },
    amanita:     { nombre: 'Amanita gruñona',      tipo: 'hongo',    pv: 22, atq: 5,  xp: 15, monedas: 8,  hab: ['fuerte'] },
    tortuga:     { nombre: 'Tortuga de musgo',     tipo: 'planta',   pv: 30, atq: 4,  xp: 16, monedas: 9,  hab: ['coraza'] },
    gatohierba:  { nombre: 'Gato de hierba',       tipo: 'planta',   pv: 19, atq: 6,  xp: 15, monedas: 8,  hab: ['doble'] },
    kitsune:     { nombre: 'Kitsune de hojas',     tipo: 'espiritu', pv: 24, atq: 6,  xp: 18, monedas: 10, hab: ['drena'] },
    cristalito:  { nombre: 'Cristalito',           tipo: 'piedra',   pv: 28, atq: 6,  xp: 20, monedas: 11, hab: ['coraza'] },
    capirote:    { nombre: 'Seta capirote',        tipo: 'hongo',    pv: 24, atq: 7,  xp: 19, monedas: 10, hab: ['fuerte'] },
    mascara:     { nombre: 'Máscara moteada',      tipo: 'espiritu', pv: 30, atq: 7,  xp: 22, monedas: 12, hab: ['drena'] },
    farolero:    { nombre: 'Portafaroles',         tipo: 'espiritu', pv: 26, atq: 6,  xp: 22, monedas: 12, hab: ['cura'] },
    musgoespiral:{ nombre: 'Musgo con setas',      tipo: 'planta',   pv: 32, atq: 7,  xp: 23, monedas: 12, hab: ['cura', 'coraza'] },
    jabali:      { nombre: 'Jabalí florido',       tipo: 'planta',   pv: 42, atq: 9,  xp: 32, monedas: 16, hab: ['fuerte'] },
    ciervo:      { nombre: 'Ciervo kitsune',       tipo: 'espiritu', pv: 36, atq: 9,  xp: 30, monedas: 15, hab: ['doble'] },
    golemcristal:{ nombre: 'Gólem de cristal',     tipo: 'piedra',   pv: 58, atq: 10, xp: 40, monedas: 20, hab: ['coraza', 'fuerte'] },
    tortuseta:   { nombre: 'Tortuseta',            tipo: 'hongo',    pv: 46, atq: 9,  xp: 34, monedas: 17, hab: ['coraza'] },
    setalarga:   { nombre: 'Seta zancuda',         tipo: 'hongo',    pv: 34, atq: 10, xp: 30, monedas: 15, hab: ['doble'] },
    velo:        { nombre: 'Velo de corteza',      tipo: 'espiritu', pv: 46, atq: 11, xp: 42, monedas: 20, hab: ['drena'] },
    garza:       { nombre: 'Garza carmesí',        tipo: 'espiritu', pv: 40, atq: 12, xp: 42, monedas: 20, hab: ['doble'] },
    granoso:     { nombre: 'Gran oso de musgo',    tipo: 'planta',   pv: 72, atq: 12, xp: 55, monedas: 26, hab: ['fuerte', 'cura'] },
    amanitaroja: { nombre: 'Amanita sangrante',    tipo: 'hongo',    pv: 50, atq: 11, xp: 44, monedas: 21, hab: ['fuerte', 'drena'] }
  },
  // qué monstruos salen en cada zona
  zonas: {
    bosque:    ['seta', 'osezno', 'espiral', 'cervato', 'pelusa'],
    ribera:    ['amanita', 'tortuga', 'gatohierba', 'kitsune', 'pelusa'],
    manantial: ['cristalito', 'capirote', 'mascara', 'farolero', 'musgoespiral'],
    paso:      ['jabali', 'ciervo', 'golemcristal', 'tortuseta', 'setalarga'],
    santuario: ['velo', 'garza', 'granoso', 'amanitaroja', 'golemcristal']
  },
  // botín de cada monstruo derrotado: probabilidad de soltar mineral en bruto y té
  botin: { mena: 0.22, te: 0.08 },

  // ---------- MINERÍA ----------
  // tres minerales en bruto. Se refinan en la fragua (3 en bruto + monedas = 1 lingote)
  // y los lingotes suben de grado las armas (Despertar → Memoria → Nombre verdadero)
  minerales: {
    hierro: { nombre: 'Mena de hierro',  lingote: 'carbon', icono: '鉄', color: '#8a8f99', refinar: 10 },
    cobre:  { nombre: 'Mena de cobre',   lingote: 'cobre',  icono: '銅', color: '#c8743a', refinar: 25 },
    jade:   { nombre: 'Jade en bruto',   lingote: 'jade',   icono: '翠', color: '#4fb88a', refinar: 60 }
  },
  porLingote: 3,                        // menas necesarias para un lingote
  // picos: los vende el kappa. tabla = probabilidad (%) de cada mineral al picar · extra = probabilidad de sacar 2
  picos: {
    pico:    { nombre: 'Pico de hierro',   precio: 60,  tabla: { hierro: 72, cobre: 24, jade: 4 },  extra: 0,    desc: 'Pica las vetas del mundo. Sobre todo hierro' },
    damasco: { nombre: 'Pico de damasco',  precio: 480, tabla: { hierro: 45, cobre: 40, jade: 15 }, extra: 0.35, desc: 'Acero ondulado: más cobre, más jade y a veces doble' }
  },
  vetas: { porZona: 4, jadeZonaProfunda: 2, profundas: ['paso', 'santuario'] },   // vetas por zona (se renuevan cada día)
  monedasAlHuir: 0
};
