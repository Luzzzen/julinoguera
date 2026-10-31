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

  // Por día de la semana: 0 = domingo, 1 = lunes … 6 = sábado
  horarios: {
    retiro: { 1: ['15 a 17 hs'], 2: ['11 a 13 hs', '15 a 17 hs'], 3: ['11 a 13 hs', '15 a 17 hs'],
              4: ['11 a 13 hs', '15 a 17 hs'], 5: ['11 a 13 hs', '15 a 17 hs'], 6: ['11 a 13 hs'] },
    envio:  { 2: ['10 a 12 hs'], 3: ['10 a 12 hs'], 4: ['10 a 12 hs'], 5: ['10 a 12 hs'], 6: ['12 a 14 hs'] }
  },

  redes: {
    instagram: 'https://www.instagram.com/julinoguerapasteleria/',
    tiktok: 'https://www.tiktok.com/@julinoguerapasteleria'
  },

  envioGratisDesde: 100000,
  zonasEnvio: [
    { id: 'z1', nombre: 'Zona 1', barrios: 'San Justo, Villa Luzuriaga', precio: 3000 },
    { id: 'z2', nombre: 'Zona 2', barrios: 'Ramos Mejía, Haedo',         precio: 4000 },
    { id: 'z3', nombre: 'Zona 3', barrios: 'Morón, Ciudadela',           precio: 5500 }
  ]
};
