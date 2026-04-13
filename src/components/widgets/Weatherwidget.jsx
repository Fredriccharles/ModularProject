import { useEffect, useState } from "react";
import { WidgetShell } from "./Widgetshell.jsx";
import { getColor } from "./widgetColors.jsx";

const CONDITIONS = {
  0:  { label: "Clear",        icon: "☀️" },
  1:  { label: "Mainly Clear", icon: "🌤" },
  2:  { label: "Partly Cloudy",icon: "⛅" },
  3:  { label: "Overcast",     icon: "☁️" },
  45: { label: "Foggy",        icon: "🌫" },
  48: { label: "Icy Fog",      icon: "🌫" },
  51: { label: "Light Drizzle",icon: "🌦" },
  61: { label: "Light Rain",   icon: "🌧" },
  63: { label: "Rain",         icon: "🌧" },
  65: { label: "Heavy Rain",   icon: "🌧" },
  71: { label: "Light Snow",   icon: "🌨" },
  73: { label: "Snow",         icon: "❄️" },
  80: { label: "Showers",      icon: "🌦" },
  95: { label: "Thunderstorm", icon: "⛈" },
};

function getCondition(code) {
  return CONDITIONS[code] ?? { label: "Unknown", icon: "🌡" };
}

export default function WeatherWidget({ data, updateWidget, deleteWidget, isSelected, onSelect, selectedIds, allWidgets, updateAllWidgets }) {
  const color = getColor(data.colorId);
  const [weather,   setWeather]   = useState(null);
  const [city,      setCity]      = useState(data.city || "");
  const [editCity,  setEditCity]  = useState(!data.city);
  const [cityInput, setCityInput] = useState(data.city || "");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [unit,      setUnit]      = useState(data.unit || "C"); // C or F

  // Fetch on mount if city stored
  useEffect(() => {
    if (data.city) fetchWeather(data.city);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchWeather(cityName) {
    setLoading(true);
    setError("");
    try {
      // 1. Geocode
      const geoRes  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results?.length) throw new Error("City not found");
      const { latitude, longitude, name, country } = geoData.results[0];

      // 2. Weather
      const wRes  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&temperature_unit=celsius`);
      const wData = await wRes.json();
      const cur   = wData.current;

      setWeather({
        tempC:    cur.temperature_2m,
        code:     cur.weathercode,
        wind:     cur.windspeed_10m,
        humidity: cur.relativehumidity_2m,
        city:     name,
        country,
      });
      setCity(cityName);
      updateWidget(data.id, { city: cityName, unit });
      setEditCity(false);
    } catch (err) {
      setError(err.message || "Failed to fetch");
    }
    setLoading(false);
  }

  function handleSearch(e) {
    e.preventDefault();
    if (cityInput.trim()) fetchWeather(cityInput.trim());
  }

  function toggleUnit() {
    const next = unit === "C" ? "F" : "C";
    setUnit(next);
    updateWidget(data.id, { unit: next });
  }

  function displayTemp(c) {
    if (unit === "F") return `${Math.round(c * 9 / 5 + 32)}°F`;
    return `${Math.round(c)}°C`;
  }

  const cond = weather ? getCondition(weather.code) : null;

  return (
    <WidgetShell
      data={data} updateWidget={updateWidget} deleteWidget={deleteWidget}
      label="Weather" minWidth={200} minHeight={180}
      isSelected={isSelected} onSelect={onSelect}
      selectedIds={selectedIds} allWidgets={allWidgets} updateAllWidgets={updateAllWidgets}
    >
      <div onMouseDown={(e) => e.stopPropagation()} style={{
        flex: 1, display: "flex", flexDirection: "column",
        padding: "14px", gap: "10px", fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* City search */}
        {editCity ? (
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "6px" }}>
            <input
              autoFocus
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Enter city..."
              style={{
                flex: 1, background: "#ffffff0d",
                border: `1px solid ${color.border}`, borderRadius: "8px",
                padding: "6px 10px", color: "#ddd", fontSize: "12px",
                outline: "none", fontFamily: "inherit", caretColor: color.accent,
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = color.accent + "88"}
              onBlur={(e)  => e.currentTarget.style.borderColor = color.border}
            />
            <button type="submit" style={{
              background: color.accent, border: "none", borderRadius: "8px",
              color: "#fff", padding: "6px 12px", fontSize: "12px",
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>Go</button>
          </form>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#888", fontWeight: 500 }}>
              {weather?.city}, {weather?.country}
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={toggleUnit} style={{
                background: "transparent", border: `1px solid ${color.border}`,
                borderRadius: "5px", color: "#666", fontSize: "10px",
                padding: "2px 6px", cursor: "pointer", fontFamily: "inherit",
              }}>°{unit === "C" ? "F" : "C"}</button>
              <button onClick={() => setEditCity(true)} style={{
                background: "transparent", border: "none",
                color: "#444", fontSize: "12px", cursor: "pointer",
              }}>✎</button>
            </div>
          </div>
        )}

        {/* Loading / error */}
        {loading && <div style={{ fontSize: "12px", color: "#555", textAlign: "center" }}>Fetching…</div>}
        {error   && <div style={{ fontSize: "11px", color: "#f43f5e", textAlign: "center" }}>{error}</div>}

        {/* Weather display */}
        {weather && !loading && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "44px", lineHeight: 1 }}>{cond.icon}</span>
              <div>
                <div style={{ fontSize: "32px", fontWeight: 700, color: color.accent, lineHeight: 1 }}>
                  {displayTemp(weather.tempC)}
                </div>
                <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                  {cond.label}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <Stat label="Wind"     value={`${weather.wind} km/h`} color={color} />
              <Stat label="Humidity" value={`${weather.humidity}%`}  color={color} />
            </div>
          </>
        )}

        {!weather && !loading && !editCity && (
          <div style={{ fontSize: "11px", color: "#333", textAlign: "center", marginTop: "8px" }}>
            No data — search for a city
          </div>
        )}
      </div>
    </WidgetShell>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: "#ffffff06", border: `1px solid ${color.border}`, borderRadius: "8px", padding: "6px 8px" }}>
      <div style={{ fontSize: "9px", color: "#555", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>{label}</div>
      <div style={{ fontSize: "13px", color: "#aaa", fontWeight: 600 }}>{value}</div>
    </div>
  );
}