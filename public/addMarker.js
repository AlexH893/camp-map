import { loadMarkers } from "./index.js";
export let currentInfoWindow = null;

let inSelectionMode = false;
let markerCounter = 0;

export async function fetchContent(url) {
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

export function updateContent(
  content,
  elevationInFeet,
  latLong,
  name,
  desc,
  markerId,
  date_created,
  imageUrl
) {
  const updatedContent = content
    .replace(
      /<!-- ELEVATION_PLACEHOLDER -->/,
      elevationInFeet ? `Elevation: ${elevationInFeet.toFixed(2)} feet` : ""
    )
    .replace(
      /<!-- LATITUDE_PLACEHOLDER -->/,
      latLong ? `Latitude: ${latLong.lat}` : ""
    )
    .replace(
      /<!-- LONGITUDE_PLACEHOLDER -->/,
      latLong ? `Longitude: ${latLong.lng}` : ""
    )
    .replace(/<!-- NAME_PLACEHOLDER -->/, name || "No Name")
    .replace(/<!-- DESCRIPTION_PLACEHOLDER -->/, desc || "No description")
    .replace(/<!-- DYNAMIC_ID -->/, markerId || "")
    .replace(/<!-- DYNAMIC_ID2 -->/, markerId || "")
    .replace(/<!-- DATE_CREATED_PLACEHOLDER -->/, date_created || "")
    .replace(
      /<!-- IMAGE_PLACEHOLDER -->/,
      imageUrl
        ? `<img src="${imageUrl}" alt="Marker Image"  class="image">`
        : "No image available"
    );

  console.log("Marker ID: " + markerId + " Name: " + name);
  return updatedContent;
}

async function submitMarker(
  name,
  desc,
  lat,
  lng,
  elevationInFeet,
  infoWindow,
  AdvancedMarkerElement,
  date_created,
  imageUrl
) {
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
        imageUrl,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();

    loadMarkers(AdvancedMarkerElement);
    inSelectionMode = false;
    toggleButtonState();

    if (infoWindow) {
      infoWindow.close();
    }
  } catch (error) {
    console.error("Error submitting marker:", error);
  }
}

export async function addMarker(map) {
  const snackbar = document.getElementById("snackbar");
  snackbar.className = "show";

  setTimeout(() => {
    snackbar.className = snackbar.className.replace("show", "");
  }, 3000);

  inSelectionMode = true;

  if (inSelectionMode) {
    toggleButtonState();

    const clickListener = map.addListener("click", async (event) => {
      const { lat, lng } = event.latLng.toJSON();
      window.selectedLatLng = { lat, lng };

      try {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: event.latLng,
          map: map,
          title: "New Marker",
        });

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

        window.markers = window.markers || {};
        marker.id = `marker-${markerCounter++}`;
        window.markers[marker.id] = marker;

        const infoWindow = new google.maps.InfoWindow({
          content: content,
          ariaLabel: "Test",
        });

        infoWindow.open({ anchor: marker, map, shouldFocus: false });

        currentInfoWindow = infoWindow;

        setTimeout(() => {
          const submitButton = document.getElementById("submit-button");
          if (submitButton) {
            submitButton.addEventListener("click", () => {
              const nameInput = document.getElementById("name");

              if (!nameInput.value.trim()) {
                alert("Name is required");
                nameInput.focus();
                return;
              }

              const descInput = document.getElementById("desc");
              const name = nameInput ? nameInput.value : "Unnamed Marker";
              const desc = descInput ? descInput.value : "No description";
              const imageUrl =
                document.getElementById("imageContainer")?.querySelector("img")
                  ?.src || "";

              submitMarker(
                name,
                desc,
                window.selectedLatLng.lat,
                window.selectedLatLng.lng,
                elevationInFeet,
                infoWindow,
                google.maps.marker.AdvancedMarkerElement,
                imageUrl
              );

              marker.desc = desc;
              handleMarkerClick(marker);
            });
          } else {
            console.error("Submit button not found.");
          }
        }, 100);

        google.maps.event.removeListener(clickListener);
      } catch (error) {
        console.error("Error adding marker:", error);
      }
    });
  }
}

export async function handleMarkerClick(marker, markerId, date_created) {
  marker.addListener("click", async () => {
    if (inSelectionMode) {
      return;
    }

    if (currentInfoWindow) {
      currentInfoWindow.close();
    }
    try {
      const position = marker.position;
      const lat = position.lat;
      const lng = position.lng;

      window.selectedLatLng = { lat, lng };

      const { elevationInFeet, latLong } = await getElevation(lat, lng);

      let contentUrl = "markerModal.html";
      let content = await fetchContent(contentUrl);

      // Fetch marker data from API or your data source
      const response = await fetch(`/api/markers/${markerId}`);
      const markerData = await response.json();

      content = updateContent(
        content,
        elevationInFeet,
        latLong,
        marker.title,
        marker.desc || "No description",
        markerId,
        date_created,
        markerData.imageUrl
      );

      console.log("Displaying info window for marker ID:", markerId);

      const infoWindow = new google.maps.InfoWindow({
        content: content,
        ariaLabel: "Marker Information",
      });

      infoWindow.open({
        anchor: marker,
        map: marker.map,
        shouldFocus: false,
      });

      currentInfoWindow = infoWindow;

      marker.map.addListener("click", () => {
        if (currentInfoWindow) {
          currentInfoWindow.close();
          currentInfoWindow = null;
        }
      });

      setTimeout(() => {
        const editButton = document.querySelector(".edit");

        if (editButton) {
          editButton.addEventListener("click", async (event) => {
            event.preventDefault();
            try {
              if (currentInfoWindow) {
                currentInfoWindow.close();
                currentInfoWindow = null;
              }
              handleEdit(editButton);
            } catch (error) {
              console.error("Error in edit button click handler:", error);
            }
          });
        } else {
          console.error("Edit button not found in the modal content.");
        }

        const uploadButton = document.getElementById("uploadButton");
        if (uploadButton) {
          uploadButton.addEventListener("click", async (event) => {
            event.preventDefault();
            console.log("Upload button clicked");

            const fileInput = document.getElementById("fileUpload");
            const file = fileInput.files[0];

            if (!file) {
              alert("Please select a JPG file to upload.");
              return;
            }

            const formData = new FormData();
            formData.append("image", file);
            formData.append("markerId", markerId);

            try {
              const response = await fetch("/upload", {
                method: "POST",
                body: formData,
              });

              const result = await response.json();

              if (response.ok) {
                document.getElementById("uploadStatus").innerText =
                  "Image uploaded successfully!";
                console.log("Image URL:", result.imageUrl);

                const imageContainer =
                  document.getElementById("imageContainer");
                if (imageContainer) {
                  imageContainer.innerHTML = `<img src="${result.imageUrl}" alt="Uploaded Image" style="max-width: 100%; height: auto;">`;
                }
              } else {
                document.getElementById("uploadStatus").innerText =
                  "Failed to upload image.";
                console.error("Upload error:", result.error);
              }
            } catch (error) {
              console.error("Error during file upload:", error);
              document.getElementById("uploadStatus").innerText =
                "An error occurred during upload.";
            }
          });
        } else {
          console.error("Upload button not found.");
        }
      }, 100);
    } catch (error) {
      console.error("Error displaying marker modal:", error);
    }
  });
}

export async function deleteAddition() {
  if (currentInfoWindow) {
    currentInfoWindow.close();
  }

  await loadMarkers(google.maps.marker.AdvancedMarkerElement);
  inSelectionMode = false;
  toggleButtonState();
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

window.deleteAddition = deleteAddition;
