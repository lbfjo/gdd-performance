# Deployment Guide

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged in: `firebase login`
3. `.env.local` filled in (see `.env.example`)

## First-time Firebase setup

1. Go to https://console.firebase.google.com → project `gdd-gym`
2. Build → Firestore → Create database → Production mode → europe-west1
3. Firestore → Rules → paste contents of `firestore.rules` → Publish
4. Project settings → Add web app → name `gdd-pwa` → copy config into `.env.local`

## Seed initial data

In Firestore console, create:

**Collection: `config` → document: `app`**
```
staffPin: <SHA-256 of your chosen 4-digit staff PIN>
```

**Collection: `athletes` → one doc per athlete**
```
name: "Full Name"
pin: <SHA-256 of athlete's 4-digit PIN>
position: "Midfielder"  (optional)
active: true
```

To compute SHA-256 of a PIN in your browser console:
```js
const pin = '1234'
const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
console.log([...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join(''))
```

## Deploy

```bash
npm run build
firebase deploy
```

App will be live at: https://gdd-gym.web.app

## Required Firestore indexes

Add these in Firebase console → Firestore → Indexes → Composite:

1. Collection: `athletes` — Fields: `active ASC`, `name ASC`
2. Collection: `checkins` — Fields: `athleteId ASC`, `date ASC`
3. Collection: `checkins` — Fields: `athleteId ASC`, `date DESC`
4. Collection: `checkins` — Fields: `date ASC`
