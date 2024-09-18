// script.js

class WeatherApp {
  constructor() {
    this.mapManager = new MapManager();
    this.storageService = new StorageService();
    this.uiManager = new UIManager(this);
    this.initialize();

    this.currentRegion = {};
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
        this.currentRegion = { regionName: query, lat: lat, lon: lon };

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
    // Can get rid of the args and use initialize currentRegion object
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
  constructor() {
    // Initialize selectedRegions from localStorage when the class is instantiated
    this.selectedRegions =
      JSON.parse(localStorage.getItem("selected-regions")) || [];
  }

  // Helper method to check if a region exists
  regionExists(regionToCheck) {
    return this.selectedRegions.some((region) => {
      return (
        region.regionName === regionToCheck.regionName &&
        region.lat === regionToCheck.lat &&
        region.lon === regionToCheck.lon
      );
    });
  }

  // Store a region if it does not already exist
  storeSelectedRegion(regionToStore) {
    console.log(regionToStore);
    console.log("To store", regionToStore.regionName);

    // Check if the region already exists
    if (!this.regionExists(regionToStore)) {
      this.selectedRegions.push(regionToStore);
      localStorage.setItem(
        "selected-regions",
        JSON.stringify(this.selectedRegions)
      );
    }

    this.getSelectedRegions();
  }

  // Retrieve and log the selected regions
  getSelectedRegions() {
    console.log(this.selectedRegions);
  }
}

class UIManager {
  constructor(app) {
    this.app = app;
  }

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

        if (tab.getAttribute("data-target") === "tab-2") {
          this.renderSelectedRegions();
        }
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
    this.showBookmarkButton();
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

  showBookmarkButton() {
    let bookmarkButton = document.getElementById("bookmarkButton");
    if (!bookmarkButton) {
      bookmarkButton = document.createElement("button");
      bookmarkButton.id = "bookmarkButton";
      bookmarkButton.className =
        "bookmark-btn bg-blue-500 text-white p-2 rounded mt-4";
      bookmarkButton.textContent = "Bookmark this region";
      const tab_1 = document.getElementById("tab-1");
      tab_1.appendChild(bookmarkButton);
    }

    bookmarkButton.style.display = "block";

    bookmarkButton.addEventListener("click", () => {
      this.app.storageService.storeSelectedRegion(this.app.currentRegion);
    });
  }

  renderSelectedRegions() {
    const selectedRegionsContainer =
      document.getElementById("selected-regions");

    selectedRegionsContainer.innerHTML = "";

    // Retrieve selected regions from localStorage

    const selectedRegions = this.app.storageService.selectedRegions;

    // Check if there are no selected regions
    if (selectedRegions.length === 0) {
      selectedRegionsContainer.innerHTML = "<li>No regions selected</li>";
      return;
    }

    // Create and append list items for each selected region
    selectedRegions.forEach((region, index) => {
      const listItem = document.createElement("li");
      listItem.className = "flex items-center justify-between mb-2";
      listItem.innerHTML = `
        ${region.regionName} (Lat: ${region.lat}, Lon: ${region.lon})
        <button class="delete-btn ml-2 text-red-500">X</button>
      `;
      selectedRegionsContainer.appendChild(listItem);

      // Add click event listener to the delete button
      listItem.querySelector(".delete-btn").addEventListener("click", () => {
        this.deleteRegion(index);
      });

      listItem.addEventListener("click", () => {
        this.reRenderMap(region.lat, region.lon, region.regionName);
      });
    });
  }

  // Delete a region by index
  deleteRegion(index) {
    const selectedRegions = this.app.storageService.selectedRegions;
    selectedRegions.splice(index, 1);
    localStorage.setItem("selected-regions", JSON.stringify(selectedRegions));

    // Re-render the list
    this.renderSelectedRegions();
  }

  reRenderMap(lat, lon, regionName) {
    this.app.mapManager.moveToLocation(lat, lon, regionName);
  }
}

const weatheApp = new WeatherApp();
