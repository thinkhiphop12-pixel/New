# ⚽ Retro Football Manager v2

A nostalgic single-player football/soccer management simulation game inspired by classic titles like **FIFA 2000 Manager** and **Premier Manager** for PS1. Built with vanilla HTML, CSS, and JavaScript — no frameworks, no dependencies, just pure retro gaming vibes.

![Retro Football Manager](https://img.shields.io/badge/version-2.0-green) ![License](https://img.shields.io/badge/license-MIT-blue) ![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

## 🎮 Features

### Core Gameplay
- **18-team league** with full round-robin fixtures (34 matches per season)
- **Squad management** with 16 players per team (GK, DEF, MID, FWD)
- **Match simulation** based on team strength, energy, and tactical selections
- **Multi-season progression** with player aging, retirements, and youth development

### Player Management
- **Player stats**: Energy, Condition, Strength, Age, Market Value
- **Balanced energy system**: Players drain 8-15 energy per match, recover 25 when rested
- **Youth Academy**: Random youth prospects (ages 16-18) join from the academy
- **Player development**: Match experience and training improve player strength
- **Aging & retirement**: Players age each season, veterans may retire after 34

### Financial Systems
- **5 sponsor slots**: Shirt sponsor + 4 stadium stands (North, South, East, West)
- **Signing bonuses**: 25% of contract value paid immediately
- **Match day revenue**: Dynamic attendance based on ticket pricing
- **Prize money**: €250K - €5M based on final league position
- **Transfer market**: Buy and sell players, refresh market for €100K

### Training
| Type | Strength Gain | Energy Cost | Price |
|------|---------------|-------------|-------|
| Basic | +3 | -10 | €20,000 |
| Intensive | +6 | -20 | €60,000 |
| Elite | +10 | -25 | €150,000 |

### Stadium Management
- **Capacity expansion**: Add 1,000 to 10,000 seats
- **Ticket pricing**: €10-100 range, affects attendance
- **Visual stadium display**: Shows sponsored stands

### Season Features
- **Relegation system**: Bottom 2 AI teams relegated, replaced by promoted teams
- **Season summary**: Final position, prize money, squad changes
- **Fresh start**: All players reset energy/condition for new season

### Random Events
Humorous events that can help or hinder your club:
- 🎰 Lottery wins and mysterious benefactors
- 🦨 Skunk invasions and plumbing disasters  
- 👽 UFO sightings and duck mascot adoptions
- 🍕 Pizza parties and gaming addiction epidemics

## 🖼️ Screenshots

The game features a retro aesthetic with:
- CRT scanline effect overlay
- Retro pixel fonts (Press Start 2P, VT323)
- Neon green and gold color scheme
- SVG kit graphics with customizable colors

## 🚀 Getting Started

### Quick Start
1. Download or clone the repository
2. Open `index.html` in any modern browser
3. Select your team and kit colors
4. Start managing!

```bash
# Clone the repository
git clone https://github.com/yourusername/retro-football-manager.git

# Navigate to directory
cd retro-football-manager

# Open in browser (macOS)
open index.html

# Or simply double-click index.html
```

### No Build Required
This is a pure client-side application. No npm, no bundlers, no servers needed.

## 📁 Project Structure

```
football-manager-v2/
├── index.html          # Main HTML file
├── README.md           # This file
├── css/
│   └── styles.css      # All styling (retro theme, components)
├── js/
│   ├── data.js         # Constants, team names, events, sponsors
│   ├── state.js        # Game state management, save/load
│   ├── players.js      # Player & team generation, youth system
│   ├── sponsors.js     # Sponsor system (5 slots)
│   ├── transfers.js    # Transfer market logic
│   ├── training.js     # Training camp system
│   ├── lineup.js       # Lineup selection, auto-select
│   ├── stadium.js      # Stadium capacity, tickets
│   ├── match.js        # Match simulation, season processing
│   ├── graphics.js     # Kit & stadium SVG rendering
│   ├── ui.js           # UI updates, notifications, sorting
│   └── main.js         # Game controller, event handlers
└── assets/             # (Reserved for future assets)
```

## 💾 Save System

Games are saved as JSON files with the naming format:
```
rfm-save-s{season}r{round}.json
```

Save files include complete game state and can be loaded at any time.

## 🎯 Gameplay Tips

1. **Rotate your squad** — Don't play the same 11 every match or they'll burn out
2. **Use "Freshest XI"** — Auto-selects players with highest energy
3. **Invest in youth** — Young players have hidden potential and grow faster
4. **Balance ticket prices** — Higher prices mean more revenue but lower attendance
5. **Sign stadium sponsors** — Each stand can have its own sponsor for extra income
6. **Watch the ticker** — The news log tracks all important events

## 🛠️ Technical Details

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Dependencies
- **Google Fonts**: Press Start 2P, VT323 (loaded via CDN)
- No JavaScript frameworks
- No build tools required

### Performance
- Lightweight (~50KB total)
- No external API calls
- Runs entirely client-side
- Saves to local filesystem (download)

## 🤝 Contributing

Contributions are welcome! Some ideas for enhancements:

- [ ] Cup/tournament competitions
- [ ] Player contracts and wages
- [ ] Tactical formations
- [ ] Manager reputation system
- [ ] Sound effects and music
- [ ] Mobile-optimized UI
- [ ] Multiplayer/hot-seat mode
- [ ] More detailed match engine
- [ ] Player personalities/morale

### Development
```bash
# Simply edit the files and refresh browser
# No build step needed!

# For live reload, you can use any simple server:
npx serve .
# or
python -m http.server 8000
```

## 📜 License

MIT License — feel free to use, modify, and distribute.

## 🙏 Acknowledgments

- Inspired by classic management games: Premier Manager, FIFA Manager, Championship Manager
- Retro aesthetic inspired by PS1/PS2 era sports games
- Built with ❤️ and nostalgia

---

**Ready to lead your club to glory? The pitch awaits!** ⚽🏆
