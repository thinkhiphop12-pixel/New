"use client"

import { cn } from "@/lib/utils"
import type { Formation } from "@/lib/draft-data"
import type { DraftedPlayer } from "@/lib/sim"

type Props = {
  formation: Formation
  squad: (DraftedPlayer | null)[]
  activeIndex?: number
  showRatings?: boolean
  onSlotClick?: (index: number) => void
  /** open slots the pending player can be placed into — pulse + clickable */
  highlightIndexes?: number[]
}

export function Pitch({
  formation,
  squad,
  activeIndex,
  showRatings = true,
  onSlotClick,
  highlightIndexes = [],
}: Props) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-[oklch(0.28_0.05_150)]">
      {/* pitch markings */}
      <PitchMarkings />
      {formation.slots.map((slot, i) => {
        const player = squad[i] ?? null
        const isActive = i === activeIndex
        const isHighlighted = highlightIndexes.includes(i)
        return (
          <button
            key={i}
            type="button"
            disabled={!onSlotClick || !isHighlighted}
            onClick={() => isHighlighted && onSlotClick?.(i)}
            style={{ left: `${slot.x}%`, top: `${100 - slot.y}%` }}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 flex w-[19%] flex-col items-center gap-1 outline-none",
              isHighlighted ? "cursor-pointer" : onSlotClick && "cursor-default",
            )}
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all sm:size-11",
                player
                  ? "border-primary bg-background text-foreground"
                  : "border-dashed border-foreground/40 bg-background/30 text-foreground/60",
                isActive && "scale-110 border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_oklch(0.86_0.21_130_/_0.25)]",
                isHighlighted &&
                  "scale-110 animate-pulse border-solid border-primary bg-primary/30 text-foreground shadow-[0_0_0_4px_oklch(0.86_0.21_130_/_0.35)]",
              )}
            >
              {player && showRatings ? player.rating : slot.label}
            </span>
            <span className="max-w-full truncate rounded bg-background/80 px-1 text-[9px] font-semibold leading-tight text-foreground sm:text-[10px]">
              {player ? player.name : slot.label}
            </span>
            {player && (
              <span className="max-w-full truncate text-[8px] leading-none text-foreground/70 sm:text-[9px]">
                {player.club} {player.season}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function PitchMarkings() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 133"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full text-foreground/15"
    >
      {/* stripes */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect
          key={i}
          x="0"
          y={(i * 133) / 6}
          width="100"
          height={133 / 6}
          fill={i % 2 === 0 ? "oklch(0.30 0.05 150)" : "oklch(0.27 0.05 150)"}
        />
      ))}
      <g fill="none" stroke="currentColor" strokeWidth="0.5">
        <rect x="2" y="2" width="96" height="129" />
        <line x1="2" y1="66.5" x2="98" y2="66.5" />
        <circle cx="50" cy="66.5" r="11" />
        <circle cx="50" cy="66.5" r="0.8" fill="currentColor" />
        {/* top box */}
        <rect x="28" y="2" width="44" height="16" />
        <rect x="40" y="2" width="20" height="6" />
        {/* bottom box */}
        <rect x="28" y="115" width="44" height="16" />
        <rect x="40" y="125" width="20" height="6" />
      </g>
    </svg>
  )
}
