import { expect, test } from '@jest/globals';
import { safeTestLocation } from '../src/services/collarSimulator.js';
import { distanceMeters } from '../src/utils/geography.js';

test('safe simulation supports no zones and checks all overlapping zones', () => {
  expect(safeTestLocation([])).toEqual({ latitude: 0, longitude: 0 });
  const zones = [
    { centerLatitude: 0, centerLongitude: 0, radius: 100000 },
    { centerLatitude: -80, centerLongitude: -180, radius: 100000 },
    { centerLatitude: -80, centerLongitude: -179.9, radius: 100000 },
  ];
  const point = safeTestLocation(zones);
  for (const zone of zones) {
    expect(
      distanceMeters(
        point.latitude,
        point.longitude,
        zone.centerLatitude,
        zone.centerLongitude,
      ),
    ).toBeGreaterThan(zone.radius);
  }
});

test('a point exactly on a zone boundary is not selected as safe', () => {
  const zone = {
    centerLatitude: 0,
    centerLongitude: 0.5,
    radius: distanceMeters(0, 0, 0, 0.5),
  };
  expect(safeTestLocation([zone])).not.toEqual({ latitude: 0, longitude: 0 });
});

test('fails explicitly when all candidates are covered instead of returning unsafe coordinates', () => {
  const zones = [{ centerLatitude: 0, centerLongitude: 0, radius: 100000 }];
  for (let latitude = -80; latitude <= 80; latitude += 10) {
    for (let longitude = -180; longitude < 180; longitude += 10) {
      zones.push({
        centerLatitude: latitude,
        centerLongitude: longitude,
        radius: 100000,
      });
    }
  }
  expect(() => safeTestLocation(zones)).toThrow('No reading was saved');
});
