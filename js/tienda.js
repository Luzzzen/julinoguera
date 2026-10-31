/* ===== Estado ===== */

const CLAVE_CARRITO = 'jn-carrito-v2';
const CLAVE_ENTREGA = 'jn-entrega-v2';
let carrito = cargarCarrito();
let actual = null;
let mesVisible = null;
let avisoQuitados = '';

function cargarCarrito() {
  try { return JSON.parse(localStorage.getItem(CLAVE_CARRITO)) || []; }
  catch { return []; }
}
function guardarCarrito() {
  try { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito)); } catch {}
}

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const ICONO_BATIDOR = '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M24 4v14"/><path d="M24 18c-7 0-10 8-10 15s4 11 10 11 10-4 10-11-3-15-10-15Z"/><path d="M24 18c-3 0-4.5 8-4.5 15s2 11 4.5 11 4.5-4 4.5-11-1.5-15-4.5-15Z"/></g></svg>';

/* ===== Fechas ===== */

function isoDe(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function deIso(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}
function textoFecha(iso) {
  const t = deIso(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
function hoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function fechaMinima() {
  const d = hoy();
  const pasoElCorte = new Date().getHours() >= CONFIG.horaCorte;
  d.setDate(d.getDate() + CONFIG.anticipacionMinDias + (pasoElCorte ? 1 : 0));
  return d;
}
function fechaMaxima() {
  const d = hoy();
  d.setDate(d.getDate() + CONFIG.ventanaDias);
  return d;
}
function esHabil(d) {
  return d >= fechaMinima() && d <= fechaMaxima()
    && !CONFIG.diasCerrados.includes(d.getDay())
    && !CONFIG.fechasBloqueadas.includes(isoDe(d));
}
/* Productos de entrega semanal (porciones): se entregan el próximo día fijo
   (el viernes) que respete la anticipación. Juli los prende y apaga desde el panel. */
function entregaSemanal(prod) {
  const fecha = hoy();
  fecha.setDate(fecha.getDate() + (prod.entregaFija.diaEntrega - fecha.getDay() + 7) % 7);
  while (fecha < fechaMinima()) fecha.setDate(fecha.getDate() + 7);
  return { fecha: isoDe(fecha) };
}

/* 'ok' | 'proximamente' | 'sinstock' */
function estadoProducto(prod) {
  if (prod.disponible === false) return prod.entregaFija ? 'proximamente' : 'sinstock';
  if (prod.opciones.some(op => !op.valores.length)) return 'sinstock';
  return 'ok';
}
const sePuedePedir = prod => estadoProducto(prod) === 'ok';

/* ===== Opciones y precios ===== */

const buscarProducto = id => PRODUCTOS.find(p => p.id === id);
const buscarOpcion = (prod, id) => prod.opciones.find(o => o.id === id);
const buscarValor = (op, id) => op.valores.find(v => v.id === id);

function esVisible(op, sel) {
  return !op.visibleSi || sel[op.visibleSi.opcion] === op.visibleSi.valor;
}

// "porCaja": el máximo se multiplica por la cantidad (2 cajas → el doble de sabores)
function cuantosPorUnidad(prod, op, sel) {
  if (op.elegir) return op.elegir;
  const base = buscarOpcion(prod, op.segun);
  const v = sel[op.segun] && buscarValor(base, sel[op.segun]);
  return v ? v.elegir : 0;
}
function cuantosElegir(prod, op, sel, cantidad = 1) {
  const n = cuantosPorUnidad(prod, op, sel);
  return op.porCaja ? n * cantidad : n;
}
// Mínima cantidad de cajas para que entren los sabores elegidos
function cantidadMinima(prod, sel) {
  return prod.opciones.reduce((min, op) => {
    if (op.tipo !== 'multiple' || !op.porCaja || !Array.isArray(sel[op.id])) return min;
    const n = cuantosPorUnidad(prod, op, sel);
    return n ? Math.max(min, Math.ceil(sel[op.id].length / n)) : min;
  }, 1);
}

// Oferta: el porcentaje se aplica al producto (no a los adicionales)
function conDescuento(prod, monto) {
  return prod.descuento ? Math.round(monto * (100 - prod.descuento) / 100) : monto;
}

function precioUnitario(prod, sel, adic) {
  let total = prod.precio || 0;
  prod.opciones.forEach(op => {
    if (op.tipo !== 'unica' || !esVisible(op, sel) || !sel[op.id]) return;
    const v = buscarValor(op, sel[op.id]);
    if (v && v.precio) total += v.precio;
  });
  total = conDescuento(prod, total);
  adic.forEach(id => total += ADICIONALES[id].precio);
  return total;
}

function precioLista(prod) {
  return prod.opciones.reduce((t, op) => {
    if (op.tipo !== 'unica' || op.visibleSi) return t;
    const precios = op.valores.map(v => v.precio).filter(p => p != null);
    return t + (precios.length ? Math.min(...precios) : 0);
  }, prod.precio || 0);
}
const precioDesde = prod => conDescuento(prod, precioLista(prod));

function precioHTML(prod) {
  const desde = tieneVariosPrecios(prod) ? '<small>desde </small>' : '';
  const tachado = prod.descuento ? `<s>${formatoPrecio(precioLista(prod))}</s> ` : '';
  return `<span class="precio">${desde}${tachado}${formatoPrecio(precioDesde(prod))}</span>`;
}
const ofertaHTML = prod => prod.descuento ? `<span class="cinta-oferta">Oferta −${prod.descuento}%</span>` : '';

function tieneVariosPrecios(prod) {
  return prod.opciones.some(op => new Set(op.valores.map(v => v.precio).filter(p => p != null)).size > 1);
}

/* ===== Galería ===== */

function galeriaHTML(prod) {
  if (!prod.fotos.length) {
    return `<div class="galeria">${ofertaHTML(prod)}<div class="galeria-pista"><div class="foto-vacia">${ICONO_BATIDOR}<span>Foto próximamente</span></div></div></div>`;
  }
  const fotos = prod.fotos.map((src, i) => `<img src="${esc(src)}" alt="${esc(prod.nombre)}${prod.fotos.length > 1 ? ` · foto ${i + 1}` : ''}" loading="lazy" decoding="async">`).join('');
  const puntos = prod.fotos.length > 1
    ? `<div class="galeria-puntos">${prod.fotos.map((_, i) => `<button type="button" data-foto="${i}" aria-label="Foto ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('')}</div>`
    : '';
  return `<div class="galeria">${ofertaHTML(prod)}<div class="galeria-pista">${fotos}</div>${puntos}</div>`;
}

function activarGalerias(raiz) {
  $$('.galeria', raiz).forEach(g => {
    const pista = $('.galeria-pista', g);
    const puntos = $$('.galeria-puntos button', g);
    if (!puntos.length) return;
    puntos.forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      pista.scrollTo({ left: pista.clientWidth * Number(b.dataset.foto), behavior: 'smooth' });
    }));
    pista.addEventListener('scroll', () => {
      const i = Math.round(pista.scrollLeft / pista.clientWidth);
      puntos.forEach((b, j) => b.toggleAttribute('aria-current', i === j));
    }, { passive: true });
  });
}

/* ===== Catálogo ===== */

function renderCatalogo() {
  const nav = $('#categorias');
  const contenedor = $('#catalogo');

  const categorias = CATEGORIAS.filter(c => PRODUCTOS.some(p => p.categoria === c.id));

  if (!categorias.length) {
    contenedor.innerHTML = '<p class="catalogo-vacio">Estamos actualizando la tienda. Volvé en un rato o escribinos por WhatsApp.</p>';
    return;
  }
  nav.innerHTML = categorias.map(c => `<a href="#cat-${c.id}" data-cat="${c.id}">${esc(c.nombre)}</a>`).join('');

  contenedor.innerHTML = categorias.map(c => `
    <section class="categoria" id="cat-${c.id}" aria-labelledby="titulo-${c.id}">
      <h2 id="titulo-${c.id}">${esc(c.nombre)}</h2>
      ${c.nota ? `<p class="categoria-nota">${textoConLinks(c.nota)}</p>` : ''}
      <div class="grilla">
        ${PRODUCTOS.filter(p => p.categoria === c.id).map(tarjetaHTML).join('')}
        ${c.cierre && c.cierre.texto ? `<a class="tarjeta tarjeta-cierre" href="${esc(c.cierre.href)}">
            <p>${esc(c.cierre.texto)}</p>
            <span class="boton boton-secundario">${esc(c.cierre.boton)} →</span>
          </a>` : ''}
      </div>
    </section>`).join('');

  activarGalerias(contenedor);
  activarLinksWhatsApp(contenedor);
  // Toda la tarjeta abre el producto (los puntos de la galería no, porque frenan el click)
  $$('[data-abrir]', contenedor).forEach(t => t.addEventListener('click', () => abrirConfigurador(t.dataset.abrir)));

  const enlaces = $$('a', nav);
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (!e.isIntersecting) return;
      enlaces.forEach(a => a.toggleAttribute('aria-current', a.dataset.cat === e.target.id.replace('cat-', '')));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  $$('.categoria', contenedor).forEach(s => observador.observe(s));
}

function tarjetaHTML(prod) {
  const estado = estadoProducto(prod);
  const ok = estado === 'ok';
  let etiqueta = '';
  if (estado === 'proximamente') etiqueta = 'Próximamente';
  else if (estado === 'sinstock') etiqueta = 'Sin stock por ahora';
  else if (prod.entregaFija) etiqueta = 'Entrega: ' + textoFecha(entregaSemanal(prod).fecha);
  const boton = ok
    ? `<button class="boton boton-chico" type="button" data-producto="${prod.id}">Elegir</button>`
    : `<button class="boton boton-chico" type="button" disabled>${estado === 'proximamente' ? 'Próximamente' : 'Sin stock'}</button>`;
  return `
    <article class="tarjeta${ok ? ' tarjeta-clic' : ' tarjeta-off'}"${ok ? ` data-abrir="${prod.id}"` : ''}>
      ${galeriaHTML(prod)}
      <div class="tarjeta-cuerpo">
        ${etiqueta ? `<span class="etiqueta">${etiqueta}</span>` : ''}
        <h3>${esc(prod.nombre)}</h3>
        <p>${esc(prod.descripcion)}</p>
        <div class="tarjeta-pie">
          ${precioHTML(prod)}
          ${boton}
        </div>
      </div>
    </article>`;
}

/* ===== Configurador ===== */

function abrirConfigurador(id) {
  const prod = buscarProducto(id);
  actual = { prod, cant: {} };
  prod.opciones.filter(op => op.tipo === 'cantidades').forEach(op => actual.cant[op.id] = {});
  const dialogo = $('#configurador');

  dialogo.innerHTML = `
    <form method="dialog" class="hoja-contenido" novalidate>
      <button class="cerrar" value="cerrar" aria-label="Cerrar">×</button>
      ${galeriaHTML(prod)}
      <div class="hoja-cuerpo">
        <h2>${esc(prod.nombre)}</h2>
        <p class="hoja-desc">${esc(prod.descripcion)}</p>
        ${prod.nota ? `<p class="hoja-nota">${esc(prod.nota)}</p>` : ''}
        ${fechaFijaHTML(prod)}
        ${prod.opciones.map(op => opcionHTML(prod, op)).join('')}
        ${adicionalesHTML(prod)}
        <div class="campo-cantidad">
          <span>Cantidad</span>
          <div class="contador">
            <button type="button" data-cant="-1" aria-label="Restar">−</button>
            <input name="cantidad" type="number" min="1" max="20" value="1" inputmode="numeric" aria-label="Cantidad">
            <button type="button" data-cant="1" aria-label="Sumar">+</button>
          </div>
        </div>
        <p class="aviso-error" role="alert" hidden></p>
      </div>
      <div class="hoja-pie">
        <span class="precio" id="precio-config"></span>
        <button type="button" class="boton" id="agregar">Agregar al pedido</button>
      </div>
    </form>`;

  activarGalerias(dialogo);

  const form = $('form', dialogo);
  form.addEventListener('submit', e => { if (!e.submitter || e.submitter.value !== 'cerrar') e.preventDefault(); });
  form.addEventListener('change', e => {
    // Adicionales del mismo grupo (las velas): se puede marcar uno solo
    const t = e.target;
    const grupo = t.name === 'adic' && t.checked && ADICIONALES[t.value].grupo;
    if (grupo) $$('input[name="adic"]', form).forEach(i => {
      if (i !== t && ADICIONALES[i.value].grupo === grupo) i.checked = false;
    });
    actualizarConfigurador();
  });
  form.addEventListener('input', actualizarConfigurador);
  $$('[data-cant]', form).forEach(b => b.addEventListener('click', () => {
    const inp = form.cantidad;
    inp.value = Math.min(20, Math.max(1, Number(inp.value || 1) + Number(b.dataset.cant)));
    actualizarConfigurador();
  }));
  $$('[data-sabor]', form).forEach(b => b.addEventListener('click', () => {
    const conteo = actual.cant[b.dataset.op];
    conteo[b.dataset.sabor] = Math.max(0, (conteo[b.dataset.sabor] || 0) + Number(b.dataset.delta));
    actualizarConfigurador();
  }));
  $('#agregar', form).addEventListener('click', agregarAlCarrito);

  actualizarConfigurador();
  dialogo.showModal();
  $('.hoja-contenido', dialogo).scrollTop = 0;
}

function fechaFijaHTML(prod) {
  if (!prod.entregaFija) return '';
  // (la fecha se calcula sola: el próximo día de entrega)
  const f = prod.entregaFija;
  const fecha = entregaSemanal(prod).fecha;
  return `<fieldset class="grupo" data-opcion="__fecha">
      <legend>Fecha de entrega</legend>
      <div class="opciones">
        <label class="opcion">
          <input type="radio" name="__fecha" value="${fecha}"><span>${textoFecha(fecha)}</span>
        </label>
      </div>
      <p class="grupo-nota">${f.retiro.length ? 'Retiro: ' + esc(f.retiro.join(' / ')) : ''}${f.retiro.length && f.envio.length ? ' · ' : ''}${f.envio.length ? 'Envío: ' + esc(f.envio.join(' / ')) : ''}</p>
    </fieldset>`;
}

function opcionHTML(prod, op) {
  if (op.tipo === 'cantidades') {
    return `<fieldset class="grupo" data-opcion="${op.id}">
        <legend>${esc(op.nombre)} <span class="grupo-ayuda"></span></legend>
        <ul class="lista-cantidades">
          ${op.valores.map(v => `<li>
              <span>${esc(v.nombre)}</span>
              <div class="contador contador-chico">
                <button type="button" data-op="${op.id}" data-sabor="${v.id}" data-delta="-1" aria-label="Uno menos de ${v.nombre}">−</button>
                <output data-conteo="${v.id}">0</output>
                <button type="button" data-op="${op.id}" data-sabor="${v.id}" data-delta="1" aria-label="Uno más de ${v.nombre}">+</button>
              </div>
            </li>`).join('')}
        </ul>
      </fieldset>`;
  }

  const preseleccion = op.tipo === 'unica' && (op.preseleccionar || op.valores.some(v => v.precio != null || v.elegir));
  const tipoInput = op.tipo === 'multiple' ? 'checkbox' : 'radio';

  const valores = op.valores.map((v, i) => {
    const marcado = preseleccion && i === 0 ? ' checked' : '';
    const extra = op.estilo === 'color' ? `<span class="muestra" style="--muestra:${v.hex}"></span>` : '';
    const precio = v.precio != null && op.valores.length > 1 && !prod.precio ? `<small>${formatoPrecio(conDescuento(prod, v.precio))}</small>` : '';
    return `<label class="opcion${op.estilo === 'color' ? ' opcion-color' : ''}">
        <input type="${tipoInput}" name="${op.id}" value="${v.id}"${marcado}>
        ${extra}<span>${esc(v.nombre)}</span>${precio}
      </label>`;
  }).join('');

  return `<fieldset class="grupo" data-opcion="${op.id}">
      <legend>${esc(op.nombre)} <span class="grupo-ayuda"></span></legend>
      <div class="opciones">${valores}</div>
    </fieldset>`;
}

function adicionalesHTML(prod) {
  if (!prod.adicionales || !prod.adicionales.length) return '';
  return `<fieldset class="grupo">
      <legend>Adicionales <span class="grupo-ayuda">opcional</span></legend>
      <div class="opciones">
        ${prod.adicionales.map(id => {
          const a = ADICIONALES[id];
          return `<label class="opcion">
            <input type="checkbox" name="adic" value="${id}">
            <span>${esc(a.nombre)}</span><small>${a.precio ? '+ ' + formatoPrecio(a.precio) : 'cortesía'}</small>
          </label>`;
        }).join('')}
      </div>
    </fieldset>`;
}

function leerSeleccion(form, prod) {
  const sel = {};
  prod.opciones.forEach(op => {
    if (op.tipo === 'multiple') {
      sel[op.id] = $$(`input[name="${op.id}"]:checked`, form).map(i => i.value);
    } else if (op.tipo === 'cantidades') {
      sel[op.id] = Object.fromEntries(Object.entries(actual.cant[op.id]).filter(([, n]) => n > 0));
    } else {
      const marcado = $(`input[name="${op.id}"]:checked`, form);
      sel[op.id] = marcado ? marcado.value : null;
    }
  });
  const adic = $$('input[name="adic"]:checked', form).map(i => i.value);
  return { sel, adic };
}

function totalCantidades(obj) {
  return Object.values(obj || {}).reduce((t, n) => t + n, 0);
}

function actualizarConfigurador() {
  const { prod } = actual;
  const form = $('#configurador form');
  const { sel, adic } = leerSeleccion(form, prod);
  const cantidad = Math.min(20, Math.max(1, Number(form.cantidad.value) || 1));

  prod.opciones.forEach(op => {
    const grupo = $(`[data-opcion="${op.id}"]`, form);
    const visible = esVisible(op, sel);
    grupo.hidden = !visible;
    if (!visible) {
      $$('input', grupo).forEach(i => i.checked = false);
      sel[op.id] = op.tipo === 'multiple' ? [] : null;
    }

    if (op.tipo === 'multiple') {
      const n = cuantosElegir(prod, op, sel, cantidad);
      const marcados = $$('input:checked', grupo);
      marcados.slice(n).forEach(i => i.checked = false);
      const total = Math.min(marcados.length, n);
      $$('input', grupo).forEach(i => i.disabled = !n || (!i.checked && total >= n));
      const base = op.segun && buscarOpcion(prod, op.segun);
      const porUnidad = cuantosPorUnidad(prod, op, sel);
      $('.grupo-ayuda', grupo).textContent = !n
        ? `elegí primero ${base.nombre.toLowerCase()}`
        : op.porCaja
          ? `hasta ${porUnidad} por caja · ${total}/${n}${cantidad === 1 ? ' · sumá cajas para elegir más' : ''}`
          : `${op.hasta ? 'hasta' : 'elegí'} ${n} · ${total}/${n}`;
      sel[op.id] = $$('input:checked', grupo).map(i => i.value);
    }

    if (op.tipo === 'cantidades') {
      const n = op.elegir;
      const conteo = actual.cant[op.id];
      const total = totalCantidades(conteo);
      $$('[data-conteo]', grupo).forEach(o => o.textContent = conteo[o.dataset.conteo] || 0);
      $$('[data-delta="1"]', grupo).forEach(b => b.disabled = total >= n);
      $$('[data-delta="-1"]', grupo).forEach(b => b.disabled = !conteo[b.dataset.sabor]);
      $('.grupo-ayuda', grupo).textContent = `elegí ${n} · ${total}/${n} · podés repetir`;
    }
  });

  const fecha = prod.entregaFija ? ($('input[name="__fecha"]:checked', form) || {}).value || null : null;
  Object.assign(actual, { sel, adic, cantidad, fecha });

  $('#precio-config').textContent = formatoPrecio(precioUnitario(prod, sel, adic) * cantidad);
  $('.aviso-error', form).hidden = true;
}

function faltantes(prod, sel, fecha, cantidad = 1) {
  const lista = [];
  if (prod.entregaFija && !fecha) lista.push('la fecha de entrega');
  prod.opciones.forEach(op => {
    if (!esVisible(op, sel)) return;
    let falta;
    if (op.tipo === 'multiple') {
      const n = cuantosElegir(prod, op, sel, cantidad);
      falta = op.hasta ? (sel[op.id].length < 1 || sel[op.id].length > n) : sel[op.id].length !== n;
    } else if (op.tipo === 'cantidades') {
      falta = totalCantidades(sel[op.id]) !== op.elegir;
    } else {
      falta = !sel[op.id];
    }
    if (falta) lista.push(op.nombre.toLowerCase());
  });
  return lista;
}

/* ===== Carrito ===== */

function detalleItem(prod, sel, adic) {
  const lineas = [];
  prod.opciones.forEach(op => {
    if (!esVisible(op, sel)) return;
    if (op.tipo === 'multiple') {
      lineas.push(`${op.nombre}: ${sel[op.id].map(id => buscarValor(op, id).nombre).join(', ')}`);
    } else if (op.tipo === 'cantidades') {
      lineas.push(`${op.nombre}: ${Object.entries(sel[op.id]).map(([id, n]) => (n > 1 ? `${n} × ` : '') + buscarValor(op, id).nombre).join(', ')}`);
    } else if (sel[op.id]) {
      lineas.push(`${op.nombre}: ${buscarValor(op, sel[op.id]).nombre}`);
    }
  });
  if (adic.length) lineas.push(`Adicionales: ${adic.map(id => ADICIONALES[id].nombre).join(', ')}`);
  return lineas;
}

/* Rearma cada ítem desde el catálogo actual: si cambió un precio, se actualiza;
   si el producto o una opción ya no existe, el ítem se descarta. */
function itemVigente(item) {
  const prod = buscarProducto(item.id);
  if (!prod || !sePuedePedir(prod)) return null;
  try {
    const ok = prod.opciones.every(op => {
      const v = item.sel[op.id];
      if (!esVisible(op, item.sel)) return true;
      if (op.tipo === 'multiple') return Array.isArray(v) && v.every(id => buscarValor(op, id));
      if (op.tipo === 'cantidades') return v && Object.keys(v).every(id => buscarValor(op, id));
      return v && buscarValor(op, v);
    }) && item.adic.every(id => ADICIONALES[id] && (prod.adicionales || []).includes(id))
      && !faltantes(prod, item.sel, prod.entregaFija ? entregaSemanal(prod).fecha : null, item.cantidad).length;
    if (!ok) return null;
  } catch { return null; }
  return {
    prod,
    detalle: detalleItem(prod, item.sel, item.adic),
    precio: precioUnitario(prod, item.sel, item.adic)
  };
}

function depurarCarrito() {
  const quitados = [];
  carrito = carrito.filter(item => {
    const ok = itemVigente(item);
    if (!ok) quitados.push(item.nombre || 'un producto');
    return ok;
  });
  if (quitados.length) {
    guardarCarrito();
    avisoQuitados = `Sacamos del pedido ${quitados.join(', ')} porque ya no está disponible.`;
  }
}

const firmaDe = (id, sel, adic) => id + '|' + JSON.stringify(sel) + '|' + [...adic].sort().join(',');

function agregarAlCarrito() {
  const { prod, sel, adic, cantidad, fecha } = actual;
  const falta = faltantes(prod, sel, fecha, cantidad);
  const form = $('#configurador form');
  if (falta.length) {
    const aviso = $('.aviso-error', form);
    aviso.textContent = `Te falta elegir: ${falta.join(', ')}.`;
    aviso.hidden = false;
    aviso.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const firma = firmaDe(prod.id, sel, adic);
  const existente = carrito.find(i => i.firma === firma);
  if (existente) {
    existente.cantidad = Math.min(20, existente.cantidad + cantidad);
  } else {
    carrito.push({ firma, id: prod.id, nombre: prod.nombre, sel, adic, cantidad });
  }

  guardarCarrito();
  actualizarBadge();
  $('#configurador').close();
  mostrarToast(`${prod.nombre} se agregó al pedido`);
}

function actualizarBadge() {
  const total = carrito.reduce((t, i) => t + i.cantidad, 0);
  const badge = $('#carrito-cantidad');
  badge.textContent = total;
  badge.hidden = total === 0;
  $('#btn-carrito').setAttribute('aria-label', `Ver pedido (${total} productos)`);
}

let temporizadorToast;
function mostrarToast(texto) {
  const toast = $('#toast');
  $('span', toast).textContent = texto;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('visible'));
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.hidden = true, 250);
  }, 3500);
}

/* ===== Entrega ===== */

// Si hay un producto con fecha fija (porciones), todo el pedido va ese día.
function entregaFijaDelPedido() {
  const item = carrito.find(i => buscarProducto(i.id).entregaFija);
  if (!item) return null;
  const prod = buscarProducto(item.id);
  return { ...prod.entregaFija, fecha: entregaSemanal(prod).fecha, nombre: prod.nombre };
}

// Horarios por día de la semana (0 = domingo … 6 = sábado). null = falta elegir fecha.
function franjasPara(modalidad, iso, fija) {
  if (fija) return fija[modalidad] || [];
  if (!iso) return null;
  const h = (CONFIG.horarios || {})[modalidad] || {};
  const dia = deIso(iso).getDay();
  if (h.semana) return (dia === 6 ? h.sabado : h.semana) || [];   // formato anterior
  return h[dia] || [];
}

const subtotalCarrito = () => carrito.reduce((t, i) => t + itemVigente(i).precio * i.cantidad, 0);

function costoEnvio(subtotal, zona) {
  if (!zona) return 0;
  return CONFIG.envioGratisDesde && subtotal > CONFIG.envioGratisDesde ? 0 : zona.precio;
}

/* ===== Código de descuento =====
   La tienda no ve la lista de códigos: le pregunta a la base si uno vale. */

const CLAVE_CODIGO = 'jn-codigo';
let codigo = null;          // { codigo, tipo, valor, minimo } validado
let mensajeCodigo = '';

async function consultarCodigo(texto) {
  const { url, key } = CONFIG.supabase;
  const r = await fetch(`${url}/rest/v1/rpc/validar_codigo`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_codigo: texto })
  });
  if (!r.ok) throw new Error('codigo ' + r.status);
  const filas = await r.json();
  return filas[0] || null;
}

function guardarCodigo() {
  try { codigo ? localStorage.setItem(CLAVE_CODIGO, codigo.codigo) : localStorage.removeItem(CLAVE_CODIGO); } catch {}
}

const etiquetaCodigo = c => c.tipo === 'porcentaje' ? `−${c.valor}%` : `−${formatoPrecio(c.valor)}`;

// Se aplica solo sobre los productos (con las ofertas ya descontadas), nunca sobre el envío
function descuentoCodigo(subtotal) {
  if (!codigo || (codigo.minimo && subtotal < codigo.minimo)) return 0;
  return codigo.tipo === 'porcentaje' ? Math.round(subtotal * codigo.valor / 100) : Math.min(codigo.valor, subtotal);
}

async function aplicarCodigo() {
  const input = $('#input-codigo');
  const texto = input.value.trim();
  if (!texto) return;
  const boton = $('#aplicar-codigo');
  boton.disabled = true; boton.textContent = 'Aplicando…';
  try {
    const c = await consultarCodigo(texto);
    if (c) { codigo = c; mensajeCodigo = ''; }
    else { mensajeCodigo = `El código "${texto}" no existe o ya no está vigente.`; }
  } catch {
    mensajeCodigo = 'No pudimos revisar el código. Probá de nuevo en un ratito.';
  }
  guardarCodigo();
  renderCarrito();
  if (!codigo) { const i = $('#input-codigo'); if (i) { i.value = texto; i.focus(); } }
}

// Al entrar, vuelve a chequear el código guardado (puede haber vencido)
async function revalidarCodigo() {
  let guardado = null;
  try { guardado = localStorage.getItem(CLAVE_CODIGO); } catch {}
  if (!guardado) return;
  try {
    codigo = await consultarCodigo(guardado);
    if (!codigo) mensajeCodigo = `El código ${guardado} ya no está vigente.`;
  } catch { codigo = null; }
  guardarCodigo();
}

function abrirCarrito() {
  renderCarrito();
  $('#carrito').showModal();
}

function renderCarrito() {
  depurarCarrito();
  actualizarBadge();
  const cuerpo = $('#carrito-cuerpo');

  if (!carrito.length) {
    cuerpo.innerHTML = `
      ${avisoQuitados ? `<p class="aviso-error">${avisoQuitados}</p>` : ''}
      <div class="carrito-vacio">
        ${ICONO_BATIDOR}
        <p>Todavía no agregaste nada.</p>
        <button type="button" class="boton boton-secundario" data-cerrar>Ver productos</button>
      </div>`;
    avisoQuitados = '';
    $('[data-cerrar]', cuerpo).addEventListener('click', () => $('#carrito').close());
    $('#carrito-pie').hidden = true;
    return;
  }

  $('#carrito-pie').hidden = false;

  const fija = entregaFijaDelPedido();
  const guardado = leerEntrega();
  if (fija) guardado.fecha = fija.fecha;
  else if (guardado.fecha && !esHabil(deIso(guardado.fecha))) guardado.fecha = '';
  mesVisible = guardado.fecha ? deIso(guardado.fecha) : fechaMinima();
  mesVisible.setDate(1);

  cuerpo.innerHTML = `
    ${avisoQuitados ? `<p class="aviso-error">${avisoQuitados}</p>` : ''}
    <ul class="items">
      ${carrito.map((item, i) => {
        const v = itemVigente(item);
        return `
        <li class="item">
          <div class="item-info">
            <strong>${esc(v.prod.nombre)}${v.prod.descuento ? ` <span class="mini-oferta">−${v.prod.descuento}%</span>` : ''}</strong>
            ${v.detalle.map(d => `<span>${esc(d)}</span>`).join('')}
          </div>
          <div class="item-acciones">
            <div class="contador contador-chico">
              <button type="button" data-item="${i}" data-delta="-1" aria-label="Restar"${item.cantidad > 1 && item.cantidad - 1 < cantidadMinima(v.prod, item.sel) ? ' disabled title="Con menos cajas no entran los sabores elegidos: quitalo y volvé a elegir"' : ''}>−</button>
              <output>${item.cantidad}</output>
              <button type="button" data-item="${i}" data-delta="1" aria-label="Sumar">+</button>
            </div>
            <span class="precio">${formatoPrecio(v.precio * item.cantidad)}</span>
            <button type="button" class="quitar" data-quitar="${i}">Quitar</button>
          </div>
        </li>`;
      }).join('')}
    </ul>
    <p class="vaciar-fila"><button id="vaciar" type="button" class="enlace">Vaciar pedido</button></p>

    <div class="bloque-codigo">
      ${codigo
        ? `<div class="codigo-aplicado">
             <span>Código <strong>${esc(codigo.codigo)}</strong> (${etiquetaCodigo(codigo)})</span>
             <button type="button" id="quitar-codigo" class="enlace">Quitar</button>
           </div>`
        : `<label class="campo" for="input-codigo"><span>¿Tenés un código de descuento?</span></label>
           <div class="fila-codigo">
             <input id="input-codigo" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Ej.: LANZAMIENTO">
             <button type="button" id="aplicar-codigo" class="boton boton-chico boton-secundario">Aplicar</button>
           </div>`}
      <p id="mensaje-codigo" class="grupo-nota aviso-dia"${mensajeCodigo ? '' : ' hidden'}>${esc(mensajeCodigo)}</p>
    </div>

    <form id="form-entrega" class="entrega" novalidate>
      <h3>Entrega</h3>

      <div class="campo">
        <span>Fecha</span>
        ${fija
          ? `<div class="fecha-fija">
               <strong>${textoFecha(fija.fecha)}</strong>
               <small>Tu pedido incluye ${esc(fija.nombre.toLowerCase())}, que se entrega solo ese día. Todo el pedido se entrega junto.</small>
             </div>`
          : `<div id="calendario" class="calendario"></div>`}
        <input type="hidden" name="fecha" value="${guardado.fecha || ''}">
      </div>

      <fieldset class="grupo">
        <legend>¿Cómo lo recibís?</legend>
        <div class="opciones opciones-dos">
          <label class="opcion opcion-bloque">
            <input type="radio" name="modalidad" value="retiro"${guardado.modalidad !== 'envio' ? ' checked' : ''}>
            <span><strong>Retiro</strong><small>${CONFIG.direccionRetiro}</small></span>
          </label>
          <label class="opcion opcion-bloque">
            <input type="radio" name="modalidad" value="envio"${guardado.modalidad === 'envio' ? ' checked' : ''}>
            <span><strong>Envío</strong><small>Según zona</small></span>
          </label>
        </div>
      </fieldset>

      <div id="bloque-envio" class="bloque-envio">
        <label class="campo">
          <span>Zona</span>
          <select name="zona">
            <option value="">Elegí tu zona</option>
            ${CONFIG.zonasEnvio.map(z => `<option value="${z.id}"${guardado.zona === z.id ? ' selected' : ''}>${z.nombre} (${z.barrios}) · ${formatoPrecio(z.precio)}</option>`).join('')}
          </select>
          <small>¿No llegamos a tu zona? <a data-wa="¡Hola Juli! Quiero hacer un pedido pero mi zona no figura en la web. Vivo en ">Consultanos</a> y vemos cómo coordinar.</small>
        </label>
        <label class="campo">
          <span>Dirección</span>
          <input name="direccion" type="text" autocomplete="street-address" placeholder="Calle, número, piso/depto, localidad" value="${escaparAtributo(guardado.direccion)}">
        </label>
      </div>

      <fieldset class="grupo">
        <legend id="leyenda-franja">Horario</legend>
        <div class="opciones" id="franjas"></div>
        <p class="grupo-nota" id="nota-envio" hidden>Lo vas a recibir dentro de ese rango horario. Te avisamos cuando estemos en camino a tu dirección.</p>
        <p class="grupo-nota">¿Necesitás otro horario? <a data-wa="¡Hola Juli! Quiero hacer un pedido pero necesito otro horario de entrega.">Consultanos</a>.</p>
      </fieldset>

      <label class="campo">
        <span>Tu nombre</span>
        <input name="nombre" type="text" autocomplete="name" required value="${escaparAtributo(guardado.nombre)}">
      </label>

      <label class="campo">
        <span><span id="etiqueta-tercero">Nombre de quien retira</span> <small>si no sos vos</small></span>
        <input name="tercero" type="text" value="${escaparAtributo(guardado.tercero)}">
      </label>

      <label class="campo">
        <span>Comentarios <small>opcional</small></span>
        <textarea name="notas" rows="2">${escaparAtributo(guardado.notas)}</textarea>
      </label>
    </form>`;
  avisoQuitados = '';

  $$('[data-delta]', cuerpo).forEach(b => b.addEventListener('click', () => {
    const item = carrito[b.dataset.item];
    item.cantidad = Math.min(20, item.cantidad + Number(b.dataset.delta));
    if (item.cantidad < 1) carrito.splice(b.dataset.item, 1);
    guardarCarrito(); renderCarrito();
  }));
  $$('[data-quitar]', cuerpo).forEach(b => b.addEventListener('click', () => {
    carrito.splice(b.dataset.quitar, 1);
    guardarCarrito(); renderCarrito();
  }));
  activarLinksWhatsApp(cuerpo);
  const aplicar = $('#aplicar-codigo', cuerpo);
  if (aplicar) {
    aplicar.addEventListener('click', aplicarCodigo);
    $('#input-codigo', cuerpo).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); aplicarCodigo(); } });
  }
  const quitar = $('#quitar-codigo', cuerpo);
  if (quitar) quitar.addEventListener('click', () => { codigo = null; mensajeCodigo = ''; guardarCodigo(); renderCarrito(); });
  $('#vaciar', cuerpo).addEventListener('click', () => {
    if (!confirm('¿Vaciar el pedido?')) return;
    carrito = [];
    guardarCarrito(); renderCarrito();
  });

  const form = $('#form-entrega');
  form.addEventListener('change', () => { actualizarEntrega(); guardarEntrega(); });
  form.addEventListener('input', guardarEntrega);
  if (!fija) renderCalendario();
  actualizarEntrega(guardado.franja);
}

/* ===== Calendario ===== */

function renderCalendario() {
  const cont = $('#calendario');
  const form = $('#form-entrega');
  const elegida = form.fecha.value;
  const min = fechaMinima(), max = fechaMaxima();
  const anio = mesVisible.getFullYear(), mes = mesVisible.getMonth();

  const titulo = mesVisible.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const hayAnterior = new Date(anio, mes, 0) >= min;
  const haySiguiente = new Date(anio, mes + 1, 1) <= max;

  const primero = new Date(anio, mes, 1);
  const vacios = (primero.getDay() + 6) % 7;        // semana arranca el lunes
  const diasMes = new Date(anio, mes + 1, 0).getDate();

  let celdas = '<span></span>'.repeat(vacios);
  for (let d = 1; d <= diasMes; d++) {
    const fecha = new Date(anio, mes, d);
    const iso = isoDe(fecha);
    const habil = esHabil(fecha);
    const cerrado = CONFIG.diasCerrados.includes(fecha.getDay());
    celdas += `<button type="button" data-dia="${iso}"${habil ? '' : ' disabled'}${iso === elegida ? ' aria-pressed="true"' : ''}${cerrado ? ' class="cerrado"' : ''} aria-label="${textoFecha(iso)}${cerrado ? ', cerrado' : ''}">${d}</button>`;
  }

  cont.innerHTML = `
    <div class="cal-cabecera">
      <button type="button" data-mes="-1" aria-label="Mes anterior"${hayAnterior ? '' : ' disabled'}>‹</button>
      <strong>${titulo.charAt(0).toUpperCase() + titulo.slice(1)}</strong>
      <button type="button" data-mes="1" aria-label="Mes siguiente"${haySiguiente ? '' : ' disabled'}>›</button>
    </div>
    <div class="cal-semana" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
    <div class="cal-dias">${celdas}</div>
    <p class="cal-elegida">${elegida ? textoFecha(elegida) : 'Elegí un día'}</p>
    <p class="grupo-nota">Pedidos con 24 hs de anticipación (hasta las ${CONFIG.horaCorte} hs del día anterior). Domingos cerrado.</p>`;

  $$('[data-mes]', cont).forEach(b => b.addEventListener('click', () => {
    mesVisible.setMonth(mesVisible.getMonth() + Number(b.dataset.mes));
    renderCalendario();
  }));
  $$('[data-dia]', cont).forEach(b => b.addEventListener('click', () => {
    form.fecha.value = b.dataset.dia;
    renderCalendario();
    actualizarEntrega();
    guardarEntrega();
  }));
}

function actualizarEntrega(franjaPrevia) {
  const form = $('#form-entrega');
  const envio = form.modalidad.value === 'envio';
  const modalidad = envio ? 'envio' : 'retiro';
  const fija = entregaFijaDelPedido();
  $('#bloque-envio').hidden = !envio;
  $('#etiqueta-tercero').textContent = envio ? 'Nombre de quien recibe' : 'Nombre de quien retira';
  form.notas.placeholder = envio ? 'Ej.: dto, timbre, etc.' : '';

  const franjas = franjasPara(modalidad, form.fecha.value, fija);
  const contenedor = $('#franjas');
  const elegida = franjaPrevia || (form.franja && form.franja.value);
  const clave = modalidad + '|' + (franjas ? franjas.join(',') : 'sin-fecha');
  if (contenedor.dataset.clave !== clave) {
    contenedor.dataset.clave = clave;
    contenedor.innerHTML = !franjas
      ? '<p class="grupo-nota">Elegí primero la fecha.</p>'
      : franjas.length
        ? franjas.map(f => `<label class="opcion">
            <input type="radio" name="franja" value="${esc(f)}"${f === elegida ? ' checked' : ''}><span>${esc(f)}</span>
          </label>`).join('')
        : `<p class="grupo-nota aviso-dia">${envio ? 'Ese día no hacemos envíos. Elegí otro día o retiralo por el taller.' : 'Ese día no hay retiro. Elegí otro día o pedí envío.'}</p>`;
  }
  $('#leyenda-franja').textContent = envio ? 'Horario de envío' : 'Horario de retiro';
  $('#nota-envio').hidden = !envio;

  const subtotal = subtotalCarrito();
  const zona = envio ? CONFIG.zonasEnvio.find(z => z.id === form.zona.value) : null;
  const envioCosto = costoEnvio(subtotal, zona);
  const gratis = !!CONFIG.envioGratisDesde && subtotal > CONFIG.envioGratisDesde;
  const descuento = descuentoCodigo(subtotal);

  $('#subtotal').textContent = formatoPrecio(subtotal);
  $('#fila-descuento').hidden = !descuento;
  if (codigo) $('#etiqueta-descuento').textContent = `Código ${codigo.codigo}`;
  $('#monto-descuento').textContent = '−' + formatoPrecio(descuento);
  $('#fila-envio').hidden = !envio;
  $('#costo-envio').textContent = !zona ? (gratis ? 'Sin cargo' : 'Elegí la zona') : (envioCosto ? formatoPrecio(envioCosto) : 'Sin cargo');
  $('#total').textContent = formatoPrecio(subtotal - descuento + envioCosto);

  // Código con compra mínima que todavía no se alcanza
  const msg = $('#mensaje-codigo');
  if (msg && codigo && codigo.minimo && subtotal < codigo.minimo) {
    msg.textContent = `El código ${codigo.codigo} es para compras desde ${formatoPrecio(codigo.minimo)} (te faltan ${formatoPrecio(codigo.minimo - subtotal)}).`;
    msg.hidden = false;
  } else if (msg && codigo) msg.hidden = true;

  const pista = $('#pista-envio');
  pista.hidden = !envio || !CONFIG.envioGratisDesde;
  pista.textContent = gratis
    ? 'Tu pedido tiene envío sin cargo.'
    : `Envío sin cargo en compras superiores a ${formatoPrecio(CONFIG.envioGratisDesde)} (te faltan ${formatoPrecio(CONFIG.envioGratisDesde - subtotal)}).`;
}

function escaparAtributo(t = '') {
  return String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function leerEntrega() {
  try { return JSON.parse(localStorage.getItem(CLAVE_ENTREGA)) || {}; } catch { return {}; }
}
function guardarEntrega() {
  const f = $('#form-entrega');
  if (!f) return;
  const datos = {
    fecha: entregaFijaDelPedido() ? '' : f.fecha.value,
    modalidad: f.modalidad.value, zona: f.zona.value,
    direccion: f.direccion.value, franja: f.franja ? f.franja.value : '',
    nombre: f.nombre.value, tercero: f.tercero.value, notas: f.notas.value
  };
  try { localStorage.setItem(CLAVE_ENTREGA, JSON.stringify(datos)); } catch {}
}

/* ===== Envío por WhatsApp ===== */

function enviarPedido() {
  const f = $('#form-entrega');
  const envio = f.modalidad.value === 'envio';
  const errores = [];
  if (!f.fecha.value) errores.push('la fecha');
  if (!f.franja || !f.franja.value) errores.push('el horario');
  if (envio && !f.zona.value) errores.push('la zona de envío');
  if (envio && !f.direccion.value.trim()) errores.push('la dirección');
  if (!f.nombre.value.trim()) errores.push('tu nombre');

  const aviso = $('#aviso-pedido');
  if (errores.length) {
    aviso.textContent = `Completá ${errores.join(', ')}.`;
    aviso.hidden = false;
    return;
  }
  aviso.hidden = true;

  const subtotal = subtotalCarrito();
  const zona = envio ? CONFIG.zonasEnvio.find(z => z.id === f.zona.value) : null;
  const envioCosto = costoEnvio(subtotal, zona);
  const descuento = descuentoCodigo(subtotal);
  const total = subtotal - descuento + envioCosto;
  const fechaTexto = textoFecha(f.fecha.value);
  const tercero = f.tercero.value.trim();

  const lineas = [
    '¡Hola Juli! Quiero hacer este pedido:',
    '',
    ...carrito.map(i => {
      const v = itemVigente(i);
      const oferta = v.prod.descuento ? ` (oferta −${v.prod.descuento}%)` : '';
      return `• ${i.cantidad} × ${v.prod.nombre}${oferta} — ${formatoPrecio(v.precio * i.cantidad)}\n   ${v.detalle.join('\n   ')}`;
    }),
    '',
    `Subtotal: ${formatoPrecio(subtotal)}`,
    ...(descuento ? [`Código ${codigo.codigo} (${etiquetaCodigo(codigo)}): −${formatoPrecio(descuento)}`] : []),
    ...(zona ? [`Envío (${zona.nombre} · ${zona.barrios}): ${envioCosto ? formatoPrecio(envioCosto) : 'sin cargo'}`] : []),
    `*Total: ${formatoPrecio(total)}*`,
    '',
    envio
      ? `🚚 Envío · ${fechaTexto} · ${f.franja.value}\nDirección: ${f.direccion.value.trim()}`
      : `🏠 Retiro en ${CONFIG.direccionRetiro} · ${fechaTexto} · ${f.franja.value}`,
    `Nombre: ${f.nombre.value.trim()}`,
    ...(tercero ? [`${envio ? 'Recibe' : 'Retira'}: ${tercero}`] : []),
    ...(f.notas.value.trim() ? [`Comentarios: ${f.notas.value.trim()}`] : [])
  ];

  window.open(linkWhatsApp(lineas.join('\n')), '_blank', 'noopener');
}

/* ===== Inicio ===== */

document.addEventListener('DOMContentLoaded', async () => {
  const ok = await CATALOGO;
  if (!ok) {
    $('#catalogo').innerHTML = `<p class="catalogo-vacio">No pudimos cargar los productos. Probá recargar la página o <a data-wa="¡Hola Juli! Quiero hacer un pedido.">escribinos por WhatsApp</a>.</p>`;
    activarLinksWhatsApp($('#catalogo'));
    return;
  }
  depurarCarrito();
  avisoQuitados = '';
  revalidarCodigo();
  renderCatalogo();
  actualizarBadge();

  $('#btn-carrito').addEventListener('click', abrirCarrito);
  $('#toast button').addEventListener('click', () => { $('#toast').hidden = true; abrirCarrito(); });
  $('#enviar-pedido').addEventListener('click', enviarPedido);

  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
});
