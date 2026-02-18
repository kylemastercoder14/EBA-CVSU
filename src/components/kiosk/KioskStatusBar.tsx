"use client";

import { CloudSun, Snowflake, Sun, Thermometer } from "lucide-react";
import { useEffect, useState } from "react";

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=14.40371135167912&longitude=120.86601148290488&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FManila&forecast_days=1";

const weatherLabel = (code: number) => {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain Showers";
  if ([85, 86].includes(code)) return "Snow Showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Weather";
};

type WeatherData = {
  currentTemp: number;
  tempMax: number;
  tempMin: number;
  label: string;
};

const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");
  const h = time.getHours() % 12 || 12;
  const m = pad(time.getMinutes());
  const s = pad(time.getSeconds());
  const ampm = time.getHours() >= 12 ? "PM" : "AM";
  const date = time.toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="text-center text-white/90">
      <p className="font-serif text-3xl font-bold leading-none tracking-wide">
        {h}:{m}:{s} <span className="text-2xl">{ampm}</span>
      </p>
      <p className="mt-0.5 font-serif text-xs uppercase tracking-[0.18em] opacity-60">
        {date}
      </p>
    </div>
  );
};

const KioskStatusBar = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const currentTemp = weather?.currentTemp ?? null;

  useEffect(() => {
    const setNetworkState = () => setIsOnline(navigator.onLine);
    setNetworkState();
    window.addEventListener("online", setNetworkState);
    window.addEventListener("offline", setNetworkState);
    return () => {
      window.removeEventListener("online", setNetworkState);
      window.removeEventListener("offline", setNetworkState);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchWeather = async () => {
      try {
        const response = await fetch(WEATHER_URL, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;

        setWeather({
          currentTemp: Math.round(data.current.temperature_2m),
          tempMax: Math.round(data.daily.temperature_2m_max[0]),
          tempMin: Math.round(data.daily.temperature_2m_min[0]),
          label: weatherLabel(data.current.weather_code),
        });
      } catch {
        // Silently keep fallback text if weather service is unavailable.
      }
    };

    fetchWeather();
    const refresh = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(refresh);
    };
  }, []);

  return (
    <header className="relative z-10 flex w-full items-center justify-between border-b border-white/10 bg-black/70 px-8 py-4 backdrop-blur-md animate-[fadeUp_0.6s_ease_both]">
      <div className="flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${
            isOnline
              ? "bg-emerald-400 shadow-[0_0_8px_#4ade80]"
              : "bg-rose-400 shadow-[0_0_8px_#fb7185]"
          }`}
        />
        <span className="font-serif text-xs uppercase tracking-[0.2em] text-white/60">
          {isOnline ? "System Online" : "Offline Mode"}
        </span>
      </div>

      <LiveClock />

      <div className="flex items-center gap-2 text-right font-serif text-xs uppercase tracking-[0.12em] text-white/55">
        {currentTemp === null && (
          <Thermometer className="size-4.5 text-white/80" aria-hidden="true" />
        )}
        {currentTemp !== null && currentTemp <= 22 && (
          <Snowflake className="size-4.5 text-white/80" aria-hidden="true" />
        )}
        {currentTemp !== null && currentTemp > 22 && currentTemp <= 31 && (
          <CloudSun className="size-4.5 text-white/80" aria-hidden="true" />
        )}
        {currentTemp !== null && currentTemp > 31 && (
          <Sun className="size-4.5 text-white/80" aria-hidden="true" />
        )}
        {weather ? (
          <div>
            <p className="font-bold tracking-[0.16em] text-white/75">
              {weather.currentTemp}°C {weather.label}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-bold tracking-[0.16em] text-white/75">
              Loading Weather
            </p>
          </div>
        )}
      </div>
    </header>
  );
};

export default KioskStatusBar;
