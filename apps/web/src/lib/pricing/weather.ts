import type { PricingRuleMap, WeatherPricingFactor, WeatherPricingInput } from './types';
import { getPricingRuleNumber } from './rules';

const KMH_TO_MPH = 0.621371;
const REQUEST_TIMEOUT_MS = 6000;

interface OpenMeteoResponse {
  current?: {
    weather_code?: number;
    temperature_2m?: number;
    wind_speed_10m?: number;
    precipitation?: number;
  };
  current_weather?: {
    weathercode?: number;
    temperature?: number;
    windspeed?: number;
  };
  current_units?: {
    wind_speed_10m?: string;
  };
}

function classifyWeatherCode(code: number): 'severe' | 'moderate' | 'none' {
  // WMO weather codes — https://open-meteo.com/en/docs
  // 95-99 thunderstorm; 75 heavy snow; 67 freezing rain heavy; 82 heavy showers
  if ([95, 96, 99, 67, 75, 82, 86].includes(code)) return 'severe';
  // 51-67 drizzle/rain; 71-77 snow; 80-82 showers; 45/48 fog
  if (
    (code >= 51 && code <= 77) ||
    (code >= 80 && code <= 86) ||
    code === 45 ||
    code === 48
  ) {
    return 'moderate';
  }
  return 'none';
}

export async function getWeatherPricingFactor(
  rules: PricingRuleMap,
  input: WeatherPricingInput,
): Promise<WeatherPricingFactor> {
  if (input.latitude === null || input.longitude === null) {
    return {
      severity: 'unknown',
      multiplier: 1,
      reason: 'No coordinates available',
      weatherCode: null,
      temperatureCelsius: null,
      windSpeedMph: null,
      precipitationMm: null,
    };
  }

  const baseUrl =
    process.env.OPEN_METEO_BASE_URL ?? 'https://api.open-meteo.com/v1/forecast';
  const url = new URL(baseUrl);
  url.searchParams.set('latitude', input.latitude.toString());
  url.searchParams.set('longitude', input.longitude.toString());
  url.searchParams.set('current', 'weather_code,temperature_2m,wind_speed_10m,precipitation');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('timezone', 'Europe/London');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return weatherUnavailable();
    }
    const data = (await res.json()) as OpenMeteoResponse;
    const current = data.current ?? {};
    const code =
      typeof current.weather_code === 'number'
        ? current.weather_code
        : typeof data.current_weather?.weathercode === 'number'
          ? data.current_weather.weathercode
          : null;
    const tempC =
      typeof current.temperature_2m === 'number'
        ? current.temperature_2m
        : typeof data.current_weather?.temperature === 'number'
          ? data.current_weather.temperature
          : null;
    const rawWind =
      typeof current.wind_speed_10m === 'number'
        ? current.wind_speed_10m
        : typeof data.current_weather?.windspeed === 'number'
          ? data.current_weather.windspeed
          : null;
    const windUnit = data.current_units?.wind_speed_10m ?? 'mph';
    const windMph =
      rawWind === null
        ? null
        : windUnit === 'mph'
          ? rawWind
          : rawWind * KMH_TO_MPH;
    const precipitation =
      typeof current.precipitation === 'number' ? current.precipitation : null;

    const severeMul = getPricingRuleNumber(rules, 'weather_severe', 1.4);
    const moderateMul = getPricingRuleNumber(rules, 'weather_moderate', 1.15);

    let codeSeverity: 'severe' | 'moderate' | 'none' = 'none';
    if (code !== null) codeSeverity = classifyWeatherCode(code);

    const isSevere =
      codeSeverity === 'severe' ||
      (windMph !== null && windMph >= 45) ||
      (precipitation !== null && precipitation >= 8);

    const isModerate =
      !isSevere &&
      (codeSeverity === 'moderate' || (windMph !== null && windMph >= 25));

    if (isSevere) {
      return {
        severity: 'severe',
        multiplier: severeMul,
        reason: 'Severe weather conditions detected',
        weatherCode: code,
        temperatureCelsius: tempC,
        windSpeedMph: windMph,
        precipitationMm: precipitation,
      };
    }
    if (isModerate) {
      return {
        severity: 'moderate',
        multiplier: moderateMul,
        reason: 'Adverse weather conditions detected',
        weatherCode: code,
        temperatureCelsius: tempC,
        windSpeedMph: windMph,
        precipitationMm: precipitation,
      };
    }
    return {
      severity: 'none',
      multiplier: 1,
      reason: 'Calm conditions',
      weatherCode: code,
      temperatureCelsius: tempC,
      windSpeedMph: windMph,
      precipitationMm: precipitation,
    };
  } catch {
    clearTimeout(timer);
    return weatherUnavailable();
  }
}

function weatherUnavailable(): WeatherPricingFactor {
  return {
    severity: 'unavailable',
    multiplier: 1,
    reason: 'Weather unavailable',
    weatherCode: null,
    temperatureCelsius: null,
    windSpeedMph: null,
    precipitationMm: null,
  };
}
