import {
  Animal,
  Collar,
  CollarReading,
  RiskZone,
  Alert,
} from '../models/index.js';
import { ApiError, requireRecord } from '../utils/apiError.js';
import { text, location, number, choice } from '../utils/validation.js';
export async function createRiskZone(body) {
  const point = location({
    latitude: body.centerLatitude,
    longitude: body.centerLongitude,
  });
  return RiskZone.create({
    zoneName: text(body.zoneName, 'Zone name', true, 120),
    description: text(body.description, 'Description', false),
    centerLatitude: point.latitude,
    centerLongitude: point.longitude,
    radius: number(body.radius, 'Radius (metres)', 1, 100000),
    riskLevel: choice(body.riskLevel, ['High', 'Critical'], 'risk level'),
  });
}
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const rad = (value) => (value * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export async function recordReading(body) {
  const collarId = text(body.collarId, 'Collar ID', true, 60);
  const point = location(body);
  const collar = requireRecord(await Collar.findOne({ collarId }), 'Collar');
  if (collar.status !== 'Active')
    throw new ApiError(409, 'This collar is inactive');
  const animal = requireRecord(
    await Animal.findById(collar.animalId),
    'Animal',
  );
  const timestamp = new Date();
  const reading = await CollarReading.create({
    collarId,
    animalId: animal._id,
    ...point,
    timestamp,
  });
  await Collar.updateOne(
    { _id: collar._id },
    { lastTransmission: timestamp, lastLocation: point },
  );
  const zones = await RiskZone.find({
    riskLevel: { $in: ['High', 'Critical'] },
  });
  const alerts = [];
  for (const zone of zones) {
    if (
      distanceMeters(
        point.latitude,
        point.longitude,
        zone.centerLatitude,
        zone.centerLongitude,
      ) > zone.radius
    )
      continue;
    const filter = { animalId: animal._id, zoneId: zone._id, open: true };
    const update = {
      $set: {
        collarId,
        ...point,
        priority: zone.riskLevel,
        message: `${animal.tagName} entered ${zone.zoneName}`,
        lastDetectedAt: timestamp,
      },
      $setOnInsert: { status: 'New' },
    };
    let alert;
    try {
      alert = await Alert.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
        runValidators: true,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      alert = await Alert.findOneAndUpdate(filter, update, { new: true });
    }
    alerts.push(alert);
  }
  return { reading, alerts };
}
