# Taste Passport

**Travel the world one recipe at a time.** Taste Passport is a single page web app: pick a cuisine and see its dishes, open any dish for the full recipe, and see the live weather and local time in that country's capital. Every cuisine you visit earns a stamp in your passport.

## APIs used (a 4-source mashup)

| API | What it provides | Endpoints |
| --- | --- | --- |
| [TheMealDB](https://www.themealdb.com/api.php) | Dishes for each cuisine, full recipes and food photos, random dish | `filter.php?a=`, `lookup.php?i=`, `random.php` |
| [CountriesNow](https://countriesnow.space/) | The country's capital city and currency | `POST /countries/capital`, `POST /countries/currency` |
| [Open-Meteo](https://open-meteo.com/) | Capital city coordinates and time zone, then current weather | Geocoding `search?name=`, Forecast `current=temperature_2m,weather_code,is_day` |
| [Flagpedia](https://flagpedia.net/download/api) | Country flag image | `flagcdn.com/w160/{code}.png` |

All data is loaded with the JavaScript `fetch()` API. The dishes and the country facts load at the same time, and each API can fail without breaking the others. For example, if the weather is down, the dishes still show.

## How the APIs connect

1. You pick **Jamaican** → TheMealDB returns its dishes.
2. Jamaican maps to **Jamaica** → CountriesNow returns the capital (**Kingston**) and currency (**JMD**).
3. Open-Meteo geocodes **Kingston, JM**, then returns the current weather and time zone for those coordinates. The local time is shown and updates every 30 seconds.

## Features

- **Search with autocomplete** (cuisine or country name, so "Italy" works too) and one-click "Popular stops"
- **Recipe dialog** with photo, ingredients, numbered steps, tags, and video/source links. It closes with Esc, the × button, or a click outside it, and focus goes back to the dish you opened.
- **Surprise me** opens a random dish from anywhere in the world.
- **Passport stamps** remember every cuisine you've visited (saved in `localStorage`).
- **Shareable URLs**: each cuisine has its own address (`#/Italian`), so the browser's Back button and bookmarks work.
- **Loading and error states**: skeleton cards while dishes load, plus a live status message for screen readers.

## Design

The theme is a travel passport: a navy passport cover header, cream "security paper" background, a boarding-pass search card with a perforated edge, luggage-tag buttons, and rubber-stamp passport stamps.

## Accessibility and standards

- Semantic HTML (`header`, `main`, `section`, `article`, `dl`, `dialog`, `footer`). Passes the W3C Markup and CSS validators.
- Native `<dialog>`, buttons, and form controls, so everything works with the keyboard.
- Skip link, visible focus outlines, `aria-live` status messages, WCAG AA color contrast
- Respects `prefers-reduced-motion`

## Files

- `index.html`: page structure
- `styles.css`: all styles
- `app.js`: fetch calls and app logic
