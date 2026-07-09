/** 40+ specialized player roles for tactical depth. */

export interface PlayerRoleDefinition {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  description: string;
  attributes: {
    pace: number; // -2 to +2 modifier
    passing: number;
    defense: number;
    dribbling: number;
    shooting: number;
  };
}

export const PLAYER_ROLES: Record<string, PlayerRoleDefinition> = {
  // GOALKEEPERS (3 roles)
  gk_sweeper: {
    id: 'gk_sweeper',
    name: 'Sweeper Keeper',
    position: 'GK',
    description: 'Plays as 11th outfield player, rushes off line to clear',
    attributes: { pace: 1, passing: 1, defense: 1, dribbling: 0, shooting: 0 },
  },
  gk_traditional: {
    id: 'gk_traditional',
    name: 'Traditional Keeper',
    position: 'GK',
    description: 'Classic shot-stopper, stays on line',
    attributes: { pace: 0, passing: -1, defense: 1, dribbling: 0, shooting: 0 },
  },
  gk_distributor: {
    id: 'gk_distributor',
    name: 'Distributor',
    position: 'GK',
    description: 'Excellent passer, builds play from the back',
    attributes: { pace: -1, passing: 2, defense: 0, dribbling: 0, shooting: 0 },
  },

  // DEFENDERS (12 roles)
  cb_stopper: {
    id: 'cb_stopper',
    name: 'Center Back (Stopper)',
    position: 'DEF',
    description: 'Physical defender, focuses on blocking shots',
    attributes: { pace: 0, passing: -1, defense: 2, dribbling: -1, shooting: 0 },
  },
  cb_playmaker: {
    id: 'cb_playmaker',
    name: 'Center Back (Playmaker)',
    position: 'DEF',
    description: 'Ball-playing defender, initiates attacks',
    attributes: { pace: -1, passing: 2, defense: 0, dribbling: 1, shooting: -1 },
  },
  cb_aggressive: {
    id: 'cb_aggressive',
    name: 'Center Back (Aggressive)',
    position: 'DEF',
    description: 'Aggressive defender, presses opposition',
    attributes: { pace: 1, passing: -1, defense: 1, dribbling: 0, shooting: 0 },
  },
  lb_fullback: {
    id: 'lb_fullback',
    name: 'Left Back',
    position: 'DEF',
    description: 'Traditional fullback, defends wing',
    attributes: { pace: 1, passing: 0, defense: 1, dribbling: 0, shooting: -1 },
  },
  lb_wingback: {
    id: 'lb_wingback',
    name: 'Left Wing-Back',
    position: 'DEF',
    description: 'Overlaps attacking moves on the wing',
    attributes: { pace: 2, passing: 1, defense: 0, dribbling: 1, shooting: 0 },
  },
  lb_advanced_wingback: {
    id: 'lb_advanced_wingback',
    name: 'Advanced Left Wing-Back',
    position: 'DEF',
    description: 'Operates high and wide, aggressive wing play',
    attributes: { pace: 2, passing: 1, defense: -1, dribbling: 2, shooting: 1 },
  },
  rb_fullback: {
    id: 'rb_fullback',
    name: 'Right Back',
    position: 'DEF',
    description: 'Traditional fullback, defends wing',
    attributes: { pace: 1, passing: 0, defense: 1, dribbling: 0, shooting: -1 },
  },
  rb_wingback: {
    id: 'rb_wingback',
    name: 'Right Wing-Back',
    position: 'DEF',
    description: 'Overlaps attacking moves on the wing',
    attributes: { pace: 2, passing: 1, defense: 0, dribbling: 1, shooting: 0 },
  },
  rb_advanced_wingback: {
    id: 'rb_advanced_wingback',
    name: 'Advanced Right Wing-Back',
    position: 'DEF',
    description: 'Operates high and wide, aggressive wing play',
    attributes: { pace: 2, passing: 1, defense: -1, dribbling: 2, shooting: 1 },
  },
  df_inverted_fullback: {
    id: 'df_inverted_fullback',
    name: 'Inverted Fullback',
    position: 'DEF',
    description: 'Cuts inside to support midfield/attack',
    attributes: { pace: 1, passing: 1, defense: 0, dribbling: 1, shooting: 1 },
  },
  df_wide_cb: {
    id: 'df_wide_cb',
    name: 'Wide Center Back',
    position: 'DEF',
    description: 'Operates in wide defensive areas',
    attributes: { pace: 1, passing: 1, defense: 1, dribbling: 0, shooting: 0 },
  },

  // MIDFIELDERS (15 roles)
  cdm_destroyer: {
    id: 'cdm_destroyer',
    name: 'Central Midfielder (Destroyer)',
    position: 'MID',
    description: 'Aggressive defensive midfielder, breaks up play',
    attributes: { pace: 0, passing: -1, defense: 2, dribbling: -1, shooting: -2 },
  },
  cdm_anchor: {
    id: 'cdm_anchor',
    name: 'Central Midfielder (Anchor)',
    position: 'MID',
    description: 'Shields defense, stable presence',
    attributes: { pace: -1, passing: 0, defense: 2, dribbling: -1, shooting: -1 },
  },
  cdm_box_to_box: {
    id: 'cdm_box_to_box',
    name: 'Central Midfielder (Box-to-Box)',
    position: 'MID',
    description: 'Covers entire pitch, contributes both ends',
    attributes: { pace: 1, passing: 1, defense: 1, dribbling: 1, shooting: 0 },
  },
  cm_playmaker: {
    id: 'cm_playmaker',
    name: 'Midfielder (Playmaker)',
    position: 'MID',
    description: 'Key passer, dictates tempo',
    attributes: { pace: -1, passing: 2, defense: -1, dribbling: 1, shooting: 0 },
  },
  cm_wide: {
    id: 'cm_wide',
    name: 'Wide Central Midfielder',
    position: 'MID',
    description: 'Operates in wide areas, supports flanks',
    attributes: { pace: 1, passing: 1, defense: 0, dribbling: 1, shooting: 0 },
  },
  cam_trequartista: {
    id: 'cam_trequartista',
    name: 'Attacking Midfielder (Trequartista)',
    position: 'MID',
    description: 'Plays between lines, creative risk-taker',
    attributes: { pace: 0, passing: 2, defense: -2, dribbling: 2, shooting: 1 },
  },
  cam_support: {
    id: 'cam_support',
    name: 'Attacking Midfielder (Support)',
    position: 'MID',
    description: 'Creates chances, supports attack',
    attributes: { pace: 1, passing: 1, defense: -1, dribbling: 1, shooting: 1 },
  },
  cm_engine: {
    id: 'cm_engine',
    name: 'Central Midfielder (Engine)',
    position: 'MID',
    description: 'Tireless runner, high work rate',
    attributes: { pace: 1, passing: 1, defense: 1, dribbling: 0, shooting: -1 },
  },
  lm_winger: {
    id: 'lm_winger',
    name: 'Left Winger',
    position: 'MID',
    description: 'Operates on left flank, creates width',
    attributes: { pace: 2, passing: 0, defense: -1, dribbling: 2, shooting: 1 },
  },
  lm_inverted: {
    id: 'lm_inverted',
    name: 'Left Winger (Inverted)',
    position: 'MID',
    description: 'Cuts inside to shoot, left-footed naturally',
    attributes: { pace: 1, passing: 0, defense: -1, dribbling: 2, shooting: 2 },
  },
  rm_winger: {
    id: 'rm_winger',
    name: 'Right Winger',
    position: 'MID',
    description: 'Operates on right flank, creates width',
    attributes: { pace: 2, passing: 0, defense: -1, dribbling: 2, shooting: 1 },
  },
  rm_inverted: {
    id: 'rm_inverted',
    name: 'Right Winger (Inverted)',
    position: 'MID',
    description: 'Cuts inside to shoot, right-footed naturally',
    attributes: { pace: 1, passing: 0, defense: -1, dribbling: 2, shooting: 2 },
  },
  lw_support: {
    id: 'lw_support',
    name: 'Left Midfielder (Support)',
    position: 'MID',
    description: 'Wide support midfielder, link play',
    attributes: { pace: 1, passing: 1, defense: 0, dribbling: 1, shooting: 0 },
  },
  rw_support: {
    id: 'rw_support',
    name: 'Right Midfielder (Support)',
    position: 'MID',
    description: 'Wide support midfielder, link play',
    attributes: { pace: 1, passing: 1, defense: 0, dribbling: 1, shooting: 0 },
  },

  // FORWARDS (9 roles)
  st_target: {
    id: 'st_target',
    name: 'Striker (Target)',
    position: 'FWD',
    description: 'Physical forward, wins aerial battles',
    attributes: { pace: -1, passing: -1, defense: 0, dribbling: -1, shooting: 1 },
  },
  st_poacher: {
    id: 'st_poacher',
    name: 'Striker (Poacher)',
    position: 'FWD',
    description: 'Clinical finisher, penalty box specialist',
    attributes: { pace: 1, passing: -1, defense: -2, dribbling: 0, shooting: 2 },
  },
  st_allrounder: {
    id: 'st_allrounder',
    name: 'Striker (Allrounder)',
    position: 'FWD',
    description: 'Balanced attacker, contributes in all areas',
    attributes: { pace: 0, passing: 0, defense: -1, dribbling: 1, shooting: 1 },
  },
  fw_channel: {
    id: 'fw_channel',
    name: 'Forward (Channel)',
    position: 'FWD',
    description: 'Runs in wide channels, direct play',
    attributes: { pace: 2, passing: -1, defense: -1, dribbling: 1, shooting: 1 },
  },
  fw_wide: {
    id: 'fw_wide',
    name: 'Wide Forward',
    position: 'FWD',
    description: 'Plays wide but advanced, creates and finishes',
    attributes: { pace: 2, passing: 0, defense: -1, dribbling: 2, shooting: 1 },
  },
  fw_second_striker: {
    id: 'fw_second_striker',
    name: 'Second Striker',
    position: 'FWD',
    description: 'Plays behind main striker, creative threat',
    attributes: { pace: 0, passing: 1, defense: -1, dribbling: 1, shooting: 1 },
  },
  fw_false_nine: {
    id: 'fw_false_nine',
    name: 'False Nine',
    position: 'FWD',
    description: 'Drops deep, playmaker from forward position',
    attributes: { pace: -1, passing: 2, defense: -1, dribbling: 1, shooting: 0 },
  },
  fw_deep_striker: {
    id: 'fw_deep_striker',
    name: 'Deep Striker',
    position: 'FWD',
    description: 'Drops into midfield to link play',
    attributes: { pace: 0, passing: 1, defense: 0, dribbling: 1, shooting: 0 },
  },
  fw_pressing: {
    id: 'fw_pressing',
    name: 'Forward (Pressing)',
    position: 'FWD',
    description: 'High press forward, forces turnovers',
    attributes: { pace: 2, passing: -1, defense: 1, dribbling: 0, shooting: 1 },
  },
};

export function getRolesByPosition(position: 'GK' | 'DEF' | 'MID' | 'FWD'): PlayerRoleDefinition[] {
  return Object.values(PLAYER_ROLES).filter((r) => r.position === position);
}

export function getRole(roleId: string): PlayerRoleDefinition | undefined {
  return PLAYER_ROLES[roleId];
}

export function getDefaultRoleForPosition(position: 'GK' | 'DEF' | 'MID' | 'FWD'): string {
  switch (position) {
    case 'GK':
      return 'gk_traditional';
    case 'DEF':
      return 'cb_stopper';
    case 'MID':
      return 'cm_playmaker';
    case 'FWD':
      return 'st_allrounder';
  }
}
