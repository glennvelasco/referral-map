(function () {
  const mapEl = document.getElementById("map");
  const cityListEl = document.getElementById("city-list");
  const detailEl = document.getElementById("detail");
  const countEl = document.getElementById("agent-count");

  const map = L.map(mapEl, {
    zoomControl: true,
    attributionControl: true,
  }).setView([39.5, -77.5], 6);

  // Esri World Dark Gray (no key, no OSM.org). CSS filters add the vintage wash.
  // On tile failure, keep pins + sidebar via map-no-tiles.
  const basemapUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}";
  const labelsUrl =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}";
  const basemap = L.tileLayer(basemapUrl, {
    maxZoom: 16,
    attribution: "Tiles &copy; Esri | Esri, HERE, Garmin",
  }).addTo(map);
  const labels = L.tileLayer(labelsUrl, {
    maxZoom: 16,
    opacity: 0.9,
  }).addTo(map);

  let basemapFailed = false;
  basemap.on("tileerror", function () {
    if (basemapFailed) return;
    basemapFailed = true;
    map.removeLayer(basemap);
    map.removeLayer(labels);
    mapEl.classList.add("map-no-tiles");
  });

  const pinIcon = L.divIcon({
    className: "",
    html: '<div class="pin-icon"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });

  let markersById = {};
  let activeId = null;

  function esc(s) {
    if (s == null || s === "") return "";
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function showDetail(agent) {
    activeId = agent.id;
    document.querySelectorAll(".city-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.id === agent.id);
    });

    const phoneRow = agent.phone
      ? "<dt>Phone</dt><dd>" + esc(agent.phone) + "</dd>"
      : "";

    detailEl.innerHTML =
      '<button type="button" class="close" aria-label="Close">&times;</button>' +
      "<h3>" +
      esc(agent.name) +
      "</h3>" +
      '<span class="badge">' +
      esc(agent.referralType || agent.status) +
      "</span>" +
      "<dl>" +
      "<dt>Metro</dt><dd>" +
      esc(agent.metro) +
      "</dd>" +
      "<dt>Sub-area</dt><dd>" +
      esc(agent.subArea) +
      "</dd>" +
      "<dt>Brokerage</dt><dd>" +
      esc(agent.brokerage || "n/a") +
      "</dd>" +
      "<dt>Status</dt><dd>" +
      esc(agent.status) +
      "</dd>" +
      phoneRow +
      "</dl>" +
      (agent.notes
        ? '<p class="notes">' + esc(agent.notes) + "</p>"
        : "");

    detailEl.classList.add("visible");
    detailEl.querySelector(".close").addEventListener("click", function () {
      detailEl.classList.remove("visible");
      activeId = null;
      document.querySelectorAll(".city-btn").forEach(function (btn) {
        btn.classList.remove("active");
      });
    });
  }

  function focusAgent(agent) {
    showDetail(agent);
    const marker = markersById[agent.id];
    if (marker) {
      map.setView([agent.lat, agent.lng], 10, { animate: true });
      marker.openPopup();
    }
  }

  function renderList(agents) {
    cityListEl.innerHTML = "";
    agents.forEach(function (agent) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "city-btn";
      btn.dataset.id = agent.id;
      btn.innerHTML =
        '<span class="name">' +
        esc(agent.name) +
        '</span><span class="loc">' +
        esc(agent.cityLabel) +
        " · " +
        esc(agent.metro) +
        "</span>";
      btn.addEventListener("click", function () {
        focusAgent(agent);
      });
      li.appendChild(btn);
      cityListEl.appendChild(li);
    });
  }

  function addMarkers(agents) {
    const bounds = [];
    agents.forEach(function (agent) {
      const marker = L.marker([agent.lat, agent.lng], { icon: pinIcon }).addTo(
        map
      );
      marker.bindPopup(
        "<strong>" +
          esc(agent.name) +
          "</strong>" +
          esc(agent.cityLabel) +
          "<br>" +
          esc(agent.referralType || agent.status)
      );
      marker.on("click", function () {
        showDetail(agent);
      });
      markersById[agent.id] = marker;
      bounds.push([agent.lat, agent.lng]);
    });
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 8 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 9);
    }
  }

  function loadInventory() {
    return fetch("data/inventory.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Could not load inventory.json");
        return res.json();
      })
      .catch(function () {
        // file:// fallback: embedded mirror so the page still works offline
        return window.__INVENTORY_FALLBACK__ || { agents: [] };
      });
  }

  loadInventory().then(function (data) {
    const agents = data.agents || [];
    if (countEl) {
      countEl.textContent =
        agents.length + " agent" + (agents.length === 1 ? "" : "s");
    }
    renderList(agents);
    addMarkers(agents);
  });
})();
