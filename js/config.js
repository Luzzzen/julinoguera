/* ===== Configuración =====
   Los productos, precios, horarios y zonas se cargan desde Supabase (panel de admin).
   Estos valores son solo el respaldo si la base no responde. */

window.CONFIG = {
  supabase: {
    url: 'https://spfadwdiujizxizedxjw.supabase.co',
    key: 'sb_publishable_0kKPAA7PBDkL45fwrDhNyA_zBFGcawE'   // clave pública, se puede compartir
  },

  marca: 'Juli Noguera',
  whatsapp: '5491135106871',
  localidad: 'San Justo',
  direccionRetiro: 'San Justo · Venezuela y Carrasco',

  anticipacionMinDias: 1,
  horaCorte: 17,
  ventanaDias: 30,
  diasCerrados: [0],
  fechasBloqueadas: [],

  horarios: {
    retiro: { semana: ['11 a 13 hs', '15 a 17 hs'], sabado: ['11 a 13 hs'] },
    envio:  { semana: ['Despacho 10 hs', 'Despacho 17 hs'], sabado: ['Despacho 10 hs'] }
  },

  envioGratisDesde: 100000,
  zonasEnvio: [
    { id: 'z1', nombre: 'Zona 1', barrios: 'San Justo, Villa Luzuriaga', precio: 3000 },
    { id: 'z2', nombre: 'Zona 2', barrios: 'Ramos Mejía, Haedo',         precio: 4000 },
    { id: 'z3', nombre: 'Zona 3', barrios: 'Morón, Ciudadela',           precio: 5500 }
  ]
};
