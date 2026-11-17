# Allmighty

Customer shop, admin dashboard and rider app — plain HTML / CSS / JS, no build step.

## Run it
Open the folder in VS Code and use **Live Server** (open `html/login.html`), or any static server.

## Accounts
| Role     | Email                  | Password   |
|----------|------------------------|------------|
| Admin    | admin@gmail.com        | admin123   |
| Rider    | rider@gmail.com        | rider123   |
| Rider 2  | noel@gmail.com         | rider123   |
| Customer | maria.reyes@gmail.com  | maria123   |

New customers can sign up from the Sign up page. Riders are created by the admin (Riders page).

## Order flow
1. Customer checks out (cash on delivery) -> order is **New**
2. Admin **Accepts** -> **Preparing**, then **Assigns a rider** -> **For delivery**
3. Rider **Accepts** the request -> **Confirm pickup** -> **Mark as delivered** (collects COD)
4. Admin marks the rider's cash as **remitted** (Riders page)

## Images
Drop your photos into `images/` — missing images fall back to a clean placeholder:
- `images/logo.png` (login logo)
- `images/hero.jpg` (home banner)
- `images/products/all-purpose-cleaner.jpg`, `fresh-laundry-wash.jpg`, `dishwashing-liquid.jpg`, `fabric-softener.jpg`
Products added by the admin can have photos uploaded directly.

## IMPORTANT: demo data
All data is stored in the browser (`localStorage`) through `js/store.js`, so it is **not shared between devices**.
For real use, replace the functions in `js/store.js` with calls to a backend (Firebase, Supabase, Node/PHP + MySQL); the pages do not need to change.
The admin login is hard-coded in `store.js` for the demo; move it to a server-side account before going live.
To reset all demo data, run `DB.reset()` in the browser console.
