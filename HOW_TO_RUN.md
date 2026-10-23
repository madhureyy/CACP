# Cinematic Asset Carbon Profiler (CACP) — Running Guide

CACP is a full-stack sustainability profiler designed for creative, VFX, and video production storage. It analyzes carbon emissions (GHG Scope 2 & 3) and cloud storage costs across Google Cloud Storage (GCS) and Microsoft Azure Blob Storage, integrated with the official **UVG 4K Video Dataset** (`UVG_4K_video_dataset.csv`).

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend API Server
In your first terminal, launch the Express REST API (runs on `http://localhost:5000`):
```bash
npm run server
```
*Note: For automatic reloading on changes, use `npm run server:dev`.*

### 3. Start the Frontend Application
In a second terminal, launch the Vite React dev server:
```bash
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## Authentication & Credentials

- **Demo Account Email:** `demo@example.com`
- **Demo Account Password:** `password123`
- You can also register a new account on the login screen or test simulated OAuth.

---

## Full Architecture & Components

1. **Backend REST API (`server/src/index.ts`)**:
   - `GET /api/health` — System status
   - `POST /api/auth/login` & `POST /api/auth/register` — JWT authentication with salted bcrypt password hashing
   - `GET /api/cloud/verify` & `GET /api/cloud/containers` — Azure Blob Storage & GCS verification
   - `POST /api/cloud/connect` — Live/sandbox bucket connection
   - `GET /api/files` — Dynamic inventory query supporting region recalculations (US, EU, Asia, India) and provider rates (GCS vs Azure)
   - `POST /api/files/:id/flag` & `POST /api/files/bulk-flag` — Review flag toggling
   - `POST /api/carbon/calculate` — Scientific GHG emission calculator
   - `GET /api/carbon/summary` & `GET /api/carbon/historical` — Aggregated metrics & 24-month historical trend
   - `GET /api/dataset/uvg` — UVG 4K dataset sequence metadata

2. **Database Engine (`server/src/db/database.ts`)**:
   - Built on Node.js native `node:sqlite` (`cacp.sqlite`).
   - Automatically seeds the database from `UVG_4K_video_dataset.csv`, RAW image assets, and VFX cache files.

3. **Carbon Calculation Engines**:
   - **TypeScript Engine (`server/src/carbon/carbonEngine.ts`)**: In-process calculations with regional grid intensities and PUE factors.
   - **Python Engine (`carbon_engine.py`)**: Standalone CLI & analysis script calibrated to ITU-T L.1410 and CCF methodology.
     ```bash
     python carbon_engine.py --action calculate --size-gb 500 --region US --provider gcs
     python carbon_engine.py --action uvg
     ```

4. **Cloud Storage Providers**:
   - **Microsoft Azure Blob Storage (`server/src/cloud/azureProvider.ts`)**: Powered by `@azure/storage-blob` with real credentials detection and high-fidelity fallback sandbox.
   - **Google Cloud Storage (`server/src/cloud/gcsProvider.ts`)**: Powered by `@google-cloud/storage` with auto-bucket enumeration and dataset sandbox.

5. **Frontend Client (`src/`)**:
   - React 19 + TypeScript + Vite.
   - Dual-mode operation: connects directly to `/api` proxy when the backend is active, with seamless graceful fallback to client-side mock if running standalone.
