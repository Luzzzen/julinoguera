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

window.ADICIONALES = {
  bengala: { nombre: 'Bengala blanca',                 precio: 1200 },
  topper:  { nombre: 'Topper "Feliz cumple" dorado',   precio: 2500 },
  tarjeta: { nombre: 'Tarjeta "Feliz cumpleaños"',     precio: 0 }
};

/* ===== Piezas compartidas ===== */

const NOTA_TORTAS = 'Todas las tortas incluyen una velita de cortesía.';
const ADICIONALES_TORTA = ['bengala', 'topper', 'tarjeta'];

function tamanosTorta(p16, p20) {
  return { id: 'tamano', tipo: 'unica', nombre: 'Tamaño', valores: [
    { id: '16', nombre: '16 cm · 10 porciones', precio: p16 },
    { id: '20', nombre: '20 cm · 20 porciones', precio: p20 }
  ]};
}

const VELA = {
  id: 'vela', tipo: 'unica', nombre: 'Vela de cortesía', estilo: 'color', preseleccionar: true,
  valores: [
    { id: 'dorada', nombre: 'Dorada', hex: '#d6b25e' },
    { id: 'blanca', nombre: 'Blanca', hex: '#ffffff' }
  ]
};

/* ===== Porciones (cambia cada semana) ===== */

const PORCIONES_SEMANA = {
  fecha: '2026-11-06',
  sabores: [
    { id: 'oreo',   nombre: 'Oreo' },
    { id: 'mousse', nombre: 'Mousse' },
    { id: 'limon',  nombre: 'Limón' }
  ]
};

/* ===== Categorías ===== */

window.CATEGORIAS = [
  { id: 'tortas',    nombre: 'Tortas' },
  { id: 'bocaditos', nombre: 'Bocaditos',
    nota: 'Si tenés dudas sobre cuántos bocaditos necesitás, consultanos y con gusto te asesoramos.' },
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
    nota: NOTA_TORTAS,
    fotos: ['img/productos/oreo-1.webp', 'img/productos/oreo-2.webp', 'img/productos/oreo-3.webp', 'img/productos/oreo-4.webp'],
    opciones: [tamanosTorta(29000, 44000), VELA],
    adicionales: ADICIONALES_TORTA
  },
  {
    id: 'torta-limon',
    categoria: 'tortas',
    nombre: 'Torta Limón',
    descripcion: 'Una torta que no te vas a arrepentir de probar. Bizcochuelo húmedo con un suave y sabroso relleno de crema de limón.',
    nota: NOTA_TORTAS,
    fotos: ['img/productos/limon-1.webp'],
    opciones: [tamanosTorta(26000, 39000), VELA],
    adicionales: ADICIONALES_TORTA
  },
  {
    id: 'torta-chocolate',
    categoria: 'tortas',
    nombre: 'Torta Chocolate',
    descripcion: 'Para los más golosos, pero sin empalagar. El equilibrio perfecto entre un bizcocho de cacao y relleno de cremosa mousse de chocolate.',
    nota: NOTA_TORTAS,
    fotos: ['img/productos/chocolate-1.webp', 'img/productos/chocolate-2.webp', 'img/productos/chocolate-3.webp'],
    opciones: [tamanosTorta(31000, 47000), VELA],
    adicionales: ADICIONALES_TORTA
  },
  {
    id: 'torta-cumpleanitos',
    categoria: 'tortas',
    nombre: 'Torta Cumpleañitos',
    descripcion: 'Clásica torta de vainilla y dulce de leche, con decoración de granas multicolores. Perfecta para tu festejo.',
    nota: NOTA_TORTAS,
    fotos: [],
    opciones: [tamanosTorta(22000, 35000), VELA],
    adicionales: ADICIONALES_TORTA
  },
  {
    id: 'mix-tortas',
    categoria: 'tortas',
    nombre: 'Mix tortas 4 sabores',
    descripcion: '¿No sabés cuál sabor elegir? ¡Llevate todos! 4 sabores de torta en una, 1/4 de cada una de nuestras especiales: chocolate, oreo, limón y dulce de leche.',
    nota: NOTA_TORTAS,
    fotos: ['img/productos/mix-1.webp', 'img/productos/mix-2.webp', 'img/productos/mix-3.webp'],
    opciones: [
      { id: 'tamano', tipo: 'unica', nombre: 'Tamaño', valores: [
        { id: '16', nombre: 'Chico · 16 cm · 10 porciones',  precio: 28000 },
        { id: '20', nombre: 'Grande · 20 cm · 20 porciones', precio: 40000 }
      ]},
      VELA
    ],
    adicionales: ADICIONALES_TORTA
  },

  /* ---------- BOCADITOS ---------- */
  {
    id: 'caja-bocaditos',
    categoria: 'bocaditos',
    nombre: 'Caja de bocaditos',
    descripcion: '¡Una cajita que te resuelve todo! Contiene un surtido de alfajorcitos clásicos de vainilla, alfajorcitos de maicena, alfajorcitos de chocolate, trufas y cuadraditos de brownie. Cada bocado tiene aprox. 5 cm, el tamaño perfecto para que los invitados puedan disfrutar variedad.',
    nota: 'Caja de 24 unidades.',
    fotos: [],
    precio: 24000,
    opciones: []
  },
  {
    id: 'mini-tartas',
    categoria: 'bocaditos',
    nombre: 'Mini tartas',
    descripcion: 'Para probar un poco de todo, nuestras tartas en formato de bocaditos de 5 cm. Caja de 12 unidades: elegí un solo sabor o combiná hasta 2.',
    fotos: [],
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
    categoria: 'bocaditos',
    nombre: 'Mini postres',
    descripcion: 'Nuestros deliciosos postres en su versión mini. Miden 5 cm y vienen en bandeja de 9 o 16 unidades, listos para presentar a tus invitados. Como son postres cremosos, lo mejor es comerlos directo de la bandeja o servirlos en platitos.',
    fotos: ['img/productos/mini-postres-1.webp', 'img/productos/mini-postres-2.webp', 'img/productos/mini-postres-3.webp', 'img/productos/mini-postres-4.webp'],
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
    categoria: 'bocaditos',
    nombre: 'Alfajorcitos',
    descripcion: 'Clásicos alfajorcitos rellenos de dulce de leche, de 4,5 cm de diámetro, para acompañar tu evento o para merendar algo rico. La caja trae 24 unidades, elegí tu sabor favorito.',
    fotos: ['img/productos/alfajorcitos-1.webp', 'img/productos/alfajorcitos-2.webp', 'img/productos/alfajorcitos-3.webp', 'img/productos/alfajorcitos-4.webp'],
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
    fotos: ['img/productos/porciones-1.webp'],
    precio: 10000,
    entregaFija: {
      fecha: PORCIONES_SEMANA.fecha,
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
    { id: 'chica',   nombre: 'Chica',   detalle: '16 cm · 10 porciones',            peso: '1,5 kg', precio: 49000, elegir: 2 },
    { id: 'mediana', nombre: 'Mediana', detalle: '18 cm · 15 porciones',            peso: '2 kg',   precio: 62000, elegir: 2 },
    { id: 'corazon', nombre: 'Corazón', detalle: '18 cm · 15 porciones · forma de corazón', peso: '2 kg', precio: 65000, elegir: 2 },
    { id: 'grande',  nombre: 'Grande',  detalle: '20 cm · 20 porciones',            peso: '2,7 kg', precio: 74000, elegir: 3 }
  ],
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
  // Fotos de referencia (tira horizontal). Juli las manda más adelante.
  fotos: []
};
