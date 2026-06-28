const headerDateTime = document.getElementById("headerDateTime");
const headerWeather = document.getElementById("headerWeather");

const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const MONTHS = ["january","february","march","april","may","june",
                "july","august","september","october","november","december"];

function updateDateTime() {
    const now = new Date();
    const day = DAYS[now.getDay()];
    const month = MONTHS[now.getMonth()];
    const date = now.getDate();
    const year = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    headerDateTime.textContent = `${day} | ${month} ${date}, ${year} | ${hh}:${mm}:${ss}`;
}

updateDateTime();
setInterval(updateDateTime, 1000);

async function reverseGeocode(lat, lon) {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const addr = data.address;

    // Goes from most specific → least specific
    const city =
        addr.suburb           ||
        addr.city_district    ||
        addr.neighbourhood    ||
        addr.town             ||
        addr.city             ||
        addr.county           ||
        "unknown";

    return city.toLowerCase();
}

async function fetchWeatherForCoords(lat, lon) {
    const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=celsius&forecast_days=1`
    );
    const data = await res.json();
    return Math.round(data.current.temperature_2m);
}

async function fetchLocationAndWeather() {
    try {
        const geoRes = await fetch("https://ip-api.com/json/?fields=status,lat,lon");
        const geo = await geoRes.json();
        if (geo.status !== "success") throw new Error("primary geo failed");

        const lat = geo.lat;
        const lon = geo.lon;

        const [city, temp] = await Promise.all([
            reverseGeocode(lat, lon),
            fetchWeatherForCoords(lat, lon)
        ]);

        headerWeather.textContent = `${temp}°C | ${city} | ${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    } catch (e) {
        try {
            const fallbackRes = await fetch("https://ipapi.co/json/");
            const fallback = await fallbackRes.json();

            const lat = parseFloat(fallback.latitude);
            const lon = parseFloat(fallback.longitude);

            const [city, temp] = await Promise.all([
                reverseGeocode(lat, lon),
                fetchWeatherForCoords(lat, lon)
            ]);

            headerWeather.textContent = `${temp}°C | ${city} | ${lat.toFixed(4)}, ${lon.toFixed(4)}`;

        } catch (e2) {
            headerWeather.textContent = "";
        }
    }
}

fetchLocationAndWeather();
