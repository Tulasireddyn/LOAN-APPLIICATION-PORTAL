# Vitto Loan Application Portal - Project Write-Up

## What Was Built
I built a full-stack **Loan Application Portal** designed for field operations teams to register and monitor loan applications.
- **Backend**: An Express.js REST API with robust server-side validation, error handling, health checks, CORS enabled, and automatic DB migration initialization on startup.
- **Frontend**: A React.js (Vite) single-page web app built with vanilla CSS. It includes two primary modules:
  - **Operations Dashboard**: Contains summary statistics, live query filtering, full-text search by name/mobile, interactive modals, and instant state updates for approving or rejecting applications without page reload.
  - **Apply Page**: A client-validated intake form displaying language accents and providing reference number tracking.
- **Database**: A PostgreSQL schema storing applications with UUID keys and indexed query paths.
- **Responsiveness**: Utilizes CSS Media Queries that convert multi-column tabular data into readable stacked layout cards on mobile screens, facilitating easy usability by field agents.

## Tech Stack & Deployment Choices
- **Backend API Hosting**: **Render** (Free Web Service tier). It integrates seamlessly with GitHub, auto-deploys on commit, and handles Node environments cleanly.
- **Frontend Hosting**: **Vercel** (Free static hosting). Vercel provides instant global CDN caching, high-performance static asset loading, and simple environment variable routing.
- **Database**: **Neon PostgreSQL** (Serverless Free Tier). Neon offers a fully managed Postgres instance with built-in connection pooling, instant scale-to-zero capabilities, and supports UUID functions natively.

## Known Issues / Limitations
1. **Render Cold Starts**: Because the backend is deployed on Render's free tier, the API goes to sleep after 15 minutes of inactivity. The first request after a sleep period can experience a 50-second delay while the container spins up.
2. **Local Storage Backup**: If the connection drops during status changes, there is no offline storage retry mechanism yet.
3. **No Auth Layer**: The dashboard currently lacks password-protected logins for agents, exposing the data publicly.

## Future Improvements
1. **Speech-to-Text Integration**: Since Vitto specializes in non-typing borrowers, adding audio recording widgets utilizing speech-to-text models (such as OpenAI's Whisper) to fill out forms in local Indian languages would be the priority.
2. **Offline-First Synchronization**: Integrate Workbox Service Workers and IndexedDB on the client to allow field agents to capture applications without any network connection and automatically sync them when connection is restored.
3. **Role-Based Access Control (RBAC)**: Secure the operations dashboard using Auth0 or Clerk to ensure only authorized operations agents can approve/reject loans.
