const headerDateTime=document.getElementById("headerDateTime");
const headerWeather=document.getElementById("headerWeather");

const DAYS=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const MONTHS=["january","february","march","april","may","june",
              "july","august","september","october","november","december"];

function updateDateTime(){
    const now=new Date();
    const day=DAYS[now.getDay()];
    const month=MONTHS[now.getMonth()];
    const date=now.getDate();
    const year=now.getFullYear();

    const hh=String(now.getHours()).padStart(2,"0");
    const mm=String(now.getMinutes()).padStart(2,"0");
    const ss=String(now.getSeconds()).padStart(2,"0");

    headerDateTime.textContent=
        `${day} | ${month} ${date}, ${year} | ${hh}:${mm}:${ss}`;
}

updateDateTime();
setInterval(updateDateTime,1000);

async function fetchLocationAndWeather(){

    try{

        const geoRes=await fetch("https://ip-api.com/json/?fields=status,city,lat,lon");
        const geo=await geoRes.json();

        if(geo.status!=="success") throw new Error("geo failed");

        const city=(geo.city||"").toLowerCase();
        const lat=geo.lat.toFixed(4);
        const lon=geo.lon.toFixed(4);

        const weatherRes=await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m&temperature_unit=celsius&forecast_days=1`
        );
        const weather=await weatherRes.json();

        const temp=Math.round(weather.current.temperature_2m);

        headerWeather.textContent=`${temp}°C | ${city} | ${lat}, ${lon}`;

    }catch(e){

        try{
            const fallbackRes=await fetch("https://ipapi.co/json/");
            const fallback=await fallbackRes.json();

            const city=(fallback.city||"").toLowerCase();
            const lat=parseFloat(fallback.latitude).toFixed(4);
            const lon=parseFloat(fallback.longitude).toFixed(4);

            const weatherRes=await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${fallback.latitude}&longitude=${fallback.longitude}&current=temperature_2m&temperature_unit=celsius&forecast_days=1`
            );
            const weather=await weatherRes.json();
            const temp=Math.round(weather.current.temperature_2m);

            headerWeather.textContent=`${temp}°C | ${city} | ${lat}, ${lon}`;

        }catch(e2){

            headerWeather.textContent="";
        }
    }
}

fetchLocationAndWeather();
