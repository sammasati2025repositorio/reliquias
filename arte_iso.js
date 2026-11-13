/* Reliquias — dirección de arte isométrica. La geometría usa el mismo mapa que la física. */
const ARTE_ISO = (() => {
  const AX=.88, AY=.44, TAU=Math.PI*2;
  const proyectar=(x,y)=>[AX*(x-y),AY*(x+y)];
  function direccion(x,y){return [(x/AX+y/AY)/2,(y/AY-x/AX)/2];}
  const perfiles={
    aldea:{base:'#849344',claros:['#b1bb58','#9ba64a','#677e39','#c1bc67'],piedra:['#e3d59c','#d7ca91','#f1e2ae','#c6bc8c'],agua:'#428e87',luz:'#ffeab7',nombre:'EL CEREZO DORMIDO',sub:'Donde hasta las piedras tienen algo que contar'},
    bosque:{base:'#657d39',claros:['#89a447','#768b39','#456c3b','#b3b95a'],piedra:['#c8c690','#bbc28d','#d9d19c','#afba7b'],agua:'#398a82',luz:'#e9f5b5',nombre:'LAS RAÍCES ALTAS',sub:'Los árboles escuchan. Alguno también cotillea.'},
    ribera:{base:'#8b9a45',claros:['#a8b657','#b7b962','#6d913c','#748a43'],piedra:['#e2d6a7','#d6ca9d','#efe0b4','#c4c59b'],agua:'#419c96',luz:'#fff3bd',nombre:'RIBERA DE LAS LUCIÉRNAGAS',sub:'El río no cobra peaje. Narel aún se lo piensa.'},
    manantial:{base:'#77925b',claros:['#a7b778','#94ab61','#5f8759','#bdd39a'],piedra:['#d8ddc2','#c3cfb4','#ede7c9','#b7c1a5'],agua:'#4caaa3',luz:'#c7fff1',nombre:'LAS DOS CAÍDAS',sub:'El agua recuerda lo que el acero ha olvidado'},
    paso:{base:'#8d8d58',claros:['#c0b76a','#a9a05f','#7c8b49','#bdb478'],piedra:['#d8cfad','#c5bca1','#e8ddba','#bbb29a'],agua:'#548f8e',luz:'#ffe5b9',nombre:'EL PASO DE LOS CIEN TORII',sub:'Noventa y nueve puertas. La otra está de vacaciones.'},
    santuario:{base:'#687b52',claros:['#8f9d5e','#7f935c','#466e54','#aab778'],piedra:['#d4d3b5','#bfc4ab','#e6dec0','#acb7a2'],agua:'#478e82',luz:'#e4f6bd',nombre:'EL CEREZO NEGRO',sub:'Hasta las promesas rotas pueden echar raíces'},
    dojo:{base:'#39313c',claros:['#51414a','#413944','#635043','#332c37'],piedra:['#574447','#69514d','#725e52','#493e43'],agua:'#402b39',luz:'#f3b273',nombre:'EL DOJO DE LAS DEUDAS',sub:'Se ruega devolver el alma al salir'}
  };
  const frames={"atlas-casas": [[26, 2, 598, 592], [661, 4, 633, 584], [25, 612, 631, 570], [656, 601, 652, 581]], "atlas-naturaleza": [[13, 9, 490, 494], [514, 8, 506, 495], [1080, 16, 412, 486], [11, 514, 484, 499], [516, 541, 482, 457], [1033, 518, 489, 493]], "atlas-monumentos": [[19, 7, 577, 615], [637, 12, 602, 603], [3, 627, 620, 612], [631, 635, 619, 594]]};
  const patrones={};
  let cache=null, cam=null, ultimo=0, llegada=0, ultimoNivel=null;
  const rnd0=n=>{let a=n>>>0||71;return()=>{a^=a<<13;a^=a>>>17;a^=a<<5;return(a>>>0)/4294967296;}};
  function poly(c,pts,fill,stroke,w=.6){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke()}}
  function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill()}
  function line(c,pts,color,w=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.lineWidth=w;c.strokeStyle=color;c.stroke()}
  function material(c,images,n,side) {
    const im=images['atlas-suelos'];if(!im?.naturalWidth)return null;
    const key=n+':'+side;if(!patrones[key]){
      const cv=document.createElement('canvas');cv.width=cv.height=side*4;const cc=cv.getContext('2d');cc.scale(2,2);const sw=im.naturalWidth/2,sh=im.naturalHeight/2;
      for(let y=0;y<2;y++)for(let x=0;x<2;x++){cc.save();cc.translate((x?2:0)*side,(y?2:0)*side);cc.scale(x?-1:1,y?-1:1);cc.drawImage(im,(n%2)*sw,Math.floor(n/2)*sh,sw,sh,0,0,side,side);cc.restore();}
      patrones[key]=cv;
    }
    const pat=c.createPattern(patrones[key],'repeat');if(pat?.setTransform)pat.setTransform({a:.5,b:0,c:0,d:.5,e:0,f:0});return pat;
  }
  function mallaAgua(L,T) {
    if(L.aguaGeometria)return L.aguaGeometria;
    const step=T/5,nx=L.cols*5+1,ny=L.rows*5+1,v=new Float32Array(nx*ny),polys=[],edges=[];
    const water=(x,y)=>L.c[y]?.[x]===2?1:0;
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const x=i/5-.5,y=j/5-.5,ix=Math.floor(x),iy=Math.floor(y);let den=0,sum=0;
      for(let b=iy-1;b<=iy+2;b++)for(let a=ix-1;a<=ix+2;a++){const wt=Math.exp(-((x-a)**2+(y-b)**2)/.48);sum+=wt*water(a,b);den+=wt;}
      v[j*nx+i]=sum/den;
    }
    for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
      const corners=[[i*step,j*step,v[j*nx+i]],[(i+1)*step,j*step,v[j*nx+i+1]],[(i+1)*step,(j+1)*step,v[(j+1)*nx+i+1]],[i*step,(j+1)*step,v[(j+1)*nx+i]]];
      const poly=[],cross=[];
      for(let k=0;k<4;k++){const a=corners[k],b=corners[(k+1)%4],ina=a[2]>=.46,inb=b[2]>=.46;if(ina)poly.push([a[0],a[1]]);if(ina!==inb){const t=(.46-a[2])/(b[2]-a[2]),pt=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];poly.push(pt);cross.push(pt);}}
      if(poly.length>=3)polys.push(poly);if(cross.length===2)edges.push(cross);
    }
    L.aguaGeometria={nx,ny,v,step,polys,edges};return L.aguaGeometria;
  }
  function aguaEn(L,T,x,y){
    const a=mallaAgua(L,T),xx=x/a.step,yy=y/a.step,ix=Math.floor(xx),iy=Math.floor(yy);if(ix<0||iy<0||ix>=a.nx-1||iy>=a.ny-1)return false;
    const u=xx-ix,v=yy-iy,i=iy*a.nx+ix;return a.v[i]*(1-u)*(1-v)+a.v[i+1]*u*(1-v)+a.v[i+a.nx]*(1-u)*v+a.v[i+a.nx+1]*u*v>=.46;
  }
  // v0.22: el contorno del agua se construye una sola vez (antes, miles de trocitos en cada fotograma)
  function rutaAgua(mesh){
    if(mesh.ruta)return mesh.ruta;
    // las casillas llenas de agua se juntan en franjas (un rectángulo por tramo); solo los bordes llevan su trocito curvo
    const r=new Path2D(),{nx,ny,v,step}=mesh,lim=.46,dentro=(i,j)=>v[j*nx+i]>=lim;
    for(let j=0;j<ny-1;j++){
      let ini=-1;
      for(let i=0;i<=nx-1;i++){
        const lleno=i<nx-1&&dentro(i,j)&&dentro(i+1,j)&&dentro(i,j+1)&&dentro(i+1,j+1);
        if(lleno){if(ini<0)ini=i;continue;}
        if(ini>=0){r.rect(ini*step,j*step,(i-ini)*step+.05,step+.05);ini=-1;}
        if(i>=nx-1)continue;
        const c=[[i*step,j*step,v[j*nx+i]],[(i+1)*step,j*step,v[j*nx+i+1]],[(i+1)*step,(j+1)*step,v[(j+1)*nx+i+1]],[i*step,(j+1)*step,v[(j+1)*nx+i]]],poly=[];
        for(let k=0;k<4;k++){const a=c[k],b=c[(k+1)%4],ina=a[2]>=lim,inb=b[2]>=lim;if(ina)poly.push(a);if(ina!==inb){const t=(lim-a[2])/(b[2]-a[2]);poly.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}
        if(poly.length<3)continue;r.moveTo(poly[0][0],poly[0][1]);for(let k=1;k<poly.length;k++)r.lineTo(poly[k][0],poly[k][1]);r.closePath();
      }
    }
    return mesh.ruta=r;
  }
  function caminoAgua(c,mesh){c.beginPath();}
  function caminoRedondeado(c,L,T) {
    // Campo continuo: suaviza también los rincones interiores de cruces y bifurcaciones.
    const n=4,step=T/n,nx=L.cols*n+1,ny=L.rows*n+1,v=new Float32Array(nx*ny),lim=.27;
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const x=i/n-.5,y=j/n-.5,ix=Math.floor(x),iy=Math.floor(y);let sum=0,den=0;
      for(let b=iy-2;b<=iy+2;b++)for(let a=ix-2;a<=ix+2;a++){
        const wt=Math.exp(-((x-a)**2+(y-b)**2)/.85);den+=wt;if(L.c[b]?.[a]===5)sum+=wt;
      }
      v[j*nx+i]=sum/den;
    }
    c.beginPath();
    for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){
      const corners=[[i*step,j*step,v[j*nx+i]],[(i+1)*step,j*step,v[j*nx+i+1]],[(i+1)*step,(j+1)*step,v[(j+1)*nx+i+1]],[i*step,(j+1)*step,v[(j+1)*nx+i]]],poly=[];
      for(let k=0;k<4;k++){const a=corners[k],b=corners[(k+1)%4],ina=a[2]>=lim,inb=b[2]>=lim;if(ina)poly.push(a);if(ina!==inb){const f=(lim-a[2])/(b[2]-a[2]);poly.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);}}
      if(poly.length<3)continue;c.moveTo(poly[0][0],poly[0][1]);for(let k=1;k<poly.length;k++)c.lineTo(poly[k][0],poly[k][1]);c.closePath();
    }
    c.fill();
  }
  function textura(L,T,region,images) {
    const loaded=!!images['atlas-suelos']?.naturalWidth;
    if(cache?.L===L&&cache.T===T&&cache.loaded===loaded&&!(cache.libre&&sueloProy?.data!==cache))return cache;
    const p=perfiles[L.exterior?region:'dojo']||perfiles.aldea,rnd=rnd0(L.cols*100+region.length*3);
    const canvas=document.createElement('canvas'), c=canvas.getContext('2d'), res=1.8, w=L.cols*T,h=L.rows*T;
    canvas.width=Math.ceil(w*res);canvas.height=Math.ceil(h*res);c.scale(res,res);
    c.fillStyle=p.base;c.fillRect(0,0,w,h);
    const cell=(x,y)=>L.c[y]?.[x]??1, waters=[],flora=[],rocks=[],lights=[],bridges=[];
    if(L.exterior) {
      const pasto=material(c,images,0,128);if(pasto){c.fillStyle=pasto;c.fillRect(0,0,w,h);c.globalAlpha=.23;c.fillStyle=p.base;c.fillRect(0,0,w,h);c.globalAlpha=1;}
      // Grandes manchas cromáticas; ninguna cuadrícula visible en la hierba.
      for(let i=0;i<L.cols*L.rows*2;i++){
        const x=rnd()*w,y=rnd()*h,r=T*(.45+rnd()*1.3),v=c.createRadialGradient(x,y,0,x,y,r);
        v.addColorStop(0,p.claros[i%4]+'48');v.addColorStop(1,p.claros[i%4]+'00');c.fillStyle=v;c.fillRect(x-r,y-r,r*2,r*2);
      }
      // v0.22: briznas agrupadas por color (5 trazos en total en vez de uno por brizna)
      const briznas=[0,1,2,3,4].map(()=>new Path2D()),coloresBrizna=['#d2ce78','#9fb957','#577331','#bec669','#4c6938'];
      for(let y=0;y<L.rows;y++)for(let x=0;x<L.cols;x++){
        const k=cell(x,y);
        for(let j=0;j<8;j++){
          const px=(x+rnd())*T,py=(y+rnd())*T,r=briznas[j%5];rnd();
          r.moveTo(px,py);r.quadraticCurveTo(px+1.3,py-1.2,px+.2+rnd(),py-2-rnd()*1.5);
        }
        if(k===0&&((x*17+y*31)%13===0))flora.push([x+.2+rnd()*.6,y+.2+rnd()*.6,rnd()]);
      }
      c.lineWidth=.47;for(let j=0;j<5;j++){c.strokeStyle=coloresBrizna[j]+'90';c.stroke(briznas[j]);}
      // El sendero conserva las conexiones del mapa y redondea todas sus bifurcaciones.
      const m=document.createElement('canvas');m.width=canvas.width;m.height=canvas.height;
      const mc=m.getContext('2d');mc.scale(res,res);mc.fillStyle='#c9bd83';
      caminoRedondeado(mc,L,T);
      for(let y=0;y<L.rows;y++)for(let x=0;x<L.cols;x++)if(cell(x,y)===5){
        if(region==='ribera'&&[cell(x-1,y),cell(x+1,y),cell(x,y-1),cell(x,y+1)].includes(2))bridges.push([x,y]);
      }
      const paving=document.createElement('canvas');paving.width=canvas.width;paving.height=canvas.height;
      const pc=paving.getContext('2d');pc.scale(res,res);pc.fillStyle='#aaab6e';pc.fillRect(0,0,w,h);
      // Losas grandes desiguales con juntas, canto oscuro y aristas de sol.
      for(let y=0;y<h;y+=T*.42)for(let x=0;x<w;x+=T*.52){
        const rr=rnd0((Math.round(x)*71+Math.round(y)*313+18)>>>0),xx=x+(Math.round(y/(T*.42))%2)*T*.26;
        const sw=T*(.40+rr()*.08),sh=T*(.32+rr()*.04),j=rr()*1.8;
        const pts=[[xx+1,y+j+1],[xx+sw-1,y+rr()*1.4],[xx+sw+1,y+sh*.5],[xx+sw-1,y+sh],[xx+2,y+sh+rr()],[xx,y+sh*.4]];
        poly(pc,pts.map(a=>[a[0]+.5,a[1]+.9]),'#767d52');poly(pc,pts,p.piedra[Math.floor(rr()*4)]);
        line(pc,[pts[5],pts[0],pts[1]],'#fff5cf83',.65);
        if(rr()<.12)line(pc,[[xx+sw*.3,y+1],[xx+sw*.44,y+sh*.4],[xx+sw*.36,y+sh*.6]],'#a7a070',.4);
      }
      const losas=material(pc,images,1,112);if(losas){pc.fillStyle=losas;pc.fillRect(0,0,w,h);}
      pc.setTransform(1,0,0,1,0,0);pc.globalCompositeOperation='destination-in';pc.drawImage(m,0,0);
      c.drawImage(paving,0,0,w,h);paving.width=paving.height=m.width=m.height=1;
    } else {
      for(let y=0;y<L.rows;y++)for(let x=0;x<L.cols;x++){
        const k=cell(x,y);if(k===1)continue;
        const xx=x*T,yy=y*T,rr=rnd0(x*991+y*813+4);
        c.fillStyle=(x+y)%2?'#5a4942':'#625043';c.fillRect(xx,yy,T,T);
        const tablas=material(c,images,2,112);if(tablas){c.fillStyle=tablas;c.globalAlpha=.45;c.fillRect(xx,yy,T,T);c.globalAlpha=1;}
        for(let j=0;j<5;j++){
          c.fillStyle=j%2?'#8d725a45':'#181a232f';c.fillRect(xx+j*T/5,yy,T/5-.7,T);
          for(let t=0;t<3;t++)line(c,[[xx+j*T/5+rr()*3,yy+rr()*T],[xx+j*T/5+rr()*3,yy+rr()*T]],'#c6a5781a',.35);
        }
        c.strokeStyle='#241c27';c.lineWidth=.65;c.strokeRect(xx+.4,yy+.4,T-.8,T-.8);
        if(rr()<.31&&k===0){poly(c,[[xx+2,yy+8],[xx+9,yy+4],[xx+17,yy+9],[xx+15,yy+17],[xx+5,yy+19]],'#350f2180');for(let j=0;j<6;j++)ellipse(c,xx+rr()*T,yy+rr()*T,.4+rr(),.6,'#571e2980')}
        if(rr()<.15&&k===0)line(c,[[xx+3,yy],[xx+9,yy+7],[xx+7,yy+12],[xx+15,yy+20]],'#191924',1.2);
        if(k===3||k===4||k===8){c.strokeStyle=k===8?'#b7dcdf':'#d8b56c';c.lineWidth=1;c.strokeRect(xx+2,yy+2,T-4,T-4);ellipse(c,xx+T/2,yy+T/2,T*.29,T*.29,k===8?'#829da445':'#c7aa6240');}
        if((x*7+y*11)%31===0&&k===0)lights.push([x+.5,y+.5]);
      }
    }
    for(let y=0;y<L.rows;y++)for(let x=0;x<L.cols;x++){
      const k=cell(x,y);
      if(k===2)waters.push([x,y]);
      if(k===1)rocks.push([x,y]);
    }
    const waterMesh=mallaAgua(L,T);
    if(waters.length){
      c.save();caminoAgua(c,waterMesh);c.clip(rutaAgua(waterMesh));c.fillStyle=p.agua;c.fillRect(0,0,w,h);
      const aqu=material(c,images,3,160);if(aqu){c.fillStyle=aqu;c.globalAlpha=.8;c.fillRect(0,0,w,h);c.globalAlpha=1;}c.restore();
      // Piedra y musgo sobre la misma curva que usa la colisión.
      for(let i=0;i<waterMesh.edges.length;i++){const[a,b]=waterMesh.edges[i];line(c,[a,b],'#315c4f',2.8);line(c,[a,b],'#a0b47c',1.7);if(i%2===0){const px=(a[0]+b[0])/2,py=(a[1]+b[1])/2;ellipse(c,px,py,1.6,1.1,i%3?'#a8b889':'#c7c79b');if(i%6===0)line(c,[[px-1,py],[px,py-3],[px+.6,py]],'#5f8b3d',.7);}}
      for(const[x,y]of waters)if((x*3+y*5)%8===0&&aguaEn(L,T,(x+.5)*T,(y+.5)*T)){ellipse(c,(x+.5)*T,(y+.5)*T,T*.14,T*.12,'#5caa73');ellipse(c,(x+.48)*T,(y+.48)*T,1.1,1.1,'#f7e8c4')}
    }
    if(L.exterior&&region==='ribera')for(const[x,y]of bridges){for(let j=0;j<7;j++){c.fillStyle=j%2?'#a48250':'#ba955d';c.fillRect(x*T,y*T+j*T/7,T,T/7-.7);line(c,[[x*T+2,y*T+j*T/7+1],[x*T+T-2,y*T+j*T/7+1]],'#e3c088',.4)}}
    cache={ancho:canvas.width,L,T,loaded,canvas,waters,waterMesh,flora,rocks,lights,bridges,w,h};return cache;
  }
  // v0.20: cada recorte del atlas se reescala una sola vez a su tamaño en pantalla y se guarda.
  // Antes se reescalaba desde la imagen grande en cada fotograma (muy caro en móvil).
  const recortes=new Map();let escalaCache=2;
  function recorte(im,id,n,box,width){
    const pw=Math.max(4,Math.round(width*escalaCache/4)*4),key=id+':'+n+':'+pw;let cv=recortes.get(key);
    if(!cv){if(recortes.size>400)recortes.clear();const ph=Math.max(4,Math.round(pw*box[3]/box[2]));cv=document.createElement('canvas');cv.width=pw;cv.height=ph;const cc=cv.getContext('2d');cc.imageSmoothingQuality='high';cc.drawImage(im,...box,0,0,pw,ph);recortes.set(key,cv);}
    return cv;
  }
  function sprite(c,images,id,n,x,y,width,opacity=1){
    const im=images[id],box=frames[id]?.[n];if(!im?.naturalWidth||!box)return false;
    const height=width*box[3]/box[2],cv=recorte(im,id,n,box,width),a=c.globalAlpha;c.globalAlpha=a*opacity;c.drawImage(cv,x-width/2,y-height,width,height);c.globalAlpha=a;return height;
  }
  // v0.20: el suelo (hierba, losas, orillas) se proyecta en isométrico UNA vez y luego solo se copia.
  let sueloProy=null;
  function sueloProyectado(c,L,T,region,images,data,sc){
    const res=Math.min(escalaCache,1.5),key=data.ancho+':'+region;
    if(sueloProy&&sueloProy.data===data&&sueloProy.key===key)return sueloProy;   // no se rehace al cambiar la calidad: se reescala
    const m=L.exterior?T*5:T,esq=[proyectar(0,0),proyectar(data.w,0),proyectar(data.w,data.h),proyectar(0,data.h)];
    const x0=Math.min(...esq.map(e=>e[0]))-m,x1=Math.max(...esq.map(e=>e[0]))+m,y0=Math.min(...esq.map(e=>e[1]))-m,y1=Math.max(...esq.map(e=>e[1]))+m;
    const cv=document.createElement('canvas');cv.width=Math.ceil((x1-x0)*res);cv.height=Math.ceil((y1-y0)*res);const cc=cv.getContext('2d');
    cc.setTransform(res*AX,res*AY,-res*AX,res*AY,-x0*res,-y0*res);
    if(L.exterior){const ptn=material(cc,images,0,128);if(ptn){cc.fillStyle=ptn;cc.fillRect(-m*3,-m*3,data.w+m*6,data.h+m*6);}}
    cc.drawImage(data.canvas,0,0,data.w,data.h);
    // v0.23: todo lo plano y quieto se pinta aquí UNA vez (antes, cientos de rellenos por fotograma)
    cc.setTransform(res,0,0,res,-x0*res,-y0*res);
    const Pq=(x,y)=>proyectar(x,y),sombra=(x,y,rx,ry)=>{const q=Pq(x,y);ellipse(cc,q[0]+T*.28,q[1]+T*.1,rx,ry,'#28352b38');ellipse(cc,q[0],q[1],rx*.5,ry*.6,'#172b243b')};
    if(L.exterior){
      for(const[x,y]of data.rocks)if(x===0||y===0||x===L.cols-1||y===L.rows-1){const b=Pq((x+1)*T,y*T),c2=Pq((x+1)*T,(y+1)*T),dd=Pq(x*T,(y+1)*T);poly(cc,[dd,c2,[c2[0],c2[1]+8],[dd[0],dd[1]+8]],'#6c7050');poly(cc,[b,c2,[c2[0],c2[1]+8],[b[0],b[1]+8]],'#4e5741');}
      for(let y=-18;y<L.rows+18;y+=2)for(let x=-18;x<L.cols+18;x+=2){if(x>=0&&y>=0&&x<L.cols&&y<L.rows)continue;const rr=rnd0(x*73+y*113+9301),xx=(x+rr())*T,yy=(y+rr())*T,sw=T*(2.5+rr()*1.7);sombra(xx,yy,sw*.4,sw*.16);}
      const bl=region==='aldea'?((sc&&sc.buildings)||[]):[],lm=(sc&&sc.landmarks)||[];   // sin sombra donde no se dibuja roca (bajo casas y monumentos)
      for(const[x,y]of data.rocks){if(bl.some(b=>x>=b.x&&x<b.x+b.ancho&&y>=b.y&&y<b.y+b.fondo)||lm.some(m=>x>=m.x&&x<m.x+m.w&&y>=m.y&&y<m.y+m.h))continue;sombra((x+.5)*T,(y+.5)*T,T*.8,T*.25);}
      for(const[x,y]of L.arboles||[]){const sw=T*(2.05+((x*19+y*31)%13)*.045);sombra((x+.5)*T,(y+.5)*T,sw*.52,sw*.18);}
      for(const[x,y,v]of data.flora)if(v<=.62){const q=Pq(x*T,y*T);for(let j=0;j<5;j++){const xx=q[0]+Math.sin(j*2.7)*4,yy=q[1]+Math.cos(j*1.3)*2;line(cc,[[xx,yy],[xx+1,yy-4]],'#547333',.6);for(let k=0;k<3;k++)ellipse(cc,xx+Math.cos(k*2.1)*.8,yy-4+Math.sin(k*2.1)*.6,.75,.65,['#f8e6a7','#ebe9cc','#e9baac'][j%3])}}
    }
    // la textura plana ya no hace falta: se libera para ahorrar memoria (se rehace si cambia el tamaño)
    if(images['atlas-suelos']?.naturalWidth||!L.exterior){data.canvas.width=data.canvas.height=1;data.libre=true;}
    // v0.64: el suelo se trocea en baldosas de 512 px y solo se pintan las que se ven
    // (un lienzo gigante de 8 megapíxeles ahogaba la tarjeta gráfica del móvil).
    const TROZO=512,trozos=[];
    for(let ty=0;ty<cv.height;ty+=TROZO)for(let tx=0;tx<cv.width;tx+=TROZO){const tw=Math.min(TROZO,cv.width-tx),th=Math.min(TROZO,cv.height-ty),t2=document.createElement('canvas');t2.width=tw;t2.height=th;t2.getContext('2d').drawImage(cv,tx,ty,tw,th,0,0,tw,th);trozos.push({cv:t2,x:tx,y:ty,w:tw,h:th});}
    sueloProy={data,key,cv:{width:cv.width,height:cv.height},trozos,x0,y0,res};cv.width=cv.height=1;return sueloProy;
  }
  const capas={};
  function capa(clave,w,h,pintar){const res=escalaCache,k=clave+':'+w+':'+h+':'+res;let cv=capas[k];if(!cv){cv=document.createElement('canvas');cv.width=Math.ceil(w*res);cv.height=Math.ceil(h*res);const cc=cv.getContext('2d');cc.scale(res,res);pintar(cc);capas[k]=cv;}return cv;}
  function fondo(c,w,h,p,clock){c.drawImage(capa('fondo'+p.base,w,h,cc=>{cc.fillStyle=p.base;cc.fillRect(0,0,w,h);const gr=cc.createLinearGradient(0,0,w,h);gr.addColorStop(0,p.claros[0]);gr.addColorStop(.65,p.base);gr.addColorStop(1,p.claros[2]);cc.fillStyle=gr;cc.fillRect(0,0,w,h);}),0,0,w,h);}
  function render(s,d) {
    const {g:c,L,T,IW:w,AH:height,clock:t,region,images,h,foco}=s,p=perfiles[L.exterior?region:'dojo']||perfiles.aldea;
    const data=textura(L,T,region,images),sceneNew=ultimoNivel!==L,dt=Math.min(.05,Math.max(0,t-ultimo));ultimo=t;
    if(sceneNew){cam=null;ultimoNivel=L;llegada=t;}
    const focus=proyectar(foco.x,foco.y),target=[focus[0]-w*.5,focus[1]-height*.57];
    if(!cam)cam=target.slice();else{const ease=1-Math.exp(-dt*10);cam[0]+=(target[0]-cam[0])*ease;cam[1]+=(target[1]-cam[1])*ease;}
    const cx=cam[0]+Math.sin(t*81)*s.shake*1.6,cy=cam[1]+Math.cos(t*63)*s.shake*1.4;
    const P=(x,y,z=0)=>{const q=proyectar(x,y);return[q[0]-cx,q[1]-cy-z]},Q=(x,y,z=0)=>P(x*T,y*T,z);
    const visible=(x,y,hh=T*4)=>x>-T*5&&x<w+T*5&&y>-T&&y<height+hh;
    c.save();c.beginPath();c.rect(0,0,w,height);c.clip();fondo(c,w,height,p,t);
    const ground=f=>{c.save();c.transform(AX,AY,-AX,AY,-cx,-cy);f();c.restore();};
    escalaCache=Math.min(2.25,Math.max(1,c.getTransform().a||1));
    {const sp=sueloProyectado(c,L,T,region,images,data,s),ok=images['atlas-suelos']?.naturalWidth||!L.exterior;
     if(ok){const k=1/sp.res,ox=sp.x0-cx,oy=sp.y0-cy;for(const tr of sp.trozos){const x=ox+tr.x*k,y=oy+tr.y*k,ww=tr.w*k,hh=tr.h*k;if(x>w||y>height||x+ww<0||y+hh<0)continue;c.drawImage(tr.cv,x,y,ww+.5,hh+.5);}}
     else ground(()=>c.drawImage(data.canvas,0,0,data.w,data.h));}
    const horneado=!!(sueloProy&&sueloProy.data===data&&L.exterior);
    // Bordes elevados: lo oscuro es un canto de tierra, nunca un camino invisible.
    if(L.exterior&&!horneado)for(const[x,y]of data.rocks)if(x===0||y===0||x===L.cols-1||y===L.rows-1){
      const a=Q(x,y),b=Q(x+1,y),cc=Q(x+1,y+1),dd=Q(x,y+1);if(!visible(...cc))continue;
      poly(c,[[...dd],[...cc],[cc[0],cc[1]+8],[dd[0],dd[1]+8]],'#6c7050');poly(c,[b,cc,[cc[0],cc[1]+8],[b[0],b[1]+8]],'#4e5741');
    }
    // Agua: reflejos y caústicas que se quedan siempre dentro de las casillas de agua.
    // v0.64: reflejos del agua SIN recorte (el recorte con curvas hundía los FPS en el manantial) y en UN solo trazo.
    // Solo en casillas de agua rodeadas de agua, así nunca se salen a la orilla.
    if(data.waters.length&&(window.CONFIG?.rendimiento?.reflejosAgua!==false)){
      if(!data.aguaDentro){const k=new Set(data.waters.map(([x,y])=>x+','+y));data.aguaDentro=data.waters.filter(([x,y])=>k.has((x+1)+','+y)&&k.has((x-1)+','+y)&&k.has(x+','+(y+1))&&k.has(x+','+(y-1)));}
      ground(()=>{c.beginPath();const brillos=[];
        for(const[x,y]of data.aguaDentro){const pp=Q(x,y);if(!visible(...pp))continue;
          for(let k=0;k<2;k++){const yy=y*T+((t*3+k*12+x*2)%T);c.moveTo(x*T+3,yy);c.lineTo(x*T+9,yy-.3);c.lineTo(x*T+17,yy);}
          if((x*7+y*9)%17===0)brillos.push(x,y);}
        c.strokeStyle='#ceffed20';c.lineWidth=.4;c.stroke();
        c.beginPath();for(let i=0;i<brillos.length;i+=2){const x=brillos[i],y=brillos[i+1],xx=(x+.5)*T+Math.sin(t*.6+x)*T*.25,yy=(y+.5)*T+Math.cos(t*.4+y)*T*.2;c.moveTo(xx+2.1,yy);c.ellipse(xx,yy,2.1,.65,0,0,TAU);}
        c.fillStyle='#e5a66c';c.fill();});
    }

    ground(()=>{d.guia();d.sangre();d.conos();});
    const objs=[],push=(x,y,fn)=>objs.push({depth:x+y,x,y,fn});
    function bill(x,y,fn,scale=.80){const q=P(x,y);if(!visible(...q))return;c.save();c.translate(q[0],q[1]);c.scale(scale,scale);c.translate(-x,-y-7*T/24);fn();c.restore();}
    function shade(x,y,rx,ry){if(horneado)return;const q=P(x,y);ellipse(c,q[0]+T*.28,q[1]+T*.1,rx,ry,'#28352b38');ellipse(c,q[0],q[1],rx*.5,ry*.6,'#172b243b')}
    function occlusion(x,y,width,high){const a=P(x,y),hero=P(h.x,h.y);return (h.x+h.y<x+y&&Math.abs(hero[0]-a[0])<width*.40&&hero[1]<a[1]+4&&hero[1]>a[1]-high)? .38:1;}
    const bld=L.exterior&&region==='aldea'?(s.buildings||[]):[];
    const occupied=(x,y)=>bld.some(b=>x>=b.x&&x<b.x+b.ancho&&y>=b.y&&y<b.y+b.fondo);
    if(L.exterior)for(let y=-18;y<L.rows+18;y+=2)for(let x=-18;x<L.cols+18;x+=2){
      if(x>=0&&y>=0&&x<L.cols&&y<L.rows)continue;
      const rr=rnd0(x*73+y*113+9301),xx=(x+rr())*T,yy=(y+rr())*T,q=P(xx,yy);if(!visible(...q,T*5))continue;
      const sw=T*(2.5+rr()*1.7);push(xx,yy,()=>{shade(xx,yy,sw*.4,sw*.16);sprite(c,images,'atlas-naturaleza',region==='aldea'&&rr()<.2?1:0,q[0],q[1]+3,sw);});
    }
    for(const[x,y]of data.rocks){
      if(occupied(x,y)||(s.landmarks||[]).some(m=>x>=m.x&&x<m.x+m.w&&y>=m.y&&y<m.y+m.h))continue;
      const q=Q(x+.5,y+.5);if(!visible(...q,T*3))continue;
      if(L.exterior){
        const edge=x===0||y===0||x===L.cols-1||y===L.rows-1;
        push((x+.5)*T,(y+.5)*T,()=>{shade((x+.5)*T,(y+.5)*T,T*.8,T*.25);sprite(c,images,'atlas-naturaleza',edge&&((x+y)%3)?5:4,q[0],q[1]+T*.2,T*(edge?1.8:1.62));});
      }else{
        push((x+.7)*T,(y+.7)*T,()=>{
          const im=images[(x*7+y*3)%4===0?'muro-piedra':'muro-shoji'];
          if(im?.naturalWidth){const q=Q(x+.5,y+.5),width=T*1.82,hh=width*im.naturalHeight/im.naturalWidth,opacity=occlusion((x+.5)*T,(y+.5)*T,width,hh);c.save();c.globalAlpha=opacity;c.drawImage(im,q[0]-width/2,q[1]+T*AY-hh,width,hh);c.restore();return;}
          const hh=T*(.62+((x*13+y*7)%4)*.08),a=Q(x,y),b=Q(x+1,y),cc=Q(x+1,y+1),dd=Q(x,y+1),up=v=>[v[0],v[1]-hh];
          const opacity=occlusion((x+.5)*T,(y+.5)*T,T*1.9,hh);c.save();c.globalAlpha=opacity;
          poly(c,[dd,cc,up(cc),up(dd)],'#46333c','#221d28');poly(c,[b,cc,up(cc),up(b)],'#342c36','#211b25');poly(c,[up(a),up(b),up(cc),up(dd)],'#695552','#95765b');
          const m=[(dd[0]+cc[0])/2,(dd[1]+cc[1])/2];line(c,[[m[0],m[1]-2],[m[0],m[1]-hh+2]],'#a67d5770',1.3);
          if((x+y)%5===0)line(c,[[a[0],a[1]-hh],[a[0]+6,a[1]-hh+6],[a[0]+2,a[1]-hh+10]],'#201c26',1.2);
          c.restore();
        });
      }
    }
    for(let i=0;i<bld.length;i++){
      const b=bld[i],x=(b.x+b.ancho/2)*T,y=(b.y+b.fondo/2)*T;
      const vertices=[Q(b.x,b.y),Q(b.x+b.ancho,b.y),Q(b.x+b.ancho,b.y+b.fondo),Q(b.x,b.y+b.fondo)];
      const sx=(Math.min(...vertices.map(v=>v[0]))+Math.max(...vertices.map(v=>v[0])))/2,sy=vertices[2][1];
      const width=(b.ancho+b.fondo)*T*AX*1.07,n=b.templo?3:[0,1,2,0][i%4];
      push((b.x+b.ancho)*T,(b.y+b.fondo)*T,()=>{poly(c,vertices,'#92856c','#655e48',1);ellipse(c,sx+T*.3,sy-T*.3,width*.48,T*.6,'#172c2c37');const hp=P(h.x,h.y),opacity=h.x+h.y<(b.x+b.ancho+b.y+b.fondo)*T&&Math.abs(hp[0]-sx)<width*.38&&hp[1]>sy-width&&hp[1]<sy? .35:1;sprite(c,images,'atlas-casas',n,sx,sy+3,width,opacity);});
    }
    for(const[x,y]of L.arboles){
      const xx=(x+.5)*T,yy=(y+.5)*T,q=P(xx,yy);if(!visible(...q,T*5))continue;
      const seed=(x*19+y*31)%13,sw=T*(2.05+seed*.045),n=['bosque','ribera'].includes(region)?0:1;
      push(xx,yy,()=>{shade(xx,yy,sw*.52,sw*.18);const op=occlusion(xx,yy,sw,sw*1.18);c.save();c.translate(Math.sin(t*.8+x)*.35,0);sprite(c,images,'atlas-naturaleza',n,q[0],q[1]+5,sw,op);c.restore();});
    }
    for(const[x,y,v]of data.flora){
      const q=Q(x,y);if(!visible(...q))continue;
      if(v<=.62&&horneado)continue;   // florecillas ya pintadas en el suelo
      push(x*T,y*T,()=>{if(v>.62)sprite(c,images,'atlas-naturaleza',5,q[0],q[1]+3,T*.7);else{for(let j=0;j<5;j++){const xx=q[0]+Math.sin(j*2.7)*4,yy=q[1]+Math.cos(j*1.3)*2;line(c,[[xx,yy],[xx+1,yy-4]],'#547333',.6);for(let k=0;k<3;k++)ellipse(c,xx+Math.cos(k*2.1)*.8,yy-4+Math.sin(k*2.1)*.6,.75,.65,['#f8e6a7','#ebe9cc','#e9baac'][j%3])}}});
    }
    // Faroles situados al lado de senderos: decoración de suelo, sin obstáculos invisibles.
    if(L.exterior)for(let y=2;y<L.rows-2;y++)for(let x=2;x<L.cols-2;x++){
      if(L.c[y][x]!==6||(x*17+y*3)%7!==0||![[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>L.c[y+b]?.[x+a]===5))continue;
      const q=Q(x+.5,y+.5);push((x+.5)*T,(y+.5)*T,()=>sprite(c,images,'atlas-naturaleza',2,q[0],q[1]+3,T*1.5));
    }
    // Monumentos: solo se asientan sobre su propia huella sólida del mapa.
    for(const m of s.landmarks||[]){
      const x=(m.x+m.w/2)*T,y=(m.y+m.h/2)*T,q=P(x,y);if(!visible(...q,T*8))continue;
      const width=(m.w+m.h)*T*.76,foot=Q(m.x+m.w,m.y+m.h);
      push((m.x+m.w)*T,(m.y+m.h)*T,()=>{
        sprite(c,images,'atlas-monumentos',m.sprite,q[0],foot[1],width,occlusion(x,y,width,width));
        if(m.sprite===0){const top=foot[1]-width*.58;for(let k=0;k<16;k++){const f=(t*.48+k/16)%1,px=q[0]+Math.sin(k*8)*width*.09;line(c,[[px,top+f*width*.49],[px-.4,top+f*width*.49+3]],'#e5fffa9c',.65)}for(let j=0;j<5;j++){const f=(t*.65+j/5)%1;ellipse(c,q[0]+Math.sin(j*2)*width*.17,foot[1]-width*.07-f*6,width*.07*(1+f),2+f*2,'#d8fff91a');}}
      });
    }
    for(const e of s.enemies)if(!(e.muerto>0))push(e.x,e.y,()=>bill(e.x,e.y,()=>d.enemy(e),.82));
    for(const n of L.npcs){const x=(n.tx+.5)*T,y=(n.ty+.5)*T;push(x,y,()=>bill(x,y,()=>d.npc(n),.83));}
    for(const o of L.objetos)if(d.objectVisible(o)){const x=(o.tx+.5)*T,y=(o.ty+.5)*T;push(x,y,()=>bill(x,y,()=>d.object(o),.90));}
    // reliquias lanzadas: la sombra se queda en el suelo y encoge cuanto más alto va el objeto
    for(const q of s.thrown||[])push(q.x,q.y,()=>{const qq=P(q.x,q.y),k=Math.max(.35,1-q.z/(T*2.4)),w=(q.pesada?7.5:5.5)*k;ellipse(c,qq[0],qq[1],w,w*.34,'rgba(20,15,25,'+(.5*k).toFixed(2)+')');
      bill(q.x,q.y,()=>{c.save();c.translate(q.x,q.y-3-q.z);c.rotate(q.rot||0);const sq=q.z<2&&q.rebote?1.12:1;c.scale(sq,1/sq);d.gem(0,0,4+q.gema.valor*.5,q.gema.valor);c.restore();},1);});
    for(const o of s.props||[])push(o.x,o.y,()=>bill(o.x,o.y,o.f,o.esc||1));   // cofres y otros objetos del motor
    for(const gem of s.gems)if(gem.estado==='suelo'){const x=(gem.tx+.5)*T,y=(gem.ty+.5)*T;push(x,y,()=>{const q=P(x,y);ellipse(c,q[0],q[1],6,2,'#20172444');bill(x,y,()=>d.gem(x,y-3+Math.sin(t*3+gem.tx)*1.2,4+gem.valor*.5,gem.valor),1);});}
    for(const b of s.boosts)if(b.t<=0){const x=(b.tx+.5)*T,y=(b.ty+.5)*T;push(x,y,()=>bill(x,y,()=>d.boost(x,y),1));}
    for(const b of s.portals){const x=(b.tx+.5)*T,y=(b.ty+.5)*T;push(x,y,()=>bill(x,y,()=>d.portal(b),1));}
    function marker(x,y,label,color){const q=Q(x+.5,y+.5);if(!visible(...q))return;const u=(t*.7)%1;c.strokeStyle=color;c.lineWidth=.8;c.globalAlpha=.75-u*.4;c.beginPath();c.ellipse(q[0],q[1],T*(.23+u*.18),T*(.1+u*.07),0,0,TAU);c.stroke();c.globalAlpha=1;c.fillStyle=color;c.font='bold 7px Georgia';c.textAlign='center';c.fillText(label,q[0],q[1]-T*.45);}
    if(L.exterior){
      for(const exit of s.exits){marker(exit[0],exit[1],d.exitName(exit),d.open(exit)?'#f8e9b1':'#edac91');const x=(exit[0]+.5)*T,y=(exit[1]+.5)*T;if(region==='aldea')push(x,y,()=>{const q=P(x,y);sprite(c,images,'atlas-naturaleza',3,q[0],q[1]+4,T*2.5)})}
      for(const[tx,ty]of s.torii||[]){const x=(tx+.5)*T,y=(ty+.5)*T;push(x,y,()=>{const q=P(x,y);sprite(c,images,'atlas-naturaleza',3,q[0],q[1]+4,T*2.5,.85)})}
      for(const a of s.treasures||[])marker(...a,'✧','#ffe1a0');
      for(const a of s.seals||[])marker(a[0],a[1],a[2]?'✦':'◇',a[2]?'#b6e494':'#e5c3f4');
      if(s.forge)marker(...s.forge,'FORJA','#d6fff2');
      if(region==='aldea'){
        const a=s.workshop.tronco,b=s.workshop.puesto;
        push((a.x+.5)*T,(a.y+.5)*T,()=>bill((a.x+.5)*T,(a.y+.5)*T,d.trunk,1));
        push((b.x+.5)*T,(b.y+.5)*T,()=>bill((b.x+.5)*T,(b.y+.5)*T,d.wheel,.95));
        const z=s.workshop.zumos;if(z&&d.juice){const zx=(z.x+z.ancho/2)*T,zy=(z.y+z.fondo)*T;push(zx,zy,()=>bill(zx,zy,d.juice,.95));}
      }
    }
    if(L.puertas.length){const x=L.puertas.reduce((a,b)=>a+b[0]+.5,0)/L.puertas.length*T,y=(L.puertas[0][1]+.6)*T;push(x,y,()=>{const q=P(x,y);sprite(c,images,'atlas-naturaleza',3,q[0],q[1]+6,T*2.8);c.font='bold 8px Georgia';c.textAlign='center';c.fillStyle='#fff3c8';c.fillText('DOJO',q[0],q[1]-T*1.5)});}
    if(s.heroVisible)push(h.x,h.y+.1,()=>{const q=P(h.x,h.y);c.strokeStyle='#f6e5a6a0';c.lineWidth=.8;c.beginPath();c.ellipse(q[0],q[1]+1,7,3.4,0,0,TAU);c.stroke();bill(h.x,h.y,d.hero,.80)});
    objs.sort((a,b)=>a.depth-b.depth);for(const o of objs)o.fn();
    // Guía visible encima del decorado, sin tapar todo el mundo.
    if(s.guide){const u=s.guide,q=Q(u.x+.5,u.y+.5);d.guideMarker(q[0],q[1]-T*(u.tipo==='hablar'?1.5:.65)+Math.sin(t*3)*1.4);}
    ground(()=>d.effects());
    if(region==='aldea')bill((s.workshop.tronco.x+.5)*T,(s.workshop.tronco.y+.5)*T,d.trunkEffects,1);
    if(!L.exterior){
      for(const[x,y]of data.lights){const q=Q(x,y),light=c.createRadialGradient(q[0],q[1]-12,0,q[0],q[1],T*2.2);light.addColorStop(0,'#efaa4b25');light.addColorStop(1,'#efaa4b00');c.fillStyle=light;c.fillRect(q[0]-T*3,q[1]-T*3,T*6,T*6);ellipse(c,q[0],q[1]-12,1,2,'#ffdc8c')}
      c.drawImage(capa('sombraDojo',w,height,cc=>{const v=cc.createRadialGradient(w*.5,height*.55,T,w*.5,height*.55,Math.max(w,height)*.65);v.addColorStop(0,'#11172600');v.addColorStop(.7,'#18152955');v.addColorStop(1,'#0d101ab0');cc.fillStyle=v;cc.fillRect(0,0,w,height);}),0,0,w,height);
      if(L.inicio){const q=Q(L.inicio[0]+.5,L.inicio[1]+.5);d.plaque(q[0],q[1]-T*2.6,'REFUGIO',s.goal,66);}
    }else{
      // Sol, motas, mariposas y rayos discretos, todos comparten dirección de luz.
      if(((typeof CONFIG!=='undefined'&&CONFIG.rendimiento)||{}).rayosDeLuz!==false){c.save();c.globalCompositeOperation='screen';
      for(let j=0;j<3;j++){const x=((j*153-cx*.17)%(w+160)+w+160)%(w+160)-80;const grad=c.createLinearGradient(x,0,x+130,height);grad.addColorStop(0,p.luz+'20');grad.addColorStop(.65,p.luz+'07');grad.addColorStop(1,p.luz+'00');poly(c,[[x-12,0],[x+18,0],[x+height*.5+60,height],[x+height*.5,height]],grad)}
      c.restore();}
      for(let k=0;k<14;k++){const x=(k*79+t*(1.5+k%3)-cx*.18)%(w+20),y=(k*53+t*1.2-cy*.12)%(height+20);ellipse(c,x,y,.4+(k%3)*.25,.6,k%3?'#ffffcb99':'#f3b7ca9c')}
      for(let k=0;k<3;k++){const x=(k*149+t*5)%(w+30)-15,y=height*.35+Math.sin(t*.4+k*2)*height*.21;const flap=.8+Math.abs(Math.sin(t*9+k))*1.4;ellipse(c,x-flap,y,flap,.8,'#f5dda0');ellipse(c,x+flap,y,flap,.8,'#fff3cf')}
    }
    // Vida local: frases cortas cerca del héroe; una sola burbuja a la vez.
    if(L.exterior&&s.idle&&!s.dialogue){const np=L.npcs.filter(n=>Math.hypot((n.tx+.5)*T-h.x,(n.ty+.5)*T-h.y)<T*4),cycle=Math.floor(t/10),n=np[cycle%Math.max(1,np.length)];if(n&&t%10<4.3){const q=Q(n.tx+.5,n.ty+.5),frases=s.banter[n.id]||['Buen día. De momento.'],str=frases[cycle%frases.length],width=Math.min(177,str.length*3.6+14);c.save();c.font='6.8px Georgia';c.textAlign='center';c.fillStyle='#fff3dbe8';c.strokeStyle='#9f8959';c.lineWidth=.5;c.beginPath();c.roundRect(q[0]-width/2,q[1]-T*2.45,width,15,5);c.fill();c.stroke();c.fillStyle='#51472f';c.fillText(str,q[0],q[1]-T*2.45+10,width-8);c.restore();}}
    if(s.energy){const q=P(h.x,h.y);c.fillStyle='#20262bcc';c.fillRect(q[0]-8,q[1]+6,16,2);c.fillStyle='#d9e0a5';c.fillRect(q[0]-8,q[1]+6,16*s.energy,1.6)}
    c.drawImage(capa('vin'+L.exterior,w,height,cc=>{const v=cc.createRadialGradient(w*.5,height*.45,Math.min(w,height)*.27,w*.5,height*.45,Math.max(w,height)*.75);v.addColorStop(0,'#1b2f2a00');v.addColorStop(1,L.exterior?'#293a252b':'#0a09134a');cc.fillStyle=v;cc.fillRect(0,0,w,height);}),0,0,w,height);
    c.restore();
    return {camera:[cx,cy],project:P,objects:objs.length};
  }
  return {render,proyectar,direccion,frames,perfiles,aguaEn,reset:()=>{cam=null;cache=null;ultimoNivel=null;sueloProy=null;recortes.clear();for(const k in capas)delete capas[k];},escala:()=>{recortes.clear();for(const k in capas)delete capas[k];}};
})();
