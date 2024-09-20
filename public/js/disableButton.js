export function disableButton() {
  const weatherBtn = document.getElementById("getWeather");
  const btnTxt = document.getElementById("weatherBtnTxt");

  if (!weatherBtn) {
    console.error("Weather button not found!");
    return;
  }

  weatherBtn.disabled = true;
  weatherBtn.classList.add("loading");

  // Re-enable after 15 seconds and restore text
  setTimeout(() => {
    weatherBtn.disabled = false;
    if (btnTxt) {
      btnTxt.innerText = "Get Weather";
    }
    weatherBtn.classList.remove("loading");
  }, 15000);
}

window.disableButton = disableButton;
