# Carpooling App

A React Native mobile application for managing daily carpooling sessions.

## Tech Stack
-   React Native (Expo)
-   Supabase (Auth, Database, Realtime)
-   React Navigation

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Supabase Setup**
    -   Create a new Supabase project.
    -   Run the SQL from `schema.sql` in the Supabase SQL Editor.
    -   Copy `.env.example` to `.env` and fill in your URL and Anon Key.

3.  **Run App**
    ```bash
    npx expo start
    ```

## Features
-   **Driver**: Generate QR for car, Track passengers, Mark payments.
-   **Passenger**: Scan QR to log trip, View history.
-   **History**: Monthly summaries and total fare calculation.
