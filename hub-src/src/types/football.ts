export interface Player {
  id: string;
  name: string;
  position: string;
  rating: number;
  club: string;
  nation: string;
  age: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  value: number;
  fitness: number;
}

export interface Club {
  id: string;
  name: string;
  league: string;
  nation: string;
  rating: number;
  attack: number;
  midfield: number;
  defense: number;
  goals: number;
  conceded: number;
  possession: number;
  cleanSheets: number;
  wins: number;
  draws: number;
  losses: number;
  players: string[];
}

export interface Nation {
  id: string;
  name: string;
  group: string;
  rating: number;
  attack: number;
  midfield: number;
  defense: number;
  goals: number;
  conceded: number;
  possession: number;
  cleanSheets: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  date: string;
  status: 'upcoming' | 'live' | 'finished';
  stage: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  difficulty: string;
  category: string;
}

export interface Article {
  id: number;
  title: string;
  author: string;
  date: string;
  summary: string;
  content: string;
  tags: string[];
  readTime: string;
}

export interface XPState {
  level: number;
  xp: number;
  xpToNext: number;
  streak: number;
  lastActive: string;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  reward: number;
}

export interface DraftRoom {
  code: string;
  players: string[];
  squads: Record<string, Player[]>;
  currentPick: number;
  direction: 1 | -1;
  status: 'waiting' | 'drafting' | 'completed';
}

export interface ManagerState {
  mode: 'club' | 'national';
  team: string;
  squad: Player[];
  budget: number;
  fixtures: Match[];
  leagueTable: Record<string, TeamRecord>;
  formation: string;
  mentality: string;
  season: number;
}

export interface TeamRecord {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface TacticPlayer {
  id: string;
  x: number;
  y: number;
  number: number;
  position: string;
}
