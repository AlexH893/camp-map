const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const request = require("request");
const app = express();
const path = require("path");

app.use(cors());

const port = 3000;
let apiKey = process.env.API_KEY;

app.get("/api/elevation", (req, res) => {
  const { lat, lng } = req.query;
  // console.log(`Received request for elevation data: lat=${lat}, lng=${lng}`);

  // Construct the correct URL for the Google Elevation API
  const elevationUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`;
  // console.log(`Requesting elevation data from: ${elevationUrl}`);

  request(elevationUrl, function (error, response, body) {
    if (error) {
      console.error("Error:", error);
      res.status(500).send(error);
    } else if (response && response.statusCode !== 200) {
      console.error("Status Code:", response.statusCode);
      res.status(response.statusCode).send(body);
    } else {
      res.send(body);
    }
  });
});

app.get("/api/currentTemp", (req, res) => {
  const { lat, lng } = req.query;

  const currTempUrl =
    "https://api.open-meteo.com/v1/forecast?latitude=$92.644&longitude=$-104.364&current=temperature_2m,precipitation,cloud_cover&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FChicago&forecast_days=1";

  request(currTempUrl, function (error, response, body) {
    if (error) {
      console.error("Error:", error);
      res.status(500).send(error);
    } else if (response && response.statusCode !== 200) {
      console.error("Status Code:", response.statusCode);
      res.status(response.statusCode).send(body);
    } else {
      res.send(body);
    }
  });
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));

// Ensure .js files are served with correct MIME type
app.use((req, res, next) => {
  if (req.url.endsWith(".js")) {
    res.type("text/javascript");
  }
  next();
});

// Endpoint to serve API key to client
app.get("/api/getApiKey", (req, res) => {
  res.json({ apiKey: process.env.API_KEY });
});

app.listen(port, "::", () => {
  console.log(`Server running at http://[::]:${port}/`);
});
