// ============================================================
//  RED.JS — conexión online: quién está conectado, amigos, invitaciones y el dojo en pareja
//  Modos (config.js > online.modo):
//    'local'    → pruebas: funciona entre pestañas del MISMO navegador (sin internet ni cuentas)
//    'supabase' → de verdad: todos los jugadores en un único servidor gratuito de Supabase
//                 (rellena online.url y online.clave con los datos de tu proyecto de Supabase)
//  El motor solo usa RED.on / RED.enviar / RED.conectados, así que cambiar de modo no toca nada más.
// ============================================================
const RED = (() => {
  const oyentes = {}, conectados = new Map();   // id → { id, nombre, personaje, lugar, visto }
  let yo = null, canal = null, modo = 'apagado', latido = null, tema = '', ref = 0, cfgG = null, latidoWS = null;
  const on = (tipo, f) => { (oyentes[tipo] = oyentes[tipo] || []).push(f); };
  const emitir = (tipo, d) => { for (const f of oyentes[tipo] || []) try { f(d); } catch (e) { console.error(e); } };
  function idPropio() {
    try { const ses = sessionStorage.getItem('reliquias-id'); if (ses) return ses;   // pruebas: cada pestaña puede tener su propio jugador
      let id = localStorage.getItem('reliquias-id'); if (!id) { id = 'j' + Math.random().toString(36).slice(2, 10); localStorage.setItem('reliquias-id', id); } return id; }
    catch (e) { return 'j' + Math.random().toString(36).slice(2, 10); }
  }
  function recibir(m) {
    if (!m || m.de === yo.id) return;
    if (m.para && m.para !== yo.id) return;
    if (m.tipo === 'hola' || m.tipo === 'estoy') {
      const nuevo = !conectados.has(m.de);
      conectados.set(m.de, { id: m.de, nombre: m.d.nombre, personaje: m.d.personaje, lugar: m.d.lugar, visto: Date.now() });
      if (m.tipo === 'hola') enviar('estoy', yo.datos(), m.de);   // le digo que también estoy
      if (nuevo) emitir('lista');
      return;
    }
    if (m.tipo === 'adios') { conectados.delete(m.de); emitir('lista'); return; }
    const c = conectados.get(m.de); if (c) c.visto = Date.now();
    emitir(m.tipo, { de: m.de, d: m.d });
  }
  function enviar(tipo, d, para) {
    if (!canal) return;
    const m = { tipo, de: yo.id, para: para || null, d: d || {} };
    if (modo === 'local') canal.postMessage(m);
    else if (modo === 'supabase' && canal.readyState === 1) canal.send(JSON.stringify({ topic: tema, event: 'broadcast', payload: { type: 'broadcast', event: 'm', payload: m }, ref: String(++ref) }));
  }
  function abrirWS() {
    return new Promise((ok, mal) => {
      const url = cfgG.url.replace(/^http/, 'ws').replace(/\/$/, '') + '/realtime/v1/websocket?apikey=' + cfgG.clave + '&vsn=1.0.0';
      const w = new WebSocket(url); let listo = false;
      w.onopen = () => { w.send(JSON.stringify({ topic: tema, event: 'phx_join', payload: { config: { broadcast: { self: false }, presence: { key: '' } }, access_token: cfgG.clave }, ref: String(++ref) })); };
      w.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.event === 'phx_reply' && !listo) { listo = true; canal = w; clearInterval(latidoWS); latidoWS = setInterval(() => { if (w.readyState === 1) w.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref) })); }, 25000); ok(); }
        else if (m.event === 'broadcast' && m.payload) recibir(m.payload.payload); };
      w.onclose = () => { if (canal === w) { canal = null; setTimeout(() => abrirWS().then(() => enviar('hola', yo.datos())).catch(() => {}), 3000); } };   // si se corta, vuelve a conectar
      w.onerror = () => { if (!listo) mal(new Error('ws')); };
      setTimeout(() => { if (!listo) mal(new Error('timeout')); }, 10000);
    });
  }
  async function conectar(cfg, datos) {
    if (canal) return true;
    yo = { id: idPropio(), datos };
    modo = cfg.modo || 'local';
    try {
      if (modo === 'local') {
        if (typeof BroadcastChannel === 'undefined') { modo = 'apagado'; return false; }
        canal = new BroadcastChannel('reliquias-red'); canal.onmessage = ev => recibir(ev.data);
      } else if (modo === 'supabase') {
        // conexión directa al servidor en tiempo real de Supabase (WebSocket, sin librerías)
        if (!cfg.url || !cfg.clave) { modo = 'apagado'; emitir('error', 'Falta online.url y online.clave en config.js'); return false; }
        cfgG = cfg; tema = 'realtime:' + (cfg.sala || 'reliquias-mundo');
        await abrirWS();
      } else return false;
    } catch (e) { console.error(e); canal = null; modo = 'apagado'; emitir('error', 'No se pudo conectar'); return false; }
    enviar('hola', datos());
    latido = setInterval(() => {   // cada 5 s digo que sigo aquí; quien no dé señales en 15 s, se va de la lista
      enviar('estoy', yo.datos()); const ahora = Date.now(); let cambio = false;
      for (const [id, c] of conectados) if (ahora - c.visto > 15000) { conectados.delete(id); cambio = true; }
      if (cambio) emitir('lista');
    }, 5000);
    addEventListener('beforeunload', () => enviar('adios'));
    emitir('lista'); return true;
  }
  return { on, enviar, conectar, get id() { return yo && yo.id; }, get modo() { return modo; }, conectados: () => [...conectados.values()], datosPropios: () => yo && yo.datos() };
})();
