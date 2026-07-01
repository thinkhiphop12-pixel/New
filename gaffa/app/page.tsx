"use client"

import { useGaffaGame } from "@/components/game/use-gaffa-game"
import { SetupScreen } from "@/components/game/setup-screen"
import { DraftScreen } from "@/components/game/draft-screen"
import { ResultsScreen } from "@/components/game/results-screen"

export default function Page() {
  const game = useGaffaGame()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="font-heading text-lg font-extrabold uppercase tracking-tight">
            Gaffa<span className="text-primary">Draft</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Prototype
          </span>
        </div>
      </div>

      {game.phase === "setup" && (
        <SetupScreen
          settings={game.settings}
          setSettings={game.setSettings}
          onStart={game.startDraft}
        />
      )}
      {game.phase === "draft" && <DraftScreen game={game} />}
      {game.phase === "result" && <ResultsScreen game={game} />}
    </main>
  )
}
