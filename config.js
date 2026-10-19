const CONFIG = {
  business: {
    name: "0101 Barbershop",
    email: "0101barbershop@gmail.com",
    whatsappMessage: "Hola, me gustaría agendar una cita en 0101 Barbershop",
    facebook: "https://www.facebook.com/0101BarberShop/"
  },
  hours: [
    { day: "Lunes a sábado", time: "8:00 AM – 7:00 PM" },
    { day: "Domingo", time: "9:00 AM – 6:00 PM" }
  ],
  locations: [
    {
      id: "tegucigalpa",
      name: "Tegucigalpa",
      address: "Plaza Paseo Loarque, salida al sur",
      phoneDisplay: "+504 8844-4391",
      whatsappNumber: "50488444391",
      mapsUrl: "https://maps.app.goo.gl/3aZDA6VBnpMV7cAz8",
      mapsEmbedUrl: "https://www.google.com/maps?q=14.0463032,-87.2117298&z=17&hl=es&output=embed",
      instagram: "https://www.instagram.com/0101barbershop/"
    },
    {
      id: "comayagua",
      name: "Comayagua",
      address: "Premium Plaza, Comayagua",
      phoneDisplay: "+504 3394-7000",
      whatsappNumber: "50433947000",
      mapsUrl: "https://maps.app.goo.gl/cpCiW6VKGZ6fgrK66",
      mapsEmbedUrl: "https://www.google.com/maps?q=14.444911,-87.6371415&z=17&hl=es&output=embed",
      instagram: "https://www.instagram.com/0101barbershop_comayagua/"
    }
  ],
  services: [
    {
      name: "Corte",
      price: "L 170",
      teaser: "Clásico o degradado, en la misma tarifa.",
      desc: "Corte a como lo pidas. El degradado va incluido.",
      hot: true
    },
    {
      name: "Barba",
      price: "L 170",
      teaser: "Perfilado de barba y bigote.",
      desc: "Recorte, línea de mejilla y acabado."
    },
    {
      name: "Corte y barba",
      price: "L 300",
      teaser: "Las dos cosas, en una cita.",
      desc: "Corte y arreglo de barba en la misma silla.",
      hot: true
    },
    {
      name: "Corte infantil",
      price: "L 130",
      teaser: "Para niños, con la misma atención.",
      desc: "Corte para niños, por debajo de la tarifa de adulto."
    },
    {
      name: "Cejas",
      price: "L 50",
      teaser: "Perfilado rápido.",
      desc: "Definición de cejas para acompañar el corte."
    },
    {
      name: "Diseño",
      price: "L 80",
      teaser: "Líneas y contorno.",
      desc: "Diseño de línea en el corte o en la barba, cuando lo pides aparte."
    }
  ],
  gallery: [
    { image: "images/interior.jpg", alt: "Sillas y estación de 0101 Barbershop" },
    { image: "images/gallery/fade.jpg", alt: "Degradado en la silla" },
    { image: "images/gallery/beard.jpg", alt: "Barba perfilada" },
    { image: "images/gallery/classic-cut.jpg", alt: "Corte terminado" },
    { image: "images/gallery/lineup.jpg", alt: "Detalle del contorno con máquina" },
    { image: "images/hero.jpg", alt: "Preparación de la máquina" }
  ],
  testimonials: [
    {
      text: "Buen corte y rápido, me gusta que el barbero era calladito.",
      author: "Marito"
    },
    {
      text: "Muy buen servicio y los barberos, de primera. Buen ambiente, bien acondicionado. Recomendados.",
      author: "Carlos Muñoz"
    },
    {
      text: "Excelente corte de pelo, tal como solicité, sumado a la amabilidad de todos.",
      author: "Juan Carlos Rodríguez"
    },
    {
      text: "Excelente lugar, muy recomendable para adultos y niños, muy buena atención.",
      author: "Javier Bustillo"
    }
  ],
  productCategories: ["Champú", "Styling"],
  products: [
    {
      id: "american-crew-daily-cleansing",
      name: "American Crew Daily Cleansing Shampoo",
      category: "Champú",
      teaser: "Limpieza diaria, citrus mint, fórmula vegan.",
      image: "images/products/american-crew-shampoo.jpg",
      featured: true,
      price: null
    },
    {
      id: "american-crew-fiber",
      name: "American Crew Fiber",
      category: "Styling",
      teaser: "High hold, low shine · 50 g.",
      image: "images/products/american-crew-fiber.jpg",
      featured: true,
      price: null
    },
    {
      id: "maxybelt-cera-vibrante",
      name: "Maxybelt Cera Vibrante",
      category: "Styling",
      teaser: "Brillo natural y sensación húmeda · 100 g.",
      image: "images/products/maxybelt-cera-vibrante.jpg",
      featured: true,
      price: null
    },
    {
      id: "maxybelt-caspa-2en1",
      name: "Don Barbero Shampoo Control Caspa 2 en 1",
      category: "Champú",
      teaser: "Uso diario, línea profesional Maxybelt.",
      image: "images/products/maxybelt-caspa.jpg",
      featured: true,
      price: null
    },
    {
      id: "maxybelt-3en1",
      name: "Don Barbero Shampoo 3 en 1",
      category: "Champú",
      teaser: "Cabello, barba y cuerpo.",
      image: "images/products/maxybelt-3en1.jpg",
      featured: true,
      price: null
    }
  ],
  ui: {
    navProducts: "Productos",
    productsEyebrow: "Tienda",
    productsTitle: "Productos",
    productsSubtitle: "American Crew y Maxybelt para llevar el corte a casa.",
    productsViewAll: "Ver productos",
    cartLabel: "Carrito",
    cartTitle: "Tu carrito",
    cartClose: "Cerrar carrito",
    cartEmpty: "Tu carrito está vacío.",
    cartCheckout: "Pedir por WhatsApp",
    cartClear: "Vaciar carrito",
    cartRemove: "Quitar",
    cartAdded: "Agregado",
    catalogAddToCart: "Agregar al carrito",
    catalogTitle: "Productos",
    catalogSubtitle: "American Crew y Maxybelt disponibles en 0101.",
    catalogSearchPlaceholder: "Buscar producto…",
    catalogFilterAll: "Todos",
    catalogEmpty: "No hay productos con ese filtro.",
    catalogWhatsApp: "Consultar por WhatsApp",
    catalogClose: "Cerrar",
    catalogBack: "Volver al inicio",
    cartWhatsAppIntro: "Hola, me interesa este pedido de 0101 Barbershop:",
    cartWhatsAppOutro: "¿Me confirman disponibilidad y precio?",
    cartItemLine: "{qty}× {name}",
    whatsappLabel: "WhatsApp"
  }
};
