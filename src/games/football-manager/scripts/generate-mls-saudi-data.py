#!/usr/bin/env python3
"""
Generate MLS and Saudi Pro League club and player data,
then merge into gamedata.json
"""

import json
import random

# MLS Teams (2024-2025 season, 29 clubs)
MLS_TEAMS = [
    ("LA Galaxy", "LAG", "#0d3e70"),
    ("Seattle Sounders", "SEA", "#0c2340"),
    ("Portland Timbers", "POR", "#00481c"),
    ("Vancouver Whitecaps", "VAN", "#00205b"),
    ("San Jose Earthquakes", "SJE", "#0b5394"),
    ("Colorado Rapids", "COL", "#862633"),
    ("Real Salt Lake", "RSL", "#c41e3a"),
    ("FC Dallas", "DAL", "#00385d"),
    ("Houston Dynamo", "HOU", "#f39200"),
    ("Sporting Kansas City", "SKC", "#2d5016"),
    ("Minnesota United", "MIN", "#01204e"),
    ("Chicago Fire", "CHI", "#c41e3a"),
    ("Columbus Crew", "CBU", "#fdb913"),
    ("D.C. United", "DCU", "#000000"),
    ("Toronto FC", "TFC", "#c41e3a"),
    ("New England Revolution", "NER", "#004687"),
    ("New York Red Bulls", "NYRB", "#c41e3a"),
    ("New York City FC", "NYCFC", "#002b5c"),
    ("Philadelphia Union", "PHU", "#00532a"),
    ("Inter Miami CF", "MIA", "#ffb81c"),
    ("Atlanta United", "ATL", "#7c0f1d"),
    ("Orlando City", "ORL", "#753384"),
    ("CF Montréal", "MTL", "#00205b"),
    ("Los Angeles FC", "LAFC", "#000000"),
    ("San Diego Loyal", "SDU", "#007a5e"),
    ("Austin FC", "AUS", "#092c5a"),
    ("FC Cincinnati", "CIN", "#0c1c37"),
    ("St. Louis CITY SC", "STL", "#e43d5e"),
    ("Nashville SC", "NSC", "#f39200"),
]

# Saudi Pro League Teams (2024-2025 season, 18 clubs)
SAUDI_TEAMS = [
    ("Al-Hilal", "AHL", "#1b4b8a"),
    ("Al-Nassr", "ALS", "#ffb81c"),
    ("Al-Shabab", "ASH", "#003d82"),
    ("Al-Fayha", "ALF", "#ff6b35"),
    ("Al-Ittihad", "ALI", "#001f3f"),
    ("Al-Wehda", "ALW", "#ffd700"),
    ("Al-Ahli", "AHA", "#1c3a70"),
    ("Al-Raed", "ALR", "#ffb612"),
    ("Al-Taawoun", "ALT", "#0c3b7e"),
    ("Al-Riyadh", "ALY", "#0066cc"),
    ("Al-Batin", "ALB", "#660033"),
    ("Damac FC", "DAM", "#ff6600"),
    ("Al-Khaleej", "ALK", "#003d99"),
    ("Al-Fateh", "ALN", "#cc0000"),
    ("Abha Club", "ABH", "#0066cc"),
    ("Jeddah Season", "JED", "#ff9900"),
    ("Al-Faisaly", "FAI", "#ff0000"),
    ("Ohod", "OHD", "#0099cc"),
]

def generate_players(club_name, club_id, start_player_id):
    """Generate 24 players for a club with realistic ratings."""
    players = []

    # Generate diverse ratings with average around 76-80
    positions = ["GK", "GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD", "FWD", "FWD", "DEF", "MID", "MID", "FWD", "DEF", "MID"]
    roles = [
        "GK", "GK",
        "CB", "CB", "LB", "RB", "LWB",
        "CDM", "CM", "CAM", "RM", "LM", "CM",
        "ST", "LW", "RW", "CF", "ST", "RB", "CM", "CAM", "LW", "CB", "RM"
    ]

    names = [
        "A. Rodríguez", "J. Martinez", "C. López", "D. Silva", "P. García",
        "F. Fernández", "L. González", "E. Ramírez", "M. Torres", "J. Flores",
        "K. Anderson", "J. Smith", "M. Johnson", "R. Williams", "S. Taylor",
        "D. Brown", "A. Miller", "C. Davis", "B. Wilson", "E. Moore",
        "O. Ahmed", "M. Hassan", "I. Ibrahim", "Y. Abdullah"
    ]

    nationalities = [
        "Mexico", "Argentina", "Brazil", "Colombia", "United States",
        "Canada", "Spain", "France", "England", "Germany",
        "Portugal", "Netherlands", "Italy", "Uruguay", "Chile",
        "Ecuador", "Peru", "Venezuela", "Paraguay", "Costa Rica",
        "Morocco", "Cameroon", "Ghana", "Nigeria"
    ]

    for i in range(24):
        rating = random.randint(65, 89)
        pace = random.randint(60, 94)
        shooting = random.randint(50, 90)
        passing = random.randint(60, 90)
        dribbling = random.randint(55, 92)
        defense = rating if positions[i] in ["DEF", "GK"] else random.randint(35, 80)
        physical = random.randint(60, 90)

        if positions[i] == "GK":
            rating = random.randint(70, 87)
            shooting = random.randint(20, 35)
            dribbling = random.randint(65, 90)
            defense = random.randint(75, 90)

        player = {
            "id": start_player_id + i,
            "name": names[i % len(names)] if i < len(names) else f"Player {i}",
            "nat": nationalities[i % len(nationalities)],
            "pos": positions[i],
            "role": roles[i],
            "rating": rating,
            "potential": min(rating + random.randint(1, 8), 95),
            "pac": pace,
            "sho": shooting,
            "pas": passing,
            "dri": dribbling,
            "def": defense,
            "phy": physical,
            "age": random.randint(19, 37),
            "value": int(rating ** 2.5 * random.uniform(0.8, 1.5)),
            "clubId": club_id,
            "height": random.randint(168, 198),
        }
        players.append(player)

    return players

def main():
    # Load existing gamedata.json
    with open('/home/user/New/src/games/football-manager/public/data/gamedata.json', 'r') as f:
        gamedata = json.load(f)

    existing_clubs = gamedata['clubs']
    existing_players = gamedata['players']

    max_club_id = max(club['id'] for club in existing_clubs)
    max_player_id = max(player['id'] for player in existing_players)

    next_club_id = max_club_id + 1
    next_player_id = max_player_id + 1

    all_new_players = []

    # Generate MLS clubs and players
    for team_name, team_code, team_color in MLS_TEAMS:
        players = generate_players(team_name, next_club_id, next_player_id)
        all_new_players.extend(players)

        club = {
            "id": next_club_id,
            "name": team_name,
            "code": team_code,
            "color": team_color,
            "division": 11,
            "playerIds": [p['id'] for p in players]
        }
        existing_clubs.append(club)
        next_club_id += 1
        next_player_id += len(players)

    # Generate Saudi Pro League clubs and players
    for team_name, team_code, team_color in SAUDI_TEAMS:
        players = generate_players(team_name, next_club_id, next_player_id)
        all_new_players.extend(players)

        club = {
            "id": next_club_id,
            "name": team_name,
            "code": team_code,
            "color": team_color,
            "division": 12,
            "playerIds": [p['id'] for p in players]
        }
        existing_clubs.append(club)
        next_club_id += 1
        next_player_id += len(players)

    # Update gamedata
    gamedata['clubs'] = existing_clubs
    gamedata['players'].extend(all_new_players)
    gamedata['meta']['clubCount'] = len(existing_clubs)
    gamedata['meta']['playerCount'] = len(gamedata['players'])

    # Write back
    with open('/home/user/New/src/games/football-manager/public/data/gamedata.json', 'w') as f:
        json.dump(gamedata, f)

    print(f"✓ Added {len(MLS_TEAMS)} MLS clubs with {len(MLS_TEAMS) * 24} players")
    print(f"✓ Added {len(SAUDI_TEAMS)} Saudi Pro League clubs with {len(SAUDI_TEAMS) * 24} players")
    print(f"✓ Total clubs: {gamedata['meta']['clubCount']}")
    print(f"✓ Total players: {gamedata['meta']['playerCount']}")

if __name__ == '__main__':
    main()
