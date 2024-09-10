export function disableButton() {
  var button = document.getElementById("getWeather");
  let btnTxt = document.getElementById("weatherBtnTxt");
  button.disabled = true;
  button.innerText = "Please wait";
  setTimeout(function () {
    button.disabled = false;
    button.innerText = "Get Weather";
  }, 15000);
}
// window.disableButton = disableButton;
