# BNP Easy Portfolio Tracker

Track BNP Paribas Easy ETFs with live Yahoo Finance charts and a local portfolio view.

## Start the app

From the project folder, run:

```powershell
cd "C:\Users\janat\Documents\FINANCE WEB"
$env:Path = "$env:ProgramFiles\nodejs;" + $env:Path
npm install
npm run dev
```

Open **http://localhost:5173/** in your browser.

## Other commands

- `npm run build` — production build in `dist/`
- `npm run preview` — serve the production build locally (proxy still works)

## API notes

Market data is fetched from Yahoo Finance. In development, Vite proxies requests to avoid browser CORS blocks and unreliable public CORS proxies. Run the app with `npm run dev` (not by opening the JSX file directly).
