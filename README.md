# TrocaTrocaMobile 👋

TrocaTroca is a modern, premium mobile application designed for intelligent peer-to-peer item exchanges (bartering). Built with **React Native / Expo** and powered by a robust **Supabase (PostgreSQL + PostGIS)** backend, it allows users to publish listings, discover nearby exchange opportunities, make private trade proposals, and chat in real-time.

## 🚀 Key Features

- **Geospatial Discovery**: Search listings by category and filter/sort by distance, powered by PostgreSQL PostGIS spatial indexing.
- **Dynamic Proximity & Geocoding**: Automatically detects user location and resolves coordinates to city/state names (with a fallback web-geocoding service using OpenStreetMap Nominatim API).
- **Private Trade Proposals**: Make private swap offers on existing ads.
- **Unlisted/Custom Offers**: Make proposals using unlisted (custom) items. This dynamically creates a hidden advertisement tied to the trade conversation, allowing details screens and chat redirects to function perfectly.
- **Conversation-Based Access Controls**: Unlisted custom items are securely hidden from all public feeds and profiles, and can only be accessed by active trade participants.
- **Dynamic Trust Score**: Real-time user confidence dashboard (Score = Trades Accepted * 10 + Messages Sent * 1) synchronized with database profiles.
- **Private Chat Negotiation**: Sub-chat rooms created automatically inside each trade proposal for secure negotiation.
- **Theme Customization**: Beautiful light/dark mode support with persistent storage.

---

## 🛠️ Technology Stack

- **Frontend Core**: React Native (0.81), Expo SDK 54, TypeScript
- **Routing**: Expo Router (file-based routing)
- **Backend Services**: Supabase (Database, Auth, Storage)
- **Database Engine**: PostgreSQL with PostGIS, Row Level Security (RLS) policies, and spatial indices.
- **Styling & Assets**: Premium HSL-based palettes, responsive grid layouts, and custom animations.

---

## 💻 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org) and [npm](https://www.npmjs.com) installed.

### 1. Install Dependencies

Clone the repository and run:

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

### 3. Run the Development Server

Start the application using Metro bundler:

```bash
npx expo start
```

Press:
- `w` to open in the Web browser
- `a` to run on an Android emulator/device
- `i` to run on an iOS simulator/device

---

## 📂 Project Structure

```
├── assets/                  # App icon and splash screen assets
├── scripts/                 # Helper scripts (boilerplate resets)
└── src/
    ├── app/                 # Expo Router file-based screens
    │   ├── (tabs)/          # Main Tab Navigator (Home, Trades, Profile, Publish)
    │   ├── ad/              # Ad Detail screens (Dynamic route [id].tsx)
    │   └── _layout.tsx      # Root application layout
    ├── components/          # Reusable UI and Map components
    ├── constants/           # Styling design system and themes
    ├── context/             # Store Context managing state and Supabase queries
    ├── hooks/               # Custom hooks (themes, color schemes)
    └── lib/                 # Core libraries (Supabase client init)
```
