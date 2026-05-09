# Ember - Restaurant Management Platform

![Ember Dashboard](https://img.shields.io/badge/Ember-Restaurant%20Management-orange)

Ember is a comprehensive, full-stack real-time restaurant management application designed to streamline cafe and restaurant operations. It features a modern, premium user interface with dynamic state management and live updates for seamless communication between the front-of-house staff and the kitchen.

## 🚀 Features

- **Real-time Order Processing:** Instant order updates across all devices using WebSockets (Socket.io).
- **Interactive Table Management:** Visual table layouts with statuses (available, occupied, reserved) and table transfer capabilities.
- **Role-Based Access Control:** Distinct workflows and interfaces for Admins, Waiters, Chefs, and Cashiers.
- **Kitchen Display System (KDS):** Live order tracking, smart timers, and priority flags for efficient food preparation.
- **Advanced Billing:** Seamless checkout process with partial bill splitting and detailed invoicing.
- **Shift Handover Notes:** Built-in communication tool for staff to leave notes between shifts.
- **Beautiful & Modern UI:** A highly polished, responsive interface utilizing `framer-motion` for fluid micro-animations and a bespoke design system.

## 🛠️ Tech Stack

**Frontend:**
- React (with Vite)
- Context API & Custom Hooks for state management
- CSS Variables for dynamic theming (Cream & Amber light theme)
- Framer Motion (Animations)
- Lucide React (Icons)
- Socket.io-client

**Backend:**
- Node.js & Express.js
- MongoDB & Mongoose (Database & ODM)
- Socket.io (Real-time events)
- JWT (JSON Web Tokens for secure authentication)
- express-async-handler, helmet, express-rate-limit (Security & Utilities)

## 📦 Installation & Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/octotat-bot/ember.git
cd ember
```

### 2. Setup Backend
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory with the following variables:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```
Start the backend server:
```bash
npm start
```

### 3. Setup Frontend
```bash
cd ../frontend
npm install
```
Create a `.env` file in the `frontend` directory:
```env
VITE_API_URL=http://localhost:5000/api
```
Start the frontend development server:
```bash
npm run dev
```

## 🚀 Deployment

- **Frontend:** Hosted on Vercel.
- **Backend:** Hosted on Render.
- CORS is dynamically configured on the backend to allow requests from any Vercel preview domain (`*.vercel.app`) as well as local development environments.

## 📄 License
This project is proprietary and confidential.
