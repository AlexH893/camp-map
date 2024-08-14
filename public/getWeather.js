import { disableButton } from "./disableButton.js";

export function getWeather(lat, lng) {
  console.log("Weather button clicked");
  disableButton();
  const currentTempUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,cloud_cover&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FChicago&forecast_days=1`;
  fetch(currentTempUrl)
    .then((response) => {
      console.log(`Received response with status: ${response.status}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      console.log(data); // Log the data to verify structure
      if (data.current) {
        const temp = data.current.temperature_2m;
        const precipitation = data.current.precipitation;
        const cloud_cover = data.current.cloud_cover;
        console.log(`Temperature: ${temp}°F`);
        console.log(`Precipitation: ${precipitation} inches`);
        console.log(`Cloud Cover: ${cloud_cover} %`);

        document.getElementById(
          "weatherResponse"
        ).innerHTML = `Temperature: ${temp}°F<br>Precipitation: ${precipitation} inches<br> Cloud Cover: ${cloud_cover}%`;
      } else {
        console.error("Weather data not available");
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
    });
}

window.getWeather = getWeather;
