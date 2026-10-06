import mongoose from 'mongoose';
const { Schema } = mongoose;
export const roles = ['MANAGER', 'RANGER', 'LIAISON'];
export const incidentTypes = [
  'Snare / Trap',
  'Animal Carcass',
  'Illegal Campsite',
  'Suspected Poaching',
  'Injured Animal',
  'Other',
];
export const responseActions = [
  'Dispatch Ranger',
  'Notify Nearby Community',
  'Monitor Situation',
  'No Action Required',
  'Mark for Verification',
];
export const incompleteReasons = [
  'Medical Emergency',
  'Vehicle Breakdown',
  'Severe Weather',
  'Unsafe Conditions',
  'Blocked or Inaccessible Route',
  'Wildlife Threat',
  'Equipment Failure',
  'Communication Failure',
  'Emergency Reassignment',
  'Security Threat',
  'Insufficient Resources',
  'Other',
];
const ref = (model, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required,
});
const point = new Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);
const enumField = (values, initial) => ({
  type: String,
  enum: values,
  default: initial,
  required: true,
});
const model = (name, fields, indexes = []) => {
  const schema = new Schema(fields, { timestamps: true });
  indexes.forEach(([keys, options]) => schema.index(keys, options));
  return mongoose.model(name, schema);
};
export const User = model('User', {
  userId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: enumField(roles, 'RANGER'),
});
export const Incident = model('Incident', {
  incidentType: enumField(incidentTypes, undefined),
  description: String,
  location: { type: point, required: true },
  imageUrl: String,
  rangerId: ref('User'),
  patrolId: ref('Patrol', false),
  status: enumField(['Reported', 'Under Review', 'Resolved'], 'Reported'),
  syncStatus: enumField(['Synced', 'Pending'], 'Synced'),
});
const waypoint = new Schema({
  location: { type: point, required: true },
  type: { type: String, required: true },
  description: String,
  imageUrl: String,
  recordedAt: { type: Date, default: Date.now },
});
export const Patrol = model(
  'Patrol',
  {
    routeName: { type: String, required: true },
    parkName: { type: String, required: true },
    rangerId: ref('User'),
    scheduledDate: { type: Date, required: true },
    checkpoints: [{ name: String, location: point }],
    waypoints: [waypoint],
    startTime: Date,
    endTime: Date,
    durationMinutes: Number,
    status: enumField(
      ['Assigned', 'Active', 'Completed', 'Incomplete'],
      'Assigned',
    ),
    incompleteReason: {
      type: String,
      enum: [
        ...incompleteReasons,
        'Weather',
        'Injury',
        'Hazard',
        'Called Back',
      ],
    },
    incompleteReasonDetails: { type: String, maxlength: 2000 },
    createdBy: ref('User'),
  },
  [
    [
      { rangerId: 1 },
      { unique: true, partialFilterExpression: { status: 'Active' } },
    ],
  ],
);
export const Animal = model('Animal', {
  animalId: { type: String, required: true, unique: true },
  tagName: String,
  species: String,
  age: Number,
  gender: String,
  collarId: { type: String, required: true, unique: true },
  status: { type: String, default: 'Monitored' },
});
export const Collar = model('Collar', {
  collarId: { type: String, required: true, unique: true },
  animalId: ref('Animal'),
  batteryLevel: { type: Number, min: 0, max: 100 },
  status: enumField(['Active', 'Inactive'], 'Active'),
  lastTransmission: Date,
  lastLocation: point,
});
export const CollarReading = model('CollarReading', {
  collarId: { type: String, required: true, index: true },
  animalId: ref('Animal'),
  latitude: { type: Number, min: -90, max: 90, required: true },
  longitude: { type: Number, min: -180, max: 180, required: true },
  timestamp: { type: Date, default: Date.now },
});
export const RiskZone = model('RiskZone', {
  zoneName: { type: String, required: true, unique: true },
  description: String,
  centerLatitude: { type: Number, required: true, min: -90, max: 90 },
  centerLongitude: { type: Number, required: true, min: -180, max: 180 },
  radius: { type: Number, required: true, min: 1, max: 100000 },
  riskLevel: enumField(['Low', 'Medium', 'High', 'Critical'], 'High'),
});
export const Alert = model(
  'Alert',
  {
    animalId: ref('Animal'),
    collarId: String,
    zoneId: ref('RiskZone'),
    message: String,
    latitude: Number,
    longitude: Number,
    priority: enumField(['Low', 'Medium', 'High', 'Critical'], 'High'),
    status: enumField(['New', 'Acknowledged', 'Resolved'], 'New'),
    open: { type: Boolean, default: true },
    acknowledgedBy: ref('User', false),
    acknowledgedAt: Date,
    resolvedBy: ref('User', false),
    resolvedAt: Date,
    lastDetectedAt: Date,
  },
  [
    [
      { animalId: 1, zoneId: 1 },
      { unique: true, partialFilterExpression: { open: true } },
    ],
  ],
);
export const CommunityReport = model('CommunityReport', {
  landmark: { type: String, required: true },
  location: point,
  numberOfElephants: { type: Number, required: true, min: 1 },
  directionOfMovement: String,
  description: String,
  imageUrl: String,
  contact: String,
  status: enumField(
    ['New', 'Reviewing', 'Responding', 'Resolved', 'False Report'],
    'New',
  ),
  responses: [
    {
      action: { type: String, enum: responseActions, required: true },
      notes: String,
      responder: ref('User'),
      respondedAt: { type: Date, default: Date.now },
    },
  ],
});
