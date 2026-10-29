/* ===== Configuración general ===== */

window.CONFIG = {
  marca: 'Juli Noguera',
  whatsapp: '5491135106871',
  localidad: 'San Justo',
  direccionRetiro: 'San Justo · Venezuela y Carrasco',

  /* ===== Fechas ===== */
  anticipacionMinDias: 1,      // días mínimos desde hoy
  horaCorte: 17,               // después de esta hora ya no se puede pedir para mañana
  ventanaDias: 30,             // hasta cuántos días adelante se puede reservar
  diasCerrados: [0],           // 0 = domingo
  fechasBloqueadas: [],        // 'AAAA-MM-DD' (feriados, vacaciones)

  /* ===== Horarios (sábado aparte) ===== */
  horarios: {
    retiro: { semana: ['11 a 13 hs', '15 a 17 hs'], sabado: ['11 a 13 hs'] },
    envio:  { semana: ['Despacho 10 hs', 'Despacho 17 hs'], sabado: ['Despacho 10 hs'] }
  },

  /* ===== Envíos ===== */
  envioGratisDesde: 100000,    // envío sin cargo si los productos superan este monto
  zonasEnvio: [
    { id: 'z1', nombre: 'Zona 1', barrios: 'San Justo, Villa Luzuriaga', precio: 3000 },
    { id: 'z2', nombre: 'Zona 2', barrios: 'Ramos Mejía, Haedo',         precio: 4000 },
    { id: 'z3', nombre: 'Zona 3', barrios: 'Morón, Ciudadela',           precio: 5500 }
  ]
};
