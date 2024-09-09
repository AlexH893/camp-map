const express = require("express");
const sqlite = require("sqlite3");

const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const request = require("request");
const app = express();
const path = require("path");

app.use(cors());
app.use(express.json());

const port = 3000;
let apiKey = process.env.API_KEY;

// Initialize and configure the sqlite3 instance
const db = new sqlite.Database("./mydb.sqlite", (err) => {
  if (err) {
    // Log error if connection fails
    console.error("Error connecting to the database:", err.message);
  } else {
    // Log success message if connection is successful
    console.log("Successfully connected to the SQLite database.");
  }
});

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

// Route to create a marker
app.post("/api/add-marker", (req, res) => {
  const { name, desc, lat, lng, elevation } = req.body;

  const query =
    "INSERT into camp_locations (name, desc, lat, lng, elevation) VALUES (?,?,?,?,?)";
  const params = [name, desc, lat, lng, elevation];

  db.run(query, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: "Marker added successfully", id: this.lastID });
    }
  });
});

// Route to update deleted marker flag
app.put("/api/delete-marker", (req, res) => {
  const { deleted, id } = req.body;

  const query = `
    UPDATE camp_locations
    SET deleted = ?
    WHERE id = ?
  `;
  const params = [deleted, id];

  db.run(query, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ message: "No matching record found to update" });
    } else {
      res.json({
        success: true,
        message: "Marker marked deleted",
        changes: this.changes,
      });
    }
  });
});

// Route to update marker info
app.put("/api/update-marker/:id", (req, res) => {
  const { name, desc } = req.body;
  const { id } = req.params;

  const query = `
    UPDATE camp_locations
    SET name = ?,
        desc = ?
    WHERE id = ?
  `;
  const params = [name, desc, id];

  db.run(query, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ message: "No matching record found to update" });
    } else {
      res.json({
        success: true,
        message: "Marker updated",
        changes: this.changes,
      });
    }
  });
});

// Route to get all markers from db
app.get("/api/markers", (req, res) => {
  const query = "SELECT * FROM camp_locations WHERE deleted = 0";

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Route to get a marker by id
app.get("/api/markers/:id", (req, res) => {
  const markerId = req.params.id;
  const query = "SELECT * FROM camp_locations WHERE id = ? AND deleted = 0";

  db.get(query, [markerId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: "Marker not found" });
    } else {
      res.json(row);
    }
  });
});

// Endpoint to serve API key to client
app.get("/api/getApiKey", (req, res) => {
  res.json({ apiKey: process.env.API_KEY });
});

app.listen(port, "::", () => {
  console.log(`Server running at http://[::]:${port}/`);
});
