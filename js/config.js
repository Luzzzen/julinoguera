/* ===== Configuración general ===== */

window.CONFIG = {
  marca: 'Juli Noguera',
  whatsapp: '5491135106871',
  direccionRetiro: 'Carrasco 2175',

  /* ===== Fechas ===== */
  anticipacionMinDias: 1,
  ventanaDias: 30,
  diasCerrados: [],
  fechasBloqueadas: [],

  /* ===== Horarios ===== */
  franjasRetiro: ['10 a 13 hs', '15 a 18 hs'],
  franjasEnvio: ['Despacho 10 hs', 'Despacho 17 hs'],

  /* ===== Zonas de envío ===== */
  zonasEnvio: [
    { id: 'z1', nombre: 'Zona 1 · hasta 3 km', precio: 2500 },
    { id: 'z2', nombre: 'Zona 2 · de 3 a 6 km', precio: 4000 },
    { id: 'z3', nombre: 'Zona 3 · de 6 a 10 km', precio: 6000 }
  ]
};
