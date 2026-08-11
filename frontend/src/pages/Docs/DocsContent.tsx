import styles from "./DocsApp.module.css";

const docsHtml = `

  <!-- ── Hero ── -->
  <p class="hero-lead" id="overview">
    A full-stack web application that evaluates and displays the navigability of rivers, estuaries,
    reservoirs, coastal waters and lagoons in real time. A Python/FastAPI backend fetches hydrological
    and meteorological data from the Open-Meteo family of APIs, scores each station against
    dynamically calibrated thresholds, and exposes the results through a REST API consumed by a
    React/TypeScript single-page application rendered on a Leaflet map.
  </p>

  <!-- ─────────────────────────────────────────────── -->
  <h2 id="architecture">Architecture</h2>

  <div class="mermaid">
flowchart TD
    subgraph Client [Client Browser]
        direction LR
        TB[TopBar]
        SB[Sidebar]
        SM[StationMap]
        DP[DetailPanel]
    end

    API{{apiClient.ts HTTP REST}}

    subgraph Backend [FastAPI Backend]
        direction TB
        api[api.py] --> nav[navigability.py]
        nav --> sch[schemas.py]
        nav --> fetch[openmeteo_fetcher.py]
        fetch -.-> OM[(Open-Meteo APIs)]
        nav --> cal[calibration.py]
        cal -.-> OM
        nav --> mar[marine.py]
        nav --> auth[auth.py]
        auth -.-> sup[(Supabase Auth)]
        nav --> db[database.py]
        db -.-> pg[(PostgreSQL)]
    end

    Client --> API
    API --> Backend
  </div>

  <!-- ─────────────────────────────────────────────── -->
  <h2 id="stack">Technology Stack</h2>

  <table>
    <thead><tr><th>Layer</th><th>Technology</th><th>Version</th><th>Purpose</th></tr></thead>
    <tbody>
      <tr><td>Backend runtime</td><td>Python</td><td>3.11+</td><td>Application server language</td></tr>
      <tr><td>Web framework</td><td>FastAPI</td><td>0.139</td><td>REST API, async, OpenAPI docs</td></tr>
      <tr><td>ASGI server</td><td>Uvicorn</td><td>0.51</td><td>Production ASGI runner</td></tr>
      <tr><td>ORM</td><td>SQLAlchemy</td><td>2.0.51</td><td>Declarative models, sessions</td></tr>
      <tr><td>Database</td><td>PostgreSQL + PostGIS</td><td>15</td><td>Persistent station + observation data</td></tr>
      <tr><td>DB driver</td><td>psycopg2-binary</td><td>2.9.12</td><td>Python ↔ PostgreSQL wire protocol</td></tr>
      <tr><td>Auth</td><td>Supabase</td><td>2.9</td><td>JWT-based user auth &amp; sessions</td></tr>
      <tr><td>Scheduling</td><td>APScheduler</td><td>3.11</td><td>6-hour background data refresh</td></tr>
      <tr><td>Rate limiting</td><td>slowapi</td><td>0.1.10</td><td>Per-IP request throttling</td></tr>
      <tr><td>Data validation</td><td>Pydantic v2</td><td>2.13</td><td>Request/response schemas</td></tr>
      <tr><td>External data</td><td>Open-Meteo APIs</td><td>—</td><td>Wind, river discharge, marine</td></tr>
      <tr><td>Frontend framework</td><td>React</td><td>19.2</td><td>UI components</td></tr>
      <tr><td>Language</td><td>TypeScript</td><td>5.x</td><td>Type-safe frontend</td></tr>
      <tr><td>Bundler</td><td>Vite</td><td>8.1</td><td>Dev server &amp; production build</td></tr>
      <tr><td>Map</td><td>Leaflet + react-leaflet</td><td>1.9 / 5.0</td><td>Interactive map with station markers</td></tr>
      <tr><td>Charts</td><td>Recharts</td><td>3.9</td><td>Historical data line charts</td></tr>
      <tr><td>CSS</td><td>CSS Modules</td><td>—</td><td>Scoped component styles</td></tr>
      <tr><td>Geocoding</td><td>Nominatim (OSM)</td><td>—</td><td>Reverse geocoding for new stations</td></tr>
    </tbody>
  </table>

<!-- ══════════════════ BACKEND ══════════════════ -->
  <h2 id="backend-entry">Entry Point</h2>
  <p><strong>File:</strong> <code>src/api.py</code></p>

  <p>
    <code>api.py</code> is the single FastAPI application module. It owns the app instance,
    middleware configuration, scheduler lifecycle, dependency injection of database sessions,
    and all HTTP route handlers.
  </p>

  <h3>Application bootstrap</h3>
  <pre><code><span class="kw">from</span> contextlib <span class="kw">import</span> asynccontextmanager
<span class="kw">from</span> apscheduler.schedulers.background <span class="kw">import</span> BackgroundScheduler

<span class="comment"># lifespan() runs at startup and shutdown (FastAPI 0.90+ lifespan protocol)</span>
<span class="kw">@asynccontextmanager</span>
<span class="kw">async def</span> <span class="fn">lifespan</span>(app):
    scheduler = BackgroundScheduler()
    scheduler.add_job(update_weather_data)                    <span class="comment"># run immediately</span>
    scheduler.add_job(update_weather_data, <span class="str">"interval"</span>, hours=<span class="num">6</span>)  <span class="comment"># then every 6 h</span>
    scheduler.start()
    <span class="kw">yield</span>
    scheduler.shutdown()

app = FastAPI(title=<span class="str">"Canoeing Navigability API"</span>, lifespan=lifespan)</code></pre>

  <h3>Middleware stack</h3>
  <ul>
    <li><strong>CORSMiddleware</strong> — origins read from <code>CORS_ORIGIN</code> env var (comma-separated list); methods: GET, POST, PUT, DELETE, OPTIONS; custom header: <code>X-Post-Secret</code>.</li>
    <li><strong>SlowAPIMiddleware</strong> — global rate-limit enforcement via slowapi; key function is the client's remote IP address.</li>
  </ul>

  <h3>Database session injection</h3>
  <pre><code><span class="kw">def</span> <span class="fn">get_db</span>() -&gt; Generator[Session, None, None]:
    db = SessionLocal()
    <span class="kw">try</span>:
        <span class="kw">yield</span> db
    <span class="kw">finally</span>:
        db.close()</code></pre>
  <p>
    Used as a FastAPI dependency (<code>Depends(get_db)</code>) in every route that accesses the
    database. Guarantees the session is closed regardless of exceptions.
  </p>

  <h3>Score aggregation in <code>GET /api/stations/score</code></h3>
  <p>This is the most complex handler. It avoids N+1 queries through two optimised bulk fetches:</p>
  <ol>
    <li>A subquery finds <code>MAX(date)</code> per <code>water_body_id</code> across <code>data_observations</code>.</li>
    <li>A join retrieves only the matching rows (latest observation per station) in one SQL round-trip.</li>
    <li>A second query pulls all <code>hourly_forecasts</code> with <code>timestamp &gt;= now_hour</code> and selects the first (earliest upcoming) row per station into a dict.</li>
    <li>The inner closure <code>get_val(attr)</code> prefers the hourly forecast value over the historical observation, enabling seamless fallback.</li>
    <li>Each station is then passed through <code>evaluate_water_body()</code> from <code>navigability.py</code>.</li>
  </ol>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="database">Database</h2>
  <p><strong>File:</strong> <code>src/database.py</code></p>

  <p>
    Declares all SQLAlchemy ORM models using the <code>DeclarativeBase</code> / <code>Mapped</code>
    typed-column style introduced in SQLAlchemy 2.0. The connection URL is read from
    <code>DATABASE_URL</code> at import time.
  </p>

  <h3>WaterBody</h3>
  <div class="card">
    <table>
      <thead><tr><th>Column</th><th>Type</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><code>id</code></td><td>int PK</td><td>Auto-increment primary key</td></tr>
        <tr><td><code>name</code></td><td>str UNIQUE</td><td>Human-readable station name</td></tr>
        <tr><td><code>type</code></td><td>WaterBodyType</td><td>RIVER | RESERVOIR | ESTUARY | COASTAL | LAGOON</td></tr>
        <tr><td><code>latitude</code></td><td>float</td><td>WGS-84 decimal degrees</td></tr>
        <tr><td><code>longitude</code></td><td>float</td><td>WGS-84 decimal degrees</td></tr>
        <tr><td><code>region</code></td><td>str</td><td>State / region from Nominatim reverse geocode</td></tr>
        <tr><td><code>district</code></td><td>str</td><td>County / city from Nominatim</td></tr>
        <tr><td><code>flow_min</code></td><td>float?</td><td>15th-percentile discharge (m³/s) — rivers only</td></tr>
        <tr><td><code>flow_max</code></td><td>float?</td><td>80th-percentile discharge — rivers only</td></tr>
        <tr><td><code>flow_danger</code></td><td>float?</td><td>95th-percentile discharge — rivers only</td></tr>
        <tr><td><code>wave_max_good</code></td><td>float?</td><td>Reserved (not yet in scoring logic)</td></tr>
        <tr><td><code>wave_max_poor</code></td><td>float?</td><td>Reserved</td></tr>
        <tr><td><code>wave_max_danger</code></td><td>float?</td><td>Reserved</td></tr>
        <tr><td><code>tide_min_m</code></td><td>float?</td><td>50th-percentile sea level — tidal types</td></tr>
        <tr><td><code>tide_max_m</code></td><td>float?</td><td>92nd-percentile sea level — tidal types</td></tr>
        <tr><td><code>created_at</code></td><td>datetime</td><td>UTC, set by default lambda</td></tr>
      </tbody>
    </table>
    <p><em>Relationship:</em> <code>hourly_forecasts → HourlyForecast[]</code> with cascade delete-orphan.</p>
  </div>

  <h3>DataObservation</h3>
  <div class="card">
    <p>One row per station per calendar day. Unique constraint on <code>(water_body_id, date)</code>.</p>
    <table>
      <thead><tr><th>Column</th><th>Type</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><code>water_body_id</code></td><td>int FK</td><td>→ water_bodies.id</td></tr>
        <tr><td><code>date</code></td><td>date</td><td>Calendar day of the observation</td></tr>
        <tr><td><code>is_forecast</code></td><td>bool</td><td>Currently always <code>False</code>; reserved for future use</td></tr>
        <tr><td><code>flow_rate_m3s</code></td><td>float?</td><td>River discharge in m³/s</td></tr>
        <tr><td><code>tide_level_m</code></td><td>float?</td><td>Sea level height MSL in metres</td></tr>
        <tr><td><code>wind_speed_kmh</code></td><td>float?</td><td>Wind at 10 m height (km/h)</td></tr>
        <tr><td><code>wind_gust_kmh</code></td><td>float?</td><td>Wind gust at 10 m (km/h)</td></tr>
        <tr><td><code>wave_height_m</code></td><td>float?</td><td>Significant wave height (m)</td></tr>
      </tbody>
    </table>
  </div>

  <h3>HourlyForecast</h3>
  <div class="card">
    <p>
      One row per station per UTC hour. Unique constraint on <code>(water_body_id, timestamp)</code>.
      Holds both the raw meteorological values and the pre-computed navigability scores.
    </p>
    <table>
      <thead><tr><th>Column</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><code>timestamp</code></td><td>UTC datetime for this forecast hour</td></tr>
        <tr><td><code>flow_rate_m3s</code></td><td>Daily river discharge repeated for each hour</td></tr>
        <tr><td><code>tide_level_m</code></td><td>Hourly sea level</td></tr>
        <tr><td><code>wind_speed_kmh</code></td><td>Hourly wind speed</td></tr>
        <tr><td><code>wind_gust_kmh</code></td><td>Hourly wind gust</td></tr>
        <tr><td><code>wave_height_m</code></td><td>Hourly wave height</td></tr>
        <tr><td><code>flow_score</code></td><td>Computed navigability string</td></tr>
        <tr><td><code>tide_score</code></td><td>Computed navigability string</td></tr>
        <tr><td><code>wind_score</code></td><td>Computed navigability string</td></tr>
        <tr><td><code>final_score</code></td><td>Aggregated score for the hour</td></tr>
      </tbody>
    </table>
  </div>

  <h3>User &amp; UserFavorite</h3>
  <div class="card">
    <p><strong>User</strong>: primary key is the Supabase UUID string (<code>id: str</code>). Stores timezone preference. Created on first auth, auto-upserted on JWT validation.</p>
    <p><strong>UserFavorite</strong>: junction table. Unique constraint on <code>(user_id, water_body_id)</code>. No cascade required — deleting a station does not delete user rows in production; that logic is handled by DB FK rules.</p>
  </div>

  <h3>WaterBodyType enum</h3>
  <pre><code><span class="kw">class</span> <span class="cls">WaterBodyType</span>(str, Enum):
    RIVER      = <span class="str">"RIVER"</span>
    RESERVOIR  = <span class="str">"RESERVOIR"</span>
    ESTUARY    = <span class="str">"ESTUARY"</span>
    COASTAL    = <span class="str">"COASTAL"</span>
    LAGOON     = <span class="str">"LAGOON"</span></code></pre>
  <p>
    <code>str, Enum</code> inheritance means values serialise directly to/from JSON strings.
    Tidal classification: ESTUARY, LAGOON, COASTAL are "tidal" types.
  </p>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="schemas">Schemas</h2>
  <p><strong>File:</strong> <code>src/schemas.py</code></p>

  <p>All Pydantic v2 models used for request validation and response serialisation.</p>

  <h3>NavigabilityScore</h3>
  <pre><code><span class="kw">class</span> <span class="cls">NavigabilityScore</span>(Enum):
    EXCELLENT  = <span class="str">"EXCELLENT"</span>   <span class="comment"># flow in low-to-mid optimal range; wind ≤ 15 km/h</span>
    GOOD       = <span class="str">"GOOD"</span>        <span class="comment"># conditions acceptable</span>
    POOR       = <span class="str">"POOR"</span>        <span class="comment"># outside calibrated range or wind 25–40 km/h</span>
    DANGEROUS  = <span class="str">"DANGEROUS"</span>   <span class="comment"># at or above danger threshold; wind > 40 km/h</span>
    UNKNOWN    = <span class="str">"UNKNOWN"</span>     <span class="comment"># missing data or uncalibrated thresholds</span></code></pre>

  <h3>StationCreate</h3>
  <p>Request body for <code>POST /api/stations</code>. Validates name length (2–120 chars, stripped of whitespace).</p>

  <h3>StationScore</h3>
  <p>Response model for every element of <code>GET /api/stations/score</code>. Contains all raw measurements and all individual/final score strings. Threshold fields (<code>flow_min</code>, etc.) are only populated if <code>flow_max ≥ 1.0</code> — i.e. the station has meaningful calibration data.</p>

  <h3>HourlyForecastEntry</h3>
  <p>Uses <code>ConfigDict(from_attributes=True)</code> so it can be constructed directly from a <code>HourlyForecast</code> ORM row. The <code>final_score</code> field is non-optional (always returned).</p>

  <h3>ForecastResponse</h3>
  <pre><code><span class="kw">class</span> <span class="cls">ForecastResponse</span>(BaseModel):
    hourly:           list[HourlyForecastEntry]
    daily_summaries:  dict[str, DailyMarineSummary]  <span class="comment"># keyed YYYY-MM-DD</span></code></pre>

  <h3>Marine types</h3>
  <table>
    <thead><tr><th>Type</th><th>Fields</th><th>Purpose</th></tr></thead>
    <tbody>
      <tr><td><code>TidalPeak</code></td><td><code>time: str, level: float</code></td><td>A single high/low tide peak</td></tr>
      <tr><td><code>PaddlingWindow</code></td><td><code>start_time?, end_time?, peak_hour</code></td><td>Best 1–3 hour window per day</td></tr>
      <tr><td><code>DailyMarineSummary</code></td><td><code>high_tides[], low_tides[], best_paddling_window?</code></td><td>Day-level marine summary</td></tr>
    </tbody>
  </table>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="navigability">Navigability</h2>
  <p><strong>File:</strong> <code>src/navigability.py</code></p>

  <p>
    Pure scoring functions. No I/O, no database access. All functions accept optional float
    parameters and return <code>NavigabilityScore</code> enum values.
  </p>

  <h3>evaluate_river(wb, obs, flow)</h3>
  <pre><code><span class="comment"># Thresholds from calibration (15th / 80th / 95th discharge percentiles)</span>
<span class="kw">if</span> flow &gt;= f_danger:  <span class="op">return</span> DANGEROUS
<span class="kw">if</span> flow &lt;  f_min <span class="op">or</span> flow &gt; f_max:  <span class="op">return</span> POOR
<span class="kw">if</span> flow &lt;= f_min + (f_max - f_min) * <span class="num">0.6</span>:  <span class="op">return</span> EXCELLENT
<span class="op">return</span> GOOD</code></pre>
  <p>
    Returns <code>UNKNOWN</code> when any threshold is <code>None</code> or when <code>flow_max &lt; 1.0</code>
    (which signals the Open-Meteo Flood API returned negligible data for the coordinate — e.g.
    a coastal body entered as RIVER type, or a location with no upstream catchment).
  </p>

  <h3>evaluate_estuary(wb, obs, tide)</h3>
  <pre><code><span class="kw">if</span> tide &lt; t_min:  <span class="op">return</span> POOR      <span class="comment"># below 50th-percentile sea level → too shallow</span>
<span class="kw">if</span> tide &lt; t_max:  <span class="op">return</span> GOOD      <span class="comment"># between 50th and 92nd percentile</span>
<span class="op">return</span> EXCELLENT                   <span class="comment"># above 92nd percentile → deep water</span></code></pre>

  <h3>evaluate_wind(obs, wind)</h3>
  <p>Fixed absolute thresholds (not calibrated), because capsizing risk is independent of local historical norms:</p>
  <table>
    <thead><tr><th>Wind Speed</th><th>Score</th></tr></thead>
    <tbody>
      <tr><td>&gt; 40 km/h</td><td><span class="badge badge-score s-dangerous">DANGEROUS</span></td></tr>
      <tr><td>25–40 km/h</td><td><span class="badge badge-score s-poor">POOR</span></td></tr>
      <tr><td>15–25 km/h</td><td><span class="badge badge-score s-good">GOOD</span></td></tr>
      <tr><td>≤ 15 km/h</td><td><span class="badge badge-score s-excellent">EXCELLENT</span></td></tr>
    </tbody>
  </table>

  <h3>evaluate_water_body(wb, latest_obs, flow, wind, tide, wind_gust, wave_height)</h3>
  <p>
    Orchestrator. Selects which domain scorer applies based on <code>wb.type</code>. RIVER → <code>evaluate_river</code>;
    ESTUARY | LAGOON → <code>evaluate_estuary</code>; COASTAL and RESERVOIR → wind-only.
  </p>
  <p><strong>Final score aggregation rule (pessimistic):</strong></p>
  <ul>
    <li>If any applicable score is DANGEROUS → final = DANGEROUS</li>
    <li>Else if any is POOR → final = POOR</li>
    <li>Else if all are EXCELLENT → final = EXCELLENT</li>
    <li>Else → final = GOOD</li>
    <li>If no applicable scores (all UNKNOWN) → final = UNKNOWN</li>
  </ul>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="marine">Marine</h2>
  <p><strong>File:</strong> <code>src/marine.py</code></p>

  <p>Provides tidal analysis helpers over a list of <code>HourlyForecastEntry</code> objects.</p>

  <h3>find_all_tidal_peaks(hours)</h3>
  <p>
    Scans an arbitrary-length hourly list for local maxima (high tides) and local minima (low tides)
    using a single-pass three-point comparison. Caps at 2 highs and 2 lows per calendar day —
    matching the semi-diurnal tide pattern of Atlantic/European waters. Returns a dict keyed by
    <code>"YYYY-MM-DD"</code> with sub-keys <code>"highs"</code> and <code>"lows"</code>.
  </p>
  <pre><code><span class="comment"># High tide: current > previous AND current >= next</span>
<span class="kw">if</span> curr &gt; prev_h <span class="kw">and</span> curr &gt;= next_h:
    peaks_by_day[day_str][<span class="str">"highs"</span>].append(TidalPeak(time=time, level=curr))

<span class="comment"># Low tide: current < previous AND current <= next</span>
<span class="kw">elif</span> curr &lt; prev_l <span class="kw">and</span> curr &lt;= next_l:
    peaks_by_day[day_str][<span class="str">"lows"</span>].append(TidalPeak(time=time, level=curr))</code></pre>

  <h3>find_best_paddling_window(hours, is_tidal)</h3>
  <p>
    For <strong>tidal</strong> stations: finds the hour with the highest tide level (maximum water depth →
    maximum navigability). Returns a <code>PaddlingWindow</code> with <code>start_time</code> set to one hour
    before the peak and <code>end_time</code> to one hour after.
  </p>
  <p>
    For <strong>non-tidal</strong> stations: finds the hour with the lowest combined wind + gust.
    Returns a <code>PaddlingWindow</code> with only <code>peak_hour</code> set (no time window).
  </p>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="calibration">Calibration</h2>
  <p><strong>File:</strong> <code>src/calibration.py</code></p>

  <p>
    Called once during station creation (<code>POST /api/stations</code>) to derive station-specific
    thresholds from 365 days (rivers) or 30 days (tidal) of historical data.
  </p>

  <h3>calibrate_station_thresholds(wb, db)</h3>
  <p><strong>Rivers</strong> — fetches 365 days of <code>river_discharge</code> from the Open-Meteo Flood API, then:</p>
  <pre><code>wb.flow_min    = get_percentile(flows, <span class="num">15</span>)   <span class="comment"># lower paddling threshold</span>
wb.flow_max    = get_percentile(flows, <span class="num">80</span>)   <span class="comment"># upper paddling threshold</span>
wb.flow_danger = get_percentile(flows, <span class="num">95</span>)   <span class="comment"># flood/danger threshold</span>

<span class="comment"># If max < 1.0 m³/s — negligible model data — clear all thresholds</span>
<span class="kw">if</span> current_max <span class="op">is not</span> None <span class="kw">and</span> current_max &lt; <span class="num">1.0</span>:
    wb.flow_min = wb.flow_max = wb.flow_danger = None</code></pre>

  <p><strong>Tidal types</strong> (ESTUARY, LAGOON, COASTAL) — fetches 30 days of hourly <code>sea_level_height_msl</code> from the Open-Meteo Marine API:</p>
  <pre><code>wb.tide_min_m = get_percentile(sea_levels, <span class="num">50</span>)
wb.tide_max_m = get_percentile(sea_levels, <span class="num">92</span>)</code></pre>
  <p>Wind is never calibrated because wind scoring uses absolute safety thresholds.</p>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="fetcher">Fetcher</h2>
  <p><strong>File:</strong> <code>src/openmeteo_fetcher.py</code></p>

  <p>All external HTTP calls to the Open-Meteo API family. Three private fetch functions and two public orchestrators.</p>

  <h3>Private fetch functions</h3>
  <table>
    <thead><tr><th>Function</th><th>API endpoint</th><th>Variables fetched</th></tr></thead>
    <tbody>
      <tr><td><code>_fetch_wind_data(wb, forecast_days, past_days)</code></td><td><code>api.open-meteo.com/v1/forecast</code></td><td><code>wind_speed_10m, wind_gusts_10m</code> (hourly)</td></tr>
      <tr><td><code>_fetch_flow_data(wb, forecast_days, past_days)</code></td><td><code>flood-api.open-meteo.com/v1/flood</code></td><td><code>river_discharge</code> (daily) → mapped by date string for hourly lookup</td></tr>
      <tr><td><code>_fetch_tidal_data(wb, forecast_days, past_days)</code></td><td><code>marine-api.open-meteo.com/v1/marine</code></td><td><code>sea_level_height_msl, wave_height</code> (hourly)</td></tr>
    </tbody>
  </table>

  <h3>fetch_data_for_single_body(wb, db)</h3>
  <p>
    Called for new station creation and during the scheduled background sweep. Fetches 7 past days +
    today. For each calendar day, the <em>best</em> hour (best paddling window) is selected as the
    representative observation stored in <code>data_observations</code>. If a row for that date already
    exists it is updated in-place; otherwise a new row is inserted.
  </p>
  <div class="alert alert-note">
    River discharge is a daily value from the Flood API. It is repeated for every hour in the day when
    building per-hour score objects, then the best-hour selection picks the most favourable wind
    condition for the day's observation row.
  </div>

  <h3>fetch_hourly_forecasts_for_single_body(wb, db)</h3>
  <p>
    Fetches 7-day forward forecasts. Loads all existing <code>HourlyForecast</code> rows for the
    station into an in-memory dict (<code>timestamp → HourlyForecast</code>) in a single query, then
    iterates the 168 forecast hours and either updates existing rows or inserts new ones — avoiding
    N+1 queries.
  </p>

  <h3>fetch_data_for_water_bodies()</h3>
  <p>Background job entry point. Opens its own DB session, queries all stations, calls both per-station functions in sequence, closes session.</p>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="auth-backend">Auth</h2>
  <p><strong>File:</strong> <code>src/auth.py</code></p>

  <p>
    JWT-based authentication via the Supabase Python SDK. FastAPI's <code>HTTPBearer</code> security
    scheme extracts the token from the <code>Authorization: Bearer &lt;token&gt;</code> header.
  </p>

  <h3>get_current_user_id(credentials)</h3>
  <pre><code><span class="fn">supabase.auth.get_user</span>(token)           <span class="comment"># validates JWT against Supabase</span>
user_id = user_response.user.id          <span class="comment"># Supabase UUID string</span>

<span class="comment"># Auto-create local user row on first sign-in (upsert pattern)</span>
<span class="kw">with</span> SessionLocal() <span class="kw">as</span> db:
    user = db.query(User).filter(User.id == user_id).first()
    <span class="kw">if not</span> user:
        user = User(id=user_id)
        db.add(user)
        db.commit()             <span class="comment"># IntegrityError caught and rolled back on race</span></code></pre>
  <p>
    The local <code>users</code> table mirrors only <code>id</code> and <code>timezone</code>. Supabase remains the
    source of truth for credentials. On concurrent first-logins, <code>IntegrityError</code> from the
    unique primary key is caught and the rollback is silent.
  </p>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="helpers">Helpers &amp; Utils</h2>

  <h3>helpers.py</h3>
  <pre><code>TIDAL_TYPES = {WaterBodyType.ESTUARY, WaterBodyType.LAGOON, WaterBodyType.COASTAL}

<span class="kw">def</span> <span class="fn">is_tidal</span>(wb: WaterBody) -&gt; bool:
    <span class="kw">return</span> wb.type <span class="kw">in</span> TIDAL_TYPES</code></pre>
  <p>Single shared predicate used throughout the backend to branch logic between tidal and non-tidal water bodies.</p>

  <h3>utils.py</h3>
  <p><code>get_location_details(lat, lon)</code> — reverse geocodes coordinates via Nominatim (<code>User-Agent: CanoeCompass/1.0</code>). Extracts <code>county/city</code> as district and <code>state/region</code> as region. Returns <code>("Unknown", "Unknown")</code> on any error.</p>
  <p><code>get_distance_km(lat1, lon1, lat2, lon2)</code> — Haversine formula with Earth radius 6371 km. Used during station creation to reject duplicates within 500 m.</p>
  <p><code>get_percentile(data, percentile)</code> — sorts the list, computes index as <code>len(data) * percentile / 100</code> clamped to valid range, returns the value rounded to 2 decimal places. Returns <code>None</code> on empty input.</p>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="backfill">Backfill</h2>
  <p><strong>File:</strong> <code>src/backfill.py</code></p>

  <p>
    A one-shot script (run with <code>python -m src.backfill</code>) for loading historical data into an
    already-populated station set. Hardcoded to 2026-07-01 → 2026-07-17. Fetches daily max wind speed
    from the Open-Meteo Archive API and, for rivers, daily discharge from the Flood API.
    Inserts <code>DataObservation</code> rows without upsert logic — intended for use on a clean date range
    to avoid duplicates.
  </p>
  <div class="alert alert-warn">
    <code>BACKFILL_START</code> and <code>BACKFILL_END</code> are hardcoded constants. Edit before running for a
    different date range.
  </div>

<!-- ══════════════════ API REFERENCE ══════════════════ -->
  <h2 id="api-public">API Reference: Public Endpoints</h2>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/stations/score</span>
    </div>
    <div class="endpoint-body">
      <p>Returns an array of all stations with their latest navigability assessment. No authentication required.</p>
      <p><strong>Rate limit:</strong> 60 requests/minute per IP.</p>
      <p><strong>Response:</strong> <code>StationScore[]</code></p>
      <pre><code>[
  {
    <span class="str">"id"</span>: <span class="num">1</span>,
    <span class="str">"name"</span>: <span class="str">"River Tay at Perth"</span>,
    <span class="str">"type"</span>: <span class="str">"RIVER"</span>,
    <span class="str">"latitude"</span>: <span class="num">56.394</span>,
    <span class="str">"longitude"</span>: <span class="num">-3.432</span>,
    <span class="str">"flow_rate_m3s"</span>: <span class="num">42.5</span>,
    <span class="str">"wind_speed_kmh"</span>: <span class="num">18.0</span>,
    <span class="str">"wind_gust_kmh"</span>: <span class="num">24.3</span>,
    <span class="str">"wave_height_m"</span>: null,
    <span class="str">"tide_level_m"</span>: null,
    <span class="str">"flow_score"</span>: <span class="str">"EXCELLENT"</span>,
    <span class="str">"tide_score"</span>: null,
    <span class="str">"wind_score"</span>: <span class="str">"GOOD"</span>,
    <span class="str">"final_score"</span>: <span class="str">"GOOD"</span>,
    <span class="str">"flow_min"</span>: <span class="num">12.4</span>,
    <span class="str">"flow_max"</span>: <span class="num">88.2</span>,
    <span class="str">"flow_danger"</span>: <span class="num">124.7</span>,
    <span class="str">"tide_min_m"</span>: null,
    <span class="str">"tide_max_m"</span>: null
  }
]</code></pre>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/stations/{station_id}/history</span>
    </div>
    <div class="endpoint-body">
      <p>Returns up to 7 days of historical <code>DataObservation</code> rows for one station, ordered ascending by date. Rate limit: 60/min.</p>
      <p><strong>Response:</strong> <code>HistoryEntry[]</code> — fields: <code>date, flow_rate, wind_speed, tide_level, wind_gust, wave_height</code>.</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/stations/{station_id}/forecast</span>
    </div>
    <div class="endpoint-body">
      <p>
        Returns all <code>HourlyForecast</code> rows from today midnight UTC onward, plus daily marine
        summaries (tidal peaks, best paddling windows). Rate limit: 60/min.
      </p>
      <p><strong>Response:</strong> <code>ForecastResponse</code></p>
      <pre><code>{
  <span class="str">"hourly"</span>: [ <span class="comment">/* HourlyForecastEntry[] */</span> ],
  <span class="str">"daily_summaries"</span>: {
    <span class="str">"2026-08-10"</span>: {
      <span class="str">"high_tides"</span>: [{ <span class="str">"time"</span>: <span class="str">"06:14"</span>, <span class="str">"level"</span>: <span class="num">3.42</span> }],
      <span class="str">"low_tides"</span>:  [{ <span class="str">"time"</span>: <span class="str">"12:30"</span>, <span class="str">"level"</span>: <span class="num">0.18</span> }],
      <span class="str">"best_paddling_window"</span>: {
        <span class="str">"start_time"</span>: <span class="str">"05:14"</span>,
        <span class="str">"end_time"</span>:   <span class="str">"07:14"</span>,
        <span class="str">"peak_hour"</span>:  { <span class="comment">/* HourlyForecastEntry */</span> }
      }
    }
  }
}</code></pre>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-post">POST</span>
      <span class="endpoint-path">/api/stations</span>
    </div>
    <div class="endpoint-body">
      <p>Creates a new monitoring station. <strong>Requires</strong> <code>X-Post-Secret</code> header matching the <code>POST_SECRET</code> env var. Rate limit: 5/min.</p>
      <p><strong>Body:</strong></p>
      <pre><code>{ <span class="str">"name"</span>: <span class="str">"string"</span>, <span class="str">"latitude"</span>: <span class="num">float</span>, <span class="str">"longitude"</span>: <span class="num">float</span>, <span class="str">"type"</span>: <span class="str">"RIVER|ESTUARY|..."</span> }</code></pre>
      <p><strong>Checks:</strong> No existing station within 500 m (Haversine). Name 2–120 chars.</p>
      <p><strong>On success:</strong> Runs <code>calibrate_station_thresholds</code>, <code>fetch_data_for_single_body</code>, and <code>fetch_hourly_forecasts_for_single_body</code> synchronously (via <code>asyncio.to_thread</code>).</p>
      <p><strong>Response 201:</strong> <code>{ "id": int, "message": "District, Region" }</code></p>
    </div>
  </div>

  <h2 id="api-auth">API Reference: Authenticated Endpoints</h2>
  <p>All require <code>Authorization: Bearer &lt;supabase_jwt&gt;</code>. On valid JWT, the user row is auto-created if not present.</p>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/users/me</span>
    </div>
    <div class="endpoint-body">
      <p>Returns <code>{ "id": string, "timezone": string }</code> for the authenticated user.</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-put">PUT</span>
      <span class="endpoint-path">/api/users/me/timezone?timezone=Europe/Lisbon</span>
    </div>
    <div class="endpoint-body">
      <p>Updates the user's stored timezone. <code>timezone</code> is a query parameter (IANA tz string).</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-get">GET</span>
      <span class="endpoint-path">/api/favorites</span>
    </div>
    <div class="endpoint-body">
      <p>Returns an array of <code>water_body_id</code> integers for the current user's favourites.</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-post">POST</span>
      <span class="endpoint-path">/api/favorites/{station_id}</span>
    </div>
    <div class="endpoint-body">
      <p>Adds a station to favourites. Idempotent — no error if already favourited.</p>
    </div>
  </div>

  <div class="endpoint">
    <div class="endpoint-header">
      <span class="badge badge-delete">DELETE</span>
      <span class="endpoint-path">/api/favorites/{station_id}</span>
    </div>
    <div class="endpoint-body">
      <p>Removes a station from favourites. Idempotent — no error if not present.</p>
    </div>
  </div>

  <h2 id="rate-limits">Rate Limiting</h2>
  <p>
    Implemented with <strong>slowapi</strong> (a Starlette/FastAPI wrapper around <code>limits</code>).
    Key function is <code>get_remote_address</code> — the client IP. Limits are declared as
    <code>@limiter.limit("N/minute")</code> decorators per handler. On violation, returns
    <code>HTTP 429 Too Many Requests</code> via the registered <code>_rate_limit_exceeded_handler</code>.
  </p>
  <table>
    <thead><tr><th>Endpoint</th><th>Limit</th></tr></thead>
    <tbody>
      <tr><td>GET /api/stations/score</td><td>60 req/min</td></tr>
      <tr><td>GET /api/stations/{id}/history</td><td>60 req/min</td></tr>
      <tr><td>GET /api/stations/{id}/forecast</td><td>60 req/min</td></tr>
      <tr><td>POST /api/stations</td><td>5 req/min</td></tr>
    </tbody>
  </table>

<!-- ══════════════════ FRONTEND ══════════════════ -->
  <h2 id="frontend-entry">Frontend: Entry &amp; Bootstrap</h2>

  <h3>main.tsx</h3>
  <p>
    Bootstraps the React 19 application. Before mounting, establishes a <code>--vvh</code> CSS custom
    property tracking <code>window.visualViewport.height</code> — workaround for iOS Safari's 100dvh
    bug where the browser chrome's dynamic resize does not shrink <code>dvh</code> units.
  </p>
  <pre><code><span class="fn">syncVisualViewport</span>()   <span class="comment">// initial value</span>
window.visualViewport.addEventListener(<span class="str">"resize"</span>, syncVisualViewport)
window.addEventListener(<span class="str">"resize"</span>, syncVisualViewport)

createRoot(root).render(
  &lt;StrictMode&gt;
    &lt;AuthProvider&gt;
      &lt;App /&gt;
    &lt;/AuthProvider&gt;
  &lt;/StrictMode&gt;
)</code></pre>

  <h3>supabase.ts</h3>
  <p>Singleton Supabase client initialised with <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>. Imported by <code>useAuth</code> and <code>apiClient</code>.</p>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="state">State Architecture</h2>

  <p>
    There is no global state manager (no Redux/Zustand). State is split between React Context
    (authentication) and local <code>useState</code> hooks lifted to <code>App.tsx</code>.
  </p>

  <div class="card">
    <h3>App.tsx — global UI state</h3>
    <table>
      <thead><tr><th>State</th><th>Type</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td><code>selectedId</code></td><td><code>number | null</code></td><td>Currently selected station ID</td></tr>
        <tr><td><code>searchQuery</code></td><td><code>string</code></td><td>Search input value, filters sidebar list</td></tr>
        <tr><td><code>isForecastOpen</code></td><td><code>boolean</code></td><td>Controls ForecastModal visibility</td></tr>
        <tr><td><code>isPanelOpen</code></td><td><code>boolean</code></td><td>Controls Sidebar / DetailPanel visibility</td></tr>
        <tr><td><code>isAddingMode</code></td><td><code>boolean</code></td><td>Enables map click-to-add-station mode</td></tr>
        <tr><td><code>isAccountOpen</code></td><td><code>boolean</code></td><td>Controls AccountModal visibility</td></tr>
        <tr><td><code>isDark</code></td><td><code>boolean</code></td><td>Persisted theme (localStorage + data-theme attribute)</td></tr>
      </tbody>
    </table>
  </div>

  <h3>Keyboard shortcuts (global listener in App.tsx)</h3>
  <table>
    <thead><tr><th>Key</th><th>Action</th></tr></thead>
    <tbody>
      <tr><td><code>Escape</code></td><td>Close topmost modal/panel in priority order: AccountModal → ForecastModal → adding mode → deselect station</td></tr>
      <tr><td><code>/</code></td><td>Focus the search input (deselects current station)</td></tr>
      <tr><td><code>f</code> / <code>F</code></td><td>Open ForecastModal for selected station</td></tr>
      <tr><td><code>r</code> / <code>R</code></td><td>Trigger data refetch</td></tr>
      <tr><td><code>p</code> / <code>P</code></td><td>Toggle panel (sidebar/detail) open/closed</td></tr>
    </tbody>
  </table>

  <h3>Station list derivation</h3>
  <p>
    <code>filteredStations</code> is computed inline in <code>App.tsx</code> on every render: filter
    stations whose names include <code>searchQuery</code> (case-insensitive), then sort by:
    favourited-first, then alphabetical. No memoisation — React's reconciler handles this efficiently
    for the expected list sizes.
  </p>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="hooks">Hooks</h2>

  <h3>useAuth (Context)</h3>
  <p>
    Provides <code>{ user, loading, signOut }</code> via React Context. Calls
    <code>supabase.auth.getSession()</code> on mount for the initial session, then subscribes to
    <code>supabase.auth.onAuthStateChange</code> for real-time login/logout events. Unsubscribes on
    unmount.
  </p>

  <h3>useStations</h3>
  <p>
    Fetches <code>GET /api/stations/score</code> via <code>apiClient.getStationsScore()</code>. Uses a
    <code>tick</code> counter that increments on <code>refetch()</code> calls — re-running the
    <code>useEffect</code> without re-mounting. Returns <code>{ stations, loading, error, lastUpdated, refetch }</code>.
  </p>

  <h3>useFavorites</h3>
  <p>
    Loads favourites when <code>user</code> is non-null; clears to empty set on logout. Implements
    <strong>optimistic updates</strong>: the local <code>Set&lt;number&gt;</code> is toggled immediately,
    then the API call is made. If the API call fails, the set is reverted.
  </p>

  <h3>useStationForecast</h3>
  <p>
    Thin wrapper over <code>useAsyncQuery</code>. Memo-ises the fetcher function so the query only
    re-runs when <code>stationId</code> changes. Returns <code>{ forecasts, loading, error }</code>.
  </p>

  <h3>useAsyncQuery&lt;T&gt;(initial, fetcher)</h3>
  <p>
    Generic async data fetching hook. Accepts a nullable <code>fetcher</code> — when <code>null</code>,
    no request is made and <code>loading</code> is <code>false</code>. Uses a <code>cancelled</code>
    flag to prevent state updates after unmount. Returns <code>{ data, loading, error }</code>.
  </p>

  <h3>useTimezone</h3>
  <p>
    Reads timezone from <code>localStorage</code> (key: <code>canoecompass_timezone</code>) as initial
    value, falling back to <code>Intl.DateTimeFormat().resolvedOptions().timeZone</code>. When a user
    logs in, fetches the server-stored timezone and overwrites local storage if it differs from
    <code>"UTC"</code>. Writes both to local storage and the server on change.
  </p>

  <h3>useStationHistory</h3>
  <p>Analogous to <code>useStationForecast</code> — thin <code>useAsyncQuery</code> wrapper for <code>GET /api/stations/{id}/history</code>.</p>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="components">Components</h2>

  <h3>TopBar</h3>
  <p>
    Horizontal toolbar rendered above the map. Props: <code>loading</code>, <code>error</code>,
    <code>stationCount</code>, <code>lastUpdated</code>, <code>onRefetch</code>, <code>isPanelOpen</code>,
    <code>onTogglePanel</code>, <code>isDark</code>, <code>onToggleTheme</code>, <code>onOpenAccount</code>.
    Displays a loading indicator, error text, last-updated timestamp, theme toggle and account button.
  </p>

  <h3>Sidebar</h3>
  <p>
    Left-side list of all (filtered) stations. Conditionally rendered when <code>isOpen</code> is true
    and no station is selected. Renders a search input (<code>ref</code> forwarded from App for keyboard
    shortcut focus), an "Add Spot" button, and a scrollable list of station cards with score badges
    and favourite toggle.
  </p>

  <h3>StationMap</h3>
  <p>
    Leaflet map via <code>react-leaflet</code>. Renders a coloured circle marker per station based on
    <code>final_score</code>. In adding mode (<code>isAddingMode</code>), a map click opens a form to
    create a new station at that coordinate, calling <code>apiClient.createStation()</code> with the
    <code>VITE_POST_SECRET</code> header. Emits <code>onStationAdded</code> to trigger a data refetch.
  </p>

  <h3>DetailPanel</h3>
  <p>
    Rendered when a station is selected. Shows station metadata, current conditions (flow/wind/tide),
    individual score breakdown, and a "View Forecast" button. Props include <code>isFavorite</code> and
    <code>onToggleFavorite</code>. The back button deselects and re-opens the sidebar.
  </p>

  <h3>ForecastModal</h3>
  <p>
    Full-screen modal. Fetches forecast data via <code>useStationForecast</code>. Renders:
  </p>
  <ul>
    <li>A tabbed or scrollable 7-day overview with <code>final_score</code> per day.</li>
    <li>Per-day tidal peak times and best paddling window (from <code>daily_summaries</code>).</li>
    <li>A Recharts line chart of hourly <code>wind_speed_kmh</code> / <code>tide_level_m</code> / <code>flow_rate_m3s</code>.</li>
    <li>Timestamps formatted via <code>formatTimestamp</code> in the user's IANA timezone.</li>
  </ul>
  <p>Forecast data is client-side cached in <code>apiClient.ts</code> for 5 minutes (TTL: <code>CACHE_TTL = 300_000 ms</code>).</p>

  <h3>AccountModal</h3>
  <p>
    Supabase Auth UI for login/signup (email magic link or OAuth) and timezone management.
    Reads/writes timezone via <code>useTimezone</code>. Shows the user's Supabase email when logged in.
    Sign-out calls <code>supabase.auth.signOut()</code> via <code>useAuth</code>.
  </p>

  <h3>ScoreBadge</h3>
  <p>
    Displays a coloured pill for a <code>NavigabilityScore</code> string. Color values come from
    <code>constants/scores.ts</code>:
  </p>
  <pre><code>EXCELLENT  → <span style="color:#4caf87">hsl(150, 35%, 42%)</span>
GOOD       → <span style="color:#c8933a">hsl(38,  42%, 46%)</span>
POOR       → <span style="color:#c8783a">hsl(20,  48%, 48%)</span>
DANGEROUS  → <span style="color:#c0474c">hsl(0,   58%, 46%)</span>
UNKNOWN    → <span style="color:#7b869a">hsl(220,  8%, 56%)</span></code></pre>

  <h3>Tooltip</h3>
  <p>Generic hover tooltip wrapper. Wraps a trigger element and renders a floating tooltip box with configurable content.</p>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="api-client">API Client</h2>
  <p><strong>File:</strong> <code>lib/apiClient.ts</code></p>

  <p>
    A thin typed wrapper over the native <code>fetch</code> API. Every call goes through the internal
    <code>request&lt;T&gt;(path, options)</code> function:
  </p>
  <ol>
    <li>Retrieves the current Supabase session.</li>
    <li>Injects <code>Authorization: Bearer &lt;token&gt;</code> if a session exists.</li>
    <li>Fetches <code>BASE_URL + path</code> (defaults to <code>http://localhost:8000</code>).</li>
    <li>On non-OK status, parses the FastAPI <code>detail</code> field (string or array) for a human-readable error message and throws.</li>
    <li>Returns <code>res.json() as Promise&lt;T&gt;</code>.</li>
  </ol>

  <h3>Forecast cache</h3>
  <pre><code><span class="kw">const</span> forecastCache = <span class="kw">new</span> Map&lt;number, { data: ForecastResponse; timestamp: number }&gt;();
<span class="kw">const</span> CACHE_TTL = <span class="num">1000</span> * <span class="num">60</span> * <span class="num">5</span>;  <span class="comment">// 5 minutes</span>

<span class="fn">getStationForecast</span>: <span class="kw">async</span> (stationId) =&gt; {
    <span class="kw">const</span> cached = forecastCache.get(stationId);
    <span class="kw">if</span> (cached &amp;&amp; Date.now() - cached.timestamp &lt; CACHE_TTL) <span class="kw">return</span> cached.data;
    <span class="kw">const</span> data = <span class="kw">await</span> request(...);
    forecastCache.set(stationId, { data, timestamp: Date.now() });
    <span class="kw">return</span> data;
}</code></pre>
  <p>Module-level <code>Map</code> used as a simple in-memory cache. Cache is not invalidated on station updates — stale data will appear for up to 5 minutes after a background refresh.</p>

  <h3>Exported methods</h3>
  <table>
    <thead><tr><th>Method</th><th>HTTP</th><th>Path</th></tr></thead>
    <tbody>
      <tr><td><code>getStationsScore()</code></td><td>GET</td><td>/api/stations/score</td></tr>
      <tr><td><code>getStationHistory(id)</code></td><td>GET</td><td>/api/stations/:id/history</td></tr>
      <tr><td><code>getStationForecast(id)</code></td><td>GET</td><td>/api/stations/:id/forecast (cached)</td></tr>
      <tr><td><code>createStation(body)</code></td><td>POST</td><td>/api/stations + X-Post-Secret</td></tr>
      <tr><td><code>getFavorites()</code></td><td>GET</td><td>/api/favorites</td></tr>
      <tr><td><code>addFavorite(id)</code></td><td>POST</td><td>/api/favorites/:id</td></tr>
      <tr><td><code>removeFavorite(id)</code></td><td>DELETE</td><td>/api/favorites/:id</td></tr>
      <tr><td><code>updateTimezone(tz)</code></td><td>PUT</td><td>/api/users/me/timezone?timezone=...</td></tr>
      <tr><td><code>getUserProfile()</code></td><td>GET</td><td>/api/users/me</td></tr>
    </tbody>
  </table>

  <!-- ─────────────────────────────────────────────── -->
  <h2 id="scoring-ui">Scoring in the UI</h2>

  <p>
    The frontend receives pre-computed score strings from the backend. No scoring logic is re-implemented
    in the UI. The <code>SCORE_META</code> constant maps each <code>NavigabilityScore</code> string to a
    display color and label for <code>ScoreBadge</code> and map marker coloring.
  </p>

<!-- ══════════════════ DATA FLOW ══════════════════ -->
  <h2 id="data-lifecycle">Data Lifecycle</h2>

  <div class="mermaid">
flowchart TD
    Start[Startup / Every 6 Hours] --> Fetch[fetch_data_for_water_bodies]
    Fetch --> Loop{For each WaterBody}
    Loop --> Eval[evaluate_water_body per hour]
    Loop --> Fore[fetch_hourly_forecasts]
    Eval --> upsert1[(DataObservation)]
    Fore --> upsert2[(HourlyForecast)]

    API[POST /api/stations] --> Val[Validate &amp; check 500m proximity]
    Val --> Nom[get_location_details]
    Nom --> Ins[(insert WaterBody)]
    Ins --> Cal[calibrate_station_thresholds]
    Ins --> FetchSingle[fetch_data_for_single_body]
  </div>

  <!-- ─────────────────────────────────────────────── -->
  <h2 id="scoring-logic">Scoring Logic</h2>
  <p>The system calculates a navigability score for each station based on its water body type. All stations are additionally evaluated for wind danger.</p>

  <h3>1. Rivers</h3>
  <p>Rivers are evaluated based on historical flow discharge percentiles.</p>
  <div class="mermaid">
flowchart LR
    Riv[Flow Evaluation] --> RMiss[missing / max &lt; 1.0] --> U1[UNKNOWN]
    Riv --> RDang[flow &gt;= 95th pct] --> D1[DANGEROUS]
    Riv --> RPoor[flow &lt; 15th pct OR &gt; 80th pct] --> P1[POOR]
    Riv --> RExc[flow &lt;= min + 60% range] --> E1[EXCELLENT]
    Riv --> RGood[otherwise] --> G1[GOOD]

    Riv --> Wind[Wind Evaluation]
  </div>

  <h3>2. Estuaries &amp; Lagoons</h3>
  <p>Tidal bodies are evaluated based on tidal heights and peaks.</p>
  <div class="mermaid">
flowchart LR
    Tide[Tide Evaluation] --> TMiss[missing data] --> U2[UNKNOWN]
    Tide --> TPoor[tide &lt; 50th pct] --> P2[POOR]
    Tide --> TGood[tide &lt; 92nd pct] --> G2[GOOD]
    Tide --> TExc[tide &gt;= 92nd pct] --> E2[EXCELLENT]

    Tide --> Wind[Wind Evaluation]
  </div>

  <h3>3. Coastal &amp; Reservoirs / Wind Evaluation</h3>
  <p>All stations undergo a final wind evaluation step. For coastal waters and reservoirs, this is the <em>only</em> metric evaluated.</p>
  <div class="mermaid">
flowchart LR
    Wind[Wind Evaluation] --> WD[&gt; 40 km/h] --> D3[DANGEROUS]
    Wind --> WP[&gt; 25 km/h] --> P3[POOR]
    Wind --> WE[&lt;= 15 km/h] --> E3[EXCELLENT]
    Wind --> WG[15-25 km/h] --> G3[GOOD]
  </div>

  <p><strong>final_score aggregation (ignore UNKNOWNs):</strong></p>
  <ul>
    <li>DANGEROUS in any → <strong>DANGEROUS</strong></li>
    <li>POOR in any → <strong>POOR</strong></li>
    <li>all EXCELLENT → <strong>EXCELLENT</strong></li>
    <li>otherwise → <strong>GOOD</strong></li>
    <li>none applicable → <strong>UNKNOWN</strong></li>
  </ul>

<!-- ══════════════════ DEPLOYMENT ══════════════════ -->
  <h2 id="env">Environment Variables</h2>

  <h3>Backend (<code>.env</code> in project root)</h3>
  <table>
    <thead><tr><th>Variable</th><th>Required</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>DATABASE_URL</code></td><td>Yes</td><td>SQLAlchemy connection string, e.g. <code>postgresql://admin:secret@localhost:5432/canoeing</code></td></tr>
      <tr><td><code>SUPABASE_URL</code></td><td>Yes</td><td>Supabase project URL</td></tr>
      <tr><td><code>SUPABASE_ANON_KEY</code></td><td>Yes</td><td>Supabase anonymous/public key</td></tr>
      <tr><td><code>POST_SECRET</code></td><td>Yes</td><td>Shared secret for POST /api/stations; must match <code>VITE_POST_SECRET</code></td></tr>
      <tr><td><code>CORS_ORIGIN</code></td><td>No</td><td>Comma-separated allowed origins (default: <code>http://localhost:5173</code>)</td></tr>
    </tbody>
  </table>

  <h3>Frontend (<code>frontend/.env</code>)</h3>
  <table>
    <thead><tr><th>Variable</th><th>Required</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>VITE_SUPABASE_URL</code></td><td>Yes</td><td>Same Supabase project URL</td></tr>
      <tr><td><code>VITE_SUPABASE_ANON_KEY</code></td><td>Yes</td><td>Same anon key</td></tr>
      <tr><td><code>VITE_API_BASE_URL</code></td><td>No</td><td>Backend base URL (default: <code>http://localhost:8000</code>)</td></tr>
      <tr><td><code>VITE_POST_SECRET</code></td><td>No</td><td>Sent as <code>X-Post-Secret</code> header when creating stations</td></tr>
    </tbody>
  </table>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="docker">Docker</h2>

  <p>
    <code>docker-compose.yml</code> provisions only the PostgreSQL database. The backend and frontend
    are run separately (no Docker image for application code).
  </p>
  <pre><code><span class="str">image:</span>    postgis/postgis:15-3.4
<span class="str">ports:</span>    5432:5432
<span class="str">env:</span>      POSTGRES_USER=admin  POSTGRES_PASSWORD=secret  POSTGRES_DB=canoeing
<span class="str">volumes:</span>  pg_data:/var/lib/postgresql/data  (named volume, persisted)</code></pre>

  <div class="alert alert-note">
    The PostGIS extension is bundled in the image but is not currently used in the SQLAlchemy models.
    It is available for future geospatial query support.
  </div>

<!-- ─────────────────────────────────────────────── -->
  <h2 id="running">Running Locally</h2>

  <h3>Database</h3>
  <pre><code>docker compose up -d</code></pre>

  <h3>Backend</h3>
  <pre><code><span class="comment"># From project root</span>
python -m venv .venv
.venv&#92;Scripts&#92;activate          <span class="comment"># Windows</span>
pip install -r requirements.txt

<span class="comment"># Create tables (SQLAlchemy Base.metadata.create_all)</span>
python src/reset_db.py          <span class="comment"># or seed.py for sample data</span>

<span class="comment"># Start server</span>
uvicorn src.api:app --reload --port 8000</code></pre>

  <h3>Frontend</h3>
  <pre><code><span class="comment"># From frontend/</span>
npm install
npm run dev                     <span class="comment"># Vite dev server → http://localhost:5173</span></code></pre>

  <h3>Seed &amp; Reset scripts</h3>
  <p><code>src/seed.py</code> — inserts a predefined set of water bodies with calibrated thresholds for demo purposes. <code>src/reset_db.py</code> — drops and recreates all tables.</p>

`;

export function DocsContent() {
    return <article className={styles.content} dangerouslySetInnerHTML={{ __html: docsHtml }} />;
}
