import { ApiError } from './apiError.js';
export function text(value, label, required = true, max = 2000) {
  if (value == null || value === '') {
    if (required) throw new ApiError(400, `${label} is required`);
    return '';
  }
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new ApiError(
      400,
      `${label} must be text between 1 and ${max} characters`,
    );
  return value.trim();
}
export function choice(value, choices, label) {
  if (!choices.includes(value))
    throw new ApiError(400, `Choose a valid ${label}`);
  return value;
}
export function number(value, label, min, max) {
  if (
    value === '' ||
    value == null ||
    !['string', 'number'].includes(typeof value) ||
    !Number.isFinite(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new ApiError(400, `${label} must be between ${min} and ${max}`);
  return Number(value);
}
export function location(body, optional = false) {
  const source = body.location || body;
  if (
    optional &&
    (source.latitude == null || source.latitude === '') &&
    (source.longitude == null || source.longitude === '')
  )
    return undefined;
  return {
    latitude: number(source.latitude, 'Latitude', -90, 90),
    longitude: number(source.longitude, 'Longitude', -180, 180),
  };
}
export function date(value, label) {
  const result = new Date(value);
  if (!value || Number.isNaN(result.getTime()))
    throw new ApiError(400, `${label} must be a valid date`);
  return result;
}
