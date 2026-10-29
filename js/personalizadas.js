/* ===== Referencia de precios ===== */

document.addEventListener('DOMContentLoaded', async () => {
  await CATALOGO;
  const P = PERSONALIZADA;
  if (!P) return;
  const form = document.getElementById('form-referencia');
  const tamanos = document.getElementById('ref-tamanos');
  const bizcochuelos = document.getElementById('ref-bizcochuelos');
  const rellenos = document.getElementById('ref-rellenos');

  document.querySelectorAll('[data-sena]').forEach(el => el.textContent = P.sena + '%');
  document.querySelectorAll('[data-anticipacion]').forEach(el => el.textContent = P.anticipacion);
  document.getElementById('ref-nota').textContent = P.nota;

  /* ===== Tira de fotos ===== */
  const tira = document.getElementById('tira-fotos');
  tira.hidden = !P.fotos.length;
  tira.innerHTML = P.fotos.map((src, i) => `<img src="${esc(src)}" alt="Torta personalizada o mesa dulce ${i + 1}" loading="lazy">`).join('');

  /* ===== Opciones ===== */
  tamanos.innerHTML = P.tamanos.map((t, i) => `<label class="opcion opcion-bloque">
      <input type="radio" name="tamano" value="${t.id}"${i === 0 ? ' checked' : ''}>
      <span><strong>${esc(t.nombre)} · ${formatoPrecio(t.precio)}</strong><small>${esc(t.detalle)}</small></span>
    </label>`).join('');

  bizcochuelos.innerHTML = P.bizcochuelos.map((b, i) => `<label class="opcion">
      <input type="radio" name="bizcochuelo" value="${esc(b.id)}"${i === 0 ? ' checked' : ''}><span>${esc(b.nombre)}</span>
    </label>`).join('');

  rellenos.innerHTML = P.rellenos.map(r => `<label class="opcion">
      <input type="checkbox" name="relleno" value="${esc(r.id)}"><span>${esc(r.nombre)}</span>
    </label>`).join('');

  /* ===== Actualización ===== */

  function actualizar() {
    const tamano = P.tamanos.find(t => t.id === form.tamano.value);
    const bizcochuelo = P.bizcochuelos.find(b => b.id === form.bizcochuelo.value);
    const n = P.rellenosMax;
    const marcados = [...rellenos.querySelectorAll('input:checked')];
    marcados.slice(n).forEach(i => i.checked = false);
    const total = Math.min(marcados.length, n);
    rellenos.querySelectorAll('input').forEach(i => i.disabled = !i.checked && total >= n);
    document.getElementById('ref-ayuda').textContent = `hasta ${n} · ${total}/${n}`;

    document.getElementById('ref-precio').textContent = formatoPrecio(tamano.precio);
    document.getElementById('ref-sena').textContent = formatoPrecio(Math.round(tamano.precio * P.sena / 100));

    const elegidos = [...rellenos.querySelectorAll('input:checked')]
      .map(i => P.rellenos.find(r => r.id === i.value).nombre);
    const texto = [
      '¡Hola Juli! Quiero pedir una torta personalizada.',
      `Tamaño: ${tamano.nombre} (${tamano.detalle})`,
      `Bizcochuelo: ${bizcochuelo.nombre}`,
      elegidos.length ? `Rellenos: ${elegidos.join(', ')}` : null,
      'Fecha: ',
      'Te cuento la idea: '
    ].filter(Boolean).join('\n');
    document.getElementById('ref-wa').href = linkWhatsApp(texto);
  }

  form.addEventListener('change', actualizar);
  actualizar();
});
