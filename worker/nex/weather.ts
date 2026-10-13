import {
  external,
  Fault,
  json,
  text,
  type Env,
  type Identity,
} from "./core.ts";
import { reserve } from "./providers.ts";
/** Explicit city, no GPS/IP inference. Shares the existing free connector budget. */
export async function weather(env: Env, who: Identity, city: unknown) {
  const name = text(city, 80);
  await reserve(env, who, "google", 2);
  const geo = await external(
    "https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&format=json&name=" +
      encodeURIComponent(name),
  );
  if (!geo.ok) throw new Fault(503, "Busca de cidade indisponível.");
  const place = (
    (await geo.json()) as {
      results?: {
        name: string;
        country?: string;
        latitude: number;
        longitude: number;
      }[];
    }
  ).results?.[0];
  if (
    !place ||
    !Number.isFinite(place.latitude) ||
    !Number.isFinite(place.longitude)
  )
    throw new Fault(404, "Cidade não encontrada. Informe também a região.");
  const latitude = place.latitude.toFixed(2),
    longitude = place.longitude.toFixed(2);
  const r = await external(
    "https://api.open-meteo.com/v1/forecast?latitude=" +
      latitude +
      "&longitude=" +
      longitude +
      "&current=temperature_2m,apparent_temperature,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=auto",
  );
  if (!r.ok) throw new Fault(503, "Previsão temporariamente indisponível.");
  return json({
    place: [place.name, place.country].filter(Boolean).join(", "),
    data: await r.json(),
    attribution: "Open-Meteo · CC BY 4.0 · geocodificação GeoNames",
    href: "https://open-meteo.com/",
    limited: true,
  });
}
