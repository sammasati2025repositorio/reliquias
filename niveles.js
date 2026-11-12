// ============================================================
//  NIVELES.JS — los mapas, dibujados con letras
//
//  LEYENDA
//    #  seto (pared)            A  agua (pared, solo decorativa)
//    .  suelo                   H  BASE del ladrón (dorada). Empiezas en la primera H
//    G  gema                    S  zona segura (lila): los espectros no entran ni te ven
//    V  botas de velocidad      1 2 3  espectros (pon los que quieras: 1..9)
//    T  portal del ninja: van por parejas (el 1º te lleva al 2º, el 3º al 4º...)
//
//  REGLAS
//    - Todas las filas con el mismo número de letras.
//    - El borde entero debe ser pared (# o A).
//    - Al menos una H, un espectro y una G.
//    - Las gemas valen más cuanto más lejos están de la base (se calcula solo).
//  Para comprobar un mapa: abre la consola del navegador y escribe  Reliquias.validar()
// ============================================================
const NIVELES = [
  {
    nombre: 'Dojo de los Susurros',
    mapa: [
      '########################',
      '#G....#.....S....#....G#',
      '#.##..#.###..###.#..##.#',
      '#.#......#....#......#.#',
      '#...###.....1....###...#',
      '#.#...#.###..###.#...#.#',
      '#.#.V...#......#...V.#.#',
      '#...##..#.HHHH.#..##...#',
      '#S#.....#.HHHH.#.....#S#',
      '#...##..###..###..##...#',
      '#T#......2....3......#T#',
      '#.#.###.###..###.###.#.#',
      '#...#......G.......#...#',
      '#.#...##.######.##...#.#',
      '#.###..#...S....#..###.#',
      '#G.....#.G....G.#.....G#',
      '########################'
    ]
  },
  {
    nombre: 'Casa del Estanque',
    mapa: [
      '########################',
      '#HHH...#..G...#.......G#',
      '#HHH.#.#.####.#.####.#.#',
      '#....#......1...#....#.#',
      '#.####.##.AA.##.#.##.#.#',
      '#......#..AA..#....#...#',
      '#.##.#.#.AAAA.#.##.#.#.#',
      '#.#..#...AAAA...S#...#.#',
      '#.#.##.#.AAAA.#.##.###.#',
      '#T..V..#..AA..#......2T#',
      '#.####.##.AA.##.####.#.#',
      '#.#..............#...#.#',
      '#.#.##.###S.###.##.#.#.#',
      '#...#....#..#....3.#...#',
      '#.#.#.##.#..#.##.###.#.#',
      '#G....#....G...#..V...G#',
      '########################'
    ]
  }
];

// Una de cada dos calles gana una segunda losa; la planta conserva su trazado.
// Las bases, los refugios y los estanques se ensanchan con el mismo factor.
for (const n of NIVELES) {
  n.mapa = n.mapa.flatMap((fila,y) => {
    const expandir = extra => Array.from(fila).map((c,x) => {
      const fijo = '#AHS.'.includes(c), original = extra && !fijo ? '.' : c;
      return original + (x%2 === 0 ? (fijo ? c : '.') : '');
    }).join('');
    return y%2 === 0 ? [expandir(false),expandir(true)] : [expandir(false)];
  });
  const cuadricula = n.mapa.map(fila=>Array.from(fila));
  const libres=[], repetir=[];
  cuadricula.forEach((fila,y)=>fila.forEach((c,x)=>{
    if (c==='.') libres.push([x,y]);
    else if ('GV123456789'.includes(c)) repetir.push([x,y,c]);
  }));
  for (const [x,y,tipo] of repetir) {
    const lejos=libres.findIndex(([a,b])=>Math.abs(a-x)+Math.abs(b-y)===6);
    if (lejos<0) continue;
    const [[a,b]]=libres.splice(lejos,1); cuadricula[b][a]=tipo;
  }
  n.mapa = cuadricula.map(fila=>fila.join(''));
}
NIVELES.push({
  nombre:'Pabellón de la Luna Partida',
  mapa:(() => {
    const w=36,h=26;
    const c=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x===0||y===0||x===w-1||y===h-1?'#':'.'));
    const rect=(x0,y0,x1,y1,t)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)c[y][x]=t;};
    rect(12,3,23,10,'A'); rect(12,15,23,22,'A');
    rect(17,3,18,10,'.'); rect(17,15,18,22,'.');
    rect(12,6,23,7,'.'); rect(12,18,23,19,'.');
    rect(15,11,20,14,'H');
    for (const x of [5,29]) for (const y of [4,11,18]) rect(x,y,x+1,y+3,'#');
    rect(2,11,3,13,'S'); rect(32,12,33,14,'S');
    for(const [x,y,t] of [[3,3,'G'],[32,3,'G'],[3,22,'G'],[32,22,'G'],[17,2,'G'],[18,23,'G'],[9,7,'G'],[26,18,'G'],[10,12,'1'],[25,13,'2'],[9,21,'3'],[26,4,'4'],[8,15,'2'],[28,16,'1'],[8,3,'V'],[27,22,'V'],[3,17,'V'],[32,9,'V'],[2,5,'T'],[33,20,'T'],[17,6,'M'],[18,7,'M'],[17,18,'M'],[18,19,'M']]) c[y][x]=t;
    return c.map(r=>r.join(''));
  })()
});
