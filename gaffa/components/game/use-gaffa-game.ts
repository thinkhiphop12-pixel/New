"use client"

import { useCallback, useMemo, useState } from "react"
import {
  CLUB_SEASONS,
  DIFFICULTIES,
  FORMATIONS,
  type ClubSeason,
  type Difficulty,
  type Formation,
  type GameModeId,
  type Player,
  type RatingBasis,
} from "@/lib/draft-data"
import { simulateSeason, type DraftedPlayer, type SimResult } from "@/lib/sim"

export type Phase = "setup" | "draft" | "result"

export type Settings = {
  mode: GameModeId
  formationId: string
  difficultyId: string
  ratingBasis: RatingBasis
  era: string
}

const DEFAULT_SETTINGS: Settings = {
  mode: "pl",
  formationId: "442",
  difficultyId: "standard",
  ratingBasis: "form",
  era: "All eras",
}

export function useGaffaGame() {
  const [phase, setPhase] = useState<Phase>("setup")
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const [squad, setSquad] = useState<(DraftedPlayer | null)[]>([])
  const [usedClubSeasons, setUsedClubSeasons] = useState<string[]>([])
  const [currentSpin, setCurrentSpin] = useState<ClubSeason | null>(null)
  const [spinsLeft, setSpinsLeft] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)

  const formation: Formation = useMemo(
    () => FORMATIONS.find((f) => f.id === settings.formationId) ?? FORMATIONS[0],
    [settings.formationId],
  )
  const difficulty: Difficulty = useMemo(
    () => DIFFICULTIES.find((d) => d.id === settings.difficultyId) ?? DIFFICULTIES[1],
    [settings.difficultyId],
  )

  const currentSlotIndex = useMemo(() => squad.findIndex((s) => s === null), [squad])
  const currentSlot = currentSlotIndex >= 0 ? formation.slots[currentSlotIndex] : null
  const isComplete = squad.length > 0 && currentSlotIndex === -1

  // pool of club-seasons eligible for this spin
  const eligibleClubSeasons = useCallback(
    (neededPos: Player["pos"]) =>
      CLUB_SEASONS.filter(
        (cs) =>
          cs.mode === settings.mode &&
          (settings.era === "All eras" || cs.era === settings.era) &&
          !usedClubSeasons.includes(cs.id) &&
          cs.players.some((p) => p.pos === neededPos),
      ),
    [settings.mode, settings.era, usedClubSeasons],
  )

  const startDraft = useCallback(() => {
    const f = FORMATIONS.find((x) => x.id === settings.formationId) ?? FORMATIONS[0]
    const d = DIFFICULTIES.find((x) => x.id === settings.difficultyId) ?? DIFFICULTIES[1]
    setSquad(new Array(f.slots.length).fill(null))
    setUsedClubSeasons([])
    setCurrentSpin(null)
    setResult(null)
    setSpinsLeft(d.spins)
    setPhase("draft")
  }, [settings.formationId, settings.difficultyId])

  const doSpin = useCallback(
    (neededPos: Player["pos"]) => {
      const pool = eligibleClubSeasons(neededPos)
      if (pool.length === 0) return null
      const pick = pool[Math.floor(Math.random() * pool.length)]
      return pick
    },
    [eligibleClubSeasons],
  )

  const spin = useCallback(
    (isReroll: boolean) => {
      if (!currentSlot || spinning) return
      if (isReroll) {
        if (spinsLeft <= 0) return
        setSpinsLeft((n) => n - 1)
      }
      setSpinning(true)
      // brief animation window
      window.setTimeout(() => {
        const pick = doSpin(currentSlot.pos)
        setCurrentSpin(pick)
        setSpinning(false)
      }, 700)
    },
    [currentSlot, spinning, spinsLeft, doSpin],
  )

  // Strategic reroll: keep the same YEAR/season, draw a different club.
  // (App B "reroll the country in the same year".) Costs one re-roll.
  const rerollTeam = useCallback(() => {
    if (!currentSlot || !currentSpin || spinning || spinsLeft <= 0) return
    const season = currentSpin.season
    setSpinsLeft((n) => n - 1)
    setSpinning(true)
    window.setTimeout(() => {
      const pool = eligibleClubSeasons(currentSlot.pos).filter(
        (cs) => cs.season === season && cs.id !== currentSpin.id,
      )
      // Fall back to a normal spin if no same-year club is available.
      const source = pool.length > 0 ? pool : eligibleClubSeasons(currentSlot.pos)
      const pick = source.length > 0 ? source[Math.floor(Math.random() * source.length)] : null
      setCurrentSpin(pick ?? currentSpin)
      setSpinning(false)
    }, 700)
  }, [currentSlot, currentSpin, spinning, spinsLeft, eligibleClubSeasons])

  // Strategic reroll: keep the same CLUB, shift to a different season.
  // (App B "switch the year of the same country".) Costs one re-roll.
  const rerollYear = useCallback(() => {
    if (!currentSlot || !currentSpin || spinning || spinsLeft <= 0) return
    const club = currentSpin.club
    setSpinsLeft((n) => n - 1)
    setSpinning(true)
    window.setTimeout(() => {
      const pool = eligibleClubSeasons(currentSlot.pos).filter(
        (cs) => cs.club === club && cs.id !== currentSpin.id,
      )
      const source = pool.length > 0 ? pool : eligibleClubSeasons(currentSlot.pos)
      const pick = source.length > 0 ? source[Math.floor(Math.random() * source.length)] : null
      setCurrentSpin(pick ?? currentSpin)
      setSpinning(false)
    }, 700)
  }, [currentSlot, currentSpin, spinning, spinsLeft, eligibleClubSeasons])

  // Whether a same-year / same-club alternative exists for the current spin.
  const canRerollTeam = useMemo(() => {
    if (!currentSlot || !currentSpin) return false
    return eligibleClubSeasons(currentSlot.pos).some(
      (cs) => cs.season === currentSpin.season && cs.id !== currentSpin.id,
    )
  }, [currentSlot, currentSpin, eligibleClubSeasons])

  const canRerollYear = useMemo(() => {
    if (!currentSlot || !currentSpin) return false
    return eligibleClubSeasons(currentSlot.pos).some(
      (cs) => cs.club === currentSpin.club && cs.id !== currentSpin.id,
    )
  }, [currentSlot, currentSpin, eligibleClubSeasons])

  const pickPlayer = useCallback(
    (player: Player) => {
      if (currentSlotIndex < 0 || !currentSpin) return
      const drafted: DraftedPlayer = {
        ...player,
        slotIndex: currentSlotIndex,
        club: currentSpin.club,
        season: currentSpin.season,
      }
      setSquad((prev) => {
        const next = [...prev]
        next[currentSlotIndex] = drafted
        return next
      })
      setUsedClubSeasons((prev) => [...prev, currentSpin.id])
      setCurrentSpin(null)
    },
    [currentSlotIndex, currentSpin],
  )

  const simulate = useCallback(() => {
    const filled = squad.filter((s): s is DraftedPlayer => s !== null)
    if (filled.length !== formation.slots.length) return
    const seed = filled.reduce((acc, p) => acc + p.rating * 31 + p.name.length, 7)
    setResult(simulateSeason(filled, settings.ratingBasis, seed))
    setPhase("result")
  }, [squad, formation.slots.length, settings.ratingBasis])

  const reset = useCallback(() => {
    setPhase("setup")
    setSquad([])
    setUsedClubSeasons([])
    setCurrentSpin(null)
    setResult(null)
  }, [])

  const playAgain = useCallback(() => {
    startDraft()
  }, [startDraft])

  return {
    phase,
    settings,
    setSettings,
    formation,
    difficulty,
    squad,
    currentSlot,
    currentSlotIndex,
    isComplete,
    currentSpin,
    spinsLeft,
    spinning,
    result,
    eligibleClubSeasons,
    startDraft,
    spin,
    rerollTeam,
    rerollYear,
    canRerollTeam,
    canRerollYear,
    pickPlayer,
    simulate,
    reset,
    playAgain,
  }
}
