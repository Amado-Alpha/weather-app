// script.js
/*
// Initialize the map
const map = L.map("map").setView([51.505, -0.09], 13);

// Add a tile layer to the map (OpenStreetMap tiles)
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Add a marker to the map
const marker = L.marker([51.5, -0.09]).addTo(map);

// Add a popup to the marker
marker.bindPopup("<b>Hello world!</b><br>I am a popup.").openPopup();

// Search functionality.
// const form = document.querySelector('.form');
const searchButton = document.querySelector(".searchButton");
const searchQuery = document.querySelector(".searchQuery");
const temperatureContent = document.getElementById("temperature");
const precipitationContent = document.getElementById("precipitation");
const windspeedContent = document.getElementById("wind_speed");

// Tabbed component
const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".tab-panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((btn) => btn.classList.remove("active-tab"));
    panels.forEach((panel) => panel.classList.add("hidden"));
    tab.classList.add("active-tab");
    const target = document.getElementById(tab.getAttribute("data-target"));
    target.classList.remove("hidden");
  });
});

// Search location using API
function getLocation() {
  searchButton.addEventListener("click", async (e) => {
    e.preventDefault();
    const query = searchQuery.value;
    console.log(query);
    if (!query) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json`
      );
      const data = await response.json();

      console.log("RAW COORDINATES", data);
      if (data.length > 0) {
        // Take the first result
        const coordinates = data[0];
        const lat = coordinates.lat;
        const lon = coordinates.lon;

        console.log("Lat, Lon:", lat, lon);

        // Move map to the location
        map.setView([lat, lon], 13);

        // Add a marker at the location
        L.marker([lat, lon])
          .addTo(map)
          .bindPopup(`<b>Location:</b><br>${query}`)
          .openPopup();

        await fetchWeatherData(lat, lon);
      } else {
        // alert("No results found for your query.");
      }
    } catch (error) {
      console.error("Error fetching geocoding data:", error);
    }
  });
}

getLocation();

// Open-Meteo API endpoint
const openMeteoAPI =
  "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto";

// Fetch weather data for coordinates
async function fetchWeatherData(lat, lon) {
  const response = await fetch(
    openMeteoAPI.replace("{lat}", lat).replace("{lon}", lon) // Not good for perfomance -- Fix it
  );
  const data = await response.json();
  setLocalStorage(data);
  displayWeatherData(data);
}

// store selected regions to local storage
function setLocalStorage(selectedRegions) {
  localStorage.setItem("selected-regions", JSON.stringify(selectedRegions));
  getLocalStorage();
}

// retrieve selected regions from local storage
function getLocalStorage() {
  const data = JSON.parse(localStorage.getItem("selected-regions"));
  console.log("Data from local storage:", data);
}

// Display weather details in the panel
function displayWeatherData(data) {
  const currentWeather = data.current_weather;
  temperatureContent.textContent = currentWeather.temperature;
  precipitationContent.textContent = currentWeather.precipitation || "0";
  windspeedContent.textContent = currentWeather.windspeed;

  // Display 7-day forecast (basic)
  const forecastDiv = document.getElementById("forecast");
  forecastDiv.innerHTML = ""; // Clear previous forecast

  data.daily.temperature_2m_max.forEach((maxTemp, index) => {
    const minTemp = data.daily.temperature_2m_min[index];
    const card = document.createElement("div");
    card.className = "bg-blue-100 p-2 rounded shadow";
    card.innerHTML = `
            <p>Day ${index + 1}</p>
            <p>Max: ${maxTemp}°C</p>
            <p>Min: ${minTemp}°C</p>
        `;
    forecastDiv.appendChild(card);
  });
}
*/

class WeatherApp {
  constructor() {
    this.mapManager = new MapManager();
    this.storageService = new StorageService();
    this.uiManager = new UIManager();
    this.initialize();
  }

  initialize() {
    this.mapManager.initializeMap([51.505, -0.09]);
    this.uiManager.initializeTabs();
    this.handleSearch();
  }

  handleSearch() {
    const searchButton = document.querySelector(".searchButton");
    const searchQuery = document.querySelector(".searchQuery");
    searchButton.addEventListener("click", async (e) => {
      e.preventDefault();
      const query = searchQuery.value;
      if (!query) return;

      const locationCoordinates = await this.mapManager.getLocationCoordinates(
        query
      );

      if (locationCoordinates) {
        const { lat, lon } = locationCoordinates;
        this.mapManager.moveToLocation(lat, lon, query);
        const weatherService = new WeatherService(lat, lon);
        const weatherData = await weatherService.fetchWeatherData();
        this.storageService.storeSelectedRegion({
          query,
          lat,
          lon,
          weatherData,
        });
        this.uiManager.displayWeatherData(weatherData);
      }
    });
  }
}

class MapManager {
  constructor() {
    this.map = null;
  }

  initializeMap(coords) {
    this.map = L.map("map").setView(coords, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
  }

  async getLocationCoordinates(query) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json`
      );

      //   Always await !!!
      //   const data = response.json(); // Output: promise pending
      const data = await response.json();
      if (data.length > 0) {
        return {
          lat: data[0].lat,
          lon: data[0].lon,
        };
      }
    } catch (error) {
      console.error(error);
    }
    return null;
  }

  moveToLocation(lat, lon, query) {
    this.map.setView([lat, lon], 13);
    L.marker([lat, lon])
      .addTo(this.map)
      .bindPopup(`<b>Location:</b><br>${query}`)
      .openPopup();
  }
}

class WeatherService {
  constructor(lat, lon) {
    this.apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto`;
  }

  async fetchWeatherData() {
    try {
      const response = await fetch(this.apiUrl);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching weather data:", error);
      return null;
    }
  }
}

class StorageService {
  storeSelectedRegion(region) {
    // localStorage.removeItem("selected-regions");
    let selectedRegions =
      JSON.parse(localStorage.getItem("selected-regions")) || [];
    console.log(typeof selectedRegions);
    selectedRegions.push(region);
    localStorage.setItem("selected-regions", JSON.stringify(selectedRegions));

    this.getSelectedRegions();
  }

  getSelectedRegions() {
    const data = JSON.parse(localStorage.getItem("selected-regions"));
    console.log(data);
  }
}

class UIManager {
  initializeTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    const panels = document.querySelectorAll(".tab-panel");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((btn) => btn.classList.remove("active-tab"));
        panels.forEach((panel) => panel.classList.add("hidden"));
        tab.classList.add("active-tab");
        const target = document.getElementById(tab.getAttribute("data-target"));
        target.classList.remove("hidden");
      });
    });
  }

  displayWeatherData(data) {
    const temperatureContent = document.getElementById("temperature");
    const precipitationContent = document.getElementById("precipitation");
    const windspeedContent = document.getElementById("wind_speed");

    const currentWeather = data.current_weather;
    temperatureContent.textContent = currentWeather.temperature;
    precipitationContent.textContent = currentWeather.precipitation || "0";
    windspeedContent.textContent = currentWeather.windspeed;

    this.displayForecast(data);
  }

  displayForecast(data) {
    const forecastDiv = document.getElementById("forecast");
    forecastDiv.innerHTML = ""; // Clear previous forecast

    data.daily.temperature_2m_max.forEach((maxTemp, index) => {
      const minTemp = data.daily.temperature_2m_min[index];
      const card = document.createElement("div");
      card.className = "bg-blue-100 p-2 rounded shadow";
      card.innerHTML = `
        <p>Day ${index + 1}</p>
        <p>Max: ${maxTemp}°C</p>
        <p>Min: ${minTemp}°C</p>
      `;
      forecastDiv.appendChild(card);
    });
  }
}

const weatheApp = new WeatherApp();
