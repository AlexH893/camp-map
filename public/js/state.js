export let inSelectionMode = false;

export function setInSelectionMode(value) {
  inSelectionMode = value;
  toggleButtonState();
}

export function getInSelectionMode() {
  return inSelectionMode;
}

export function toggleButtonState() {
  let addMarkerButton = document.getElementById("addMarkerButton");
  if (inSelectionMode) {
    // console.log("Disabling add marker btn");
    addMarkerButton.disabled = true;
  } else {
    // console.log("Enabling add marker btn");
    addMarkerButton.disabled = false;
  }
}

window.setInSelectionMode = setInSelectionMode;
window.getInSelectionMode = getInSelectionMode;
