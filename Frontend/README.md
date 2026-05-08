# Plan Navigator Frontend

This directory contains a standalone React + Vite frontend for Plan Navigator with Firebase Authentication, protected routes, a fixed sidebar layout, and blank views ready for backend integration.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in your Firebase configuration values.
3. Install dependencies:

   npm install

4. Start the development server:

   npm run dev

## Login

Use the demo credentials below to sign in. If the account does not already exist in Firebase Authentication, the app will create it automatically on first login.

- Email: `test@plannavigator.app`
- Password: `Test1234!`

## Features included

- Firebase email/password authentication
- Auth state management with React context
- Protected route wrapper for the entire app shell
- Left navigation sidebar matching the requested layout
- Logout button in the sidebar
- Blank route views for later FastAPI integration
