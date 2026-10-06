/* ===== Estado ===== */

const CLAVE_CARRITO = 'jn-carrito';
let carrito = cargarCarrito();
let actual = null;

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

/* ===== Opciones y precios ===== */

const buscarOpcion = (prod, id) => prod.opciones.find(o => o.id === id);
const buscarValor = (op, id) => op.valores.find(v => v.id === id);

function esVisible(op, sel) {
  return !op.visibleSi || sel[op.visibleSi.opcion] === op.visibleSi.valor;
}

function cuantosElegir(prod, op, sel) {
  const base = buscarOpcion(prod, op.segun);
  const v = sel[op.segun] && buscarValor(base, sel[op.segun]);
  return v ? v.elegir : 0;
}

function precioUnitario(prod, sel, adic) {
  let total = 0;
  if (prod.tabla) {
    total += prod.tabla[prod.precioPor.map(id => sel[id]).join('|')] || 0;
  } else {
    prod.opciones.forEach(op => {
      if (op.tipo !== 'unica' || !esVisible(op, sel) || !sel[op.id]) return;
      const v = buscarValor(op, sel[op.id]);
      if (v && v.precio) total += v.precio;
    });
  }
  adic.forEach(id => total += ADICIONALES[id].precio);
  return total;
}

function precioDesde(prod) {
  if (prod.tabla) return Math.min(...Object.values(prod.tabla));
  return prod.opciones.reduce((t, op) => {
    if (op.tipo !== 'unica' || op.visibleSi) return t;
    const precios = op.valores.map(v => v.precio).filter(p => p != null);
    return t + (precios.length ? Math.min(...precios) : 0);
  }, 0);
}

function tieneVariosPrecios(prod) {
  if (prod.tabla) return new Set(Object.values(prod.tabla)).size > 1;
  return prod.opciones.some(op => new Set(op.valores.map(v => v.precio).filter(p => p != null)).size > 1);
}

/* ===== Galería ===== */

function galeriaHTML(prod) {
  if (!prod.fotos.length) {
    return `<div class="galeria"><div class="galeria-pista"><div class="foto-vacia">${ICONO_BATIDOR}<span>Foto próximamente</span></div></div></div>`;
  }
  const fotos = prod.fotos.map(src => `<img src="${src}" alt="${prod.nombre}" loading="lazy">`).join('');
  const puntos = prod.fotos.length > 1
    ? `<div class="galeria-puntos">${prod.fotos.map((_, i) => `<button type="button" data-foto="${i}" aria-label="Foto ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('')}</div>`
    : '';
  return `<div class="galeria"><div class="galeria-pista">${fotos}</div>${puntos}</div>`;
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

  nav.innerHTML = categorias.map(c => `<a href="#cat-${c.id}" data-cat="${c.id}">${c.nombre}</a>`).join('');

  contenedor.innerHTML = categorias.map(c => `
    <section class="categoria" id="cat-${c.id}" aria-labelledby="titulo-${c.id}">
      <h2 id="titulo-${c.id}">${c.nombre}</h2>
      <div class="grilla">
        ${PRODUCTOS.filter(p => p.categoria === c.id).map(tarjetaHTML).join('')}
      </div>
    </section>`).join('');

  activarGalerias(contenedor);
  $$('[data-producto]', contenedor).forEach(b => b.addEventListener('click', () => abrirConfigurador(b.dataset.producto)));

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
  const desde = tieneVariosPrecios(prod) ? 'desde ' : '';
  return `
    <article class="tarjeta">
      ${galeriaHTML(prod)}
      <div class="tarjeta-cuerpo">
        <h3>${prod.nombre}</h3>
        <p>${prod.descripcion}</p>
        <div class="tarjeta-pie">
          <span class="precio"><small>${desde}</small>${formatoPrecio(precioDesde(prod))}</span>
          <button class="boton boton-chico" type="button" data-producto="${prod.id}">Elegir</button>
        </div>
      </div>
    </article>`;
}

/* ===== Configurador ===== */

function abrirConfigurador(id) {
  const prod = PRODUCTOS.find(p => p.id === id);
  actual = { prod };
  const dialogo = $('#configurador');

  dialogo.innerHTML = `
    <form method="dialog" class="hoja-contenido" novalidate>
      <button class="cerrar" value="cerrar" aria-label="Cerrar">×</button>
      ${galeriaHTML(prod)}
      <div class="hoja-cuerpo">
        <h2>${prod.nombre}</h2>
        <p class="hoja-desc">${prod.descripcion}</p>
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
  form.addEventListener('change', actualizarConfigurador);
  form.addEventListener('input', actualizarConfigurador);
  $$('[data-cant]', form).forEach(b => b.addEventListener('click', () => {
    const inp = form.cantidad;
    inp.value = Math.min(20, Math.max(1, Number(inp.value || 1) + Number(b.dataset.cant)));
    actualizarConfigurador();
  }));
  $('#agregar', form).addEventListener('click', agregarAlCarrito);

  actualizarConfigurador();
  dialogo.showModal();
  $('.hoja-contenido', dialogo).scrollTop = 0;
}

function opcionHTML(prod, op) {
  const preseleccion = op.tipo === 'unica' && op.valores.some(v => v.precio != null || v.elegir);
  const tipoInput = op.tipo === 'multiple' ? 'checkbox' : 'radio';

  const valores = op.valores.map((v, i) => {
    const marcado = preseleccion && i === 0 ? ' checked' : '';
    const extra = op.estilo === 'color'
      ? `<span class="muestra" style="--muestra:${v.hex}"></span>`
      : '';
    const precio = !prod.tabla && v.precio != null && op.valores.length > 1 ? `<small>${formatoPrecio(v.precio)}</small>` : '';
    return `<label class="opcion${op.estilo === 'color' ? ' opcion-color' : ''}">
        <input type="${tipoInput}" name="${op.id}" value="${v.id}"${marcado}>
        ${extra}<span>${v.nombre}</span>${precio}
      </label>`;
  }).join('');

  return `<fieldset class="grupo" data-opcion="${op.id}">
      <legend>${op.nombre} <span class="grupo-ayuda"></span></legend>
      <div class="opciones">${valores}</div>
    </fieldset>`;
}

function adicionalesHTML(prod) {
  if (!prod.adicionales) return '';
  return `<fieldset class="grupo">
      <legend>Adicionales <span class="grupo-ayuda">opcional</span></legend>
      <div class="opciones">
        ${prod.adicionales.map(id => `<label class="opcion">
            <input type="checkbox" name="adic" value="${id}">
            <span>${ADICIONALES[id].nombre}</span><small>+ ${formatoPrecio(ADICIONALES[id].precio)}</small>
          </label>`).join('')}
      </div>
    </fieldset>`;
}

function leerSeleccion(form, prod) {
  const sel = {};
  prod.opciones.forEach(op => {
    if (op.tipo === 'multiple') {
      sel[op.id] = $$(`input[name="${op.id}"]:checked`, form).map(i => i.value);
    } else {
      const marcado = $(`input[name="${op.id}"]:checked`, form);
      sel[op.id] = marcado ? marcado.value : null;
    }
  });
  const adic = $$('input[name="adic"]:checked', form).map(i => i.value);
  return { sel, adic };
}

function actualizarConfigurador() {
  const { prod } = actual;
  const form = $('#configurador form');
  let { sel, adic } = leerSeleccion(form, prod);

  prod.opciones.forEach(op => {
    const grupo = $(`[data-opcion="${op.id}"]`, form);
    const visible = esVisible(op, sel);
    grupo.hidden = !visible;
    if (!visible) {
      $$('input', grupo).forEach(i => i.checked = false);
      sel[op.id] = op.tipo === 'multiple' ? [] : null;
    }

    if (op.tipo === 'multiple') {
      const n = cuantosElegir(prod, op, sel);
      const marcados = $$('input:checked', grupo);
      marcados.slice(n).forEach(i => i.checked = false);
      const total = Math.min(marcados.length, n);
      $$('input', grupo).forEach(i => i.disabled = !n || (!i.checked && total >= n));
      $('.grupo-ayuda', grupo).textContent = n ? `elegí ${n} · ${total}/${n}` : 'elegí primero el tamaño';
      sel[op.id] = $$('input:checked', grupo).map(i => i.value);
    }
  });

  const cantidad = Math.min(20, Math.max(1, Number(form.cantidad.value) || 1));
  Object.assign(actual, { sel, adic, cantidad });

  $('#precio-config').textContent = formatoPrecio(precioUnitario(prod, sel, adic) * cantidad);
  $('.aviso-error', form).hidden = true;
}

function faltantes() {
  const { prod, sel } = actual;
  return prod.opciones.filter(op => {
    if (!esVisible(op, sel)) return false;
    if (op.tipo === 'multiple') return sel[op.id].length !== cuantosElegir(prod, op, sel);
    return !sel[op.id];
  }).map(op => op.nombre.toLowerCase());
}

/* ===== Carrito ===== */

function detalleItem(prod, sel, adic) {
  const lineas = [];
  prod.opciones.forEach(op => {
    if (!esVisible(op, sel)) return;
    if (op.tipo === 'multiple') {
      lineas.push(`${op.nombre}: ${sel[op.id].map(id => buscarValor(op, id).nombre).join(', ')}`);
    } else if (sel[op.id]) {
      lineas.push(`${op.nombre}: ${buscarValor(op, sel[op.id]).nombre}`);
    }
  });
  if (adic.length) lineas.push(`Adicionales: ${adic.map(id => ADICIONALES[id].nombre).join(', ')}`);
  return lineas;
}

function agregarAlCarrito() {
  const falta = faltantes();
  const form = $('#configurador form');
  if (falta.length) {
    const aviso = $('.aviso-error', form);
    aviso.textContent = `Te falta elegir: ${falta.join(', ')}.`;
    aviso.hidden = false;
    aviso.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const { prod, sel, adic, cantidad } = actual;
  const detalle = detalleItem(prod, sel, adic);
  const firma = prod.id + '|' + detalle.join('|');
  const existente = carrito.find(i => i.firma === firma);

  if (existente) {
    existente.cantidad = Math.min(20, existente.cantidad + cantidad);
  } else {
    carrito.push({
      firma,
      id: prod.id,
      nombre: prod.nombre,
      detalle,
      precio: precioUnitario(prod, sel, adic),
      cantidad
    });
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

/* ===== Pedido y entrega ===== */

function fechasDisponibles() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechas = [];
  for (let i = CONFIG.anticipacionMinDias; i <= CONFIG.ventanaDias; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (CONFIG.diasCerrados.includes(d.getDay()) || CONFIG.fechasBloqueadas.includes(iso)) continue;
    const texto = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    fechas.push({ iso, texto: texto.charAt(0).toUpperCase() + texto.slice(1) });
  }
  return fechas;
}

function abrirCarrito() {
  renderCarrito();
  $('#carrito').showModal();
}

function renderCarrito() {
  const cuerpo = $('#carrito-cuerpo');

  if (!carrito.length) {
    cuerpo.innerHTML = `
      <div class="carrito-vacio">
        ${ICONO_BATIDOR}
        <p>Todavía no agregaste nada.</p>
        <button type="button" class="boton boton-secundario" data-cerrar>Ver productos</button>
      </div>`;
    $('[data-cerrar]', cuerpo).addEventListener('click', () => $('#carrito').close());
    $('#carrito-pie').hidden = true;
    return;
  }

  $('#carrito-pie').hidden = false;

  const fechas = fechasDisponibles();
  const guardado = leerEntrega();

  cuerpo.innerHTML = `
    <ul class="items">
      ${carrito.map((item, i) => `
        <li class="item">
          <div class="item-info">
            <strong>${item.nombre}</strong>
            ${item.detalle.map(d => `<span>${d}</span>`).join('')}
          </div>
          <div class="item-acciones">
            <div class="contador contador-chico">
              <button type="button" data-item="${i}" data-delta="-1" aria-label="Restar">−</button>
              <output>${item.cantidad}</output>
              <button type="button" data-item="${i}" data-delta="1" aria-label="Sumar">+</button>
            </div>
            <span class="precio">${formatoPrecio(item.precio * item.cantidad)}</span>
            <button type="button" class="quitar" data-quitar="${i}">Quitar</button>
          </div>
        </li>`).join('')}
    </ul>

    <form id="form-entrega" class="entrega" novalidate>
      <h3>Entrega</h3>

      <label class="campo">
        <span>Fecha</span>
        <select name="fecha" required>
          <option value="">Elegí una fecha</option>
          ${fechas.map(f => `<option value="${f.iso}"${guardado.fecha === f.iso ? ' selected' : ''}>${f.texto}</option>`).join('')}
        </select>
      </label>

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
            ${CONFIG.zonasEnvio.map(z => `<option value="${z.id}"${guardado.zona === z.id ? ' selected' : ''}>${z.nombre} · ${formatoPrecio(z.precio)}</option>`).join('')}
          </select>
        </label>
        <label class="campo">
          <span>Dirección</span>
          <input name="direccion" type="text" autocomplete="street-address" placeholder="Calle, número, piso/depto, localidad" value="${escaparAtributo(guardado.direccion)}">
        </label>
      </div>

      <fieldset class="grupo">
        <legend id="leyenda-franja">Horario</legend>
        <div class="opciones" id="franjas"></div>
      </fieldset>

      <label class="campo">
        <span>Tu nombre</span>
        <input name="nombre" type="text" autocomplete="name" required value="${escaparAtributo(guardado.nombre)}">
      </label>

      <label class="campo">
        <span>Comentarios <small>opcional</small></span>
        <textarea name="notas" rows="2" placeholder="Ej.: dedicatoria en la tarjeta, timbre, etc.">${escaparAtributo(guardado.notas)}</textarea>
      </label>
    </form>`;

  $$('[data-delta]', cuerpo).forEach(b => b.addEventListener('click', () => {
    const item = carrito[b.dataset.item];
    item.cantidad = Math.min(20, item.cantidad + Number(b.dataset.delta));
    if (item.cantidad < 1) carrito.splice(b.dataset.item, 1);
    guardarCarrito(); actualizarBadge(); renderCarrito();
  }));
  $$('[data-quitar]', cuerpo).forEach(b => b.addEventListener('click', () => {
    carrito.splice(b.dataset.quitar, 1);
    guardarCarrito(); actualizarBadge(); renderCarrito();
  }));

  const form = $('#form-entrega');
  form.addEventListener('change', () => { actualizarEntrega(); guardarEntrega(); });
  form.addEventListener('input', guardarEntrega);
  actualizarEntrega(guardado.franja);
}

function actualizarEntrega(franjaPrevia) {
  const form = $('#form-entrega');
  const envio = form.modalidad.value === 'envio';
  $('#bloque-envio').hidden = !envio;

  const franjas = envio ? CONFIG.franjasEnvio : CONFIG.franjasRetiro;
  const contenedor = $('#franjas');
  const elegida = franjaPrevia || (form.franja && form.franja.value);
  if (contenedor.dataset.modo !== (envio ? 'envio' : 'retiro')) {
    contenedor.dataset.modo = envio ? 'envio' : 'retiro';
    contenedor.innerHTML = franjas.map(f => `<label class="opcion">
        <input type="radio" name="franja" value="${f}"${f === elegida ? ' checked' : ''}><span>${f}</span>
      </label>`).join('');
  }
  $('#leyenda-franja').textContent = envio ? 'Horario de despacho' : 'Horario de retiro';

  const subtotal = carrito.reduce((t, i) => t + i.precio * i.cantidad, 0);
  const zona = envio ? CONFIG.zonasEnvio.find(z => z.id === form.zona.value) : null;
  const costoEnvio = zona ? zona.precio : 0;

  $('#subtotal').textContent = formatoPrecio(subtotal);
  $('#fila-envio').hidden = !envio;
  $('#costo-envio').textContent = zona ? formatoPrecio(costoEnvio) : 'Elegí la zona';
  $('#total').textContent = formatoPrecio(subtotal + costoEnvio);
}

function escaparAtributo(t = '') {
  return String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

const CLAVE_ENTREGA = 'jn-entrega';
function leerEntrega() {
  try { return JSON.parse(localStorage.getItem(CLAVE_ENTREGA)) || {}; } catch { return {}; }
}
function guardarEntrega() {
  const f = $('#form-entrega');
  if (!f) return;
  const datos = {
    fecha: f.fecha.value, modalidad: f.modalidad.value, zona: f.zona.value,
    direccion: f.direccion.value, franja: f.franja ? f.franja.value : '',
    nombre: f.nombre.value, notas: f.notas.value
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

  const subtotal = carrito.reduce((t, i) => t + i.precio * i.cantidad, 0);
  const zona = envio ? CONFIG.zonasEnvio.find(z => z.id === f.zona.value) : null;
  const total = subtotal + (zona ? zona.precio : 0);
  const fechaTexto = f.fecha.selectedOptions[0].textContent;

  const lineas = [
    `¡Hola Juli! Quiero hacer este pedido:`,
    '',
    ...carrito.map(i => `• ${i.cantidad} × ${i.nombre} — ${formatoPrecio(i.precio * i.cantidad)}\n   ${i.detalle.join('\n   ')}`),
    '',
    `Subtotal: ${formatoPrecio(subtotal)}`,
    ...(zona ? [`Envío (${zona.nombre}): ${formatoPrecio(zona.precio)}`] : []),
    `*Total: ${formatoPrecio(total)}*`,
    '',
    envio
      ? `🚚 Envío · ${fechaTexto} · ${f.franja.value}\nDirección: ${f.direccion.value.trim()}`
      : `🏠 Retiro en ${CONFIG.direccionRetiro} · ${fechaTexto} · ${f.franja.value}`,
    `Nombre: ${f.nombre.value.trim()}`,
    ...(f.notas.value.trim() ? [`Comentarios: ${f.notas.value.trim()}`] : [])
  ];

  window.open(linkWhatsApp(lineas.join('\n')), '_blank', 'noopener');
}

/* ===== Inicio ===== */

document.addEventListener('DOMContentLoaded', () => {
  renderCatalogo();
  actualizarBadge();

  $('#btn-carrito').addEventListener('click', abrirCarrito);
  $('#toast button').addEventListener('click', () => { $('#toast').hidden = true; abrirCarrito(); });
  $('#enviar-pedido').addEventListener('click', enviarPedido);
  $('#vaciar').addEventListener('click', () => {
    if (!confirm('¿Vaciar el pedido?')) return;
    carrito = [];
    guardarCarrito(); actualizarBadge(); renderCarrito();
  });

  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
});
