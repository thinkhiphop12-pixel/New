"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Pitch } from "./pitch"
import type { useGaffaGame } from "./use-gaffa-game"
import { CHALLENGES, GAME_MODES, type ChallengeContext } from "@/lib/draft-data"
import { Check, Trophy, X } from "lucide-react"

type Game = ReturnType<typeof useGaffaGame>

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function ResultsScreen({ game }: { game: Game }) {
  const { result, squad, formation, settings, difficulty, playAgain, reset } = game
  if (!result) return null

  const ctx: ChallengeContext = {
    position: result.position,
    points: result.points,
    unbeaten: result.unbeaten,
    cleanSheets: result.cleanSheets,
    topScorerGoals: result.topScorer.goals,
    squadRating: result.squadRating,
    difficultyId: settings.difficultyId,
    ratingBasis: settings.ratingBasis,
  }
  const earned = CHALLENGES.filter((c) => c.test(ctx))

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={reset}
          className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          ← New side
        </button>
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {settings.mode} · {formation.name} · {difficulty.name}
        </span>
      </div>

      {/* hero verdict */}
      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Final standing</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
          <span className="font-heading text-7xl font-extrabold uppercase leading-none sm:text-8xl">
            {ordinal(result.position)}
          </span>
          <span className="pb-2 text-lg font-semibold text-muted-foreground">
            {result.points} pts
          </span>
        </div>
        <p className="mt-3 max-w-2xl text-pretty text-base font-medium text-foreground">
          {result.verdict}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="W-D-L" value={`${result.won}-${result.drawn}-${result.lost}`} />
          <Metric label="Goals" value={`${result.gf}-${result.ga}`} />
          <Metric label="Clean sheets" value={`${result.cleanSheets}`} />
          <Metric label="Squad rating" value={`${result.squadRating}`} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,360px)]">
        {/* league table */}
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <h3 className="mb-3 font-heading text-xl font-bold uppercase">League table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Team</th>
                  <th className="py-2 pr-2 text-center">P</th>
                  <th className="py-2 pr-2 text-center">W</th>
                  <th className="py-2 pr-2 text-center">D</th>
                  <th className="py-2 pr-2 text-center">L</th>
                  <th className="py-2 pr-2 text-center">GD</th>
                  <th className="py-2 pl-2 text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {result.table.map((row, i) => (
                  <tr
                    key={row.name}
                    className={cn(
                      "border-b border-border/60",
                      row.isYou && "bg-primary/10 font-semibold",
                      i < 4 && "[&>td:first-child]:text-primary",
                    )}
                  >
                    <td className="py-1.5 pr-2 tabular-nums">{i + 1}</td>
                    <td className="py-1.5 pr-2">{row.name}</td>
                    <td className="py-1.5 pr-2 text-center tabular-nums">{row.played}</td>
                    <td className="py-1.5 pr-2 text-center tabular-nums">{row.won}</td>
                    <td className="py-1.5 pr-2 text-center tabular-nums">{row.drawn}</td>
                    <td className="py-1.5 pr-2 text-center tabular-nums">{row.lost}</td>
                    <td className="py-1.5 pr-2 text-center tabular-nums">{row.gf - row.ga}</td>
                    <td className="py-1.5 pl-2 text-center font-bold tabular-nums">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* side column */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-3 font-heading text-xl font-bold uppercase">Top scorer</h3>
            <p className="font-heading text-2xl font-extrabold">{result.topScorer.name}</p>
            <p className="text-sm text-muted-foreground">{result.topScorer.goals} league goals</p>
            <div className="mt-4 space-y-2">
              <Line label="Attack" value={result.attack} />
              <Line label="Midfield" value={result.midfield} />
              <Line label="Defence" value={result.defence} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-3 font-heading text-xl font-bold uppercase">Challenges</h3>
            <ul className="space-y-1.5">
              {CHALLENGES.map((c) => {
                const done = earned.some((e) => e.id === c.id)
                return (
                  <li key={c.id} className="flex items-start gap-2">
                    {done ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span className={cn("text-sm", done ? "font-semibold text-foreground" : "text-muted-foreground")}>
                      {c.name}
                    </span>
                  </li>
                )
              })}
            </ul>
            {earned.length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                <Trophy className="size-4" /> {earned.length} challenge
                {earned.length > 1 ? "s" : ""} cleared
              </p>
            )}
          </div>
        </div>
      </div>

      {/* squad pitch */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Pitch formation={formation} squad={squad} showRatings={!difficulty.ratingsHidden} />
        <div className="flex flex-col justify-center gap-4">
          <h3 className="font-heading text-3xl font-extrabold uppercase leading-none">
            Run it back?
          </h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Same settings, fresh spins — or head back and tweak the formation, era window and
            difficulty for a different challenge.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={playAgain}
              className="font-heading font-bold uppercase tracking-wide"
            >
              Draft again
            </Button>
            <Button size="lg" variant="secondary" onClick={reset}>
              Change settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="mt-0.5 block font-heading text-xl font-bold tabular-nums">{value}</span>
    </div>
  )
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
