# Perfect Cup 8-0-0 — source

This is the React/Vite source for the `/perfect-cup/` game. The site itself only
serves the built output one level up (`perfect-cup/index.html` + `perfect-cup/assets/`);
this folder is kept so the game can be modified and rebuilt later.

Squad/player data is loaded at runtime from `/data/players.json` (the same
dataset used elsewhere on the site) — no extra data file is needed here.

## Rebuild after changes

```
npm install
npm run build
```

Then copy the contents of `dist/` over the files in `perfect-cup/` (everything
except this `src-app/` folder).
