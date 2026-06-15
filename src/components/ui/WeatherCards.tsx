import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
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

const API_KEY = '8aaf48e6cef9e5748c8db14b7468472a';

interface CityConfig {
  city: string;
  country: string;
  query: string;
}

const CITIES_POOL: CityConfig[] = [
  { city: 'Tokyo', country: 'Japan', query: 'Tokyo,JP' },
  { city: 'London', country: 'United Kingdom', query: 'London,GB' },
  { city: 'Sydney', country: 'Australia', query: 'Sydney,AU' },
  { city: 'Paris', country: 'France', query: 'Paris,FR' },
  { city: 'Mumbai', country: 'India', query: 'Mumbai,IN' },
  { city: 'Cairo', country: 'Egypt', query: 'Cairo,EG' },
  { city: 'Rio de Janeiro', country: 'Brazil', query: 'Rio de Janeiro,BR' },
  { city: 'Cape Town', country: 'South Africa', query: 'Cape Town,ZA' },
  { city: 'Reykjavik', country: 'Iceland', query: 'Reykjavik,IS' },
  { city: 'New York', country: 'United States', query: 'New York,US' },
  { city: 'Singapore', country: 'Singapore', query: 'Singapore,SG' },
  { city: 'Dubai', country: 'United Arab Emirates', query: 'Dubai,AE' },
];

const CALGARY_CONFIG: CityConfig = {
  city: 'Calgary',
  country: 'Canada',
  query: 'Calgary,CA',
};

const mapWeatherType = (id: number): WeatherData['type'] => {
  if (id >= 200 && id < 300) return 'stormy';
  if (id >= 300 && id < 600) return 'rainy';
  if (id >= 600 && id < 700) return 'snowy';
  if (id === 800) return 'sunny';
  return 'cloudy';
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

const getLocalTimeStr = (timezoneOffsetInSeconds: number): string => {
  const utcTime = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
  const localTimeOfCity = new Date(utcTime + timezoneOffsetInSeconds * 1000);
  return localTimeOfCity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function WeatherCards() {
  const [weatherCards, setWeatherCards] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize the selected cities list once to keep them stable during polling
  const [citiesToShow] = useState(() => {
    const selectedCities: CityConfig[] = [];
    const citiesCopy = [...CITIES_POOL];

    while (selectedCities.length < 3 && citiesCopy.length > 0) {
      const randomIndex = Math.floor(Math.random() * citiesCopy.length);
      selectedCities.push(citiesCopy.splice(randomIndex, 1)[0]);
    }

    return [
      CALGARY_CONFIG,
      ...selectedCities,
    ];
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const promises = citiesToShow.map(async (t) => {
          try {
            const res = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
              params: {
                q: t.query,
                appid: API_KEY,
                units: 'metric',
              },
            });
            const data = res.data;
            const timezoneVal = data.timezone ?? 0;
            return {
              city: t.city,
              country: t.country,
              temp: Math.round(data.main.temp),
              condition: data.weather[0].main,
              humidity: data.main.humidity,
              windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
              type: mapWeatherType(data.weather[0].id),
              localTime: getLocalTimeStr(timezoneVal),
            };
          } catch (apiErr) {
            console.error(`Error fetching weather for ${t.city}:`, apiErr);
            return {
              city: t.city,
              country: t.country,
              temp: 0,
              condition: '',
              humidity: 0,
              windSpeed: 0,
              type: 'cloudy' as const,
              localTime: '',
              error: true,
            };
          }
        });

        const results = await Promise.all(promises);
        setWeatherCards(results);
      } catch (err) {
        console.error('Error fetching real-time weather:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();

    // Poll for new data every 5 minutes (300000 ms)
    const intervalId = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [citiesToShow]);

  if (loading || weatherCards.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {citiesToShow.map((c, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl bg-white p-5 border border-slate-100 shadow-sm animate-pulse"
          >
            {/* Weather Icon Placeholder */}
            <div className="absolute right-4 top-4 w-7 h-7 bg-slate-100 rounded-full" />

            <div className="flex flex-col h-full justify-between">
              <div>
                {/* Location placeholders */}
                <div className="h-3 w-14 bg-slate-200 rounded mb-1" />
                <div className="h-2 w-20 bg-slate-100 rounded mb-3" />

                {/* Temperature & Condition placeholders */}
                <div className="flex items-baseline gap-1.5 mt-2">
                  <div className="h-7 w-12 bg-slate-200 rounded" />
                  <div className="h-3.5 w-10 bg-slate-200 rounded" />
                </div>
              </div>

              {/* Additional details & Local Time placeholders */}
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/60">
                <div className="flex items-center gap-2.5">
                  <div className="h-3.5 w-8 bg-slate-100 rounded" />
                  <div className="h-3.5 w-12 bg-slate-100 rounded" />
                </div>
                <div className="h-2.5 w-16 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {weatherCards.map((w, idx) => (
        <div
          key={idx}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br bg-white p-5 border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${w.error ? 'from-rose-50/30 to-slate-50/50 border-rose-100 hover:border-rose-200' : getBgGradient(w.type)}`}
        >
          {w.error ? (
            <div className="flex flex-col h-full justify-between">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 tracking-wider uppercase leading-none mb-0.5">
                  {w.city}
                </h4>
                <p className="text-[10px] text-gray-400 leading-none mb-2">
                  {w.country}
                </p>
                <div className="text-xs font-medium text-rose-500 mt-2.5">
                  Weather unavailable
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-[9px] text-slate-400 font-light italic border-t border-slate-100/60 pt-2 mt-3" title="Could not retrieve weather data">
                <Clock size={10} className="text-slate-350" />
                failed to load
              </div>
            </div>
          ) : (
            <>
              {/* Weather Icon (Decorative/Top-Right) */}
              <div className="absolute right-4 top-4">
                {getWeatherIcon(w.type, 'transition-transform duration-500 hover:scale-110')}
              </div>

              <div className="flex flex-col h-full justify-between">
                <div>
                  {/* Location */}
                  <h4 className="text-xs font-semibold text-gray-400 tracking-wider uppercase leading-none mb-0.5">
                    {w.city}
                  </h4>
                  <p className="text-[10px] text-gray-400 leading-none mb-2">
                    {w.country}
                  </p>

                  {/* Temperature & Condition */}
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-bold tracking-tight text-slate-800">
                      {w.temp}°C
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {w.condition}
                    </span>
                  </div>
                </div>

                {/* Additional details & Local Time */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100/60 text-[10px] text-slate-500">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-0.5" title="Humidity">
                      <Droplets size={12} className="text-slate-400" />
                      {w.humidity}%
                    </span>
                    <span className="flex items-center gap-0.5" title="Wind Speed">
                      <Wind size={12} className="text-slate-400" />
                      {w.windSpeed} km/h
                    </span>
                  </div>
                  <span className="flex items-center gap-0.5 text-[9px] text-slate-400 font-light italic" title={`Local time in ${w.city} when fetched`}>
                    <Clock size={10} className="text-slate-350" />
                    last update: {w.localTime}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
