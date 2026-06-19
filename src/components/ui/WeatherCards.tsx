import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  CloudSun,
  Wind,
  Droplets,
  Clock,
} from 'lucide-react';

interface WeatherData {
  city: string;
  country: string;
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  type: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';
  localTime: string;
  error?: boolean;
}
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  Tooltip,
} from 'recharts';


const API_KEY = '8aaf48e6cef9e5748c8db14b7468472a';

// The exact custom color palette parameter string from your reference image
const CUSTOM_PALETTE = '-65:821692;-55:821692;-45:821692;-40:821692;-30:8257db;-20:208cec;-10:20c4e8;0:23dddd;10:c2ff28;20:fff028;25:ffc228;30:fc8014';

const getConditionIcon = (id: number, windSpeed: number) => {
  if (id >= 200 && id < 300) return <CloudLightning size={18} className="text-purple-500" />;
  if (id >= 300 && id < 400) return <CloudDrizzle size={18} className="text-blue-400" />;
  if (id >= 500 && id < 600) return <CloudRain size={18} className="text-blue-500" />;
  if (id >= 600 && id < 700) return <CloudSnow size={18} className="text-sky-300" />;
  if (id >= 700 && id < 800) return <CloudFog size={18} className="text-slate-400" />;
  if (id === 800) return windSpeed > 8
    ? <Wind size={18} className="text-slate-500" />
    : <Sun size={18} className="text-amber-400" />;
  if (id === 801) return <CloudSun size={18} className="text-amber-400" />;
  return <Cloud size={18} className="text-slate-400" />;
};

const getWeatherIcon = (type: WeatherData['type'], className: string) => {
  switch (type) {
    case 'sunny':
      return <Sun className={`${className} text-amber-500 animate-spin-slow`} size={28} />;
    case 'rainy':
      return <CloudRain className={`${className} text-blue-500`} size={28} />;
    case 'snowy':
      return <CloudSnow className={`${className} text-sky-300`} size={28} />;
    case 'stormy':
      return <CloudLightning className={`${className} text-purple-500`} size={28} />;
    case 'cloudy':
    default:
      return <Cloud className={`${className} text-slate-400`} size={28} />;
  }
};

const getBgGradient = (type: WeatherData['type']) => {
  switch (type) {
    case 'sunny':
      return 'from-amber-50/50 to-orange-50/50 border-amber-200/60 hover:border-amber-300';
    case 'rainy':
      return 'from-blue-50/50 to-indigo-50/50 border-blue-200/60 hover:border-blue-300';
    case 'snowy':
      return 'from-sky-50/50 to-slate-50/50 border-sky-200/60 hover:border-sky-300';
    case 'stormy':
      return 'from-purple-50/50 to-indigo-50/50 border-purple-200/60 hover:border-purple-300';
    case 'cloudy':
    default:
      return 'from-slate-50/50 to-zinc-50/50 border-slate-200/60 hover:border-slate-300';
  }
};

const mapWeatherType = (id: number): WeatherData['type'] => {
  if (id >= 200 && id < 300) return 'stormy';
  if (id >= 300 && id < 600) return 'rainy';
  if (id >= 600 && id < 700) return 'snowy';
  if (id === 800) return 'sunny';
  return 'cloudy';
};

export default function WeatherCards() {
  const [weather, setWeather] = useState<any>(null);
  const [airQuality, setAirQuality] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const weatherType: WeatherData['type'] = weather?.weather?.[0]?.id
    ? mapWeatherType(weather.weather[0].id)
    : 'cloudy';

  useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        const weatherRes = await axios.get(
          'https://api.openweathermap.org/data/2.5/weather',
          {
            params: {
              q: 'Calgary,CA',
              appid: API_KEY,
              units: 'metric',
            },
          }
        );

        const weatherData = weatherRes.data;
        setWeather(weatherData);

        const lat = weatherData.coord.lat;
        const lon = weatherData.coord.lon;

        // Fetching air quality data alongside standard forecast parameters
        const [airRes, forecastRes] = await Promise.all([
          axios.get(
            'https://api.openweathermap.org/data/2.5/air_pollution',
            { params: { lat, lon, appid: API_KEY } }
          ),
          axios.get(
            'https://api.openweathermap.org/data/2.5/forecast',
            { params: { lat, lon, appid: API_KEY, units: 'metric' } }
          ),
        ]);

        // FIXED HERE: Destructured target item array mapping matching documentation payload schema
        if (airRes.data && airRes.data.list && airRes.data.list.length > 0) {
          setAirQuality(airRes.data.list[0]);
        }

        if (forecastRes.data && forecastRes.data.list) {
          // Slice the first 8 items representing the next 24 hours in 3-hour intervals
          setForecast(forecastRes.data.list.slice(0, 8));
        }
      } catch (err) {
        console.error("Error retrieving air quality data parameters:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl bg-white p-5 border border-slate-100 shadow-sm animate-pulse h-[250px]"
          >
            <div className="absolute right-4 top-4 w-7 h-7 bg-slate-100 rounded-full" />
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
                <div className="h-7 w-16 bg-slate-200 rounded mb-4" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-100 rounded" />
                <div className="h-3 w-5/6 bg-slate-100 rounded" />
                <div className="h-3 w-4/5 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const forecastChartData = forecast.map((item) => {
    const timezoneOffset = weather?.timezone ?? 0;
    const date = new Date((item.dt + timezoneOffset) * 1000);
    const hours = date.getUTCHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return {
      time: `${displayHours} ${ampm}`,
      temp: Math.round(item.main.temp),
    };
  });

  const getTempColor = (temp: number): string => {
  if (temp <= -20) return '#8B5CF6'; // extreme cold — purple
  if (temp <= -10) return '#3B82F6'; // very cold   — blue
  if (temp <= 0)   return '#06B6D4'; // cold        — cyan
  if (temp <= 10)  return '#10B981'; // cool/mild   — green
  if (temp <= 20)  return '#EAB308'; // warm        — yellow
  if (temp <= 28)  return '#F97316'; // hot         — orange
  return '#EF4444';                  // very hot    — red (rare in Calgary)
};

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">

      {/* 3. Current Weather Card */}
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br bg-white p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${getBgGradient(weatherType)}`}>
        <div className="absolute right-4 top-4">
          {getWeatherIcon(weatherType, 'transition-transform duration-500 hover:scale-110')}
        </div>

        <div className="flex flex-col h-full justify-between">
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 tracking-[0.08em] uppercase leading-none mb-1">
              Calgary Weather
            </h4>
            <p className="text-xs text-slate-400 leading-none mb-3">Canada</p>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                {Math.round(weather?.main?.temp ?? 0)}°
              </span>
              <span className="text-sm font-medium text-slate-500">
                {weather?.weather?.[0]?.main}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-2">
            <div className="flex items-center justify-between">
              <span>Feels like</span>
              <span className="font-semibold text-slate-700 tabular-nums">{Math.round(weather?.main?.feels_like ?? 0)}°C</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Droplets size={13} className="text-slate-400" /> Humidity</span>
              <span className="font-semibold text-slate-700 tabular-nums">{weather?.main?.humidity ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Wind size={13} className="text-slate-400" /> Wind</span>
              <span className="font-semibold text-slate-700 tabular-nums">{Math.round((weather?.wind?.speed ?? 0) * 3.6)} km/h</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pressure</span>
              <span className="font-semibold text-slate-700 tabular-nums">{weather?.main?.pressure ?? 0} hPa</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1. OpenWeather TA2 Calgary Heat Map Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br bg-white border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 from-slate-50/50 to-zinc-50/50 border-slate-200/60 hover:border-slate-300">
        <div className="p-4 border-b border-slate-100/80 flex justify-between items-center">
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 tracking-[0.08em] uppercase leading-none">
              Calgary Heat Map
            </h4>
            <p className="text-xs text-slate-400 leading-none mt-1">Air Temp (2m) · TA2 Layer</p>
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
        </div>

        <div className="w-full h-[180px] bg-slate-50 relative">
          <iframe
            title="Calgary OpenWeather Map"
            srcDoc={`
        <!DOCTYPE html>
        <html>
        <head>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100vw; height: 180px; }
            .leaflet-control-attribution { display: none !important; }
            .weather-layer-multiply {
  mix-blend-mode: multiply;
  filter: saturate(1.8) contrast(1.3) brightness(1.05);
}
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = L.map('map', {
              center: [51.0501, -114.0853],
              zoom: 9, 
              zoomControl: false,
              attributionControl: false
            });

            // Base tile layer
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

            // Weather tile layer with custom class attached
            const weatherLayer = L.tileLayer('https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}', {
              maxZoom: 18,
              className: 'weather-layer-multiply'
            }).addTo(map);
          </script>
        </body>
        </html>
      `}
            className="w-full h-[180px] border-none block"
            sandbox="allow-scripts"
          />
          {/* Palette visual reference legend bar */}
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded text-[8px] font-medium text-slate-500 border border-slate-200 flex items-center gap-1 z-10 pointer-events-none">
            <div className="w-16 h-1.5 bg-gradient-to-r from-[#208cec] via-[#23dddd] via-[#c2ff28] to-[#fc8014] rounded-xs" />
            Temp Palette
          </div>
        </div>
      </div>

      {/* 2. Air Quality Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br bg-white p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 from-purple-50/50 to-indigo-50/50 border-purple-200/60 hover:border-purple-300">
        <div className="flex flex-col h-full justify-between">
          <div>
            <h4 className="text-[11px] font-bold text-slate-500 tracking-[0.08em] uppercase leading-none mb-1">
              Air Quality
            </h4>
            <p className="text-xs text-slate-400 leading-none mb-3">Calgary, CA</p>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                {airQuality?.main?.aqi ?? '–'}
              </span>
              <span className="text-sm font-medium text-slate-500">AQI Index</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>PM2.5</span>
              <span className="font-semibold text-slate-700 tabular-nums">{Math.round(airQuality?.components?.pm2_5 ?? 0)} µg/m³</span>
            </div>
            <div className="flex justify-between">
              <span>PM10</span>
              <span className="font-semibold text-slate-700 tabular-nums">{Math.round(airQuality?.components?.pm10 ?? 0)} µg/m³</span>
            </div>
            <div className="flex justify-between">
              <span>O₃</span>
              <span className="font-semibold text-slate-700 tabular-nums">{Math.round(airQuality?.components?.o3 ?? 0)} µg/m³</span>
            </div>
            <div className="flex justify-between">
              <span>NO₂</span>
              <span className="font-semibold text-slate-700 tabular-nums">{Math.round(airQuality?.components?.no2 ?? 0)} µg/m³</span>
            </div>
          </div>
        </div>
      </div>



      {/* 4. Forecast Card */}
<div className="relative overflow-hidden rounded-xl bg-gradient-to-br bg-white p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 from-blue-50/50 to-indigo-50/50 border-blue-200/60 hover:border-blue-300">
  <div className="flex flex-col h-full">
    <h4 className="text-[11px] font-bold text-slate-500 tracking-[0.08em] uppercase leading-none mb-1">
      Next 24 Hours
    </h4>
    <p className="text-xs text-slate-400 leading-none mb-3">3-hour intervals</p>

    <div
      className="overflow-x-auto -mx-1 px-1 pb-1"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {(() => {
        const slotW = 46;
        const slotGap = 4;
        const totalW = forecast.length * slotW + (forecast.length - 1) * slotGap;
        const firstColor = getTempColor(forecastChartData[0]?.temp ?? 10);

        return (
          <div style={{ width: totalW }}>
            <AreaChart
              width={totalW}
              height={70}
              data={forecastChartData}
              margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                {/* Horizontal gradient — colors by time position, each stop = one data point */}
                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                  {forecastChartData.map((point, i) => (
                    <stop
                      key={i}
                      offset={`${(i / Math.max(forecastChartData.length - 1, 1)) * 100}%`}
                      stopColor={getTempColor(point.temp)}
                    />
                  ))}
                </linearGradient>
                {/* Fill fades from first point's temp color downward */}
                <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={firstColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={firstColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.time ?? ''}
                formatter={(value) => [`${value}°C`, 'Temperature']}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '11px',
                  padding: '6px 10px',
                }}
                itemStyle={{ color: '#475569' }}
                labelStyle={{ color: '#94a3b8', marginBottom: '2px', fontSize: '10px' }}
              />
              <Area
                type="monotone"
                dataKey="temp"
                stroke="url(#strokeGradient)"
                strokeWidth={2}
                fill="url(#fillGradient)"
                dot={false}
                activeDot={{ r: 3 }}
              />
            </AreaChart>

            <div className="border-t border-slate-100 my-2" />

            <div className="flex" style={{ gap: slotGap }}>
              {forecast.map((item: any) => {
                const id = item.weather?.[0]?.id ?? 800;
                const icon = getConditionIcon(id, item.wind?.speed ?? 0);
                const tempColor = getTempColor(Math.round(item.main.temp));
                const timezoneOffset = weather?.timezone ?? 0;
                const date = new Date((item.dt + timezoneOffset) * 1000);
                const hours = date.getUTCHours();
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours % 12 || 12;
                return (
                  <div
                    key={item.dt}
                    className="flex flex-col items-center gap-1.5 rounded-xl py-2"
                    style={{ width: slotW, minWidth: slotW }}
                  >
                    <span className="text-[10px] font-semibold tabular-nums text-slate-400">
                      {displayHours} {ampm}
                    </span>
                    <span className="flex items-center justify-center h-5">{icon}</span>
                    {/* Temp number tinted with the same scale as the graph line */}
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{ color: tempColor }}
                    >
                      {Math.round(item.main.temp)}°
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  </div>
</div>

    </div>
  );
}