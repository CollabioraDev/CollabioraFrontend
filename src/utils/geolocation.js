const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000,
};
const RETRY_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 20000,
  maximumAge: 0,
};

function getCurrentPositionWithOptions(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      reject,
      options,
    );
  });
}

/**
 * Get user's current position via browser Geolocation API.
 * Retries once on timeout or temporary failure (e.g. after user grants permission on first prompt).
 * @returns {Promise<{ lat: number, lon: number }>}
 */
export function getCurrentPosition() {
  if (!navigator?.geolocation) {
    return Promise.reject(
      new Error("Geolocation is not supported by your browser."),
    );
  }

  return getCurrentPositionWithOptions(DEFAULT_OPTIONS).catch((err) => {
    // Permission denied: do not retry
    if (err.code === 1)
      return Promise.reject(new Error("Location permission denied."));
    // Timeout (3) or position unavailable (2): retry once with relaxed options (faster fix, longer timeout)
    if (err.code === 2 || err.code === 3) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          getCurrentPositionWithOptions(RETRY_OPTIONS)
            .then(resolve)
            .catch((retryErr) => {
              if (retryErr.code === 1)
                reject(new Error("Location permission denied."));
              else if (retryErr.code === 2)
                reject(new Error("Location unavailable."));
              else if (retryErr.code === 3)
                reject(new Error("Location request timed out."));
              else reject(new Error("Could not get your location."));
            });
        }, 400);
      });
    }
    return Promise.reject(new Error("Could not get your location."));
  });
}

/**
 * Reverse geocode lat/lon to city and country using OpenStreetMap Nominatim (no API key).
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ city: string, country: string }>}
 */
export async function reverseGeocode(lat, lon) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Could not look up location.");

  const data = await res.json();
  const addr = data?.address || {};
  const country = addr.country || "";
  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    addr.state ||
    "";

  return { city: city.trim(), country: country.trim() };
}

/**
 * Get user's city and country by detecting location and reverse geocoding.
 * @returns {Promise<{ city: string, country: string }>}
 */
export async function getCityAndCountryFromLocation() {
  const { lat, lon } = await getCurrentPosition();
  return reverseGeocode(lat, lon);
}
