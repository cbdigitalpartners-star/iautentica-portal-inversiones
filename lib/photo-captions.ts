export const PHOTO_CAPTIONS = [
  // Interior unidad
  "Dormitorio",
  "Dormitorio principal",
  "Dormitorio 2",
  "Dormitorio 3",
  "Living",
  "Comedor",
  "Living comedor",
  "Cocina",
  "Cocina equipada",
  "Baño",
  "Baño principal",
  "Closet",
  "Vestidor",
  "Pasillo",
  "Hall",
  "Terraza",
  "Balcón",
  "Logia",

  // Áreas comunes
  "Sala común",
  "Sala multiuso",
  "Sala de eventos",
  "Sala de cine",
  "Sala de juegos",
  "Coworking",
  "Quincho",
  "Lavandería",
  "Gimnasio",
  "Piscina",
  "Spa",
  "Sauna",
  "Bicicletero",
  "Pet wash",
  "Bodega",
  "Estacionamiento",

  // Exterior y entorno
  "Fachada",
  "Acceso",
  "Lobby",
  "Recepción",
  "Jardín",
  "Áreas verdes",
  "Vista panorámica",

  // Renders y planos
  "Render exterior",
  "Render interior",
  "Plano",
  "Plano de planta",
  "Ubicación",
] as const;

export type PhotoCaption = typeof PHOTO_CAPTIONS[number];
