import { loadMarkers } from "./index.js";

let inSelectionMode = false;
export let currentInfoWindow = null;
let markerCounter = 0;

// Utility function to handle HTTP requests
async function fetchContent(url) {
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`HTTP error - status: ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error("Fetch error:", error);
    return "";
  }
}

// Updates the content of a modal template with specific marker details
function updateContent(
  content,
  elevationInFeet,
  latLong,
  name,
  desc,
  markerId
) {
  return content
    .replace(
      "<!-- ELEVATION_PLACEHOLDER -->",
      `Elevation: ${elevationInFeet.toFixed(2)} feet`
    )
    .replace("<!-- LATITUDE_PLACEHOLDER -->", `Latitude: ${latLong.lat}`)
    .replace("<!-- LONGITUDE_PLACEHOLDER -->", `Longitude: ${latLong.lng}`)
    .replace("<!-- NAME_PLACEHOLDER -->", name)
    .replace("<!-- DESCRIPTION_PLACEHOLDER -->", desc)
    .replace("<!-- DYNAMIC_ID -->", markerId);
}

async function getElevation(lat, lng) {
  const elevationUrl = `http://localhost:3000/api/elevation?lat=${lat}&lng=${lng}`;
  try {
    const response = await fetch(elevationUrl);
    if (!response.ok)
      throw new Error(`Network response was not ok: ${response.status}`);
    const data = await response.json();
    if (data.status === "OK" && data.results.length > 0) {
      const elevationInFeet = data.results[0].elevation * 3.28084;
      return { elevationInFeet, latLong: { lat, lng } };
    } else {
      throw new Error(`Elevation API error: ${data.status}`);
    }
  } catch (error) {
    console.error("Elevation fetch error:", error);
    throw error;
  }
}

// Function to handle marker submission
async function submitMarker(name, desc, lat, lng, elevationInFeet, infoWindow) {
  try {
    const response = await fetch("/api/add-marker", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        desc,
        lat,
        lng,
        elevation: elevationInFeet,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();

    // Refresh markers after addition
    loadMarkers();
    inSelectionMode = false;
    toggleButtonState();

    if (infoWindow) {
      infoWindow.close();
    }
  } catch (error) {
    console.error("Error submitting marker:", error);
  }
}

// Handle marker addition & info window
export async function addMarker(map) {
  const snackbar = document.getElementById("snackbar");
  snackbar.className = "show";

  setTimeout(() => {
    snackbar.className = snackbar.className.replace("show", "");
  }, 3000);

  inSelectionMode = true;

  if (inSelectionMode) {
    // Disabling add marker btn
    toggleButtonState();

    const clickListener = map.addListener("click", async (event) => {
      const { lat, lng } = event.latLng.toJSON();
      window.selectedLatLng = { lat, lng };

      try {
        const { elevationInFeet, latLong } = await getElevation(lat, lng);
        const contentUrl = "addMarkerModal.html";

        let content = await fetchContent(contentUrl);
        content = updateContent(
          content,
          elevationInFeet,
          latLong,
          "New Marker",
          "No description",
          `marker-${markerCounter++}`
        );

        const marker = new google.maps.Marker({
          position: event.latLng,
          map: map,
          title: "New Marker",
        });

        window.markers = window.markers || {};
        marker.id = `marker-${markerCounter++}`;
        window.markers[marker.id] = marker;

        const infoWindow = new google.maps.InfoWindow({
          content: content,
          ariaLabel: "Test",
        });

        infoWindow.open({ anchor: marker, map, shouldFocus: false });

        setTimeout(() => {
          const submitButton = document.getElementById("submit-button");
          if (submitButton) {
            submitButton.addEventListener("click", () => {
              const nameInput = document.getElementById("name");
              const descInput = document.getElementById("desc");

              const name = nameInput ? nameInput.value : "Unnamed Marker";
              const desc = descInput ? descInput.value : "No description";

              submitMarker(
                name,
                desc,
                window.selectedLatLng.lat,
                window.selectedLatLng.lng,
                elevationInFeet,
                infoWindow
              );

              marker.desc = desc;
              handleMarkerClick(marker);
            });
          } else {
            console.error("Submit button not found.");
          }
        }, 0);

        google.maps.event.removeListener(clickListener);
      } catch (error) {
        console.error("Error adding marker:", error);
      }
    });
  }
}

// Handle marker click
export async function handleMarkerClick(marker) {
  marker.addListener("click", async () => {
    try {
      const contentUrl = "markerModal.html";
      const { lat, lng } = marker.getPosition().toJSON();

      // Set window.selectLatLng to marker's position
      window.selectedLatLng = { lat, lng };
      console.log(window.selectedLatLng);

      const { elevationInFeet, latLong } = await getElevation(lat, lng);

      console.log("lat: " + lat, "long: " + lng);
      let content = await fetchContent(contentUrl);
      content = updateContent(
        content,
        elevationInFeet,
        latLong,
        marker.getTitle(),
        marker.desc || "No description",
        marker.id
      );

      // Close the previously opened InfoWindow
      if (currentInfoWindow) {
        currentInfoWindow.close();
      }

      const infoWindow = new google.maps.InfoWindow({
        content: content,
        ariaLabel: "Marker Information",
      });

      infoWindow.open({
        anchor: marker,
        map: marker.getMap(),
        shouldFocus: false,
      });

      // Update the global currentInfoWindow reference
      currentInfoWindow = infoWindow;
    } catch (error) {
      console.error("Error displaying marker modal:", error);
    }
  });
}

// Close the new marker infowindow without adding marker
export async function deleteAddition() {
  // Close current InfoWindow if open
  if (currentInfoWindow) {
    currentInfoWindow.close();
  }

  // Refresh markers
  await loadMarkers();
  inSelectionMode = false;
}

export async function toggleButtonState() {
  const addMarkerButton = document.getElementById("addMarkerButton");

  if (inSelectionMode) {
    console.log("Disabling add marker btn");
    addMarkerButton.disabled = true;
  } else {
    console.log("Enabling add marker btn");

    addMarkerButton.disabled = false;
  }
}

// Ensure functions are accessible globally
window.deleteAddition = deleteAddition;
