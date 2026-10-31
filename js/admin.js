/* =====================================================================
   PANEL DE ADMIN · Juli Noguera
   Lee y escribe en Supabase. Solo funciona con un usuario logueado.
   ===================================================================== */

const sb = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
const BUCKET = 'fotos';

const estado = {
  tab: 'productos',
  categorias: [],
  productos: [],
  adicionales: [],
  ajustes: {},
  sucio: false            // hay cambios sin guardar en la pestaña actual
};

/* ===== Utilidades ===== */

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const plata = n => pesos.format(n || 0);
const copia = o => JSON.parse(JSON.stringify(o));
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function esc(t = '') {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function slug(t) {
  return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
}
function idUnico(base, usados) {
  let id = slug(base), n = 2;
  while (usados.includes(id)) id = `${slug(base)}-${n++}`;
  return id;
}
const numero = v => (v === '' || v == null || isNaN(Number(v))) ? null : Math.round(Number(v));
const lista = t => String(t || '').split(',').map(s => s.trim()).filter(Boolean);

let temporizadorAviso;
function aviso(texto, tipo = 'ok') {
  const el = $('#aviso');
  el.textContent = texto;
  el.className = 'admin-aviso ' + tipo;
  el.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.hidden = true, tipo === 'error' ? 6000 : 2500);
}

function mensajeError(error) {
  const m = (error && (error.message || error.msg)) || String(error);
  if (/JWT|token|401|403|row-level|permission/i.test(m)) return 'Se cerró la sesión o no tenés permiso. Salí y volvé a entrar.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisá internet y probá de nuevo.';
  return 'Algo salió mal: ' + m;
}
// Corre una operación de Supabase y avisa si falla
async function guardar(promesa, textoOk = 'Guardado') {
  const { error } = await promesa;
  if (error) { aviso(mensajeError(error), 'error'); return false; }
  if (textoOk) aviso(textoOk);
  return true;
}

function marcarSucio(v = true) {
  estado.sucio = v;
  const barra = $('#barra-guardar');
  if (barra) barra.classList.toggle('activa', v);
}
window.addEventListener('beforeunload', e => { if (estado.sucio) { e.preventDefault(); e.returnValue = ''; } });

/* ===== Precio de referencia (para el listado) ===== */

function precioDesde(p) {
  const base = (p.opciones || []).reduce((t, op) => {
    if (op.tipo !== 'unica') return t;
    const precios = op.valores.filter(v => v.activo !== false).map(v => v.precio).filter(x => x != null);
    return t + (precios.length ? Math.min(...precios) : 0);
  }, p.precio || 0);
  return p.descuento ? Math.round(base * (100 - p.descuento) / 100) : base;
}

/* ===== Fotos: compresión y subida ===== */

async function comprimir(archivo, maximo = 1400) {
  const img = await createImageBitmap(archivo, { imageOrientation: 'from-image' }).catch(() => null);
  if (!img) throw new Error('No se pudo leer la imagen');
  const escala = Math.min(1, maximo / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  let blob = await new Promise(r => canvas.toBlob(r, 'image/webp', 0.8));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
  return blob;
}

async function subirFoto(archivo, carpeta) {
  const blob = await comprimir(archivo);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const ruta = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(ruta, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}

// Si la foto está en nuestro bucket, devuelve su ruta (para poder borrarla)
function rutaEnBucket(url) {
  const marca = `/storage/v1/object/public/${BUCKET}/`;
  const i = String(url).indexOf(marca);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length));
}
async function borrarFotos(urls) {
  const rutas = urls.map(rutaEnBucket).filter(Boolean);
  if (rutas.length) await sb.storage.from(BUCKET).remove(rutas);
}

/* Galería editable: miniaturas que se pueden ordenar, borrar y agregar.
   "fotos" es el array que se modifica; "subidas" junta las fotos nuevas. */
function widgetFotos(cont, fotos, carpeta, subidas, alCambiar) {
  function render() {
    cont.innerHTML = `
      <div class="fotos-grilla">
        ${fotos.map((src, i) => `
          <figure class="foto-item">
            <img src="${esc(src)}" alt="Foto ${i + 1}">
            ${i === 0 ? '<span class="foto-portada">Portada</span>' : ''}
            <div class="foto-acciones">
              <button type="button" data-mover="${i}" data-dir="-1" aria-label="Mover a la izquierda"${i === 0 ? ' disabled' : ''}>◀</button>
              <button type="button" data-borrar="${i}" aria-label="Quitar foto">✕</button>
              <button type="button" data-mover="${i}" data-dir="1" aria-label="Mover a la derecha"${i === fotos.length - 1 ? ' disabled' : ''}>▶</button>
            </div>
          </figure>`).join('')}
        <label class="foto-agregar">
          <input type="file" accept="image/*" multiple hidden>
          <span>＋</span><small>Agregar fotos</small>
        </label>
      </div>
      <p class="ayuda">La primera es la portada. Las fotos se achican solas antes de subirse.</p>`;

    $$('[data-mover]', cont).forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.mover), j = i + Number(b.dataset.dir);
      [fotos[i], fotos[j]] = [fotos[j], fotos[i]];
      render(); alCambiar();
    }));
    $$('[data-borrar]', cont).forEach(b => b.addEventListener('click', () => {
      fotos.splice(Number(b.dataset.borrar), 1);
      render(); alCambiar();
    }));
    $('input[type=file]', cont).addEventListener('change', async e => {
      const archivos = [...e.target.files];
      if (!archivos.length) return;
      const etiqueta = $('.foto-agregar small', cont);
      etiqueta.textContent = 'Subiendo…';
      for (const [n, archivo] of archivos.entries()) {
        etiqueta.textContent = `Subiendo ${n + 1} de ${archivos.length}…`;
        try {
          const url = await subirFoto(archivo, carpeta);
          fotos.push(url);
          subidas.push(url);
        } catch (error) {
          aviso('No se pudo subir ' + archivo.name + '. ' + mensajeError(error), 'error');
        }
      }
      render(); alCambiar();
    });
  }
  render();
}

/* ===== Editor de filas genérico =====
   Para listas simples: zonas, tamaños, rellenos, adicionales, opciones de un grupo.
   campos: [{ k, etiqueta, tipo: 'texto'|'numero'|'check', placeholder, ancho }] */
function widgetFilas(cont, filas, { campos, nuevo, textoAgregar = '+ Agregar', alCambiar, alBorrar }) {
  function render() {
    cont.innerHTML = `
      <div class="filas">
        ${filas.map((f, i) => `
          <div class="fila">
            ${campos.map(c => campoHTML(c, f, i)).join('')}
            <div class="fila-acciones">
              <button type="button" data-mover="${i}" data-dir="-1" aria-label="Subir"${i === 0 ? ' disabled' : ''}>↑</button>
              <button type="button" data-mover="${i}" data-dir="1" aria-label="Bajar"${i === filas.length - 1 ? ' disabled' : ''}>↓</button>
              <button type="button" data-borrar="${i}" class="borrar" aria-label="Eliminar">✕</button>
            </div>
          </div>`).join('')}
      </div>
      <button type="button" class="boton boton-chico boton-secundario" data-agregar>${textoAgregar}</button>`;

    $$('[data-k]', cont).forEach(inp => inp.addEventListener('input', () => {
      const f = filas[inp.dataset.i], c = campos.find(c => c.k === inp.dataset.k);
      f[c.k] = c.tipo === 'check' ? inp.checked : c.tipo === 'numero' ? numero(inp.value) : inp.value;
      alCambiar && alCambiar();
    }));
    $$('[data-mover]', cont).forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.mover), j = i + Number(b.dataset.dir);
      [filas[i], filas[j]] = [filas[j], filas[i]];
      render(); alCambiar && alCambiar();
    }));
    $$('[data-borrar]', cont).forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.borrar);
      if (alBorrar && alBorrar(filas[i]) === false) return;
      filas.splice(i, 1);
      render(); alCambiar && alCambiar();
    }));
    $('[data-agregar]', cont).addEventListener('click', () => {
      filas.push(nuevo());
      render(); alCambiar && alCambiar();
      const ultimos = $$('.fila', cont);
      const primerInput = ultimos.length && $('input[type=text], input:not([type])', ultimos[ultimos.length - 1]);
      if (primerInput) primerInput.focus();
    });
  }
  function campoHTML(c, f, i) {
    const v = f[c.k];
    if (c.tipo === 'check') {
      return `<label class="fila-check" title="${esc(c.etiqueta)}"><input type="checkbox" class="switch" data-k="${c.k}" data-i="${i}"${v !== false ? ' checked' : ''}><span>${esc(c.etiqueta)}</span></label>`;
    }
    return `<label class="fila-campo${c.ancho ? ' ancho-' + c.ancho : ''}">
        <span>${esc(c.etiqueta)}</span>
        <input ${c.tipo === 'numero' ? 'type="number" inputmode="numeric" min="0"' : 'type="text"'} data-k="${c.k}" data-i="${i}" value="${esc(v ?? '')}" placeholder="${esc(c.placeholder || '')}">
      </label>`;
  }
  render();
}

/* ===== Login ===== */

async function iniciar() {
  const { data } = await sb.auth.getSession();
  if (data.session) mostrarPanel(); else mostrarLogin();
  sb.auth.onAuthStateChange((evento, sesion) => {
    if (evento === 'SIGNED_OUT' || !sesion) mostrarLogin();
  });
}

function mostrarLogin() {
  $('#vista-panel').hidden = true;
  $('#vista-login').hidden = false;
}

$('#form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, error = $('#login-error'), boton = $('button', f);
  error.hidden = true;
  boton.disabled = true; boton.textContent = 'Entrando…';
  const { error: err } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.clave.value });
  boton.disabled = false; boton.textContent = 'Entrar';
  if (err) {
    error.textContent = /invalid/i.test(err.message) ? 'Mail o contraseña incorrectos.' : mensajeError(err);
    error.hidden = false;
    return;
  }
  f.clave.value = '';
  mostrarPanel();
});

$('#salir').addEventListener('click', async () => {
  if (estado.sucio && !confirm('Tenés cambios sin guardar. ¿Salir igual?')) return;
  marcarSucio(false);
  await sb.auth.signOut();
});

async function mostrarPanel() {
  $('#vista-login').hidden = true;
  $('#vista-panel').hidden = false;
  $('#admin-contenido').innerHTML = '<p class="cargando">Cargando…</p>';
  if (await cargarTodo()) renderTab();
}

async function cargarTodo() {
  const [c, p, a, aj] = await Promise.all([
    sb.from('categorias').select('*').order('orden'),
    sb.from('productos').select('*').order('orden'),
    sb.from('adicionales').select('*').order('orden'),
    sb.from('ajustes').select('*')
  ]);
  const error = c.error || p.error || a.error || aj.error;
  if (error) {
    $('#admin-contenido').innerHTML = `<p class="aviso-error">${esc(mensajeError(error))}</p>`;
    return false;
  }
  estado.categorias = c.data;
  estado.productos = p.data;
  estado.adicionales = a.data;
  estado.ajustes = Object.fromEntries(aj.data.map(x => [x.clave, x.valor]));
  return true;
}

/* ===== Pestañas ===== */

$$('.admin-tabs button').forEach(b => b.addEventListener('click', async () => {
  if (b.dataset.tab === estado.tab) return;
  if (estado.sucio && !confirm('Tenés cambios sin guardar en esta sección. ¿Descartarlos?')) return;
  marcarSucio(false);
  estado.tab = b.dataset.tab;
  await cargarTodo();
  renderTab();
}));

function renderTab() {
  $$('.admin-tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.tab === estado.tab ? 'page' : 'false'));
  const cont = $('#admin-contenido');
  ({ productos: tabProductos, categorias: tabCategorias, adicionales: tabAdicionales,
     general: tabGeneral, personalizada: tabPersonalizada })[estado.tab](cont);
  window.scrollTo(0, 0);
}

// Barra fija de "Guardar cambios" para las pestañas de edición en bloque
function barraGuardar(alGuardar) {
  return { html: `<div id="barra-guardar" class="barra-guardar"><span>Tenés cambios sin guardar</span><button type="button" class="boton">Guardar cambios</button></div>`,
    activar(cont) {
      $('#barra-guardar button', cont).addEventListener('click', async e => {
        const b = e.currentTarget;
        b.disabled = true; b.textContent = 'Guardando…';
        const ok = await alGuardar();
        b.disabled = false; b.textContent = 'Guardar cambios';
        if (ok) { marcarSucio(false); await cargarTodo(); renderTab(); }
      });
    } };
}

/* =====================================================================
   PRODUCTOS
   ===================================================================== */

function tabProductos(cont) {
  const grupos = estado.categorias.map(c => ({ cat: c, prods: estado.productos.filter(p => p.categoria === c.id) }));
  const sueltos = estado.productos.filter(p => !estado.categorias.some(c => c.id === p.categoria));
  if (sueltos.length) grupos.push({ cat: { id: null, nombre: 'Sin categoría', visible: false }, prods: sueltos });

  cont.innerHTML = `
    <div class="admin-titulo">
      <h1>Productos</h1>
      <button type="button" class="boton" id="nuevo-producto">+ Nuevo producto</button>
    </div>
    <p class="ayuda"><b>Visible</b>: aparece en la tienda. <b>Hay stock</b>: se puede pedir (si no, aparece como "Sin stock" o "Próximamente").</p>
    ${grupos.map(g => `
      <section class="admin-grupo">
        <h2>${esc(g.cat.nombre)}${g.cat.visible === false && g.cat.id ? ' <small>(categoría oculta)</small>' : ''}</h2>
        ${g.prods.length ? '' : '<p class="ayuda">No hay productos en esta categoría.</p>'}
        <ul class="lista-productos">
          ${g.prods.map((p, i) => filaProductoHTML(p, i, g.prods.length)).join('')}
        </ul>
      </section>`).join('')}`;

  $('#nuevo-producto', cont).addEventListener('click', () => abrirEditor(null));
  $$('[data-editar]', cont).forEach(b => b.addEventListener('click', () => abrirEditor(b.dataset.editar)));

  $$('[data-switch]', cont).forEach(inp => inp.addEventListener('change', async () => {
    const campo = inp.dataset.switch, id = inp.dataset.id;
    const ok = await guardar(sb.from('productos').update({ [campo]: inp.checked }).eq('id', id),
      campo === 'visible' ? (inp.checked ? 'Visible en la tienda' : 'Oculto de la tienda') : (inp.checked ? 'Con stock' : 'Marcado sin stock'));
    if (!ok) { inp.checked = !inp.checked; return; }
    estado.productos.find(p => p.id === id)[campo] = inp.checked;
    renderTab();
  }));

  $$('[data-orden]', cont).forEach(b => b.addEventListener('click', async () => {
    const p = estado.productos.find(x => x.id === b.dataset.orden);
    const hermanos = estado.productos.filter(x => x.categoria === p.categoria);
    const i = hermanos.indexOf(p), otro = hermanos[i + Number(b.dataset.dir)];
    if (!otro) return;
    // Normaliza el orden por si había empates
    const nuevoOrden = hermanos.map(x => x.id);
    [nuevoOrden[i], nuevoOrden[i + Number(b.dataset.dir)]] = [nuevoOrden[i + Number(b.dataset.dir)], nuevoOrden[i]];
    const base = Math.min(...hermanos.map(x => x.orden));
    const cambios = nuevoOrden.map((id, k) => ({ id, orden: base + k }))
      .filter(c => estado.productos.find(x => x.id === c.id).orden !== c.orden);
    for (const c of cambios) {
      const { error } = await sb.from('productos').update({ orden: c.orden }).eq('id', c.id);
      if (error) return aviso(mensajeError(error), 'error');
      estado.productos.find(x => x.id === c.id).orden = c.orden;
    }
    estado.productos.sort((a, b) => a.orden - b.orden);
    renderTab();
  }));
}

function filaProductoHTML(p, i, total) {
  const insignias = [
    !p.visible && '<span class="insignia gris">Oculto</span>',
    p.visible && !p.disponible && `<span class="insignia gris">${p.entrega_semanal ? 'Próximamente' : 'Sin stock'}</span>`,
    p.descuento && `<span class="insignia oferta">Oferta −${p.descuento}%</span>`,
    p.entrega_semanal && `<span class="insignia">Entrega los ${DIAS[p.entrega_semanal.diaEntrega].toLowerCase()}</span>`
  ].filter(Boolean).join('');
  return `
    <li class="producto-fila${p.visible ? '' : ' apagado'}">
      ${p.fotos && p.fotos[0] ? `<img src="${esc(p.fotos[0])}" alt="">` : '<div class="sin-foto">Sin foto</div>'}
      <div class="producto-info">
        <strong>${esc(p.nombre)}</strong>
        <span>${precioDesde(p) ? 'desde ' + plata(precioDesde(p)) : 'sin precio'}</span>
        <div class="insignias">${insignias}</div>
      </div>
      <div class="producto-controles">
        <label class="switch-etiqueta"><input type="checkbox" class="switch" data-switch="visible" data-id="${esc(p.id)}"${p.visible ? ' checked' : ''}><span>Visible</span></label>
        <label class="switch-etiqueta"><input type="checkbox" class="switch" data-switch="disponible" data-id="${esc(p.id)}"${p.disponible ? ' checked' : ''}><span>Hay stock</span></label>
      </div>
      <div class="producto-acciones">
        <button type="button" data-orden="${esc(p.id)}" data-dir="-1" aria-label="Subir"${i === 0 ? ' disabled' : ''}>↑</button>
        <button type="button" data-orden="${esc(p.id)}" data-dir="1" aria-label="Bajar"${i === total - 1 ? ' disabled' : ''}>↓</button>
        <button type="button" class="boton boton-chico" data-editar="${esc(p.id)}">Editar</button>
      </div>
    </li>`;
}

/* ===== Editor de producto ===== */

const TIPOS = {
  unica: 'Elige una sola (ej.: tamaño)',
  multiple: 'Elige varias distintas (ej.: sabores de una caja)',
  cantidades: 'Reparte unidades y puede repetir (ej.: 2 porciones)'
};

let editor = null;   // { original, p, subidas }

function abrirEditor(id) {
  const original = id ? estado.productos.find(p => p.id === id) : null;
  const p = original ? copia(original) : {
    id: null, categoria: estado.categorias[0] && estado.categorias[0].id, nombre: '', descripcion: '', nota: '',
    precio: null, fotos: [], opciones: [], adicionales: [], visible: true, disponible: true,
    descuento: null, entrega_semanal: null
  };
  p.opciones = p.opciones || [];
  editor = { original, p, subidas: [], cambiado: false };

  const d = $('#editor');
  d.innerHTML = `
    <form class="editor-form" novalidate>
      <header class="editor-cabecera">
        <h2 id="editor-titulo">${original ? 'Editar producto' : 'Nuevo producto'}</h2>
        <button type="button" class="cerrar" data-cancelar aria-label="Cerrar">×</button>
      </header>

      <div class="editor-cuerpo">
        <section class="editor-seccion">
          <h3>Datos</h3>
          <label class="campo"><span>Nombre</span><input name="nombre" value="${esc(p.nombre)}" required></label>
          <label class="campo"><span>Categoría</span>
            <select name="categoria">${estado.categorias.map(c => `<option value="${esc(c.id)}"${c.id === p.categoria ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select>
          </label>
          <label class="campo"><span>Descripción</span><textarea name="descripcion" rows="4">${esc(p.descripcion)}</textarea></label>
          <label class="campo"><span>Nota destacada <small>opcional · ej.: "Caja de 24 unidades."</small></span><input name="nota" value="${esc(p.nota || '')}"></label>
          <label class="campo"><span>Precio base <small>opcional · dejalo vacío si el precio depende de una opción (ej.: tamaño)</small></span>
            <input name="precio" type="number" inputmode="numeric" min="0" value="${p.precio ?? ''}" placeholder="Ej.: 24000"></label>
        </section>

        <section class="editor-seccion">
          <h3>Fotos</h3>
          <div id="editor-fotos"></div>
        </section>

        <section class="editor-seccion">
          <h3>Disponibilidad y oferta</h3>
          <label class="switch-etiqueta grande"><input type="checkbox" class="switch" name="visible"${p.visible ? ' checked' : ''}><span>Visible en la tienda</span></label>
          <label class="switch-etiqueta grande"><input type="checkbox" class="switch" name="disponible"${p.disponible ? ' checked' : ''}><span>Hay stock (se puede pedir)</span></label>
          <label class="switch-etiqueta grande"><input type="checkbox" class="switch" name="enOferta"${p.descuento ? ' checked' : ''}><span>En oferta</span></label>
          <div class="sub-bloque" id="bloque-oferta"${p.descuento ? '' : ' hidden'}>
            <label class="campo campo-corto"><span>% de descuento</span><input name="descuento" type="number" min="1" max="90" inputmode="numeric" value="${p.descuento || ''}" placeholder="Ej.: 20"></label>
            <p class="ayuda" id="ejemplo-oferta"></p>
          </div>
          <label class="switch-etiqueta grande"><input type="checkbox" class="switch" name="semanal"${p.entrega_semanal ? ' checked' : ''}><span>Se entrega un solo día por semana (como las porciones)</span></label>
          <div class="sub-bloque" id="bloque-semanal"${p.entrega_semanal ? '' : ' hidden'}>
            <label class="campo campo-corto"><span>Día de entrega</span>
              <select name="diaEntrega">${DIAS.map((dia, i) => `<option value="${i}"${(p.entrega_semanal ? p.entrega_semanal.diaEntrega : 5) === i ? ' selected' : ''}>${dia}</option>`).join('')}</select></label>
            <label class="campo"><span>Horarios de retiro ese día <small>separados por coma</small></span><input name="semRetiro" value="${esc((p.entrega_semanal ? p.entrega_semanal.retiro : ['15 a 17 hs']).join(', '))}"></label>
            <label class="campo"><span>Horarios de envío ese día <small>separados por coma</small></span><input name="semEnvio" value="${esc((p.entrega_semanal ? p.entrega_semanal.envio : ['10 a 12 hs']).join(', '))}"></label>
            <p class="ayuda">La fecha se calcula sola: el próximo día de entrega que respete la anticipación. Si alguien lo pide junto con otras cosas, todo el pedido se entrega ese día.</p>
          </div>
        </section>

        <section class="editor-seccion">
          <h3>Opciones para elegir</h3>
          <p class="ayuda">Tamaños, sabores, rellenos… Cada grupo es una pregunta que el cliente responde. Destildá una opción para ocultarla sin borrarla.</p>
          <div id="editor-opciones"></div>
          <button type="button" class="boton boton-secundario boton-chico" id="agregar-grupo">+ Agregar grupo de opciones</button>
        </section>

        <section class="editor-seccion">
          <h3>Adicionales que se pueden sumar</h3>
          ${estado.adicionales.length ? `<div class="checks">
            ${estado.adicionales.map(a => `<label class="opcion"><input type="checkbox" name="adic" value="${esc(a.id)}"${(p.adicionales || []).includes(a.id) ? ' checked' : ''}><span>${esc(a.nombre)}</span><small>${a.precio ? plata(a.precio) : 'cortesía'}</small></label>`).join('')}
          </div>` : '<p class="ayuda">Todavía no hay adicionales. Se crean en la pestaña Adicionales.</p>'}
        </section>

        <p class="aviso-error" id="editor-error" role="alert" hidden></p>
      </div>

      <footer class="editor-pie">
        ${original ? '<button type="button" class="enlace peligro" data-eliminar>Eliminar</button>' : '<span></span>'}
        <div>
          <button type="button" class="boton boton-secundario" data-cancelar>Cancelar</button>
          <button type="submit" class="boton">Guardar</button>
        </div>
      </footer>
    </form>`;

  const form = $('form', d);
  const cambio = () => { editor.cambiado = true; };
  form.addEventListener('input', cambio);

  widgetFotos($('#editor-fotos', d), p.fotos, `productos/${p.id || 'nuevo'}`, editor.subidas, cambio);
  renderGrupos();

  const actualizarOferta = () => {
    $('#bloque-oferta', d).hidden = !form.enOferta.checked;
    const pct = numero(form.descuento.value);
    const ref = precioDesde({ ...p, precio: numero(form.precio.value), descuento: null });
    $('#ejemplo-oferta', d).textContent = form.enOferta.checked && pct && ref
      ? `Ejemplo: ${plata(ref)} pasa a ${plata(Math.round(ref * (100 - pct) / 100))}. En la tienda se ve el precio tachado y la etiqueta "Oferta −${pct}%".` : '';
  };
  form.enOferta.addEventListener('change', actualizarOferta);
  form.descuento.addEventListener('input', actualizarOferta);
  form.precio.addEventListener('input', actualizarOferta);
  actualizarOferta();
  form.semanal.addEventListener('change', () => $('#bloque-semanal', d).hidden = !form.semanal.checked);

  $('#agregar-grupo', d).addEventListener('click', () => {
    p.opciones.push({ id: null, tipo: 'unica', nombre: '', valores: [{ id: null, nombre: '', activo: true }] });
    cambio(); renderGrupos();
    const nombres = $$('[data-grupo-nombre]', d);
    nombres[nombres.length - 1].focus();
  });

  $$('[data-cancelar]', d).forEach(b => b.addEventListener('click', cerrarEditor));
  d.addEventListener('cancel', e => { e.preventDefault(); cerrarEditor(); });
  const eliminar = $('[data-eliminar]', d);
  if (eliminar) eliminar.addEventListener('click', eliminarProducto);
  form.addEventListener('submit', e => { e.preventDefault(); guardarProducto(form); });

  d.showModal();
  $('.editor-cuerpo', d).scrollTop = 0;
}

async function cerrarEditor() {
  if (editor.cambiado && !confirm('¿Cerrar sin guardar los cambios?')) return;
  // Las fotos que se subieron pero no se guardaron, se borran
  if (editor.subidas.length) await borrarFotos(editor.subidas);
  editor = null;
  $('#editor').close();
}

/* --- Grupos de opciones --- */

function renderGrupos() {
  const { p } = editor;
  const cont = $('#editor-opciones');
  const cambio = () => { editor.cambiado = true; };
  // grupos que otro grupo usa como referencia ("depende de")
  const referenciados = p.opciones.filter(o => o.tipo === 'multiple' && o.segun).map(o => o.segun);

  cont.innerHTML = p.opciones.map((op, gi) => {
    const candidatos = p.opciones.filter((o, k) => k !== gi && o.tipo === 'unica' && o.id);
    const modoCantidad = op.segun ? 'segun' : 'fijo';
    return `
    <div class="grupo-opciones" data-gi="${gi}">
      <div class="grupo-cabecera">
        <strong>Grupo ${gi + 1}</strong>
        <div class="fila-acciones">
          <button type="button" data-gmover="${gi}" data-dir="-1" aria-label="Subir grupo"${gi === 0 ? ' disabled' : ''}>↑</button>
          <button type="button" data-gmover="${gi}" data-dir="1" aria-label="Bajar grupo"${gi === p.opciones.length - 1 ? ' disabled' : ''}>↓</button>
          <button type="button" class="borrar" data-gborrar="${gi}" aria-label="Eliminar grupo">✕</button>
        </div>
      </div>
      <label class="campo"><span>Nombre del grupo</span><input data-grupo-nombre="${gi}" value="${esc(op.nombre)}" placeholder="Ej.: Tamaño, Sabores, Bandeja"></label>
      <label class="campo"><span>Cómo se elige</span>
        <select data-grupo-tipo="${gi}">${Object.entries(TIPOS).map(([k, t]) => `<option value="${k}"${op.tipo === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
      </label>
      ${op.tipo === 'multiple' ? `
        <div class="sub-bloque">
          <span class="etiqueta-campo">¿Cuántas puede elegir?</span>
          <label class="radio-linea"><input type="radio" name="modo-${gi}" value="fijo" data-grupo-modo="${gi}"${modoCantidad === 'fijo' ? ' checked' : ''}>
            Siempre <input type="number" min="1" inputmode="numeric" class="mini" data-grupo-elegir="${gi}" value="${op.elegir || ''}"></label>
          ${candidatos.length ? `<label class="radio-linea"><input type="radio" name="modo-${gi}" value="segun" data-grupo-modo="${gi}"${modoCantidad === 'segun' ? ' checked' : ''}>
            Depende de lo que elija en
            <select data-grupo-segun="${gi}">${candidatos.map(o => `<option value="${esc(o.id)}"${op.segun === o.id ? ' selected' : ''}>${esc(o.nombre || 'grupo sin nombre')}</option>`).join('')}</select></label>` : ''}
          <label class="radio-linea"><input type="checkbox" data-grupo-hasta="${gi}"${op.hasta ? ' checked' : ''}> Puede elegir menos (es un máximo)</label>
          <label class="radio-linea"><input type="checkbox" data-grupo-porcaja="${gi}"${op.porCaja ? ' checked' : ''}> Se multiplica por la cantidad (ej.: 2 cajas → el doble de sabores)</label>
        </div>` : ''}
      ${op.tipo === 'cantidades' ? `
        <div class="sub-bloque">
          <label class="radio-linea">Cantidad de unidades a repartir <input type="number" min="1" inputmode="numeric" class="mini" data-grupo-elegir="${gi}" value="${op.elegir || ''}"></label>
        </div>` : ''}
      <div data-valores="${gi}"></div>
      ${op.tipo === 'unica' && referenciados.includes(op.id) ? '<p class="ayuda">En cada opción poné cuántos puede elegir en el grupo que depende de este (ej.: bandeja de 9 → hasta 3 sabores).</p>' : ''}
    </div>`;
  }).join('') || '<p class="ayuda">Este producto no tiene opciones: se agrega directo al pedido con su precio base.</p>';

  p.opciones.forEach((op, gi) => {
    const campos = [
      { k: 'activo', etiqueta: 'Disponible', tipo: 'check' },
      { k: 'nombre', etiqueta: 'Opción', placeholder: 'Ej.: 16 cm · 10 porciones', ancho: 'grande' }
    ];
    if (op.tipo === 'unica') campos.push({ k: 'precio', etiqueta: 'Precio', tipo: 'numero', placeholder: 'opcional' });
    if (op.tipo === 'unica' && referenciados.includes(op.id)) campos.push({ k: 'elegir', etiqueta: 'Habilita', tipo: 'numero', placeholder: 'n°' });
    widgetFilas($(`[data-valores="${gi}"]`, cont), op.valores, {
      campos, textoAgregar: '+ Agregar opción', alCambiar: cambio,
      nuevo: () => ({ id: null, nombre: '', activo: true })
    });
  });

  const g = (attr, fn) => $$(`[${attr}]`, cont).forEach(el => el.addEventListener(el.tagName === 'SELECT' || el.type === 'radio' || el.type === 'checkbox' ? 'change' : 'input', () => { fn(p.opciones[el.getAttribute(attr)], el); cambio(); }));
  g('data-grupo-nombre', (op, el) => op.nombre = el.value);
  g('data-grupo-tipo', (op, el) => {
    op.tipo = el.value;
    if (op.tipo === 'unica') { delete op.elegir; delete op.segun; delete op.hasta; delete op.porCaja; }
    if (op.tipo === 'cantidades') { delete op.segun; delete op.hasta; delete op.porCaja; op.elegir = op.elegir || 2; }
    if (op.tipo === 'multiple') { op.elegir = op.elegir || 2; }
    renderGrupos();
  });
  g('data-grupo-elegir', (op, el) => op.elegir = numero(el.value));
  g('data-grupo-hasta', (op, el) => op.hasta = el.checked);
  g('data-grupo-porcaja', (op, el) => { if (el.checked) op.porCaja = true; else delete op.porCaja; });
  g('data-grupo-segun', (op, el) => { op.segun = el.value; renderGrupos(); });
  g('data-grupo-modo', (op, el) => {
    if (el.value === 'segun') {
      const sel = $(`[data-grupo-segun="${el.getAttribute('data-grupo-modo')}"]`, cont);
      op.segun = sel ? sel.value : null; delete op.elegir;
    } else { delete op.segun; op.elegir = op.elegir || 2; }
    renderGrupos();
  });
  $$('[data-gmover]', cont).forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.gmover), j = i + Number(b.dataset.dir);
    [p.opciones[i], p.opciones[j]] = [p.opciones[j], p.opciones[i]];
    cambio(); renderGrupos();
  }));
  $$('[data-gborrar]', cont).forEach(b => b.addEventListener('click', () => {
    const op = p.opciones[b.dataset.gborrar];
    if (!confirm(`¿Eliminar el grupo "${op.nombre || 'sin nombre'}" y todas sus opciones?`)) return;
    p.opciones.splice(b.dataset.gborrar, 1);
    p.opciones.forEach(o => { if (o.segun === op.id) { delete o.segun; o.elegir = 2; } });
    cambio(); renderGrupos();
  }));
}

/* --- Guardar --- */

function validarProducto(p) {
  const errores = [];
  if (!p.nombre.trim()) errores.push('Falta el nombre.');
  if (!p.categoria) errores.push('Elegí una categoría.');
  p.opciones.forEach((op, i) => {
    const nombre = op.nombre.trim() || `el grupo ${i + 1}`;
    if (!op.nombre.trim()) errores.push(`El grupo ${i + 1} no tiene nombre.`);
    if (!op.valores.length) errores.push(`"${nombre}" no tiene opciones.`);
    if (op.valores.some(v => !String(v.nombre || '').trim())) errores.push(`Hay una opción sin nombre en "${nombre}".`);
    if (op.tipo === 'cantidades' && !(op.elegir >= 1)) errores.push(`En "${nombre}" falta la cantidad de unidades.`);
    if (op.tipo === 'multiple') {
      if (op.segun) {
        const base = p.opciones.find(o => o.id === op.segun);
        if (!base) errores.push(`"${nombre}" depende de un grupo que ya no existe.`);
        else if (base.valores.some(v => !(v.elegir >= 1))) errores.push(`En "${base.nombre}" falta completar "Habilita" en todas las opciones.`);
      } else if (!(op.elegir >= 1)) errores.push(`En "${nombre}" falta cuántas puede elegir.`);
    }
  });
  const tienePrecio = p.precio > 0 || p.opciones.some(op => op.tipo === 'unica' && op.valores.length && op.valores.every(v => v.precio > 0));
  if (!tienePrecio) errores.push('Falta el precio: poné un precio base o un precio en cada opción de un grupo (ej.: tamaño).');
  if (p.descuento != null && !(p.descuento >= 1 && p.descuento <= 90)) errores.push('El descuento tiene que estar entre 1 y 90%.');
  return errores;
}

async function guardarProducto(form) {
  const { p, original } = editor;
  p.nombre = form.nombre.value.trim();
  p.categoria = form.categoria.value;
  p.descripcion = form.descripcion.value.trim();
  p.nota = form.nota.value.trim() || null;
  p.precio = numero(form.precio.value);
  p.visible = form.visible.checked;
  p.disponible = form.disponible.checked;
  p.descuento = form.enOferta.checked ? numero(form.descuento.value) : null;
  p.entrega_semanal = form.semanal.checked
    ? { diaEntrega: Number(form.diaEntrega.value), retiro: lista(form.semRetiro.value), envio: lista(form.semEnvio.value) }
    : null;
  p.adicionales = $$('input[name="adic"]:checked', form).map(i => i.value);

  const errores = validarProducto(p);
  const caja = $('#editor-error');
  if (errores.length) {
    caja.innerHTML = errores.map(esc).join('<br>');
    caja.hidden = false;
    caja.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  caja.hidden = true;

  // IDs estables: los existentes no cambian (así no se rompen los carritos)
  if (!p.id) p.id = idUnico(p.nombre, estado.productos.map(x => x.id));
  const idsGrupo = p.opciones.map(o => o.id).filter(Boolean);
  p.opciones.forEach(op => {
    if (!op.id) { op.id = idUnico(op.nombre, idsGrupo); idsGrupo.push(op.id); }
    const idsValor = op.valores.map(v => v.id).filter(Boolean);
    op.valores.forEach(v => {
      if (!v.id) { v.id = idUnico(v.nombre, idsValor); idsValor.push(v.id); }
      v.nombre = v.nombre.trim();
      if (v.precio == null) delete v.precio;
      if (v.elegir == null) delete v.elegir;
    });
    op.nombre = op.nombre.trim();
  });

  const fila = {
    id: p.id, categoria: p.categoria, nombre: p.nombre, descripcion: p.descripcion, nota: p.nota,
    precio: p.precio, fotos: p.fotos, opciones: p.opciones, adicionales: p.adicionales,
    visible: p.visible, disponible: p.disponible, descuento: p.descuento, entrega_semanal: p.entrega_semanal
  };
  if (!original) fila.orden = Math.max(0, ...estado.productos.map(x => x.orden)) + 1;

  const boton = $('button[type=submit]', form);
  boton.disabled = true; boton.textContent = 'Guardando…';
  const consulta = original ? sb.from('productos').update(fila).eq('id', p.id) : sb.from('productos').insert(fila);
  const ok = await guardar(consulta, original ? 'Producto guardado' : 'Producto creado');
  boton.disabled = false; boton.textContent = 'Guardar';
  if (!ok) return;

  // Fotos que se quitaron: se borran del almacenamiento
  if (original) await borrarFotos((original.fotos || []).filter(f => !p.fotos.includes(f)));
  editor = null;
  $('#editor').close();
  await cargarTodo();
  renderTab();
}

async function eliminarProducto() {
  const { original } = editor;
  if (!confirm(`¿Eliminar "${original.nombre}"? No se puede deshacer.\n\nSi solo querés sacarlo un tiempo, mejor apagá "Visible".`)) return;
  const ok = await guardar(sb.from('productos').delete().eq('id', original.id), 'Producto eliminado');
  if (!ok) return;
  await borrarFotos([...(original.fotos || []), ...editor.subidas]);
  editor = null;
  $('#editor').close();
  await cargarTodo();
  renderTab();
}

/* =====================================================================
   CATEGORÍAS
   ===================================================================== */

function tabCategorias(cont) {
  const filas = copia(estado.categorias);
  const borradas = [];
  const barra = barraGuardar(async () => {
    if (filas.some(c => !c.nombre.trim())) { aviso('Hay una categoría sin nombre.', 'error'); return false; }
    for (const id of borradas) {
      const { error } = await sb.from('categorias').delete().eq('id', id);
      if (error) { aviso(mensajeError(error), 'error'); return false; }
    }
    const usados = estado.categorias.map(c => c.id);
    const datos = filas.map((c, i) => {
      if (!c.id) { c.id = idUnico(c.nombre, usados); usados.push(c.id); }
      const cierre = c.cierre && c.cierre.texto ? { texto: c.cierre.texto, boton: c.cierre.boton || 'Ver más', href: c.cierre.href || '#' } : null;
      return { id: c.id, nombre: c.nombre.trim(), nota: (c.nota || '').trim() || null, cierre, visible: c.visible !== false, orden: i + 1 };
    });
    return guardar(sb.from('categorias').upsert(datos), 'Categorías guardadas');
  });

  function render() {
    cont.innerHTML = `
      <div class="admin-titulo"><h1>Categorías</h1></div>
      <p class="ayuda">El orden de acá es el orden de la tienda. En la nota podés poner un link así: <code>[texto del link](preguntas.html)</code>.</p>
      <div class="tarjetas-edit">
        ${filas.map((c, i) => {
          const cantidad = estado.productos.filter(p => p.categoria === c.id).length;
          return `
          <div class="tarjeta-edit">
            <div class="grupo-cabecera">
              <label class="switch-etiqueta"><input type="checkbox" class="switch" data-c="visible" data-i="${i}"${c.visible !== false ? ' checked' : ''}><span>Visible</span></label>
              <div class="fila-acciones">
                <button type="button" data-mover="${i}" data-dir="-1" aria-label="Subir"${i === 0 ? ' disabled' : ''}>↑</button>
                <button type="button" data-mover="${i}" data-dir="1" aria-label="Bajar"${i === filas.length - 1 ? ' disabled' : ''}>↓</button>
                <button type="button" class="borrar" data-borrar="${i}" aria-label="Eliminar"${cantidad ? ` disabled title="Tiene ${cantidad} productos"` : ''}>✕</button>
              </div>
            </div>
            <label class="campo"><span>Nombre</span><input data-c="nombre" data-i="${i}" value="${esc(c.nombre)}"></label>
            <label class="campo"><span>Nota debajo del título <small>opcional</small></span><textarea data-c="nota" data-i="${i}" rows="2">${esc(c.nota || '')}</textarea></label>
            <details${c.cierre && c.cierre.texto ? ' open' : ''}>
              <summary>Tarjeta al final de la categoría <small>opcional</small></summary>
              <label class="campo"><span>Texto</span><input data-cierre="texto" data-i="${i}" value="${esc(c.cierre ? c.cierre.texto : '')}" placeholder="¿Buscás una torta personalizada?"></label>
              <label class="campo"><span>Botón</span><input data-cierre="boton" data-i="${i}" value="${esc(c.cierre ? c.cierre.boton : '')}" placeholder="Mirá acá"></label>
              <label class="campo"><span>Link</span><input data-cierre="href" data-i="${i}" value="${esc(c.cierre ? c.cierre.href : '')}" placeholder="personalizadas.html"></label>
            </details>
            <p class="ayuda">${cantidad} producto${cantidad === 1 ? '' : 's'}</p>
          </div>`;
        }).join('')}
      </div>
      <button type="button" class="boton boton-secundario" id="nueva-categoria">+ Nueva categoría</button>
      ${barra.html}`;

    barra.activar(cont);
    marcarSucio(estado.sucio);
    $$('[data-c]', cont).forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
      filas[el.dataset.i][el.dataset.c] = el.type === 'checkbox' ? el.checked : el.value; marcarSucio();
    }));
    $$('[data-cierre]', cont).forEach(el => el.addEventListener('input', () => {
      const c = filas[el.dataset.i]; c.cierre = c.cierre || {}; c.cierre[el.dataset.cierre] = el.value; marcarSucio();
    }));
    $$('[data-mover]', cont).forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.mover), j = i + Number(b.dataset.dir);
      [filas[i], filas[j]] = [filas[j], filas[i]]; marcarSucio(); render();
    }));
    $$('[data-borrar]', cont).forEach(b => b.addEventListener('click', () => {
      const c = filas[b.dataset.borrar];
      if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
      if (c.id) borradas.push(c.id);
      filas.splice(b.dataset.borrar, 1); marcarSucio(); render();
    }));
    $('#nueva-categoria', cont).addEventListener('click', () => {
      filas.push({ id: null, nombre: '', nota: '', visible: true, cierre: null }); marcarSucio(); render();
      const nombres = $$('[data-c="nombre"]', cont); nombres[nombres.length - 1].focus();
    });
  }
  render();
}

/* =====================================================================
   ADICIONALES
   ===================================================================== */

function tabAdicionales(cont) {
  const filas = copia(estado.adicionales);
  const borrados = [];
  const barra = barraGuardar(async () => {
    if (filas.some(a => !String(a.nombre || '').trim())) { aviso('Hay un adicional sin nombre.', 'error'); return false; }
    for (const id of borrados) {
      // también se saca de los productos que lo usaban
      for (const p of estado.productos.filter(p => (p.adicionales || []).includes(id))) {
        const { error } = await sb.from('productos').update({ adicionales: p.adicionales.filter(x => x !== id) }).eq('id', p.id);
        if (error) { aviso(mensajeError(error), 'error'); return false; }
      }
      const { error } = await sb.from('adicionales').delete().eq('id', id);
      if (error) { aviso(mensajeError(error), 'error'); return false; }
    }
    const usados = estado.adicionales.map(a => a.id);
    const datos = filas.map((a, i) => {
      if (!a.id) { a.id = idUnico(a.nombre, usados); usados.push(a.id); }
      return { id: a.id, nombre: a.nombre.trim(), precio: a.precio || 0, grupo: (a.grupo || '').trim() || null, visible: a.visible !== false, orden: i + 1 };
    });
    return guardar(sb.from('adicionales').upsert(datos), 'Adicionales guardados');
  });

  cont.innerHTML = `
    <div class="admin-titulo"><h1>Adicionales</h1></div>
    <p class="ayuda">Velas, bengalas, toppers… Precio 0 = cortesía. Si dos adicionales tienen el mismo <b>grupo</b> (ej.: "vela"), el cliente puede elegir solo uno de ellos. En cada producto elegís cuáles se ofrecen.</p>
    <div id="filas-adicionales"></div>
    ${barra.html}`;
  barra.activar(cont);
  widgetFilas($('#filas-adicionales', cont), filas, {
    campos: [
      { k: 'visible', etiqueta: 'Visible', tipo: 'check' },
      { k: 'nombre', etiqueta: 'Nombre', placeholder: 'Ej.: Bengala blanca', ancho: 'grande' },
      { k: 'precio', etiqueta: 'Precio', tipo: 'numero', placeholder: '0' },
      { k: 'grupo', etiqueta: 'Grupo', placeholder: 'opcional' }
    ],
    textoAgregar: '+ Nuevo adicional',
    nuevo: () => ({ id: null, nombre: '', precio: 0, grupo: '', visible: true }),
    alCambiar: () => marcarSucio(),
    alBorrar: a => {
      const usan = estado.productos.filter(p => (p.adicionales || []).includes(a.id)).length;
      if (!confirm(`¿Eliminar "${a.nombre}"?${usan ? `\nSe va a sacar de ${usan} producto(s).` : ''}`)) return false;
      if (a.id) borrados.push(a.id);
    }
  });
}

/* =====================================================================
   ENVÍOS Y HORARIOS
   ===================================================================== */

function tabGeneral(cont) {
  const g = copia(estado.ajustes.general || {});
  g.zonasEnvio = g.zonasEnvio || [];
  g.fechasBloqueadas = (g.fechasBloqueadas || []).filter(f => f >= new Date().toISOString().slice(0, 10));
  g.diasCerrados = g.diasCerrados || [];
  // Horarios por día (0 = domingo … 6 = sábado). Convierte el formato viejo (semana/sábado).
  g.horarios = g.horarios || {};
  ['retiro', 'envio'].forEach(m => {
    const h = g.horarios[m] || {};
    const porDia = {};
    for (let d = 0; d < 7; d++) {
      porDia[d] = h.semana ? (d === 6 ? h.sabado || [] : d === 0 ? [] : h.semana) : (h[d] || []);
    }
    g.horarios[m] = porDia;
  });

  const barra = barraGuardar(async () => {
    if (!/^\d{10,15}$/.test(g.whatsapp || '')) { aviso('El WhatsApp tiene que ser solo números, con código de país (ej.: 5491112345678).', 'error'); return false; }
    if (g.zonasEnvio.some(z => !String(z.nombre || '').trim() || !(z.precio >= 0))) { aviso('Revisá las zonas: falta nombre o precio.', 'error'); return false; }
    g.zonasEnvio.forEach((z, i) => z.id = z.id || 'z' + Date.now() + i);
    return guardar(sb.from('ajustes').upsert({ clave: 'general', valor: g }), 'Ajustes guardados');
  });

  const fechaTexto = iso => {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  function render() {
    cont.innerHTML = `
      <div class="admin-titulo"><h1>Envíos y horarios</h1></div>

      <section class="tarjeta-edit">
        <h2>Pedidos</h2>
        <div class="campos-fila">
          <label class="campo"><span>Días mínimos de anticipación</span><input type="number" min="0" data-g="anticipacionMinDias" value="${g.anticipacionMinDias ?? 1}"></label>
          <label class="campo"><span>Hora de corte <small>después de esta hora ya no se puede pedir para mañana</small></span><input type="number" min="0" max="23" data-g="horaCorte" value="${g.horaCorte ?? 17}"></label>
          <label class="campo"><span>Se puede reservar hasta (días)</span><input type="number" min="1" data-g="ventanaDias" value="${g.ventanaDias ?? 30}"></label>
        </div>
        <span class="etiqueta-campo">Días cerrados</span>
        <div class="checks">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label class="opcion"><input type="checkbox" data-cerrado="${d}"${g.diasCerrados.includes(d) ? ' checked' : ''}><span>${DIAS[d]}</span></label>`).join('')}</div>
        <span class="etiqueta-campo">Fechas bloqueadas <small>feriados, vacaciones, días con agenda llena</small></span>
        <div class="fechas-bloqueadas">
          ${g.fechasBloqueadas.sort().map((f, i) => `<span class="chip">${fechaTexto(f)} <button type="button" data-quitar-fecha="${i}" aria-label="Quitar">✕</button></span>`).join('') || '<span class="ayuda">Ninguna</span>'}
        </div>
        <div class="agregar-fecha"><input type="date" id="nueva-fecha" min="${new Date().toISOString().slice(0, 10)}"><button type="button" class="boton boton-chico boton-secundario" id="agregar-fecha">Bloquear fecha</button></div>
      </section>

      <section class="tarjeta-edit">
        <h2>Horarios por día <small>separados por coma · vacío = ese día no hay</small></h2>
        <div class="tabla-horarios">
          <span></span><strong>Retiro</strong><strong>Envío</strong>
          ${[1, 2, 3, 4, 5, 6, 0].map(d => `
            <span class="dia${g.diasCerrados.includes(d) ? ' cerrado' : ''}">${DIAS[d]}${g.diasCerrados.includes(d) ? ' <small>(cerrado)</small>' : ''}</span>
            <input data-h="retiro.${d}" aria-label="Retiro ${DIAS[d]}" value="${esc(g.horarios.retiro[d].join(', '))}" placeholder="—">
            <input data-h="envio.${d}" aria-label="Envío ${DIAS[d]}" value="${esc(g.horarios.envio[d].join(', '))}" placeholder="—">`).join('')}
        </div>
        <p class="ayuda">Ej.: <code>11 a 13 hs, 15 a 17 hs</code>. En envíos, el cliente lo recibe dentro de ese rango.</p>
      </section>

      <section class="tarjeta-edit">
        <h2>Zonas de envío</h2>
        <div id="filas-zonas"></div>
        <label class="campo campo-corto"><span>Envío sin cargo en compras mayores a</span><input type="number" min="0" data-g="envioGratisDesde" value="${g.envioGratisDesde ?? ''}"></label>
      </section>

      <section class="tarjeta-edit">
        <h2>Contacto</h2>
        <label class="campo"><span>WhatsApp <small>solo números, con 549 adelante</small></span><input data-g="whatsapp" inputmode="numeric" value="${esc(g.whatsapp || '')}"></label>
        <label class="campo"><span>Dirección de retiro</span><input data-g="direccionRetiro" value="${esc(g.direccionRetiro || '')}"></label>
      </section>
      ${barra.html}`;

    barra.activar(cont);
    marcarSucio(estado.sucio);
    $$('[data-g]', cont).forEach(el => el.addEventListener('input', () => {
      g[el.dataset.g] = el.type === 'number' ? numero(el.value) : el.value.trim(); marcarSucio();
    }));
    $$('[data-h]', cont).forEach(el => el.addEventListener('input', () => {
      const [m, d] = el.dataset.h.split('.'); g.horarios[m][d] = lista(el.value); marcarSucio();
    }));
    $$('[data-cerrado]', cont).forEach(el => el.addEventListener('change', () => {
      const d = Number(el.dataset.cerrado);
      g.diasCerrados = el.checked ? [...new Set([...g.diasCerrados, d])] : g.diasCerrados.filter(x => x !== d); marcarSucio();
    }));
    $$('[data-quitar-fecha]', cont).forEach(b => b.addEventListener('click', () => {
      g.fechasBloqueadas.splice(Number(b.dataset.quitarFecha), 1); marcarSucio(); render();
    }));
    $('#agregar-fecha', cont).addEventListener('click', () => {
      const v = $('#nueva-fecha', cont).value;
      if (!v) return;
      if (!g.fechasBloqueadas.includes(v)) g.fechasBloqueadas.push(v);
      marcarSucio(); render();
    });
    widgetFilas($('#filas-zonas', cont), g.zonasEnvio, {
      campos: [
        { k: 'nombre', etiqueta: 'Zona', placeholder: 'Zona 1' },
        { k: 'barrios', etiqueta: 'Barrios', placeholder: 'San Justo, Villa Luzuriaga', ancho: 'grande' },
        { k: 'precio', etiqueta: 'Precio', tipo: 'numero', placeholder: '3000' }
      ],
      textoAgregar: '+ Nueva zona',
      nuevo: () => ({ id: null, nombre: '', barrios: '', precio: null }),
      alCambiar: () => marcarSucio()
    });
  }
  render();
}

/* =====================================================================
   PERSONALIZADAS
   ===================================================================== */

function tabPersonalizada(cont) {
  const P = copia(estado.ajustes.personalizada || {});
  ['tamanos', 'bizcochuelos', 'rellenos', 'fotos'].forEach(k => P[k] = P[k] || []);
  const subidas = [];
  const barra = barraGuardar(async () => {
    for (const k of ['tamanos', 'bizcochuelos', 'rellenos']) {
      if (P[k].some(x => !String(x.nombre || '').trim())) { aviso('Hay una fila sin nombre.', 'error'); return false; }
      const usados = P[k].map(x => x.id).filter(Boolean);
      P[k].forEach(x => { if (!x.id) { x.id = idUnico(x.nombre, usados); usados.push(x.id); } });
    }
    const original = (estado.ajustes.personalizada || {}).fotos || [];
    const ok = await guardar(sb.from('ajustes').upsert({ clave: 'personalizada', valor: P }), 'Personalizadas guardadas');
    if (ok) { await borrarFotos(original.filter(f => !P.fotos.includes(f))); subidas.length = 0; }
    return ok;
  });

  cont.innerHTML = `
    <div class="admin-titulo"><h1>Personalizadas y eventos</h1></div>
    <p class="ayuda">Esto es solo la referencia de precios de la página Eventos. Los pedidos personalizados se cierran por WhatsApp.</p>

    <section class="tarjeta-edit">
      <h2>Condiciones</h2>
      <div class="campos-fila">
        <label class="campo"><span>Seña (%)</span><input type="number" min="0" max="100" data-p="sena" value="${P.sena ?? 50}"></label>
        <label class="campo"><span>Anticipación</span><input data-p="anticipacion" value="${esc(P.anticipacion || '')}" placeholder="72 hs"></label>
        <label class="campo"><span>Rellenos máximos</span><input type="number" min="1" data-p="rellenosMax" value="${P.rellenosMax ?? 2}"></label>
      </div>
      <label class="campo"><span>Nota debajo del precio</span><textarea data-p="nota" rows="2">${esc(P.nota || '')}</textarea></label>
    </section>

    <section class="tarjeta-edit"><h2>Tamaños y precios</h2><div id="filas-tamanos"></div></section>
    <section class="tarjeta-edit"><h2>Bizcochuelos</h2><div id="filas-bizcochuelos"></div></section>
    <section class="tarjeta-edit"><h2>Rellenos</h2><div id="filas-rellenos"></div></section>
    <section class="tarjeta-edit"><h2>Galería de la página Eventos</h2><div id="fotos-eventos"></div></section>
    ${barra.html}`;

  barra.activar(cont);
  $$('[data-p]', cont).forEach(el => el.addEventListener('input', () => {
    P[el.dataset.p] = el.type === 'number' ? numero(el.value) : el.value; marcarSucio();
  }));
  const cambio = () => marcarSucio();
  widgetFilas($('#filas-tamanos', cont), P.tamanos, {
    campos: [
      { k: 'nombre', etiqueta: 'Nombre', placeholder: 'Chica' },
      { k: 'detalle', etiqueta: 'Detalle', placeholder: '16 cm · 10 porciones · 1,5 kg aprox.', ancho: 'grande' },
      { k: 'precio', etiqueta: 'Precio', tipo: 'numero' }
    ], textoAgregar: '+ Nuevo tamaño', nuevo: () => ({ id: null, nombre: '', detalle: '', precio: null }), alCambiar: cambio
  });
  widgetFilas($('#filas-bizcochuelos', cont), P.bizcochuelos, {
    campos: [{ k: 'nombre', etiqueta: 'Nombre', ancho: 'grande' }], textoAgregar: '+ Nuevo bizcochuelo', nuevo: () => ({ id: null, nombre: '' }), alCambiar: cambio
  });
  widgetFilas($('#filas-rellenos', cont), P.rellenos, {
    campos: [{ k: 'nombre', etiqueta: 'Nombre', ancho: 'grande' }], textoAgregar: '+ Nuevo relleno', nuevo: () => ({ id: null, nombre: '' }), alCambiar: cambio
  });
  widgetFotos($('#fotos-eventos', cont), P.fotos, 'eventos', subidas, cambio);
}

/* ===== Arranque ===== */

iniciar();
