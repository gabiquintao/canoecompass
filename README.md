# Canoecompass

A full-stack web application that evaluates and displays the navigability of rivers, estuaries, reservoirs, coastal waters, and lagoons in real time.

[**Live Demo**](https://canoecompass.vercel.app) | [**Full Documentation**](https://canoecompass.vercel.app/docs)

## Overview

Canoecompass helps water sports enthusiasts determine if a water body is safe and navigable. A Python/FastAPI backend fetches hydrological and meteorological data from the Open-Meteo family of APIs, scores each station against dynamically calibrated thresholds, and exposes the results through a REST API. The data is consumed by a React/TypeScript single-page application and beautifully rendered on an interactive Leaflet map.

## Documentation

For a deep dive into the architecture, data lifecycle, scoring algorithms, and database schemas, please read our [Detailed Documentation](https://canoecompass.vercel.app/docs).
