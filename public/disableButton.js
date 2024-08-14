export function disableButton() {
  var button = document.getElementById("getWeather");
  let btnTxt = document.getElementById("weatherBtnTxt");
  button.disabled = true;
  btnTxt.innerText = "Please wait";
  setTimeout(function () {
    button.disabled = false;
    btnTxt.innerText = "Get Weather";
  }, 15000);
}
// window.disableButton = disableButton;
