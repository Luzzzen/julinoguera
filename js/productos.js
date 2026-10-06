/* ===== Adicionales ===== */

window.ADICIONALES = {
  vela:       { nombre: 'Vela',                     precio: 500 },
  packVelas:  { nombre: 'Pack de velas',            precio: 1500 },
  bengala:    { nombre: 'Bengala',                  precio: 1000 },
  topper:     { nombre: 'Topper "Feliz cumpleaños"', precio: 2500 },
  tarjeta:    { nombre: 'Tarjeta',                  precio: 800 }
};

/* ===== Listas compartidas ===== */

const RELLENOS = [
  { id: 'ddl',        nombre: 'Dulce de leche' },
  { id: 'chantilly',  nombre: 'Crema chantilly' },
  { id: 'oreo',       nombre: 'Oreo' },
  { id: 'mousse-choc', nombre: 'Mousse de chocolate' },
  { id: 'mousse-frut', nombre: 'Mousse de frutilla' }
];

const COLORES = [
  { id: 'rosa',     nombre: 'Rosa',     hex: '#f4b6c8' },
  { id: 'lila',     nombre: 'Lila',     hex: '#c1b0d9' },
  { id: 'celeste',  nombre: 'Celeste',  hex: '#a9d4ef' },
  { id: 'amarillo', nombre: 'Amarillo', hex: '#f6e08f' },
  { id: 'blanco',   nombre: 'Blanco',   hex: '#ffffff' },
  { id: 'verde',    nombre: 'Verde',    hex: '#b5ddb5' }
];

const ADICIONALES_TORTA = ['vela', 'packVelas', 'bengala', 'topper', 'tarjeta'];

/* ===== Categorías ===== */

window.CATEGORIAS = [
  { id: 'tortas',      nombre: 'Tortas' },
  { id: 'desayunos',   nombre: 'Desayunos' },
  { id: 'mini-postres', nombre: 'Mini postres' },
  { id: 'cuadraditos', nombre: 'Cuadraditos' },
  { id: 'tartas',      nombre: 'Tartas' },
  { id: 'budines',     nombre: 'Budines' },
  { id: 'alfajores',   nombre: 'Alfajores' },
  { id: 'masitas',     nombre: 'Masitas' }
];

/* ===== Productos ===== */

window.PRODUCTOS = [
  /* ---------- TORTAS ---------- */
  {
    id: 'julis-cake',
    categoria: 'tortas',
    nombre: "Juli's Cake",
    descripcion: 'La torta de la casa, en cuatro sabores y tres tamaños.',
    fotos: [],
    opciones: [
      { id: 'tamano', tipo: 'unica', nombre: 'Tamaño', valores: [
        { id: '10', nombre: '10 cm', precio: 12000 },
        { id: '16', nombre: '16 cm', precio: 20000 },
        { id: '20', nombre: '20 cm', precio: 28000 }
      ]},
      { id: 'sabor', tipo: 'unica', nombre: 'Sabor', valores: [
        { id: 'clasica',   nombre: 'Clásica' },
        { id: 'limon',     nombre: 'Limón' },
        { id: 'chocolate', nombre: 'Chocolate' },
        { id: 'oreo',      nombre: 'Oreo' }
      ]}
    ],
    adicionales: ADICIONALES_TORTA
  },
  {
    id: 'cake-cumpleanos',
    categoria: 'tortas',
    nombre: 'Cake Cumpleaños',
    descripcion: 'Elegís tamaño, rellenos y color. Ideal para festejar.',
    fotos: [],
    opciones: [
      { id: 'tamano', tipo: 'unica', nombre: 'Tamaño', valores: [
        { id: 'mini', nombre: 'Mini 10 cm',        precio: 14000, elegir: 1 },
        { id: '18-1', nombre: '18 cm · 1 relleno',  precio: 24000, elegir: 1 },
        { id: '18-2', nombre: '18 cm · 2 rellenos', precio: 29000, elegir: 2 },
        { id: '18-3', nombre: '18 cm · 3 rellenos', precio: 34000, elegir: 3 }
      ]},
      { id: 'rellenos', tipo: 'multiple', nombre: 'Rellenos', segun: 'tamano', valores: RELLENOS },
      { id: 'color', tipo: 'unica', nombre: 'Color', estilo: 'color', valores: COLORES }
    ],
    adicionales: ADICIONALES_TORTA
  },

  /* ---------- DESAYUNOS ---------- */
  {
    id: 'desayuno',
    categoria: 'desayunos',
    nombre: 'Desayuno',
    descripcion: 'Una caja para sorprender.',
    fotos: [],
    opciones: [
      { id: 'tipo', tipo: 'unica', nombre: 'Versión', valores: [
        { id: 'chico',  nombre: 'Chico',        precio: 18000 },
        { id: 'grande', nombre: 'Grande',       precio: 28000 },
        { id: 'cumple', nombre: 'Cumpleañero',  precio: 32000 }
      ]},
      { id: 'color', tipo: 'unica', nombre: 'Color de la torta', estilo: 'color',
        visibleSi: { opcion: 'tipo', valor: 'cumple' }, valores: COLORES }
    ],
    adicionales: ['vela', 'bengala', 'tarjeta']
  },

  /* ---------- MINI POSTRES ---------- */
  {
    id: 'mini-postres',
    categoria: 'mini-postres',
    nombre: 'Mini postres',
    descripcion: 'Caja surtida de postrecitos.',
    fotos: [],
    opciones: [
      { id: 'caja', tipo: 'unica', nombre: 'Caja', valores: [
        { id: 'x12', nombre: '12 unidades · 3 sabores', precio: 16000, elegir: 3 },
        { id: 'x16', nombre: '16 unidades · 4 sabores', precio: 21000, elegir: 4 }
      ]},
      { id: 'sabores', tipo: 'multiple', nombre: 'Sabores', segun: 'caja', valores: [
        { id: 's1', nombre: 'Sabor 1' }, { id: 's2', nombre: 'Sabor 2' },
        { id: 's3', nombre: 'Sabor 3' }, { id: 's4', nombre: 'Sabor 4' },
        { id: 's5', nombre: 'Sabor 5' }, { id: 's6', nombre: 'Sabor 6' },
        { id: 's7', nombre: 'Sabor 7' }, { id: 's8', nombre: 'Sabor 8' }
      ]}
    ]
  },

  /* ---------- CUADRADITOS ---------- */
  {
    id: 'cuadraditos',
    categoria: 'cuadraditos',
    nombre: 'Cuadraditos',
    descripcion: 'Caja surtida para compartir.',
    fotos: [],
    opciones: [
      { id: 'caja', tipo: 'unica', nombre: 'Caja', valores: [
        { id: 'x12', nombre: '12 unidades · 3 sabores', precio: 14000, elegir: 3 },
        { id: 'x16', nombre: '16 unidades · 4 sabores', precio: 18000, elegir: 4 }
      ]},
      { id: 'sabores', tipo: 'multiple', nombre: 'Sabores', segun: 'caja', valores: [
        { id: 'lemonies',   nombre: 'Lemonies' },
        { id: 'pastafrola', nombre: 'Pastafrola' },
        { id: 'brownie',    nombre: 'Brownie' },
        { id: 'coco',       nombre: 'Coco' },
        { id: 'manzana',    nombre: 'Manzana' }
      ]}
    ]
  },

  /* ---------- TARTAS ---------- */
  {
    id: 'tartas',
    categoria: 'tartas',
    nombre: 'Tartas',
    descripcion: 'Todas de 24 cm.',
    fotos: [],
    opciones: [
      { id: 'sabor', tipo: 'unica', nombre: 'Sabor', valores: [
        { id: 'lemon-pie',  nombre: 'Lemon pie',  precio: 15000 },
        { id: 'coco',       nombre: 'Coco',       precio: 14000 },
        { id: 'pastafrola', nombre: 'Pastafrola', precio: 12000 },
        { id: 'frutillas',  nombre: 'Frutillas',  precio: 17000 }
      ]}
    ]
  },

  /* ---------- BUDINES ---------- */
  {
    id: 'budines',
    categoria: 'budines',
    nombre: 'Budines',
    descripcion: 'Todos de 25 cm.',
    fotos: [],
    opciones: [
      { id: 'sabor', tipo: 'unica', nombre: 'Sabor', valores: [
        { id: 'limon',      nombre: 'Limón',      precio: 9000 },
        { id: 'chocolate',  nombre: 'Chocolate',  precio: 9500 },
        { id: 'marmolado',  nombre: 'Marmolado',  precio: 9500 },
        { id: 'naranja',    nombre: 'Naranja',    precio: 9000 }
      ]}
    ]
  },

  /* ---------- ALFAJORES ---------- */
  {
    id: 'alfajores',
    categoria: 'alfajores',
    nombre: 'Alfajores',
    descripcion: 'De 5 cm. Cada caja viene de un solo sabor.',
    fotos: [],
    opciones: [
      { id: 'caja', tipo: 'unica', nombre: 'Caja', valores: [
        { id: 'x12', nombre: 'Caja x12' },
        { id: 'x24', nombre: 'Caja x24' }
      ]},
      { id: 'sabor', tipo: 'unica', nombre: 'Sabor', valores: [
        { id: 'clasicos',  nombre: 'Clásicos' },
        { id: 'chocolate', nombre: 'Chocolate' },
        { id: 'almendras', nombre: 'Almendras' }
      ]}
    ],
    precioPor: ['caja', 'sabor'],
    tabla: {
      'x12|clasicos': 9000,  'x12|chocolate': 10000, 'x12|almendras': 12000,
      'x24|clasicos': 17000, 'x24|chocolate': 19000, 'x24|almendras': 23000
    }
  },

  /* ---------- MASITAS ---------- */
  {
    id: 'masitas',
    categoria: 'masitas',
    nombre: 'Masitas',
    descripcion: 'Surtido de masitas secas.',
    fotos: [],
    opciones: [
      { id: 'caja', tipo: 'unica', nombre: 'Caja', valores: [
        { id: '500', nombre: '500 g', precio: 9000 },
        { id: '1kg', nombre: '1 kg',  precio: 17000 }
      ]}
    ]
  }
];

/* ===== Tortas personalizadas (referencia) ===== */
window.PERSONALIZADA = {
  sena: 50,
  anticipacion: 5,
  tamanos: [
    { id: '18-1', nombre: '18 cm · 1 relleno',  precio: 35000, elegir: 1 },
    { id: '18-2', nombre: '18 cm · 2 rellenos', precio: 42000, elegir: 2 },
    { id: '18-3', nombre: '18 cm · 3 rellenos', precio: 49000, elegir: 3 }
  ],
  rellenos: RELLENOS
};
