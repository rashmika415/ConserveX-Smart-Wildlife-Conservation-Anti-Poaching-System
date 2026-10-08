export async function reverseGeocodeGeoapify(lat, lon) {
  if (!lat || !lon) return null;
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const apiKey =
    import.meta.env?.VITE_GEOAPIFY_API_KEY ||
    'c043d6aa3dba49129cb296f9f0676925';

  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${apiKey}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    const prop = data.features?.[0]?.properties;
    if (!prop) return null;

    const town =
      prop.city || prop.suburb || prop.village || prop.county || prop.town || '';
    const district = prop.county || prop.state_district || '';
    const province = prop.state || '';
    const formatted = prop.formatted || '';
    const country = prop.country || '';

    // Create a concise clean area label (e.g., "Rajagiriya, Colombo District")
    const areaParts = [town, district].filter(Boolean);
    const uniqueArea = Array.from(new Set(areaParts)).join(', ');

    return {
      town,
      district,
      province,
      country,
      formatted,
      areaTitle: uniqueArea || formatted,
      raw: prop,
    };
  } catch (err) {
    console.warn('Geoapify reverse geocoding request failed:', err);
    return null;
  }
}
