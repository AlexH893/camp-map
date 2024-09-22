// Util function to fetchContent
export async function fetchContent(url) {
  try {
    let response = await fetch(url);
    if (!response.ok)
      throw new Error(`HTTP error - status: ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error("Failed to fetch content:", error.message);
    return "";
  }
}

// Function to update modal content
export function updateContent(
  content,
  elevationInFeet,
  latLong,
  name,
  desc,
  markerId,
  date_created,
  imageUrl,
  type
) {
  let updatedContent = content
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
    .replace(/<!-- TYPE_PLACEHOLDER -->/, type || "No Type")
    .replace(/<!-- DESCRIPTION_PLACEHOLDER -->/, desc || "No description")
    .replace(/<!-- DYNAMIC_ID -->/, markerId || "")
    .replace(/<!-- DYNAMIC_ID2 -->/, markerId || "")
    .replace(/<!-- DATE_CREATED_PLACEHOLDER -->/, date_created || "")
    .replace(
      /<!-- IMAGE_PLACEHOLDER -->/,
      imageUrl
        ? `<img src="${imageUrl}" alt="Marker Image" class="image" style="display: block;">`
        : ""
    )
    .replace(/<!-- DYNAMIC_TYPE -->/, type || "camp")
    .replace(/<!-- DYNAMIC_TYPE2 -->/, type || "camp"); // Default to "waypoint" if type is missing

  // Replace dynamic marker IDs using a loop to avoid repetition
  return updatedContent.replace(/<!-- DYNAMIC_ID -->/g, markerId || "");
}
// Function to manipulate the DOM after content is rendered
export function handleImageDisplay(imageUrl) {
  const imageContainer = document.getElementById("imageContainer");
  imageContainer?.style.setProperty("display", imageUrl ? "block" : "none");
}

// Function to get elevation
export async function getElevation(lat, lng) {
  const elevationUrl = `http://localhost:3000/api/elevation?lat=${lat}&lng=${lng}`;
  try {
    const response = await fetch(elevationUrl);
    if (!response.ok) throw new Error(`Error: ${response.status}`);

    const data = await response.json();
    if (data.status === "OK" && data.results.length > 0) {
      const elevationInFeet = data.results[0].elevation * 3.28084;
      return { elevationInFeet, latLong: { lat, lng } };
    }
    throw new Error(`Elevation API error: ${data.status}`);
  } catch (error) {
    console.error("Failed to get elevation:", error.message);
    throw error;
  }
}
