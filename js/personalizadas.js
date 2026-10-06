/* ===== Referencia de precios ===== */

document.addEventListener('DOMContentLoaded', () => {
  const P = PERSONALIZADA;
  const form = document.getElementById('form-referencia');
  const tamanos = document.getElementById('ref-tamanos');
  const rellenos = document.getElementById('ref-rellenos');

  document.querySelectorAll('[data-sena]').forEach(el => el.textContent = P.sena + '%');
  document.querySelectorAll('[data-anticipacion]').forEach(el => el.textContent = P.anticipacion);

  tamanos.innerHTML = P.tamanos.map((t, i) => `<label class="opcion">
      <input type="radio" name="tamano" value="${t.id}"${i === 0 ? ' checked' : ''}>
      <span>${t.nombre}</span><small>${formatoPrecio(t.precio)}</small>
    </label>`).join('');

  rellenos.innerHTML = P.rellenos.map(r => `<label class="opcion">
      <input type="checkbox" name="relleno" value="${r.id}"><span>${r.nombre}</span>
    </label>`).join('');

  /* ===== Actualización ===== */

  function actualizar() {
    const tamano = P.tamanos.find(t => t.id === form.tamano.value);
    const n = tamano.elegir;
    const marcados = [...rellenos.querySelectorAll('input:checked')];
    marcados.slice(n).forEach(i => i.checked = false);
    const total = Math.min(marcados.length, n);
    rellenos.querySelectorAll('input').forEach(i => i.disabled = !i.checked && total >= n);
    document.getElementById('ref-ayuda').textContent = `elegí ${n} · ${total}/${n}`;

    document.getElementById('ref-precio').textContent = formatoPrecio(tamano.precio);
    document.getElementById('ref-sena').textContent = formatoPrecio(Math.round(tamano.precio * P.sena / 100));

    const elegidos = [...rellenos.querySelectorAll('input:checked')]
      .map(i => P.rellenos.find(r => r.id === i.value).nombre);
    const texto = [
      '¡Hola Juli! Quiero pedir una torta personalizada.',
      `Tamaño: ${tamano.nombre}`,
      elegidos.length ? `Rellenos: ${elegidos.join(', ')}` : null,
      'Fecha: ',
      'Te cuento la idea: '
    ].filter(Boolean).join('\n');
    document.getElementById('ref-wa').href = linkWhatsApp(texto);
  }

  form.addEventListener('change', actualizar);
  actualizar();
});
