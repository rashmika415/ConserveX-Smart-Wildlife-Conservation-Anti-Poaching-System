import { distanceMeters } from '../utils/geography.js';
import { ApiError } from '../utils/apiError.js';

export function safeTestLocation(zones) {
  const outsideAllZones = (latitude, longitude) =>
    zones.every(
      (zone) =>
        distanceMeters(
          latitude,
          longitude,
          zone.centerLatitude,
          zone.centerLongitude,
        ) > zone.radius,
    );
  if (outsideAllZones(0, 0)) return { latitude: 0, longitude: 0 };
  // Bounded, deterministic search for artificial simulator coordinates.
  // Every candidate is checked against the same zones used for detection.
  for (let latitude = -80; latitude <= 80; latitude += 10) {
    for (let longitude = -180; longitude < 180; longitude += 10) {
      if (outsideAllZones(latitude, longitude)) return { latitude, longitude };
    }
  }
  throw new ApiError(
    409,
    'Unable to find a safe test location. No reading was saved.',
  );
}
