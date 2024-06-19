// getWeather.js
export function getWeather(lat, lng) {
  console.log("Weather button clicked");

  const currentTempUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&hourly=temperature_2m&forecast_days=1&temperature_unit=fahrenheit`;

  fetch(currentTempUrl)
    .then((response) => {
      console.log(`Received response with status: ${response.status}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      if (
        data &&
        data.hourly &&
        data.hourly.temperature_2m &&
        data.hourly.temperature_2m.length > 0
      ) {
        const temp = data.hourly.temperature_2m[0];
        console.log(`Temperature: ${temp}°F`);
        document.getElementById(
          "weatherResponse"
        ).textContent = `Temperature: ${temp}°F`;
      } else {
        console.error("Weather data not available");
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
    });
}

window.getWeather = getWeather;
