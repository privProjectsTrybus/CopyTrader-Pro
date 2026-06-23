# Deploy CopyTrader Pro to Vercel

## Option 1: One command (fastest)
```bash
cd frontend
npm run build
npx vercel deploy dist --prod
```
Vercel will open a browser to authenticate, then deploy immediately.

## Option 2: Full project deploy with Vercel CLI
```bash
npm install -g vercel
vercel login         # opens browser, sign in
vercel               # run from /frontend — links project and deploys
```

## Option 3: Drag-and-drop (no CLI needed)
1. Open https://vercel.com/new
2. Drag the `frontend/dist` folder onto the page
3. Click Deploy — live in ~30 seconds

## Option 4: GitHub auto-deploy
1. Push this repo to GitHub
2. Go to vercel.com → Import Project → pick your repo
3. Set Root Directory to `frontend`, Framework to Vite
4. Every push auto-deploys
