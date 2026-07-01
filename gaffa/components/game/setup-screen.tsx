"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CHALLENGES,
  DIFFICULTIES,
  ERAS,
  FORMATIONS,
} from "@/lib/draft-data"
import type { Settings } from "./use-gaffa-game"
import { Eye, EyeOff, Target, Trophy } from "lucide-react"

type Props = {
  settings: Settings
  setSettings: (s: Settings) => void
  onStart: () => void
}

function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: { id: T; title: string; subtitle?: string }[]
  value: T
  onChange: (v: T) => void
  columns?: number
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
    >
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-md border px-3 py-2.5 text-left transition-colors",
              active
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-foreground/30",
            )}
          >
            <span className="block text-sm font-semibold text-foreground">{o.title}</span>
            {o.subtitle && (
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {o.subtitle}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  )
}

export function SetupScreen({ settings, setSettings, onStart }: Props) {
  const update = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch })

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:pt-16">
      <header className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          A football draft game
        </p>
        <h1 className="mt-3 font-heading text-5xl font-extrabold uppercase leading-[0.9] tracking-tight text-balance sm:text-7xl">
          Name
          <br />
          Your Side
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          Spin for a random club-season, then draft one player from it into your XI. No two
          players from the same side. Fill all eleven, simulate a full season, and see if your
          gut built a champion.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-7">
          <Section label="Formation">
            <OptionGrid
              value={settings.formationId}
              onChange={(formationId) => update({ formationId })}
              options={FORMATIONS.map((f) => ({ id: f.id, title: f.name }))}
            />
          </Section>

          <Section label="Era window">
            <OptionGrid
              columns={3}
              value={settings.era}
              onChange={(era) => update({ era })}
              options={ERAS.map((e) => ({ id: e, title: e }))}
            />
          </Section>
        </div>

        <div className="space-y-7">
          <Section label="Difficulty (re-rolls)">
            <OptionGrid
              columns={2}
              value={settings.difficultyId}
              onChange={(difficultyId) => update({ difficultyId })}
              options={DIFFICULTIES.map((d) => ({
                id: d.id,
                title: `${d.name} · ${d.spins} spins`,
                subtitle: d.description,
              }))}
            />
          </Section>

          <Section label="Season challenges">
            <ul className="grid gap-1.5">
              {CHALLENGES.slice(0, 5).map((c) => (
                <li
                  key={c.id}
                  className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2"
                >
                  <Trophy className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <span className="text-sm font-semibold text-foreground">{c.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{c.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-start gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Target className="size-4 text-primary" />
            {DIFFICULTIES.find((d) => d.id === settings.difficultyId)?.spins} re-rolls
          </span>
          <span className="flex items-center gap-1.5">
            {DIFFICULTIES.find((d) => d.id === settings.difficultyId)?.ratingsHidden ? (
              <>
                <EyeOff className="size-4 text-primary" /> Ratings hidden
              </>
            ) : (
              <>
                <Eye className="size-4 text-primary" /> Ratings shown
              </>
            )}
          </span>
        </div>
        <Button size="lg" onClick={onStart} className="font-heading text-base font-bold uppercase tracking-wide">
          Start the draft
        </Button>
      </div>
    </div>
  )
}
