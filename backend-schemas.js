/**
 * REFERENCIA PARA EL BACKEND (Node.js + Mongoose)
 * 
 * Copia estos esquemas en tu proyecto de backend para crear la estructura
 * de la base de datos MongoDB compatible con tu App React Native.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// --- 1. Esquema de Usuario ---
const UserSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Recuerda hashear esto
  role: { 
    type: String, 
    enum: ['Admin', 'Project Manager', 'Viewer'], 
    default: 'Viewer' 
  },
  companyName: String,
  imageUri: String
}, { timestamps: true });

// --- 2. Esquema de Proyecto ---
const ProjectSchema = new Schema({
  name: { type: String, required: true },
  client: String,
  status: { 
    type: String, 
    enum: ['En Progreso', 'Retrasado', 'Completado', 'On Time'],
    default: 'En Progreso'
  },
  address: String,
  progress: { type: Number, default: 0 },
  participants: [String], // Podrían ser IDs de usuarios o URLs de avatares
  architecturalPlanUri: String, // URL a S3/Cloudinary
  startDate: Date,
  endDate: Date
}, { timestamps: true });

// --- 3. Esquema de Checklist (Items del plano) ---
// Se recomienda una colección separada referenciando al proyecto para escalabilidad
const ChecklistItemSchema = new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  
  // Coordenadas y Dimensiones (para el plano)
  x: Number,
  y: Number,
  width: Number,
  height: Number,
  
  assignedTo: String, // Podría ser un ObjectId ref: 'User'
  shape: { 
    type: String, 
    enum: ['rectangle', 'circle', 'pencil', 'pin'],
    default: 'rectangle'
  },
  path: String, // Para trazos libres (pencil)
  
  // Sub-documentos para evidencias y comentarios
  evidence: [{
    type: { type: String, enum: ['image', 'video'] },
    uri: String,
    createdAt: { type: Date, default: Date.now }
  }],
  comments: [{
    text: String,
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// --- 4. Esquema de Catálogo Dinámico (Multiusos) ---
// Permite guardar listas para Partidas, Unidades, Bancos, etc. en una sola colección.
const CatalogSchema = new Schema({
  type: { type: String, required: true, index: true }, // Agrupador (Ej: 'budget_category', 'unit_type')
  code: { type: String, required: true }, // Identificador único o slug (Ej: 'CIM', 'M2')
  value: { type: String, required: true }, // El texto visible (Ej: 'Cimentación', 'Metro Cuadrado')
  description: String, // Descripción opcional
  active: { type: Boolean, default: true }, // Para "borrado lógico" (ocultar sin eliminar)
  order: { type: Number, default: 0 }, // Para controlar el orden de aparición en las listas
  metadata: Schema.Types.Mixed // Campo flexible para datos extra específicos del tipo
}, { timestamps: true });

// Índice compuesto: El código debe ser único DENTRO de cada tipo de catálogo
CatalogSchema.index({ type: 1, code: 1 }, { unique: true });

// --- 5. Esquema de Eventos (Agenda) ---
const EventSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true }, // Fecha del evento
  time: String, // Hora (ej. "14:00")
  type: { 
    type: String, 
    enum: ['Meeting', 'Inspection', 'Delivery', 'Deadline', 'Other'],
    default: 'Other' 
  },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' }, // Opcional: vincular a un proyecto
}, { timestamps: true });

module.exports = {
  User: mongoose.model('User', UserSchema),
  Project: mongoose.model('Project', ProjectSchema),
  ChecklistItem: mongoose.model('ChecklistItem', ChecklistItemSchema),
  Catalog: mongoose.model('Catalog', CatalogSchema),
  Event: mongoose.model('Event', EventSchema)
};