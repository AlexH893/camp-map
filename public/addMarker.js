// Fetch content from addMarkerModal.html with XMLHttpRequest
function fetchContent(elevationInFeet, latLong, callback) {
  let xhr = new XMLHttpRequest();

  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        console.log("Content fetched successfully");
        let content = xhr.responseText;

        // Update the content with elevation, latitude, and longitude data
        content = content
          .replace(
            "<!-- ELEVATION_PLACEHOLDER -->",
            `Elevation: ${elevationInFeet.toFixed(2)} feet`
          )
          .replace("<!-- LATITUDE_PLACEHOLDER -->", `Latitude: ${latLong.lat}`)
          .replace(
            "<!-- LONGITUDE_PLACEHOLDER -->",
            `Longitude: ${latLong.lng}`
          );

        callback(content);
      } else {
        console.error("Failed to fetch modal content: ", xhr.status);
        callback("");
      }
    }
  };
  xhr.open("GET", "addMarkerModal.html", true);
  xhr.send();
}

let contentString = "";
let latLng = { lat: -25.363, lng: 131.044 };
let apiKey = "YOUR_API_KEY_HERE";

function getElevation(lat, lng, callback) {
  const elevationUrl = `http://localhost:3000/api/elevation?lat=${lat}&lng=${lng}`;
  // console.log(`Fetching elevation data from: ${elevationUrl}`);

  fetch(elevationUrl)
    .then((response) => {
      console.log(`Received response with status: ${response.status}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // console.log("Elevation API response data:", data); // Log the full response data

      if (data.status === "OK" && data.results.length > 0) {
        console.log("test");
        // Convert elevation from meters to feet
        const elevationInFeet = data.results[0].elevation * 3.28084;
        const latLong = { lat, lng };
        console.log(elevationInFeet);

        callback(null, elevationInFeet, latLong);
      } else {
        callback(new Error(`Elevation API error: ${data.status}`));
      }
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      callback(error);
    });
}

export function addMarker(map) {
  const snackbar = document.getElementById("snackbar");
  snackbar.className = "show";

  setTimeout(() => {
    snackbar.className = snackbar.className.replace("show", "");
  }, 3000);

  let inSelectionMode = true;

  if (inSelectionMode) {
    console.log("Selection mode activated. Click on the map to add a marker.");

    const clickListener = map.addListener("click", (event) => {
      const clickedLatLng = event.latLng;
      console.log(`Lat: ${clickedLatLng.lat()}, Lng: ${clickedLatLng.lng()}`);

      // Fetch elevation at the clicked position
      getElevation(
        clickedLatLng.lat(),
        clickedLatLng.lng(),
        (error, elevationInFeet, latLong) => {
          if (error) {
            console.log(error);
          } else {
            console.log(
              `Elevation at (${clickedLatLng.lat()}, ${clickedLatLng.lng()}) is ${elevationInFeet.toFixed(
                2
              )} feet.`
            );

            // Ensure the content is fetched before adding the marker
            fetchContent(elevationInFeet, latLong, function (responseText) {
              contentString = responseText;

              const marker = new google.maps.Marker({
                position: event.latLng,
                map: map,
                title: "New Marker",
              });

              const infoWindow = new google.maps.InfoWindow({
                content: contentString,
                ariaLabel: "Test",
              });

              // Open the infoWindow immediately after adding the marker
              infoWindow.open({
                anchor: marker,
                map,
                shouldFocus: false,
              });

              marker.addListener("click", () => {
                map.setCenter(marker.getPosition());
                infoWindow.open({
                  anchor: marker,
                  map,
                  shouldFocus: false,
                });
              });

              google.maps.event.removeListener(clickListener);
            });
          }
        }
      );
    });
  }
}
