"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CHALLENGES,
  DIFFICULTIES,
  ERAS,
  FORMATIONS,
} from "@/lib/draft-data"
import { dailySettings, type DailyState } from "@/lib/daily"
import type { Settings } from "./use-gaffa-game"
import { CalendarDays, Check, Eye, EyeOff, Flame, Share2, Target, Trophy } from "lucide-react"

type Props = {
  settings: Settings
  setSettings: (s: Settings) => void
  onStart: () => void
  onStartDaily: () => void
  daily: DailyState | null
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

function DailyCard({ daily, onStartDaily }: { daily: DailyState; onStartDaily: () => void }) {
  const [copied, setCopied] = useState(false)
  const s = dailySettings(daily.day)
  const formation = FORMATIONS.find((f) => f.id === s.formationId)
  const blurb = `${s.competition === "cup" ? "Cup run" : "League season"} · ${formation?.name ?? ""} · same spins for everyone`

  const share = async () => {
    if (!daily.shareText) return
    try {
      if (navigator.share) {
        await navigator.share({ text: daily.shareText })
        return
      }
    } catch {
      // fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(daily.shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard unavailable — nothing to do
    }
  }

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="font-heading text-lg font-extrabold uppercase leading-none">
            Daily Challenge <span className="text-primary">#{daily.day}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {daily.playedToday && daily.summary ? daily.summary : blurb}
          </p>
        </div>
        {daily.streak > 0 && (
          <span className="ml-1 flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 font-mono text-xs font-bold text-primary">
            <Flame className="size-3.5" /> {daily.streak}
          </span>
        )}
      </div>
      {daily.playedToday ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-primary">
            <Check className="size-4" /> Played
          </span>
          {daily.shareText && (
            <Button size="sm" variant="secondary" onClick={share}>
              <Share2 className="mr-1.5 size-3.5" /> {copied ? "Copied!" : "Share"}
            </Button>
          )}
        </div>
      ) : (
        <Button
          onClick={onStartDaily}
          className="font-heading font-bold uppercase tracking-wide"
        >
          Play today&apos;s
        </Button>
      )}
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

export function SetupScreen({ settings, setSettings, onStart, onStartDaily, daily }: Props) {
  const update = (patch: Partial<Settings>) => setSettings({ ...settings, ...patch })

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:pt-16">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          A football draft game
        </p>
        <h1 className="mt-3 font-heading text-5xl font-extrabold uppercase leading-[0.9] tracking-tight text-balance sm:text-7xl">
          Name
          <br />
          Your Side
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          Spin for a random World Cup squad, then draft one player from it into your XI. No two
          players from the same side. Fill all eleven, then take them into a league season or a
          knockout Cup run against the greatest teams in history.
        </p>
      </header>

      {daily && <DailyCard daily={daily} onStartDaily={onStartDaily} />}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-7">
          <Section label="Competition">
            <OptionGrid
              columns={2}
              value={settings.competition}
              onChange={(competition) => update({ competition })}
              options={[
                { id: "league" as const, title: "League season", subtitle: "38 games vs 19 rivals. Points win prizes." },
                { id: "cup" as const, title: "Cup run", subtitle: "4 knockout rounds vs real World Cup legends." },
              ]}
            />
          </Section>

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

          <Section label={settings.competition === "cup" ? "Cup challenges" : "Season challenges"}>
            <ul className="grid gap-1.5">
              {CHALLENGES.filter((c) => c.scope === settings.competition).slice(0, 5).map((c) => (
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
