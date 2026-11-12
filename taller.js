// Entrenamiento y tómbola de la aldea.
const TALLER = (() => {
  const tronco = {x:18,y:10,pdv:88000,intervalo:.72,critico:.12,multiplicador:1.6};
  const puesto = {x:5,y:11};
  const premios = [
    {id:'huevo', humor:'Ni es huevo ni es de gato. No sirve para nada, pero queda precioso en la Bolsa. El vendedor no admite devoluciones.', icono:'◉', nombre:'Huevo de gato disecado', detalle:'Curiosidad', peso:20, tipo:'curio'},
    {id:'cobre', humor:'Cobre que se cayó de una compuerta del río. Sirve para templar armas en la fragua. Huele a pescado, pero brilla.', icono:'⬡', nombre:'Cobre de la compuerta', detalle:'2 minerales', peso:18, tipo:'mineral', n:2},
    {id:'xp', humor:'Un recuerdo ajeno que se te mete en la cabeza. Te da experiencia y, de paso, la receta de un guiso que nunca probarás.', icono:'✧', nombre:'Soplo de memoria', detalle:'90 XP', peso:20, tipo:'xp', n:90},
    {id:'shide', humor:'Capa del Peregrino: protege del viento, de la lluvia y de las miradas de los centinelas. De la vergüenza, no.', icono:'♧', nombre:'Capa del Peregrino', detalle:'Pieza de conjunto', peso:9, tipo:'equipo'},
    {id:'monedas', humor:'Una bolsa olvidada entre las raíces del cedro. Nadie la reclama. Tú tampoco preguntes.', icono:'◈', nombre:'Bolsa de monedas', detalle:'35 monedas', peso:14, tipo:'monedas', n:35},
    {id:'kintsugi', humor:'Anillo del Peregrino: roto y reparado con oro. Como tú después de la tercera planta.', icono:'◌', nombre:'Anillo del Peregrino', detalle:'Pieza de conjunto', peso:9, tipo:'equipo'},
    {id:'jade', humor:'Jade lunar, el mineral más raro de la fragua. Brilla de noche y de día también, porque es presumido.', icono:'✦', nombre:'Jade lunar', detalle:'1 mineral', peso:6, tipo:'mineral', n:1},
    {id:'mascara', humor:'Máscara del Peregrino: los espectros dudan si eres de los suyos. Tú también, al mirarte al espejo.', icono:'◭', nombre:'Máscara del Peregrino', detalle:'Pieza de conjunto', peso:4, tipo:'equipo'}
  ];
  const colores=['#633d43','#355c54','#5c445c','#7e5339','#45516c','#685b37','#35554c','#714051'];
  function sortear(r) {
    let tirada=Math.min(99.999,Math.max(0,r*100));
    for(const [i,p] of premios.entries()) {
      if(tirada<p.peso)return i;
      tirada-=p.peso;
    }
    return premios.length-1;
  }
  function dano(ataque,critico) { return Math.round((44+ataque)*(critico?tronco.multiplicador:1)); }
  return {tronco,puesto,premios,colores,sortear,dano};
})();
