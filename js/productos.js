/* =====================================================================
   CATÁLOGO
   Para cambiar precios, textos o fotos, se edita este archivo.

   Tipos de opción:
   - unica       → se elige una (radio). Si los valores tienen precio, se suma.
   - multiple    → se eligen varias distintas. "elegir" fija el máximo
                   (o "segun" lo toma del valor elegido en otra opción).
                   Con "hasta: true" alcanza con 1; si no, hay que elegir todas.
   - cantidades  → se reparten "elegir" unidades entre los valores
                   (se puede repetir el mismo).
   ===================================================================== */

/* ===== Adicionales ===== */

// "grupo": dentro del mismo grupo se puede marcar uno solo (las velas).
window.ADICIONALES = {
  velaDorada: { nombre: 'Vela dorada',                 precio: 0, grupo: 'vela' },
  velaBlanca: { nombre: 'Vela blanca',                 precio: 0, grupo: 'vela' },
  bengala: { nombre: 'Bengala blanca',                 precio: 1200 },
  topper:  { nombre: 'Topper "Feliz cumple" dorado',   precio: 2500 },
  tarjeta: { nombre: 'Tarjeta "Feliz cumpleaños"',     precio: 0 }
};

/* ===== Piezas compartidas ===== */

// fotos('oreo', 3) → ['img/productos/oreo-1.webp', ... 'oreo-3.webp']
function fotos(nombre, cantidad) {
  return Array.from({ length: cantidad }, (_, i) => `img/productos/${nombre}-${i + 1}.webp`);
}

const ADICIONALES_TORTA = ['velaDorada', 'velaBlanca', 'bengala', 'topper', 'tarjeta'];

function tamanosTorta(p16, p20) {
  return { id: 'tamano', tipo: 'unica', nombre: 'Tamaño', valores: [
    { id: '16', nombre: '16 cm · 10 porciones', precio: p16 },
    { id: '20', nombre: '20 cm · 20 porciones', precio: p20 }
  ]};
}

/* ===== Porciones (cambia cada semana) =====
   Se publican solas cada miércoles y se entregan el viernes de esa semana.
   Cierran el jueves a la hora de corte (CONFIG.horaCorte).
   Acá solo hay que actualizar los sabores. */

const PORCIONES_SEMANA = {
  primeraEntrega: '2026-11-06',  // antes de esta fecha no se publican
  diaPublicacion: 3,             // 3 = miércoles
  horaPublicacion: 0,            // desde las 0 hs del miércoles
  diaEntrega: 5,                 // 5 = viernes
  sabores: [
    { id: 'oreo',   nombre: 'Oreo' },
    { id: 'mousse', nombre: 'Mousse de chocolate' },
    { id: 'limon',  nombre: 'Limón' }
  ]
};

/* ===== Categorías ===== */

window.CATEGORIAS = [
  { id: 'tortas',    nombre: 'Tortas',
    cierre: { texto: '¿Buscás una torta personalizada?', boton: 'Mirá acá', href: 'personalizadas.html' } },
  { id: 'acompanamientos', nombre: 'Acompañamientos',
    nota: '¿No sabés cuántos necesitás? <a href="preguntas.html#mesa-dulce">Mirá las preguntas frecuentes</a>, ahí te explicamos cómo calcularlo.' },
  { id: 'porciones', nombre: 'Porciones' }
];

/* ===== Productos ===== */

window.PRODUCTOS = [
  /* ---------- TORTAS ---------- */
  {
    id: 'torta-oreo',
    categoria: 'tortas',
    nombre: 'Torta Oreo',
    descripcion: 'Nuestra versión de la famosa galletita OREO. Bizcocho húmedo de cacao negro y dos cortes de relleno cremoso de oreo.',
    fotos: fotos('oreo', 4),
    opciones: [tamanosTorta(29000, 44000)],
    adicionales: ADICIONALES_TORTA
  },
  {
    id: 'torta-limon',
    categoria: 'tortas',
    nombre: 'Torta Limón',
    descripcion: 'Una torta que no te vas a arrepentir de probar. Bizcochuelo húmedo con un suave y sabroso relleno de crema de limón.',
    fotos: fotos('limon', 4),
    opciones: [tamanosTorta(26000, 39000)],
    adicionales: ADICIONALES_TORTA
  },
  {
    id: 'torta-chocolate',
    categoria: 'tortas',
    nombre: 'Torta Chocolate',
    descripcion: 'Para los más golosos, pero sin empalagar. El equilibrio perfecto entre un bizcocho de cacao y relleno de cremosa mousse de chocolate.',
    fotos: fotos('chocolate', 3),
    opciones: [tamanosTorta(31000, 47000)],
    adicionales: ADICIONALES_TORTA
  },
  {
    id: 'torta-cumpleanitos',
    categoria: 'tortas',
    nombre: 'Torta Cumpleañitos',
    descripcion: 'Clásica torta de vainilla y dulce de leche, con decoración de granas multicolores. Perfecta para tu festejo.',
    fotos: fotos('cumpleanitos', 4),
    opciones: [tamanosTorta(22000, 35000)],
    adicionales: ADICIONALES_TORTA
  },
  {
    id: 'mix-tortas',
    categoria: 'tortas',
    nombre: 'Mix tortas 4 sabores',
    descripcion: '¿No sabés cuál sabor elegir? ¡Llevate todos! 4 sabores de torta en una, 1/4 de cada una de nuestras especiales: chocolate, oreo, limón y dulce de leche.',
    fotos: fotos('mix', 3),
    opciones: [
      { id: 'tamano', tipo: 'unica', nombre: 'Tamaño', valores: [
        { id: '16', nombre: 'Chico · 16 cm · 10 porciones',  precio: 28000 },
        { id: '20', nombre: 'Grande · 20 cm · 20 porciones', precio: 40000 }
      ]}
    ],
    adicionales: ADICIONALES_TORTA
  },

  /* ---------- BOCADITOS ---------- */
  {
    id: 'caja-bocaditos',
    categoria: 'acompanamientos',
    nombre: 'Caja de bocaditos',
    descripcion: '¡Una cajita que te resuelve todo! Contiene un surtido de alfajorcitos clásicos de vainilla, alfajorcitos de maicena, alfajorcitos de chocolate, trufas y cuadraditos de brownie. Cada bocado tiene aprox. 5 cm, el tamaño perfecto para que los invitados puedan disfrutar variedad.',
    nota: 'Caja de 24 unidades.',
    fotos: fotos('caja-bocaditos', 5),
    precio: 24000,
    opciones: []
  },
  {
    id: 'mini-tartas',
    categoria: 'acompanamientos',
    nombre: 'Mini tartas',
    descripcion: 'Para probar un poco de todo, nuestras tartas en formato de bocaditos de 5 cm. Caja de 12 unidades: elegí un solo sabor o combiná hasta 2.',
    fotos: fotos('mini-tartas', 4),
    precio: 18000,
    opciones: [
      { id: 'sabores', tipo: 'multiple', nombre: 'Sabores', elegir: 2, hasta: true, valores: [
        { id: 'lemon-pie',  nombre: 'Lemon pie' },
        { id: 'choco-ddl',  nombre: 'Chocolate y dulce de leche' },
        { id: 'frutilla',   nombre: 'Frutilla' },
        { id: 'manzana',    nombre: 'Manzana' },
        { id: 'coco-ddl',   nombre: 'Coco y dulce de leche' }
      ]}
    ]
  },
  {
    id: 'mini-postres',
    categoria: 'acompanamientos',
    nombre: 'Mini postres',
    descripcion: 'Nuestros deliciosos postres en su versión mini. Miden 5 cm y vienen en bandeja de 9 o 16 unidades, listos para presentar a tus invitados. Como son postres cremosos, lo mejor es comerlos directo de la bandeja o servirlos en platitos.',
    fotos: fotos('mini-postres', 4),
    opciones: [
      { id: 'bandeja', tipo: 'unica', nombre: 'Bandeja', valores: [
        { id: 'x9',  nombre: '9 unidades · hasta 3 sabores',  precio: 20000, elegir: 3 },
        { id: 'x16', nombre: '16 unidades · hasta 4 sabores', precio: 29000, elegir: 4 }
      ]},
      { id: 'sabores', tipo: 'multiple', nombre: 'Sabores', segun: 'bandeja', hasta: true, valores: [
        { id: 'tiramisu',    nombre: 'Tiramisú' },
        { id: 'cheesecake',  nombre: 'Cheesecake' },
        { id: 'brownie',     nombre: 'Brownie' },
        { id: 'mousse-choc', nombre: 'Mousse de chocolate' }
      ]}
    ]
  },
  {
    id: 'alfajorcitos',
    categoria: 'acompanamientos',
    nombre: 'Alfajorcitos',
    descripcion: 'Clásicos alfajorcitos rellenos de dulce de leche, de 4,5 cm de diámetro, para acompañar tu evento o para merendar algo rico. La caja trae 24 unidades, elegí tu sabor favorito.',
    fotos: fotos('alfajorcitos', 4),
    opciones: [
      { id: 'sabor', tipo: 'unica', nombre: 'Sabor · caja x24', valores: [
        { id: 'vainilla',  nombre: 'Vainilla',  precio: 15000 },
        { id: 'maicena',   nombre: 'Maicena',   precio: 16500 },
        { id: 'chocolate', nombre: 'Chocolate', precio: 22000 }
      ]}
    ]
  },

  /* ---------- PORCIONES ---------- */
  {
    id: 'porciones',
    categoria: 'porciones',
    nombre: 'Caja de porciones',
    descripcion: 'Para que puedas empezar a probar nuestros productos, ofrecemos estas cajitas que incluyen 2 porciones grandes. Disponibles los viernes, duran frescas todo el finde, conservadas en heladera y tapadas con su fólex. Las dos porciones son en total 1/4 de torta, así que se pueden compartir (o no). ¡Cada semana vamos a variar los sabores y sumar nuevos!',
    fotos: fotos('porciones', 1),
    precio: 10000,
    entregaFija: {
      semanal: PORCIONES_SEMANA,
      retiro: ['15 a 17 hs'],
      envio: ['Despacho 17 hs']
    },
    opciones: [
      { id: 'sabores', tipo: 'cantidades', nombre: 'Sabores', elegir: 2, valores: PORCIONES_SEMANA.sabores }
    ]
  }
];

/* ===== Tortas personalizadas (solo referencia, no se compran online) ===== */

window.PERSONALIZADA = {
  sena: 50,
  anticipacion: '72 hs',
  nota: 'Los precios consideran una decoración estándar; algunos diseños pueden tener adicionales de topper, apliques, macarons, etc.',
  tamanos: [
    { id: 'chica',   nombre: 'Chica',   detalle: '16 cm · 10 porciones · 1,5 kg aprox.',                    precio: 49000 },
    { id: 'mediana', nombre: 'Mediana', detalle: '18 cm · 15 porciones · 2 kg aprox.',                      precio: 62000 },
    { id: 'corazon', nombre: 'Corazón', detalle: '18 cm · 15 porciones · forma de corazón · 2 kg aprox.',  precio: 65000 },
    { id: 'grande',  nombre: 'Grande',  detalle: '20 cm · 20 porciones · 2,7 kg aprox.',                    precio: 74000 }
  ],
  rellenosMax: 2,
  bizcochuelos: [
    { id: 'vainilla',  nombre: 'Vainilla' },
    { id: 'chocolate', nombre: 'Chocolate' }
  ],
  rellenos: [
    { id: 'ddl',         nombre: 'Dulce de leche' },
    { id: 'chantilly',   nombre: 'Crema chantilly' },
    { id: 'oreo',        nombre: 'Crema oreo' },
    { id: 'mousse-choc', nombre: 'Mousse de chocolate' }
  ],
  // Galería de la página de Eventos (tortas personalizadas y mesas dulces)
  fotos: fotos('eventos', 4)
};
