"use client"

import { useEffect, useState } from "react"
import { useGaffaGame } from "@/components/game/use-gaffa-game"
import { SetupScreen } from "@/components/game/setup-screen"
import { DraftScreen } from "@/components/game/draft-screen"
import { ResultsScreen } from "@/components/game/results-screen"
import type { ClubSeason } from "@/lib/draft-data"

export default function Page() {
  const [clubSeasons, setClubSeasons] = useState<ClubSeason[]>([])
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let alive = true
    // Raw fetch() is not auto-prefixed by Next's basePath, so add it ourselves.
    const bp = process.env.NEXT_PUBLIC_BASE_PATH || ""
    fetch(`${bp}/data/squads.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: ClubSeason[]) => {
        if (alive) setClubSeasons(data)
      })
      .catch(() => {
        if (alive) setLoadError(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const game = useGaffaGame(clubSeasons)
  const ready = clubSeasons.length > 0

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-heading text-lg font-extrabold uppercase tracking-tight">
            Gaffa<span className="text-primary">Draft</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            World Cup XI
          </span>
        </div>
      </div>

      {!ready && (
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {loadError ? "Could not load squad data — please refresh." : "Loading squads…"}
          </p>
        </div>
      )}

      {ready && game.phase === "setup" && (
        <SetupScreen
          settings={game.settings}
          setSettings={game.setSettings}
          onStart={game.startDraft}
          onStartDaily={game.startDaily}
          daily={game.dailyState}
        />
      )}
      {ready && game.phase === "draft" && <DraftScreen game={game} />}
      {ready && game.phase === "result" && <ResultsScreen game={game} />}
    </main>
  )
}
