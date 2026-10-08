import {
  Animal,
  Collar,
  CollarReading,
  RiskZone,
  Alert,
} from '../models/index.js';
import { ApiError, requireRecord } from '../utils/apiError.js';
import { text, location, number, choice } from '../utils/validation.js';
import { distanceMeters } from '../utils/geography.js';
import { safeTestLocation } from './collarSimulator.js';
export { distanceMeters } from '../utils/geography.js';
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
export async function recordReading(body) {
  const collarId = text(body.collarId, 'Collar ID', true, 60);
  const simulation =
    body.simulation === undefined
      ? undefined
      : choice(body.simulation, ['safe'], 'simulation mode');
  let point = simulation ? undefined : location(body);
  const collar = requireRecord(await Collar.findOne({ collarId }), 'Collar');
  if (collar.status !== 'Active')
    throw new ApiError(409, 'This collar is inactive');
  const animal = requireRecord(
    await Animal.findById(collar.animalId),
    'Animal',
  );
  const zones = await RiskZone.find({
    riskLevel: { $in: ['High', 'Critical'] },
  });
  if (simulation) point = safeTestLocation(zones);
  const timestamp = new Date();
  const reading = await CollarReading.create({
    collarId,
    animalId: animal._id,
    ...point,
    timestamp,
  });
  const alerts = [];
  let insideRiskZone = false;
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
    insideRiskZone = true;
    const wasInside =
      collar.lastLocation &&
      distanceMeters(
        collar.lastLocation.latitude,
        collar.lastLocation.longitude,
        zone.centerLatitude,
        zone.centerLongitude,
      ) <= zone.radius;
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
        upsert: !wasInside,
        new: true,
        runValidators: true,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      alert = await Alert.findOneAndUpdate(filter, update, { new: true });
    }
    if (alert) alerts.push(alert);
  }
  await Collar.updateOne(
    { _id: collar._id },
    { lastTransmission: timestamp, lastLocation: point },
  );
  return { reading, alerts, insideRiskZone };
}
