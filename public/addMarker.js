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
function updateContent(content, elevationInFeet, latLong, name, markerId) {
  return content
    .replace(
      "<!-- ELEVATION_PLACEHOLDER -->",
      `Elevation: ${elevationInFeet.toFixed(2)} feet`
    )
    .replace("<!-- LATITUDE_PLACEHOLDER -->", `Latitude: ${latLong.lat}`)
    .replace("<!-- LONGITUDE_PLACEHOLDER -->", `Longitude: ${latLong.lng}`)
    .replace("<!-- NAME_PLACEHOLDER -->", name)
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
async function submitMarker(name, lat, lng, elevationInFeet, infoWindow) {
  try {
    const response = await fetch("/api/add-marker", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        lat,
        lng,
        elevation: elevationInFeet,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    console.log("Marker added:", data.message);
    inSelectionMode = false;

    // Close the infoWindow after successful submission
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
          `marker-${markerCounter++}`
        );

        const marker = new google.maps.Marker({
          position: event.latLng,
          map: map,
          title: "New Marker",
        });

        // Store the marker in the global markers object
        window.markers = window.markers || {};
        window.markers[marker.id] = marker; // Use the unique marker ID

        const infoWindow = new google.maps.InfoWindow({
          content: content,
          ariaLabel: "Test",
        });

        infoWindow.open({ anchor: marker, map, shouldFocus: false });

        // Attach the submit function to the button after modal content is loaded
        setTimeout(() => {
          const submitButton = document.getElementById("submit-button");
          if (submitButton) {
            submitButton.addEventListener("click", () => {
              const nameInput = document.getElementById("name");
              const name = nameInput ? nameInput.value : "Unnamed Marker";
              submitMarker(
                name,
                window.selectedLatLng.lat,
                window.selectedLatLng.lng,
                elevationInFeet,
                infoWindow
              );
            });
          } else {
            console.error("Submit button not found.");
          }
        }, 0); // Wait for the DOM to update with the loaded content

        // Ensure click event is attached to the new marker
        handleMarkerClick(marker);

        // Remove the clickListener after adding the marker
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
      const { elevationInFeet, latLong } = await getElevation(lat, lng);

      let content = await fetchContent(contentUrl);
      content = updateContent(
        content,
        elevationInFeet,
        latLong,
        marker.getTitle(),
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
