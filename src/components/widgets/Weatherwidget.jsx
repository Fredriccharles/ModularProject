// WeatherWidget.jsx
// Uses open-meteo.com (free, no API key, CORS-friendly)
// + nominatim.openstreetmap.org for geocoding (also free, no key)

import { useEffect, useState, useCallback } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

// WMO weather code → description + emoji
const WMO = {
  0:  ["Clear sky",       "☀️"],
  1:  ["Mainly clear",    "🌤️"],
  2:  ["Partly cloudy",   "⛅"],
  3:  ["Overcast",        "☁️"],
  45: ["Foggy",           "🌫️"],
  48: ["Depositing rime", "🌫️"],
  51: ["Light drizzle",   "🌦️"],
  53: ["Drizzle",         "🌦️"],
  55: ["Dense drizzle",   "🌧️"],
  61: ["Slight rain",     "🌧️"],
  63: ["Moderate rain",   "🌧️"],
  65: ["Heavy rain",      "🌧️"],
  71: ["Slight snow",     "🌨️"],
  73: ["Moderate snow",   "❄️"],
  75: ["Heavy snow",      "❄️"],
  77: ["Snow grains",     "❄️"],
  80: ["Slight showers",  "🌦️"],
  81: ["Moderate showers","🌧️"],
  82: ["Violent showers", "⛈️"],
  85: ["Snow showers",    "🌨️"],
  86: ["Heavy snow showers","❄️"],
  95: ["Thunderstorm",    "⛈️"],
  96: ["Thunderstorm + hail","⛈️"],
  99: ["Thunderstorm + heavy hail","⛈️"],
};

function getWMO(code) {
  return WMO[code] ?? ["Unknown", "🌡️"];
}

export default function WeatherWidget({
  data, updateWidget, deleteWidget,
  isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets,
}) {
  const color = getColor(data.colorId);

  const [weather,    setWeather]    = useState(null);   // fetched result
  const [unit,       setUnit]       = useState(data.unit || "C");
  const [cityInput,  setCityInput]  = useState(data.savedCity || "");
  const [searching,  setSearching]  = useState(!data.savedCity); // show input if no city saved
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  // ── Auto-load saved city on mount ────────────────────────────────────
  useEffect(() => {
    if (data.savedCity && data.savedLat != null) {
      fetchWeatherByCoords(data.savedLat, data.savedLon, data.savedCity, data.savedCountry);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Geocode → coords → weather ────────────────────────────────────────
  async function searchCity(e) {
    e?.preventDefault();
    const q = cityInput.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    try {
      // Nominatim geocoding — completely free, no key, CORS-open
      const geoResp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const geoData = await geoResp.json();
      if (!geoData.length) throw new Error(`City "${q}" not found. Try a different name.`);

      const { lat, lon, display_name } = geoData[0];
      // Parse city and country from display_name (format: "City, Region, Country")
      const parts   = display_name.split(",");
      const city    = parts[0].trim();
      const country = parts[parts.length - 1].trim();

      await fetchWeatherByCoords(parseFloat(lat), parseFloat(lon), city, country);

      // Persist for next session
      updateWidget(data.id, {
        savedCity: city, savedCountry: country,
        savedLat: parseFloat(lat), savedLon: parseFloat(lon),
        unit,
      });
      setSearching(false);
    } catch (err) {
      setError(err.message || "Failed to geocode city.");
      setLoading(false);
    }
  }

  async function fetchWeatherByCoords(lat, lon, city, country) {
    setLoading(true);
    setError("");
    try {
      // Open-Meteo — free, no key, CORS-open
      const resp = await fetch(
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m` +
        `&temperature_unit=celsius&windspeed_unit=kmh&timezone=auto`
      );
      if (!resp.ok) throw new Error(`Weather API error: ${resp.status}`);
      const json = await resp.json();
      const cur  = json.current;

      setWeather({
        city, country,
        tempC:      cur.temperature_2m,
        feelsLikeC: cur.apparent_temperature,
        code:       cur.weathercode,
        wind:       Math.round(cur.windspeed_10m),
        humidity:   cur.relativehumidity_2m,
      });
    } catch (err) {
      setError(err.message || "Could not fetch weather.");
    }
    setLoading(false);
  }

  function toggleUnit() {
    const next = unit === "C" ? "F" : "C";
    setUnit(next);
    updateWidget(data.id, { unit: next });
  }

  function temp(c) {
    if (unit === "F") return `${Math.round(c * 9 / 5 + 32)}°F`;
    return `${Math.round(c)}°C`;
  }

  const [desc, icon] = weather ? getWMO(weather.code) : ["", ""];

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Weather" minWidth={220} minHeight={190}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ flex: 1, display: "flex", flexDirection: "column", padding: "14px", gap: "10px" }}
      >
        {/* ── City search ── */}
        {searching ? (
          <form onSubmit={searchCity} style={{ display: "flex", gap: "6px" }}>
            <input
              autoFocus
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Enter city name…"
              style={{
                flex: 1, background: "#ffffff0d",
                border: `1px solid ${color.border}`, borderRadius: "8px",
                padding: "7px 10px", color: "#ddd", fontSize: "12px",
                outline: "none", fontFamily: "inherit", caretColor: color.accent,
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = color.accent + "99"}
              onBlur={(e)  => e.currentTarget.style.borderColor = color.border}
            />
            <button type="submit" style={{
              background: color.accent, border: "none", borderRadius: "8px",
              color: "#fff", padding: "7px 14px", fontSize: "12px",
              fontWeight: 700, cursor: "pointer", flexShrink: 0,
            }}>Go</button>
          </form>
        ) : (
          /* City header row */
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#888", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {weather?.city}, {weather?.country}
            </span>
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
              <button onClick={toggleUnit} style={smBtn}>°{unit === "C" ? "F" : "C"}</button>
              <button onClick={() => setSearching(true)} style={smBtn} title="Change city">✎</button>
            </div>
          </div>
        )}

        {/* ── Status ── */}
        {loading && <p style={{ fontSize: "12px", color: "#555", textAlign: "center", margin: 0 }}>Fetching weather…</p>}
        {error   && (
          <div style={{ fontSize: "11px", color: "#f43f5e", background: "#f43f5e11", borderRadius: "6px", padding: "8px 10px" }}>
            ⚠ {error}
          </div>
        )}

        {/* ── Weather display ── */}
        {weather && !loading && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "48px", lineHeight: 1, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: "34px", fontWeight: 800, color: color.accent, lineHeight: 1 }}>
                  {temp(weather.tempC)}
                </div>
                <div style={{ fontSize: "11px", color: "#666", marginTop: "3px" }}>
                  Feels like {temp(weather.feelsLikeC)} · {desc}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <StatBox label="Wind"     value={`${weather.wind} km/h`} color={color} />
              <StatBox label="Humidity" value={`${weather.humidity}%`}  color={color} />
            </div>
          </>
        )}
      </div>
    </WidgetShell>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: "#ffffff07",
      border: `1px solid ${color.border}`,
      borderRadius: "8px", padding: "6px 8px",
    }}>
      <div style={{ fontSize: "9px", color: "#555", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "13px", color: "#bbb", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const smBtn = {
  background: "transparent", border: "1px solid #2a2a2a",
  borderRadius: "5px", color: "#555", fontSize: "10px",
  padding: "2px 7px", cursor: "pointer", fontFamily: "inherit",
};