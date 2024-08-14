import { getWeather } from "./getWeather.js";

// let apiKey = "test";

// Util function to handle HTTP requests

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

function updateContent(content, elevationInFeet, latLong) {
  return content
    .replace(
      "<!-- ELEVATION_PLACEHOLDER -->",
      `Elevation: ${elevationInFeet.toFixed(2)} feet`
    )
    .replace("<!-- LATITUDE_PLACEHOLDER -->", `Latitude: ${latLong.lat}`)
    .replace("<!-- LONGITUDE_PLACEHOLDER -->", `Longitude: ${latLong.lng}`);
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

// Handle marker addition & info window
export async function addMarker(map) {
  const snackbar = document.getElementById("snackbar");
  snackbar.className = "show";

  setTimeout(
    () => (snackbar.className = snackbar.className.replace("show", "")),
    3000
  );

  let inSelectionMode = true;

  if (inSelectionMode) {
    console.log("Selection mode activated. Click on the map to add a marker.");

    const clickListener = map.addListener("click", async (event) => {
      const { lat, lng } = event.latLng.toJSON();
      window.selectedLatLng = { lat, lng };
      console.log(`Lat: ${lat}, Lng: ${lng}`);
      try {
        const { elevationInFeet, latLong } = await getElevation(lat, lng);
        const contentUrl = "addMarkerModal.html";

        let content = await fetchContent(contentUrl);
        content = updateContent(content, elevationInFeet, latLong);

        const marker = new google.maps.Marker({
          position: event.latLng,
          map: map,
          title: "New Marker",
        });

        const infoWindow = new google.maps.InfoWindow({
          content: content,
          ariaLabel: "Test",
        });

        infoWindow.open({ anchor: marker, map, shouldFocus: false });

        marker.addListener("click", () => {
          map.setCenter(marker.getPosition());
          infoWindow.open({ anchor: marker, map, shouldFocus: false });
        });

        google.maps.event.removeListener(clickListener);
      } catch (error) {
        console.error("Error adding marker:", error);
      }
    });
  }
}
