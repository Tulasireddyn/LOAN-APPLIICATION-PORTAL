# Loan Application Portal 🚀

A modern, responsive, and secure Loan Application Portal designed for field agents and borrowers. The application enables local-language borrowers (supporting English, Hindi, Tamil, Telugu, and Marathi) to apply for loans easily, and allows operations agents to manage, search, filter, and update application statuses in real-time.

---

## 🔗 Live Deployments

- **Frontend App (Vercel):** *Pending deployment...*
- **Backend API (Render):** *Pending deployment...*
- **Live Database (Neon PostgreSQL):** *Active*

---

## 🛠️ Features

- **Dashboard Page**: 
  - **Real-Time Statistics Bar**: Total applications count, total loan amount requested, and breakdown by status.
  - **Dynamic Filtering**: Filter applications by status (`pending`, `approved`, `rejected`) in real-time.
  - **Basic Search**: Fast search by applicant name or mobile number (client-to-server query).
  - **Interactive Detail Panel**: View application details and approve/reject pending loans.
- **Apply Page**:
  - Full form submission with fields: Applicant Name, Mobile, Loan Amount (₹), Loan Purpose, and Preferred Language.
  - Strict client-side validation for all fields.
  - Success screen showing a copyable UUID reference number.
- **Backend API**:
  - Node.js + Express with proper RESTful verbs and HTTP response status codes.
  - Strict server-side validation with clear 400 Bad Request JSON responses.
  - PostgreSQL database persistence.
- **Database**:
  - Parameterized queries to prevent SQL Injection.
  - Indexing for optimized filtering and sorting.
  - Automatic table migrations on startup.
- **Aesthetics & Responsive Design**:
  - Beautiful dark-mode slate theme with glassmorphism panels.
  - Customized status and language badges for high scannability.
  - 100% mobile-responsive layout transforming the table to stacked cards for field agents using mobile phones.

---

## 📁 Repository Structure

```
LOAN APPLICATION PORTAL/
├── migrations/
│   └── 001_init.sql      # Database schema migration
├── server/               # Node.js + Express Backend
│   ├── db.js             # DB connection logic (pg.Pool)
│   ├── index.js          # API endpoints & server setup
│   └── package.json
├── client/               # React + Vite Frontend
│   ├── src/
│   │   ├── App.jsx       # Frontend logic & UI components
│   │   ├── index.css     # Styling, badges & responsive cards
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .gitignore            # Git exclusion list
├── implementation_plan.md# Architecture details
└── README.md             # This document
```

---

## ⚙️ Local Setup Guide

Follow these steps to run both the backend and frontend locally in less than 5 minutes.

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally or on a cloud instance)

### 1. Database Setup
1. Create a local PostgreSQL database (e.g. `vitto_loans`).
2. The schema will automatically migrate when you start the server, but you can inspect `migrations/001_init.sql` for the SQL script.

### 2. Backend Setup (`server`)
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://<username>:<password>@localhost:5432/vitto_loans
   NODE_ENV=development
   ```
4. Run the development server (automatically restarts using nodemon):
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`.

### 3. Frontend Setup (`client`)
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`. Open it in your browser.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description | Payloads / Query Filters |
|---|---|---|---|
| `POST` | `/api/applications` | Submit a new application | Body: `{ name, mobile, amount, purpose, language }` |
| `GET` | `/api/applications` | Get all applications | Query: `?status=pending` or `?search=ramesh` |
| `PATCH`| `/api/applications/:id/status` | Update status | Body: `{ status: 'approved' \| 'rejected' }` |
| `GET` | `/api/summary` | Get summary counts | Response: Total apps, total amount, status counts |
| `GET` | `/health` | Server health status | Returns system runtime status |

---

## 🧪 Technical Implementation Details

### Database Schema (`migrations/001_init.sql`)
```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    purpose TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Server-Side Input Validation
All POST requests validate fields on the backend. If fields are empty, malformed, or contain wrong language types, a `400 Bad Request` is returned with detailed validation error feedback:
```json
{
  "success": false,
  "errors": [
    "Applicant name is required and must be a valid text.",
    "Valid mobile number is required (10 to 15 digits)."
  ]
}
```

---

## 🔮 Future Improvements & Scaling
1. **Interactive Audio Capture**: Since Vitto serves non-typing borrowers, we would integrate audio recording widgets with Speech-to-Text translation (using Whisper API) directly into the apply screen.
2. **OTP Authentication**: Add SMS OTP-based authentication to verify mobile numbers during application submission.
3. **Agent Offline Mode**: Sync submissions using service workers and IndexedDB so agents can register applications in remote areas without internet coverage, syncing when online.
