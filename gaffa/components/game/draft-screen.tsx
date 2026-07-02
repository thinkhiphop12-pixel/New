"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Pitch } from "./pitch"
import type { Player } from "@/lib/draft-data"
import type { useGaffaGame } from "./use-gaffa-game"
import { Dices, RotateCw, Shuffle } from "lucide-react"

type Game = ReturnType<typeof useGaffaGame>

export function DraftScreen({ game }: { game: Game }) {
  const {
    formation,
    difficulty,
    squad,
    openSlotIndexes,
    compatibleOpenSlots,
    isComplete,
    currentSpin,
    spinsLeft,
    spinning,
    spin,
    pickPlayer,
    simulate,
    reset,
  } = game

  const showRatings = !difficulty.ratingsHidden
  const filledCount = squad.filter(Boolean).length

  // A clicked player who fits SEVERAL open slots waits here while the user
  // taps one of the highlighted positions on the pitch.
  const [pending, setPending] = useState<Player | null>(null)
  useEffect(() => setPending(null), [currentSpin])

  // Show the WHOLE squad for context; a player is pickable when he fits ANY
  // open slot in your formation. Everyone else is greyed out (e.g. once both
  // your CB slots are filled, remaining centre-backs show disabled).
  const squadPlayers = currentSpin ? currentSpin.players : []
  const canPickPlayer = (p: Player) => compatibleOpenSlots(p).length > 0

  const handlePlayerClick = (p: Player) => {
    const slots = compatibleOpenSlots(p)
    if (slots.length === 0) return
    if (slots.length === 1) {
      pickPlayer(p, slots[0])
      setPending(null)
      return
    }
    setPending(p)
  }

  const handleSlotClick = (index: number) => {
    if (!pending) return
    if (!compatibleOpenSlots(pending).includes(index)) return
    pickPlayer(pending, index)
    setPending(null)
  }

  const highlightIndexes = pending ? compatibleOpenSlots(pending) : []

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8">
      {/* top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={reset}
          className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          ← New side
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Stat label="Picked" value={`${filledCount}/${formation.slots.length}`} />
          <Stat label="Re-rolls" value={`${spinsLeft}`} highlight={spinsLeft > 0} />
          <Stat label="Formation" value={formation.name} />
          <Stat label="Ratings" value={showRatings ? "On" : "Hidden"} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* pitch */}
        <div>
          <Pitch
            formation={formation}
            squad={squad}
            showRatings={showRatings}
            onSlotClick={pending ? handleSlotClick : undefined}
            highlightIndexes={highlightIndexes}
          />
          {pending && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-primary/50 bg-primary/10 px-3 py-2">
              <p className="text-sm font-semibold">
                Place <span className="text-primary">{pending.name}</span> — tap a highlighted
                position
              </p>
              <button
                onClick={() => setPending(null)}
                className="shrink-0 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* draft panel */}
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          {isComplete ? (
            <CompletePanel onSimulate={simulate} />
          ) : (
            <>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
                {openSlotIndexes.length} slot{openSlotIndexes.length === 1 ? "" : "s"} open
              </p>
              <h2 className="mt-2 font-heading text-3xl font-extrabold uppercase leading-none sm:text-4xl">
                Draft your XI
              </h2>

              {!currentSpin ? (
                <div className="mt-8 flex flex-col items-center justify-center gap-5 py-10">
                  <div
                    className={cn(
                      "flex size-24 items-center justify-center rounded-full border-2 border-dashed border-primary/50 text-primary",
                      spinning && "animate-spin",
                    )}
                  >
                    <Dices className="size-10" />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {spinning
                      ? "Spinning the wheel…"
                      : "Spin for a random World Cup squad, then place one of its players into any free slot."}
                  </p>
                  <Button
                    size="lg"
                    disabled={spinning}
                    onClick={() => spin(false)}
                    className="font-heading text-base font-bold uppercase tracking-wide"
                  >
                    <Shuffle className="mr-2 size-4" /> Spin the wheel
                  </Button>
                </div>
              ) : (
                <div className="mt-5">
                  <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded font-heading text-sm font-extrabold text-background"
                      style={{
                        backgroundColor: currentSpin.color,
                        boxShadow: currentSpin.trim ? `inset 0 0 0 2px ${currentSpin.trim}` : undefined,
                      }}
                    >
                      <Flag flag={currentSpin.flag} fallback={currentSpin.club.slice(0, 2).toUpperCase()} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading text-lg font-bold uppercase leading-none">
                        {currentSpin.club}{" "}
                        <span className="font-mono text-xs font-normal normal-case text-muted-foreground">
                          {currentSpin.season}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {currentSpin.note ? `${currentSpin.note} · ` : ""}
                        {currentSpin.era}
                      </p>
                    </div>
                    {currentSpin.finish && (
                      <span
                        className={cn(
                          "shrink-0 rounded px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider",
                          currentSpin.finish === "Champions"
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {currentSpin.finish}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Full squad — pick anyone who fits a free slot
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {squadPlayers.map((p) => {
                      const pickable = canPickPlayer(p)
                      const goals = p.stats?.g ?? 0
                      return (
                        <button
                          key={p.id}
                          onClick={() => pickable && handlePlayerClick(p)}
                          disabled={!pickable}
                          aria-disabled={!pickable}
                          className={cn(
                            "flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors",
                            pickable
                              ? "border-border bg-background hover:border-primary"
                              : "cursor-not-allowed border-border/40 bg-background/40 opacity-40",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                "flex w-9 shrink-0 items-center justify-center rounded px-1 py-0.5 font-mono text-[10px] font-bold uppercase",
                                pickable ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                              )}
                            >
                              {p.spec ?? p.pos}
                            </span>
                            <span className="truncate text-sm font-semibold">{p.name}</span>
                            {goals > 0 && (
                              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                {goals}g
                              </span>
                            )}
                          </span>
                          {showRatings && (
                            <span
                              className={cn(
                                "ml-2 flex size-7 shrink-0 items-center justify-center rounded text-xs font-bold",
                                pickable ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                              )}
                            >
                              {p.rating}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="text-xs text-muted-foreground">
                      Not feeling it? Re-roll for a different squad.
                    </span>
                    <RerollMenu
                      spinsLeft={spinsLeft}
                      spinning={spinning}
                      canRerollTeam={game.canRerollTeam}
                      canRerollYear={game.canRerollYear}
                      onNewSquad={() => spin(true)}
                      onRerollTeam={game.rerollTeam}
                      onRerollYear={game.rerollYear}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function RerollMenu({
  spinsLeft,
  spinning,
  canRerollTeam,
  canRerollYear,
  onNewSquad,
  onRerollTeam,
  onRerollYear,
}: {
  spinsLeft: number
  spinning: boolean
  canRerollTeam: boolean
  canRerollYear: boolean
  onNewSquad: () => void
  onRerollTeam: () => void
  onRerollYear: () => void
}) {
  const disabled = spinsLeft <= 0 || spinning

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value
    // Reset back to the default option so the menu is re-usable.
    e.target.value = "0"
    if (v === "new") onNewSquad()
    else if (v === "team") onRerollTeam()
    else if (v === "year") onRerollYear()
  }

  return (
    <div className="flex items-center gap-2">
      <RotateCw className={cn("size-4 text-muted-foreground", spinning && "animate-spin")} />
      <select
        defaultValue="0"
        disabled={disabled}
        onChange={handleChange}
        className={cn(
          "rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <option value="0">Re-roll ({spinsLeft})…</option>
        <option value="new">New random squad</option>
        <option value="team" disabled={!canRerollTeam}>
          Same year · new club
        </option>
        <option value="year" disabled={!canRerollYear}>
          Same club · new year
        </option>
      </select>
    </div>
  )
}

/** Nation flag: an emoji for most nations, or an inline SVG (England, Wales,
 * Scotland, USSR, Yugoslavia, Zaire…) rendered via a data URI. */
function Flag({ flag, fallback }: { flag?: string; fallback: string }) {
  if (!flag) return <>{fallback}</>
  if (flag.startsWith("<svg"))
    return (
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(flag)}`}
        alt=""
        className="h-5 w-7 rounded-[2px] object-cover"
      />
    )
  return <span className="text-xl leading-none">{flag}</span>
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5">
      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn("block text-sm font-bold", highlight && "text-primary")}>{value}</span>
    </div>
  )
}

function CompletePanel({ onSimulate }: { onSimulate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-12 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">XI complete</p>
      <h2 className="font-heading text-4xl font-extrabold uppercase leading-none">
        Your side
        <br />
        is named
      </h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        Eleven players, eleven different club-seasons. Time to throw them into a full league
        season and see how they get on.
      </p>
      <Button
        size="lg"
        onClick={onSimulate}
        className="font-heading text-base font-bold uppercase tracking-wide"
      >
        Simulate the season
      </Button>
    </div>
  )
}
