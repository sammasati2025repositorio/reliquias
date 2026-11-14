// Equipo del Dojo. Los números de velocidad, sigilo y defensa son porcentajes.
const EQUIPO = (() => {
  const ranuras = { cabeza:'Sombrero', capa:'Capa', amuleto:'Amuleto', arma:'Arma', anillo1:'Anillo I', anillo2:'Anillo II', cintura:'Cinturón', botas:'Botas', reliquia:'Reliquia' };
  const stats = { ataque:'Ataque', velocidad:'Velocidad', aguante:'Aguante', recarga:'Recuperación', sigilo:'Sigilo', defensa:'Protección', fortuna:'Hallazgo', sabiduria:'Sabiduría' };
  const objetos = {};
  function item(id, nombre, tipo, icono, rareza, atributos, descripcion) {
    objetos[id] = {nombre,tipo,icono,rareza,atributos,descripcion};
  }
  item('kasa','Kasa de los Susurros','cabeza','◭','Común',{sigilo:.5},'Las fibras de paja amortiguan el ruido de los pasos.');
  item('sandalias','Sandalias de junco','botas','⌁','Común',{velocidad:5,aguante:.2},'El junco se dobla al pisar y recupera su forma al alzar el pie.');
  item('cinta','Cinta de los cinco nudos','cintura','≋','Común',{recarga:8},'Cada nudo marca una respiración.');
  item('katana','Katana de la Primera Lluvia','arma','⚔','Raro',{ataque:12},'Forjada al son de la primera lluvia de otoño. Puede recibir un nombre en la fragua.');
  item('capa','Capa del Espejo Turbio','capa','♧','Raro',{sigilo:1,defensa:4},'El reflejo llega medio paso después que tú.');
  item('loto','Amuleto del loto hundido','amuleto','✾','Raro',{sabiduria:10,aguante:.35},'Un loto que sobrevivió treinta años bajo el estanque.');
  item('escama','Anillo de escama azul','anillo','◌','Raro',{fortuna:12},'La escama conserva el brillo de una moneda recién mojada.');
  item('bokken','Bokken del sauce lunar','arma','†','Raro',{ataque:16},'Tallado con la rama que se inclinaba hacia la luna.');
  item('haori','Haori del Pabellón Lunar','capa','❖','Épico',{sigilo:1.5,defensa:10},'El forro guarda el dibujo de un cielo sin nubes.');
  item('lunario','Anillo de la luna menguante','anillo','☾','Épico',{velocidad:4,sabiduria:8},'Solo refleja la luz cuando la luna pierde su última punta.');
  item('sello','Sello del Primer Guardián','reliquia','✧','Épico',{aguante:.6,defensa:8},'Una firma en jade oscuro, anterior al Dojo.');
  item('kanabo','Kanabō de la Campana Hueca','arma','⚒','Épico',{ataque:22},'Deja un eco bajo cuando se acerca a una llama.');
  item('dofus','Huevo de jade','reliquia','✺','Legendario',{},'Desbloqueado por la campaña. Su protección innata bloquea cada cuarto ataque.');
  item('shide','Capa del Peregrino','capa','♧','Épico',{defensa:6},'Dos piezas del Peregrino dan +0,25 s de aguante. Tres añaden +4 % de hallazgo.');
  item('kintsugi','Anillo del Peregrino','anillo','◌','Épico',{fortuna:6},'Dos piezas del Peregrino dan +0,25 s de aguante. Tres añaden +4 % de hallazgo.');
  item('mascara','Máscara del Peregrino','cabeza','◭','Legendario',{sigilo:1},'Dos piezas del Peregrino dan +0,25 s de aguante. Tres añaden +4 % de hallazgo.');
  const materiales = { carbon:'Lingote de hierro', cobre:'Lingote de cobre', jade:'Jade pulido' };   // v0.69: se consiguen refinando mineral en la fragua
  const botin = [
    {objetos:['kasa','sandalias','cinta','katana'], materiales:{carbon:2}, xp:65, monedas:30},
    {objetos:['capa','loto','escama','bokken'], materiales:{carbon:1,cobre:2}, xp:100, monedas:50},
    {objetos:['haori','lunario','sello','kanabo'], materiales:{carbon:1,cobre:1,jade:2}, xp:160, monedas:80}
  ];
  const juramentos = {
    brasa:{nombre:'Brasa', texto:'El filo recordará el fuego.', atributo:'ataque', valor:5},
    niebla:{nombre:'Niebla', texto:'El filo aprenderá el silencio.', atributo:'sigilo', valor:.5},
    rio:{nombre:'Río', texto:'El filo seguirá el ritmo del agua.', atributo:'recarga', valor:5}
  };
  const grados = [
    {nombre:'Despertar', material:'carbon', cantidad:2, ataque:6, monedas:40, nivel:2, pasos:['Soplar las brasas','Grabar el juramento','Sumergir el filo']},
    {nombre:'Memoria', material:'cobre', cantidad:3, ataque:9, monedas:120, nivel:5, pasos:['Calentar el cobre','Ajustar la guarda','Sumergir el filo']},
    {nombre:'Nombre verdadero', material:'jade', cantidad:3, ataque:14, monedas:300, nivel:8, pasos:['Abrir la veta lunar','Pronunciar su nombre','Sellar el juramento']}
  ];
  function encaja(objeto, ranura) {
    return objeto.tipo === ranura || (objeto.tipo === 'anillo' && ranura.startsWith('anillo'));
  }
  return {ranuras,stats,objetos,materiales,botin,juramentos,grados,encaja};
})();
