/* ===== Carga del catálogo desde Supabase =====
   Trae categorías, productos, adicionales y ajustes. Guarda una copia en el
   navegador: si la base no responde, la tienda usa la última copia que vio. */

(function () {
  const CLAVE_CACHE = 'jn-catalogo-v1';
  const { url, key } = CONFIG.supabase;

  function pedir(tabla, consulta) {
    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), 8000);
    return fetch(`${url}/rest/v1/${tabla}?${consulta}`, { headers: { apikey: key }, signal: control.signal })
      .then(r => { if (!r.ok) throw new Error(`${tabla}: ${r.status}`); return r.json(); })
      .finally(() => clearTimeout(corte));
  }

  async function traer() {
    const [categorias, productos, adicionales, ajustes] = await Promise.all([
      pedir('categorias', 'select=*&order=orden'),
      pedir('productos', 'select=*&order=orden'),
      pedir('adicionales', 'select=*&order=orden'),
      pedir('ajustes', 'select=*')
    ]);
    return { categorias, productos, adicionales, ajustes };
  }

  // Pasa las filas de la base al formato que usa la tienda (solo lo visible)
  function aplicar(d) {
    const ajustes = Object.fromEntries(d.ajustes.map(a => [a.clave, a.valor]));
    Object.assign(CONFIG, ajustes.general || {});
    window.PERSONALIZADA = ajustes.personalizada || null;

    window.ADICIONALES = Object.fromEntries(d.adicionales.filter(a => a.visible)
      .map(a => [a.id, { nombre: a.nombre, precio: a.precio || 0, grupo: a.grupo || null }]));

    window.CATEGORIAS = d.categorias.filter(c => c.visible)
      .map(c => ({ id: c.id, nombre: c.nombre, nota: c.nota, cierre: c.cierre }));

    window.PRODUCTOS = d.productos
      .filter(p => p.visible && CATEGORIAS.some(c => c.id === p.categoria))
      .map(p => ({
        id: p.id,
        categoria: p.categoria,
        nombre: p.nombre,
        descripcion: p.descripcion || '',
        nota: p.nota,
        precio: p.precio,
        fotos: p.fotos || [],
        descuento: p.descuento || 0,
        disponible: p.disponible,
        entregaFija: p.entrega_semanal,
        adicionales: (p.adicionales || []).filter(id => ADICIONALES[id]),
        opciones: (p.opciones || []).map(op => ({ ...op, valores: op.valores.filter(v => v.activo !== false) }))
      }));
  }

  window.CATALOGO = (async () => {
    let copia = null;
    try { copia = JSON.parse(localStorage.getItem(CLAVE_CACHE)); } catch {}
    try {
      const datos = await traer();
      aplicar(datos);
      try { localStorage.setItem(CLAVE_CACHE, JSON.stringify(datos)); } catch {}
      return true;
    } catch (error) {
      console.error('No se pudo cargar el catálogo', error);
      if (copia) { aplicar(copia); return true; }
      window.CATEGORIAS = []; window.PRODUCTOS = []; window.ADICIONALES = {};
      return false;
    }
  })();
})();
