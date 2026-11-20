/*
  Taste Passport
  A single page app that mashes up four public APIs with fetch():
    1. TheMealDB    – dishes and full recipes for each cuisine
    2. CountriesNow – the capital city and currency for each cuisine's country
    3. Open-Meteo   – geocoding for the capital, then its live weather and time zone
    4. Flagpedia    – the country's flag image (flagcdn.com)
*/
(function () {
  "use strict";

  /* ---------- API endpoints ---------- */
  const MEALDB = "https://www.themealdb.com/api/json/v1/1";
  const COUNTRIES = "https://countriesnow.space/api/v0.1/countries";
  const GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
  const WEATHER = "https://api.open-meteo.com/v1/forecast";
  const FLAG = (code) => `https://flagcdn.com/w160/${code}.png`;

  /* ---------- Cuisines, each mapped to its country ----------
     name:    the country name CountriesNow expects
     code:    ISO two-letter code (flag image + checking the geocoder)
     capital: backup only, used if CountriesNow is down
     query:   TheMealDB files some cuisines by country ("France")
              instead of nationality ("French"), so this is the
              word that actually returns dishes                    */
  const AREAS = {
    Algerian: { name: "Algeria", code: "dz", capital: "Algiers" },
    American: { name: "United States", code: "us", capital: "Washington", query: "United States" },
    Argentinian: { name: "Argentina", code: "ar", capital: "Buenos Aires", query: "Argentina" },
    Australian: { name: "Australia", code: "au", capital: "Canberra" },
    Belgian: { name: "Belgium", code: "be", capital: "Brussels", query: "Belgium" },
    Brazilian: { name: "Brazil", code: "br", capital: "Brasilia", query: "Brazil" },
    British: { name: "United Kingdom", code: "gb", capital: "London" },
    Canadian: { name: "Canada", code: "ca", capital: "Ottawa" },
    Chinese: { name: "China", code: "cn", capital: "Beijing" },
    Croatian: { name: "Croatia", code: "hr", capital: "Zagreb" },
    Dutch: { name: "Netherlands", code: "nl", capital: "Amsterdam", query: "Netherlands" },
    Egyptian: { name: "Egypt", code: "eg", capital: "Cairo" },
    Filipino: { name: "Philippines", code: "ph", capital: "Manila" },
    French: { name: "France", code: "fr", capital: "Paris", query: "France" },
    Greek: { name: "Greece", code: "gr", capital: "Athens" },
    Indian: { name: "India", code: "in", capital: "New Delhi", query: "India" },
    Irish: { name: "Ireland", code: "ie", capital: "Dublin" },
    Italian: { name: "Italy", code: "it", capital: "Rome" },
    Jamaican: { name: "Jamaica", code: "jm", capital: "Kingston" },
    Japanese: { name: "Japan", code: "jp", capital: "Tokyo" },
    Kenyan: { name: "Kenya", code: "ke", capital: "Nairobi" },
    Malaysian: { name: "Malaysia", code: "my", capital: "Kuala Lumpur" },
    Mexican: { name: "Mexico", code: "mx", capital: "Mexico City" },
    Moroccan: { name: "Morocco", code: "ma", capital: "Rabat" },
    Norwegian: { name: "Norway", code: "no", capital: "Oslo", query: "Norway" },
    Polish: { name: "Poland", code: "pl", capital: "Warsaw" },
    Portuguese: { name: "Portugal", code: "pt", capital: "Lisbon" },
    Russian: { name: "Russia", code: "ru", capital: "Moscow" },
    "Saudi Arabian": { name: "Saudi Arabia", code: "sa", capital: "Riyadh" },
    Slovak: { name: "Slovakia", code: "sk", capital: "Bratislava", query: "Slovakia" },
    Spanish: { name: "Spain", code: "es", capital: "Madrid" },
    Syrian: { name: "Syria", code: "sy", capital: "Damascus" },
    Thai: { name: "Thailand", code: "th", capital: "Bangkok" },
    Tunisian: { name: "Tunisia", code: "tn", capital: "Tunis" },
    Turkish: { name: "Turkey", code: "tr", capital: "Ankara" },
    Ukrainian: { name: "Ukraine", code: "ua", capital: "Kyiv" },
    Uruguayan: { name: "Uruguay", code: "uy", capital: "Montevideo" },
    Venezuelan: { name: "Venezuela", code: "ve", capital: "Caracas", query: "Venezuela" },
    Vietnamese: { name: "Vietnam", code: "vn", capital: "Hanoi" }
  };

  /* Open-Meteo returns WMO weather codes */
  const WEATHER_CODES = {
    0: ["Clear sky", "☀️", "🌙"], 1: ["Mostly clear", "🌤️", "🌙"], 2: ["Partly cloudy", "⛅", "☁️"],
    3: ["Overcast", "☁️", "☁️"], 45: ["Foggy", "🌫️", "🌫️"], 48: ["Freezing fog", "🌫️", "🌫️"],
    51: ["Light drizzle", "🌦️", "🌧️"], 53: ["Drizzle", "🌦️", "🌧️"], 55: ["Heavy drizzle", "🌧️", "🌧️"],
    56: ["Freezing drizzle", "🌧️", "🌧️"], 57: ["Freezing drizzle", "🌧️", "🌧️"],
    61: ["Light rain", "🌦️", "🌧️"], 63: ["Rain", "🌧️", "🌧️"], 65: ["Heavy rain", "🌧️", "🌧️"],
    66: ["Freezing rain", "🌧️", "🌧️"], 67: ["Freezing rain", "🌧️", "🌧️"],
    71: ["Light snow", "🌨️", "🌨️"], 73: ["Snow", "🌨️", "🌨️"], 75: ["Heavy snow", "❄️", "❄️"],
    77: ["Snow grains", "🌨️", "🌨️"], 80: ["Rain showers", "🌦️", "🌧️"], 81: ["Rain showers", "🌧️", "🌧️"],
    82: ["Violent showers", "⛈️", "⛈️"], 85: ["Snow showers", "🌨️", "🌨️"], 86: ["Snow showers", "❄️", "❄️"],
    95: ["Thunderstorm", "⛈️", "⛈️"], 96: ["Thunderstorm with hail", "⛈️", "⛈️"], 99: ["Thunderstorm with hail", "⛈️", "⛈️"]
  };

  const STAMPS_KEY = "taste-passport-stamps";

  /* ---------- Elements ---------- */
  const $ = (id) => document.getElementById(id);
  const form = $("search-form");
  const input = $("cuisine-input");
  const datalist = $("cuisine-list");
  const statusEl = $("status");
  const destination = $("destination");
  const dishGrid = $("dish-grid");
  const dialog = $("recipe");

  const areaList = Object.keys(AREAS).sort();
  let clockTimer = null;
  let currentRequest = 0;             // ignores slow responses from an older search

  /* ---------- Helpers ---------- */
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* fetch() + JSON, with one retry: TheMealDB's free tier briefly
     blocks requests that come in too fast */
  async function getJSON(url, options, retries = 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`${response.status} from ${new URL(url).hostname}`);
      return await response.json();
    } catch (err) {
      if (retries > 0) {
        await wait(1500);
        return getJSON(url, options, retries - 1);
      }
      throw err;
    }
  }

  function postJSON(url, body) {
    return getJSON(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* Accepts "italian", "Italy", or " ITALIAN " and returns "Italian" */
  function matchArea(query) {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return areaList.find((a) => a.toLowerCase() === q) ||
      areaList.find((a) => AREAS[a].name.toLowerCase() === q || (AREAS[a].query || "").toLowerCase() === q) ||
      areaList.find((a) => a.toLowerCase().startsWith(q)) ||
      null;
  }

  /* ---------- Autocomplete list ---------- */
  function fillDatalist() {
    datalist.replaceChildren(...areaList.map((a) => {
      const option = document.createElement("option");
      option.value = a;
      return option;
    }));
  }

  /* ---------- Visit a cuisine ---------- */
  async function visit(area) {
    const request = ++currentRequest;
    const country = AREAS[area];

    setStatus(`Boarding for ${area} cuisine…`);
    destination.hidden = false;
    destination.dataset.current = area;
    destination.setAttribute("aria-busy", "true");

    $("destination-heading").textContent = `${area} cuisine`;
    $("country-name").textContent = country ? country.name : "Destination";
    ["fact-capital", "fact-time", "fact-weather", "fact-currency"].forEach((id) => {
      $(id).textContent = "…";
    });
    const flag = $("flag");
    if (country) {
      flag.src = FLAG(country.code);
      flag.alt = `Flag of ${country.name}`;
      flag.hidden = false;
    } else {
      flag.hidden = true;
    }
    showDishSkeletons();

    // Dishes and country facts load at the same time
    const [dishResult] = await Promise.allSettled([
      loadDishes(area, request),
      loadCountry(country, request)
    ]);

    if (request !== currentRequest) return;
    destination.removeAttribute("aria-busy");

    if (dishResult.status === "rejected") {
      setStatus("TheMealDB isn't responding right now. Wait a few seconds and try again.", true);
    } else if (dishResult.value === 0) {
      setStatus(`TheMealDB doesn't have any ${area} recipes yet. Try a popular stop below.`, true);
    } else {
      setStatus(`Welcome to ${area} cuisine: ${dishResult.value} dishes to explore.`);
      addStamp(area);
    }
  }

  function showDishSkeletons() {
    dishGrid.replaceChildren(...Array.from({ length: 8 }, () => {
      const li = el("li", "dish is-loading");
      li.setAttribute("aria-hidden", "true");
      return li;
    }));
    $("dish-count").textContent = "";
  }

  /* ---------- 1. TheMealDB: dishes for a cuisine ---------- */
  async function fetchMeals(word) {
    const data = await getJSON(`${MEALDB}/filter.php?a=${encodeURIComponent(word)}`);
    return data.meals || [];
  }

  async function loadDishes(area, request) {
    try {
      const country = AREAS[area];
      let meals = await fetchMeals((country && country.query) || area);
      // nothing under the nationality? try the country name
      if (meals.length === 0 && country && !country.query) meals = await fetchMeals(country.name);
      if (request !== currentRequest) return 0;
      $("dish-count").textContent = `${meals.length} ${meals.length === 1 ? "dish" : "dishes"}`;
      if (meals.length === 0) {
        dishGrid.replaceChildren(el("li", "dish-error", `No ${area} dishes in the cookbook yet.`));
        return 0;
      }

      dishGrid.replaceChildren(...meals.map((meal) => {
        const li = el("li", "dish");
        const button = el("button", "dish-button");
        button.type = "button";
        button.dataset.id = meal.idMeal;

        const img = el("img");
        img.src = `${meal.strMealThumb}/preview`;
        img.alt = "";
        img.width = 250;
        img.height = 250;
        img.loading = "lazy";

        const name = el("span", "dish-name", meal.strMeal);
        const cta = el("span", "dish-cta", "View recipe");
        button.append(img, name, cta);
        li.append(button);
        return li;
      }));
      return meals.length;
    } catch (err) {
      dishGrid.replaceChildren(el("li", "dish-error", "Dishes are unavailable right now."));
      throw err;
    }
  }

  /* ---------- 2–3. CountriesNow + Open-Meteo: country facts ---------- */
  async function loadCountry(country, request) {
    if (!country) {
      ["fact-capital", "fact-time", "fact-weather", "fact-currency"].forEach((id) => {
        $(id).textContent = "Not available";
      });
      return;
    }

    // CountriesNow: capital and currency (in parallel)
    const [capitalRes, currencyRes] = await Promise.allSettled([
      postJSON(`${COUNTRIES}/capital`, { country: country.name }),
      postJSON(`${COUNTRIES}/currency`, { country: country.name })
    ]);
    if (request !== currentRequest) return;

    // CountriesNow still uses some older spellings ("Kiev"), so fix those
    const capital = ((capitalRes.status === "fulfilled" && capitalRes.value.data && capitalRes.value.data.capital) ||
      country.capital).replace(/^Kiev$/, "Kyiv");
    $("fact-capital").textContent = capital;
    $("fact-currency").textContent =
      (currencyRes.status === "fulfilled" && currencyRes.value.data && currencyRes.value.data.currency) ||
      "Not available";

    // Open-Meteo geocoding: find the capital's coordinates and time zone.
    // Only accept a match in the right country ("Kiev" alone also finds a town in Russia).
    try {
      let place = await findPlace(capital, country.code);
      if (!place && capital !== country.capital) place = await findPlace(country.capital, country.code);
      if (!place) throw new Error("Capital not found");

      // Open-Meteo forecast: the weather right now
      const weather = await getJSON(
        `${WEATHER}?latitude=${place.latitude}&longitude=${place.longitude}` +
        "&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit&timezone=auto"
      );
      if (request !== currentRequest) return;

      const now = weather.current;
      const [label, dayIcon, nightIcon] = WEATHER_CODES[now.weather_code] || ["Unknown", "🌡️", "🌡️"];
      const tempF = Math.round(now.temperature_2m);
      const tempC = Math.round((now.temperature_2m - 32) * 5 / 9);
      const icon = el("span", "weather-icon", now.is_day ? dayIcon : nightIcon);
      icon.setAttribute("aria-hidden", "true");
      $("fact-weather").replaceChildren(icon,
        document.createTextNode(` ${tempF}°F (${tempC}°C), ${label.toLowerCase()}`));
      startClock(weather.timezone || place.timezone);
    } catch (err) {
      $("fact-weather").textContent = "Not available";
      $("fact-time").textContent = "Not available";
    }
  }

  async function findPlace(name, code) {
    const geo = await getJSON(`${GEOCODE}?name=${encodeURIComponent(name)}&count=10&language=en&format=json`);
    return (geo.results || []).find((r) => r.country_code && r.country_code.toLowerCase() === code) || null;
  }

  function startClock(timeZone) {
    clearInterval(clockTimer);
    const format = new Intl.DateTimeFormat("en-US", {
      timeZone, weekday: "short", hour: "numeric", minute: "2-digit"
    });
    const tick = () => { $("fact-time").textContent = format.format(new Date()); };
    tick();
    clockTimer = setInterval(tick, 30000);
  }

  /* ---------- Recipe dialog ---------- */
  async function openRecipe(id, mealData) {
    try {
      let meal = mealData;
      if (!meal) {
        setStatus("Opening recipe…");
        const data = await getJSON(`${MEALDB}/lookup.php?i=${encodeURIComponent(id)}`);
        meal = data.meals && data.meals[0];
      }
      if (!meal) throw new Error("Recipe not found");
      fillRecipe(meal);
      setStatus("");
      if (!dialog.open) dialog.showModal();
      dialog.scrollTop = 0;
    } catch (err) {
      setStatus("That recipe couldn't be loaded. Try another dish.", true);
    }
  }

  function fillRecipe(meal) {
    $("recipe-title").textContent = meal.strMeal;
    $("recipe-meta").textContent = [meal.strArea, meal.strCategory].filter(Boolean).join(" · ");

    const photo = $("recipe-photo");
    photo.src = meal.strMealThumb;
    photo.alt = `Plate of ${meal.strMeal}`;

    const tags = (meal.strTags || "").split(",").map((t) => t.trim()).filter(Boolean);
    $("recipe-tags").replaceChildren(...tags.map((t) => el("li", "", t)));

    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const name = (meal[`strIngredient${i}`] || "").trim();
      const amount = (meal[`strMeasure${i}`] || "").trim();
      if (name) ingredients.push({ name, amount });
    }
    $("recipe-ingredients").replaceChildren(...ingredients.map(({ name, amount }) => {
      const li = el("li");
      li.append(el("span", "amount", amount), el("span", "ingredient", name));
      return li;
    }));

    $("recipe-steps").replaceChildren(...splitSteps(meal.strInstructions).map((s) => el("li", "", s)));

    // Use the area to offer a trip to that cuisine
    const links = $("recipe-links");
    links.replaceChildren();
    if (meal.strYoutube) {
      const a = el("a", "button", "Watch the video");
      a.href = meal.strYoutube;
      a.rel = "noopener";
      links.append(a);
    }
    if (meal.strSource) {
      const a = el("a", "button button-secondary", "Original recipe");
      a.href = meal.strSource;
      a.rel = "noopener";
      links.append(a);
    }
    const mealArea = matchArea(meal.strArea || "");
    if (mealArea && destination.dataset.current !== mealArea) {
      const b = el("button", "button button-secondary", `Explore ${mealArea} cuisine`);
      b.type = "button";
      b.addEventListener("click", () => {
        dialog.close();
        go(mealArea);
      });
      links.append(b);
    }
  }

  /* Recipes come as one long string; turn it into clean steps.
     Drops "STEP 1" labels, leading bullets, and ALL-CAPS section
     headings like "MAKING THE SOUP" so only real steps are numbered. */
  function splitSteps(text) {
    const isHeading = (s) => s.length < 40 && /[A-Z]/.test(s) && s === s.toUpperCase();
    return (text || "")
      .split(/\r?\n+/)
      .map((s) => s.replace(/^\s*([-–•*▢]+\s*)?(step\s*\d+[:.)-]?|\d+[.)])?\s*/i, "").trim())
      .filter((s) => s && !/^step\s*\d*$/i.test(s) && !/^\d+$/.test(s) && !isHeading(s.replace(/:$/, "")));
  }

  /* ---------- Passport stamps (saved in this browser) ---------- */
  function getStamps() {
    try {
      return JSON.parse(localStorage.getItem(STAMPS_KEY)) || [];
    } catch (err) {
      return [];
    }
  }

  function saveStamps(stamps) {
    try {
      localStorage.setItem(STAMPS_KEY, JSON.stringify(stamps));
    } catch (err) {
      // storage blocked; stamps still show for this visit
    }
    renderStamps(stamps);
  }

  function addStamp(area) {
    const stamps = getStamps().filter((s) => s.area !== area);
    stamps.unshift({ area, date: new Date().toISOString() });
    saveStamps(stamps.slice(0, 24));
  }

  function renderStamps(stamps) {
    const list = $("stamps");
    list.replaceChildren(...stamps.map((s, i) => {
      const country = AREAS[s.area];
      const li = el("li");
      const b = el("button", `stamp stamp-${i % 4}`);
      b.type = "button";
      b.dataset.area = s.area;
      b.append(el("span", "stamp-area", s.area));
      if (country) b.append(el("span", "stamp-code", country.code.toUpperCase()));
      const time = el("time", "stamp-date",
        new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
      time.dateTime = s.date.slice(0, 10);
      b.append(time);
      b.setAttribute("aria-label", `Revisit ${s.area} cuisine, stamped ${time.textContent}`);
      li.append(b);
      return li;
    }));
    $("passport-empty").hidden = stamps.length > 0;
    $("clear-stamps").hidden = stamps.length === 0;
  }

  /* ---------- Routing: #/Italian, so Back and sharing work ---------- */
  function go(area) {
    const hash = `#/${encodeURIComponent(area)}`;
    if (location.hash === hash) visit(area);
    else location.hash = hash;
  }

  function route() {
    const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    if (!raw || raw === "top" || raw === "main") return;
    const area = matchArea(raw);
    if (area) {
      input.value = area;
      visit(area).then(() => {
        destination.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
    }
  }

  /* ---------- Events ---------- */
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const area = matchArea(input.value);
    if (area) {
      go(area);
    } else {
      setStatus(`No flights to "${input.value.trim()}" yet. Try one of: ${areaList.slice(0, 6).join(", ")}…`, true);
      input.focus();
    }
  });

  document.addEventListener("click", (event) => {
    const chip = event.target.closest("button[data-area]");
    if (chip) {
      go(chip.dataset.area);
      return;
    }
    const dish = event.target.closest(".dish-button");
    if (dish) openRecipe(dish.dataset.id);
  });

  $("surprise-button").addEventListener("click", async () => {
    try {
      setStatus("Picking a surprise dish…");
      const data = await getJSON(`${MEALDB}/random.php`);
      openRecipe(null, data.meals[0]);
    } catch (err) {
      setStatus("We couldn't pick a surprise dish. Try again.", true);
    }
  });

  $("clear-stamps").addEventListener("click", () => {
    saveStamps([]);
    setStatus("Your passport is clear.");
  });

  // Click on the dark backdrop closes the recipe
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  window.addEventListener("hashchange", route);

  /* ---------- Start ---------- */
  fillDatalist();
  renderStamps(getStamps());
  route();
})();
