'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import QRCode from 'react-qr-code'

type ViewState = 'loading' | 'no_token' | 'invalid' | 'not_found' | 'unavailable' | 'ready'
type AttendeeData = { attendee: Record<string, unknown>; event: Record<string, unknown> }

function getDrinkColors(name: string) {
  const n = name.toLowerCase()
  if (n.includes('oolong'))      return { bg: 'bg-[#F3E8DE]', border: 'border-[#D4BC9E]', strip: 'bg-[#8B5E34]' }
  if (n.includes('cream soda')) return { bg: 'bg-green-50',   border: 'border-green-200',  strip: 'bg-green-500' }
  if (n.includes('coca') || n.includes('coke')) return { bg: 'bg-red-50', border: 'border-red-200', strip: 'bg-red-500' }
  if (n.includes('sapporo') || n.includes('beer')) return { bg: 'bg-amber-50', border: 'border-amber-200', strip: 'bg-amber-400' }
  if (n.includes('highball'))    return { bg: 'bg-orange-50',  border: 'border-orange-200', strip: 'bg-orange-600' }
  if (n.includes('lemon'))       return { bg: 'bg-yellow-50',  border: 'border-yellow-200', strip: 'bg-yellow-400' }
  return { bg: 'bg-white', border: 'border-[#17120F]', strip: 'bg-[#17120F]' }
}

function formatArrivalTime(iso: string) {
  if (!iso) return 'TBD'
  try {
    return new Date(iso).toLocaleTimeString('en-GB', {
      timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit',
    }) + ' JST'
  } catch { return 'TBD' }
}

function getEventPhase(iso: string) {
  if (!iso) return 'Date pending'
  const eventTime = new Date(iso).getTime()
  if (Number.isNaN(eventTime)) return 'Date pending'
  const diffMinutes = Math.round((eventTime - Date.now()) / 60000)
  if (diffMinutes > 90) return `Starts ${new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Tokyo', month: 'short', day: 'numeric' })}`
  if (diffMinutes > 0) return `Starts in ${diffMinutes} min`
  if (diffMinutes > -180) return 'Happening now'
  return 'Event ended'
}

function DrinkCard({ name }: { name: string }) {
  const c = getDrinkColors(name)
  return (
    <div className={`${c.bg} rounded-xl border-2 ${c.border} px-4 py-3 relative overflow-hidden flex items-center gap-3 shadow-[3px_3px_0_#17120F]`}>
      <div className={`absolute left-0 top-0 bottom-0 w-2 ${c.strip}`} />
      <span className="font-black text-[#23110D] text-sm pl-2">{name}</span>
    </div>
  )
}

function Lantern({ className = '', delay = '0s', variant = 'red', glyph = '祭' }: { className?: string; delay?: string; variant?: 'red' | 'gold'; glyph?: string }) {
  const body = variant === 'gold' ? '#FFC400' : '#E51F1F'
  const glyphFill = variant === 'gold' ? '#9A1414' : '#FFF8D8'
  return (
    <svg
      viewBox="0 0 44 74"
      className={className}
      style={{ transformOrigin: 'top center', animation: 'lanternSway 3.4s ease-in-out infinite', animationDelay: delay }}
      aria-hidden="true"
    >
      <line x1="22" y1="0" x2="22" y2="8" stroke="#17120F" strokeWidth="2" />
      <rect x="11" y="7" width="22" height="7" rx="2.5" fill="#3A2A1A" stroke="#17120F" strokeWidth="2" />
      <ellipse cx="22" cy="35" rx="18" ry="21" fill={body} stroke="#17120F" strokeWidth="2.5" />
      <ellipse cx="15" cy="29" rx="4" ry="8" fill="#FFFFFF" opacity="0.22" />
      <g stroke="#17120F" strokeOpacity="0.32" strokeWidth="1.5" fill="none">
        <path d="M5.5 27 Q22 24 38.5 27" />
        <path d="M4 35 Q22 32 40 35" />
        <path d="M5.5 43 Q22 46 38.5 43" />
      </g>
      <text x="22" y="41" textAnchor="middle" fontSize="18" fontWeight="700" fill={glyphFill} style={{ fontFamily: "'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif" }}>{glyph}</text>
      <rect x="14" y="54" width="16" height="6" rx="2" fill="#3A2A1A" stroke="#17120F" strokeWidth="2" />
      <g stroke="#FFC400" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="60" x2="17" y2="71" /><line x1="22" y1="60" x2="22" y2="72" /><line x1="26" y1="60" x2="27" y2="71" />
      </g>
    </svg>
  )
}

function LanternGarland() {
  const lanterns = [
    { g: '大', v: 'red' }, { g: '衆', v: 'gold' }, { g: '酒', v: 'red' }, { g: '場', v: 'gold' },
    { g: '乾', v: 'red' }, { g: '杯', v: 'gold' }, { g: '祭', v: 'red' },
  ] as const
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 px-1.5" aria-hidden="true">
      <div className="absolute left-2 right-2 top-1.5 h-0.5 rounded-full bg-[#17120F]/70" />
      <div className="relative flex items-start justify-between">
        {lanterns.map((l, i) => (
          <Lantern key={i} variant={l.v} glyph={l.g} delay={`${i * 0.22}s`} className={i % 2 ? 'h-9' : 'h-[2.9rem]'} />
        ))}
      </div>
    </div>
  )
}

function KaraagePiece({ x, y, s = 1, rot = 0 }: { x: number; y: number; s?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path
        d="M0 -13 C5 -13 7 -10 9 -9 C13 -9 14 -5 13 -2 C15 2 13 6 10 7 C9 11 5 13 1 11 C-3 13 -8 11 -8 7 C-12 6 -13 1 -11 -3 C-13 -7 -9 -11 -5 -10 C-4 -12 -2 -13 0 -13 Z"
        fill="#C36A18" stroke="#17120F" strokeWidth="2.2" strokeLinejoin="round"
      />
      <path d="M-5 -6 C-1 -8 4 -7 5 -3 C6 0 3 3 -1 2 C-5 2 -7 -3 -5 -6 Z" fill="#E89A40" />
      <circle cx="4" cy="5" r="1.2" fill="#3A2410" />
      <circle cx="-3" cy="6" r="1" fill="#3A2410" />
      <circle cx="6" cy="-2" r="0.9" fill="#3A2410" />
    </g>
  )
}

function KaraageBoat({ className = '' }: { className?: string }) {
  const pieces = [
    { x: 46, y: 98, s: 1, rot: -8 }, { x: 72, y: 104, s: 1.1, rot: 12 }, { x: 102, y: 106, s: 1.18, rot: -4 },
    { x: 134, y: 104, s: 1.1, rot: 14 }, { x: 162, y: 98, s: 1, rot: -10 },
    { x: 60, y: 84, s: 1, rot: 18 }, { x: 90, y: 86, s: 1.05, rot: -14 }, { x: 120, y: 86, s: 1.05, rot: 8 }, { x: 150, y: 84, s: 1, rot: -18 },
    { x: 78, y: 68, s: 0.95, rot: -6 }, { x: 108, y: 68, s: 1, rot: 12 }, { x: 136, y: 68, s: 0.95, rot: -12 },
    { x: 94, y: 56, s: 0.92, rot: 8 }, { x: 122, y: 56, s: 0.92, rot: -8 }, { x: 108, y: 46, s: 0.85, rot: 2 },
  ]
  const negi = [
    { x: 72, y: 40 }, { x: 80, y: 24 }, { x: 86, y: 14 }, { x: 92, y: 8 }, { x: 98, y: 4, green: true }, { x: 103, y: 12 },
    { x: 108, y: 2 }, { x: 113, y: 8, green: true }, { x: 118, y: 0 }, { x: 123, y: 8 }, { x: 128, y: 2 },
    { x: 133, y: 10, green: true }, { x: 138, y: 4 }, { x: 144, y: 14 }, { x: 150, y: 22, green: true }, { x: 158, y: 36 },
    { x: 100, y: 16 }, { x: 114, y: 14 }, { x: 128, y: 18 }, { x: 66, y: 30 },
  ]
  return (
    <svg viewBox="0 0 240 168" className={className} aria-hidden="true">
      <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6">
        <path d="M84 14 q-7 -9 0 -17 q5 -6 0 -12" /><path d="M120 8 q-7 -9 0 -17 q5 -6 0 -12" /><path d="M156 16 q-7 -9 0 -17 q5 -6 0 -12" />
      </g>
      <g strokeLinecap="round" strokeWidth="3.6">
        {negi.map((n, i) => (
          <line key={i} x1="115" y1="56" x2={n.x} y2={n.y} stroke={n.green ? '#7FB84A' : '#FCFCF7'} />
        ))}
      </g>
      <path d="M88 54 Q104 40 120 44 Q138 39 152 54 Q138 62 120 60 Q100 63 88 54 Z" fill="#FCFCF7" stroke="#17120F" strokeWidth="1.6" strokeLinejoin="round" />
      {pieces.map((p, i) => <KaraagePiece key={i} {...p} />)}
      <g stroke="#17120F" strokeWidth="2" strokeLinejoin="round">
        <path d="M40 102 a15 15 0 0 1 15 15 l-15 0 z" fill="#FFE34D" />
        <path d="M40 102 a15 15 0 0 1 15 15" fill="none" stroke="#E8C200" strokeWidth="2" />
        <path d="M196 102 a15 15 0 0 0 -15 15 l15 0 z" fill="#FFE34D" />
      </g>
      <path d="M6 108 Q120 99 234 108 L210 130 Q120 152 30 130 Z" fill="#A9743C" stroke="#17120F" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M6 108 Q120 99 234 108 L228 113 Q120 105 12 113 Z" fill="#C28E50" stroke="#17120F" strokeWidth="1.5" />
      <path d="M26 118 Q120 130 214 118" fill="none" stroke="#6B4521" strokeWidth="2.4" strokeLinecap="round" />
      <g stroke="#6B4521" strokeWidth="1.4" strokeOpacity="0.55" strokeLinecap="round">
        <line x1="60" y1="124" x2="60" y2="134" /><line x1="100" y1="128" x2="100" y2="139" />
        <line x1="140" y1="128" x2="140" y2="139" /><line x1="180" y1="124" x2="180" y2="134" />
      </g>
    </svg>
  )
}

function SmileyMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#E51F1F" stroke="#17120F" strokeWidth="2.5" />
      <circle cx="13" cy="16.5" r="2.6" fill="#17120F" />
      <circle cx="27" cy="16.5" r="2.6" fill="#17120F" />
      <path d="M11 22 q9 11 18 0" fill="none" stroke="#17120F" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function BrandSign({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <SmileyMark className="h-7 w-7 shrink-0 -rotate-6" />
        <span className="brand-wordmark text-2xl leading-none">Offkai Bot</span>
      </div>
    )
  }
  return (
    <div className="inline-flex flex-col items-center px-2">
      <span className="brand-banner inline-block rounded-lg px-3 py-0.5 text-[11px] tracking-[0.34em]">大衆酒場</span>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="brand-wordmark text-[2.4rem] leading-[0.95]">Offkai Bot</span>
        <SmileyMark className="h-8 w-8 shrink-0 -rotate-6 drop-shadow-[2px_2px_0_#17120F]" />
      </div>
      <span className="mt-2 font-display text-[10px] uppercase tracking-[0.42em] text-white drop-shadow-[1.5px_1.5px_0_#17120F]">RSVP Pass</span>
    </div>
  )
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="brand-rays min-h-dvh flex items-center justify-center p-6 text-[#23110D]">
      <div className="brand-card w-full max-w-sm rounded-3xl p-7 text-center">
        {children}
      </div>
    </main>
  )
}

function NoToken() {
  return (
    <CenterCard>
      <BrandSign compact />
      <h1 className="mt-7 font-display text-2xl uppercase tracking-tight">Check Your DMs</h1>
      <p className="mt-3 text-sm font-bold leading-relaxed text-[#5B3428]">
        Your personal event link was sent to you via Discord DM. Open that message and tap the link to view your RSVP details.
      </p>
    </CenterCard>
  )
}

function InvalidToken({ reason }: { reason: 'invalid' | 'not_found' | 'unavailable' }) {
  const title = reason === 'not_found' ? 'RSVP Not Found' : reason === 'unavailable' ? 'RSVP Unavailable' : 'Link Invalid'
  const badge = reason === 'not_found' ? '404' : reason === 'unavailable' ? '503' : 'NG'
  const message =
    reason === 'not_found'
      ? "We couldn't find your RSVP for this event. Check with the event host if you believe this is an error."
      : reason === 'unavailable'
        ? "We couldn't load your RSVP right now. Check your connection and try again."
        : 'This link has expired or is invalid. Check your Discord DMs for an updated link.'
  return (
    <CenterCard>
      <BrandSign compact />
      <p className="mx-auto mt-7 inline-flex h-12 min-w-12 items-center justify-center rounded-full border-2 border-[#17120F] bg-[#E51F1F] px-4 text-sm font-black uppercase tracking-widest text-white">
        {badge}
      </p>
      <h1 className="mt-4 font-display text-2xl uppercase tracking-tight">{title}</h1>
      <p className="mt-3 text-sm font-bold leading-relaxed text-[#5B3428]">{message}</p>
      {reason === 'unavailable' && (
        <button
          onClick={() => window.location.reload()}
          className="brand-action mt-5 min-h-[44px] rounded-xl px-6 font-black uppercase tracking-widest text-sm"
        >
          Retry
        </button>
      )}
    </CenterCard>
  )
}

function RSVPCard({ data, token }: { data: AttendeeData; token: string }) {
  const { attendee, event } = data
  const name = (attendee.display_name || attendee.username) as string
  const status = attendee.status as string
  const drinks = (attendee.drinks as string[]) ?? []
  const extraPeople = (attendee.extra_people as number) ?? 0
  const extrasNames = (attendee.extras_names as string[]) ?? []
  const behaviorConfirmed = !!attendee.behavior_confirmed
  const arrivalConfirmed = !!attendee.arrival_confirmed
  const eventName = event.event_name as string
  const venue = (event.venue as string) || 'TBA'
  const address = (event.address as string) || ''
  const mapsLink = (event.google_maps_link as string) || ''
  const datetime = (event.event_datetime as string) || ''
  const maxCapacity = event.max_capacity as number | undefined
  const eventOpen = event.open as boolean | undefined
  const eventDeadline = event.event_deadline as string | undefined
  const isWaitlist = status === 'waitlist'
  const partySize = 1 + extraPeople
  const companions = extrasNames.length > 0 ? extrasNames.join(', ') : extraPeople > 0 ? `+${extraPeople} guest${extraPeople > 1 ? 's' : ''}` : 'Solo'
  const rsvpStatus = typeof eventOpen === 'boolean' ? (eventOpen ? 'Open' : 'Closed') : 'TBD'
  const checks = [
    { label: 'Entry pass', done: !isWaitlist },
    { label: 'Rules', done: behaviorConfirmed },
    { label: 'Arrival', done: arrivalConfirmed },
  ]
  const qrValue = typeof window !== 'undefined'
    ? `${window.location.origin}/?token=${token}`
    : `/?token=${token}`

  return (
    <main className="brand-bg min-h-dvh w-full max-w-md mx-auto text-[#23110D] pb-12 font-sans md:my-8 md:min-h-0 md:rounded-[2rem] md:shadow-2xl md:overflow-hidden">
      <div className="brand-sunburst relative overflow-hidden px-5 pb-5 pt-16 text-white rounded-b-[2rem] border-b-4 border-[#17120F] shadow-[0_8px_0_#17120F]">
        <LanternGarland />

        <div className="flex justify-center">
          <BrandSign />
        </div>

        <div className="relative mt-1 flex justify-center">
          <KaraageBoat className="h-36 w-auto drop-shadow-[3px_4px_0_rgba(23,18,15,0.22)]" />
          <span className="brand-stamp font-brush absolute -left-1 bottom-3 -rotate-6 rounded-xl px-3 py-1 text-sm tracking-[0.12em]">バカ盛り</span>
        </div>

        <div className="mt-3 flex flex-col items-center text-center">
          <div className="brand-banner inline-block rounded-xl px-4 py-1.5">
            <h1 className="font-display text-lg sm:text-xl uppercase tracking-tight leading-tight text-[#FFF8D8]">{eventName}</h1>
          </div>
          <span className="mt-2 inline-block rounded-xl border-2 border-[#17120F] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#17120F] shadow-[3px_3px_0_#FFD51B]">Offkai Pass</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-[#23110D]">
          <div className="rounded-2xl border-2 border-[#17120F] bg-[#FFD51B] p-3 shadow-[3px_3px_0_#17120F]">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Today</p>
            <p className="text-sm font-black">{getEventPhase(datetime)}</p>
          </div>
          <div className="rounded-2xl border-2 border-[#17120F] bg-white p-3 shadow-[3px_3px_0_#17120F]">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Arrival</p>
            <p className="text-sm font-black">{formatArrivalTime(datetime)}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="brand-card rounded-2xl overflow-hidden">
          <div className={`${isWaitlist ? 'bg-[#F59E0B]' : 'bg-[#17120F]'} p-3 flex justify-between items-center`}>
            <span className="text-[10px] font-black text-white tracking-[0.22em] uppercase">Entry Pass · 乾杯</span>
            <span className={`text-[9px] font-black px-3 py-1 rounded border-2 uppercase tracking-widest ${isWaitlist ? 'bg-white text-[#17120F] border-[#17120F]' : 'bg-[#FFD51B] text-[#17120F] border-white'}`}>
              {isWaitlist ? 'Waitlist' : 'Confirmed'}
            </span>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <p className="text-[9px] uppercase font-black text-[#8B2D1F] tracking-[0.2em] mb-1">Name</p>
              <h2 className="text-4xl font-black text-[#17120F] uppercase tracking-tight leading-none">{name}</h2>
              <p className="mt-2 text-xs font-black text-[#8B2D1F]">Party of {partySize} · {companions}</p>
            </div>

            {!isWaitlist ? (
              <div className="brand-ticket relative rounded-2xl p-4 flex flex-col items-center gap-3">
                <div className="brand-hanko absolute -right-2 -top-2 flex items-center justify-center px-1.5 py-2 text-[12px] rotate-6" aria-hidden="true">乾杯</div>
                <div className="p-3 bg-white rounded-xl border-2 border-[#17120F] shadow-[4px_4px_0_#E51F1F]">
                  <QRCode value={qrValue} size={188} fgColor="#17120F" role="img" aria-label={`Entry QR code for ${name}`} />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#8B2D1F]">Show at check-in</p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-[#17120F] bg-[#FFD51B] p-4 shadow-[4px_4px_0_#17120F]">
                <p className="font-black uppercase tracking-widest text-[#17120F] text-sm">Standby Mode</p>
                <p className="mt-1 text-xs font-bold text-[#5B3428]">You&apos;re on the waitlist — we&apos;ll DM you on Discord if a spot opens up.</p>
              </div>
            )}
          </div>
        </div>

        <div className="brand-card rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] uppercase font-black text-[#8B2D1F] tracking-widest mb-3">Venue</p>
              <p className="font-black text-[#17120F] text-lg leading-tight">{venue}</p>
              {address && <p className="text-xs font-bold text-[#5B3428] mt-1">{address}</p>}
            </div>
            {mapsLink && (
              <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                className="brand-action min-h-[44px] shrink-0 inline-flex items-center gap-1 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-wider">
                Maps
              </a>
            )}
          </div>
        </div>

        {drinks.length > 0 && (
          <div className="brand-card rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[9px] uppercase font-black text-[#8B2D1F] tracking-widest">
                {drinks.length > 1 ? 'Drink Tickets' : 'First Drink Ticket'}
              </p>
              <span className="brand-stamp font-brush rotate-2 rounded-lg px-2 py-0.5 text-[10px] tracking-[0.12em]">乾杯</span>
            </div>
            <div className="space-y-2">
              {drinks.map((d, i) => <DrinkCard key={i} name={d} />)}
            </div>
          </div>
        )}

        <div className="brand-card rounded-2xl p-5">
          <p className="text-[9px] uppercase font-black text-[#8B2D1F] tracking-widest mb-3">Ready Check</p>
          <div className="grid grid-cols-3 gap-2">
            {checks.map(check => (
              <div key={check.label} className={`rounded-xl border-2 p-3 text-center ${check.done ? 'bg-white border-[#17120F]' : 'bg-[#FFD51B] border-[#17120F]'}`}>
                <p className="text-lg font-black">{check.done ? '✓' : '!'}</p>
                <p className={`text-[9px] font-black uppercase tracking-widest ${check.done ? 'text-[#17120F]' : 'text-[#8B2D1F]'}`}>{check.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="brand-card rounded-2xl p-5">
          <p className="text-[9px] uppercase font-black text-[#8B2D1F] tracking-widest mb-3">Offkai Details</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-black text-[#17120F]">{maxCapacity || 'TBD'}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#8B2D1F]">Capacity</p>
            </div>
            <div>
              <p className="text-lg font-black text-[#17120F]">{rsvpStatus}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#8B2D1F]">RSVP</p>
            </div>
            <div>
              <p className="text-lg font-black text-[#17120F]">{eventDeadline ? formatArrivalTime(eventDeadline) : 'TBD'}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#8B2D1F]">Deadline</p>
            </div>
          </div>
        </div>

        <OffkaiHub />

        <p className="text-center text-[10px] font-black text-[#8B2D1F] uppercase tracking-widest pt-2">
          This link is personal — please don&apos;t share it.
        </p>
      </div>
    </main>
  )
}

// --- Offkai Hub (spec preview) -------------------------------------------
// UI-only mock of the post-RSVP "offkai chaos" features. Everything here is
// non-functional and stamped 準備中 (coming soon) until the bot adds support.

function ComingSoon({ className = '' }: { className?: string }) {
  return (
    <span className={`brand-hanko inline-flex items-center justify-center px-1 py-2 text-[11px] tracking-[0.1em] ${className}`} title="Coming soon">
      準備中
    </span>
  )
}

function HubAvatar({ name, tone = 'yellow' }: { name: string; tone?: 'yellow' | 'ink' | 'white' }) {
  const cls = tone === 'ink' ? 'bg-[#17120F] text-white' : tone === 'white' ? 'bg-white text-[#17120F]' : 'bg-[#FFD51B] text-[#17120F]'
  return (
    <div className={`w-9 h-9 rounded-full border-2 border-[#17120F] flex items-center justify-center font-black text-sm shrink-0 shadow-[2px_2px_0_#17120F] ${cls}`}>
      {name[0].toUpperCase()}
    </div>
  )
}

function HubSection({ title, jp, children }: { title: string; jp: string; children: React.ReactNode }) {
  return (
    <div className="brand-card relative rounded-2xl p-5">
      <ComingSoon className="absolute -right-2 -top-3 rotate-6" />
      <div className="mb-3 flex items-end gap-2">
        <h3 className="font-display text-base uppercase tracking-tight text-[#17120F] leading-none">{title}</h3>
        <span className="font-brush text-lg leading-none text-[#8B2D1F]">{jp}</span>
      </div>
      {children}
    </div>
  )
}

const HUB_ANNOUNCEMENTS = [
  { author: 'Fadekyun', host: true, time: '10:32', text: 'Doors open at 12:00 sharp — karaage boat incoming 🍗' },
  { author: 'Fadekyun', host: true, time: '10:40', text: 'Table assignments are up — find your group below 👇' },
]
const HUB_SUGGESTIONS = ['Sakichan', 'Hoshino', 'Arisa']
const HUB_TABLES = [1, 2, 3, 4, 5, 6].map(n => ({ n, yours: n === 3 }))

function OffkaiHub() {
  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <div className="h-0.5 flex-1 rounded bg-[#17120F]/30" />
        <span className="brand-banner inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] tracking-[0.2em]">
          <span className="font-brush text-sm leading-none">準備中</span> Offkai Hub
        </span>
        <div className="h-0.5 flex-1 rounded bg-[#17120F]/30" />
      </div>

      {/* Board */}
      <HubSection title="Board" jp="掲示板">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border-2 border-[#5865F2] bg-[#5865F2]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#404bbf]">
          <svg viewBox="0 0 24 18" className="h-3.5 w-4" fill="#5865F2" aria-hidden="true"><path d="M20 1.5A19 19 0 0 0 15.3 0l-.3.5a17 17 0 0 1 4.2 1.3 16 16 0 0 0-13.4 0A17 17 0 0 1 10 .5L9.7 0A19 19 0 0 0 5 1.5C2 6 1.2 10.4 1.5 14.7A19 19 0 0 0 7.3 18l.6-1a12 12 0 0 1-1.8-.9l.4-.3a13 13 0 0 0 11 0l.4.3a12 12 0 0 1-1.8.9l.6 1a19 19 0 0 0 5.8-3.3c.4-5-.8-9.4-3.5-13.2ZM8.4 12.2c-.9 0-1.7-.8-1.7-1.9 0-1 .8-1.9 1.7-1.9s1.7.9 1.7 1.9c0 1-.8 1.9-1.7 1.9Zm7.2 0c-.9 0-1.7-.8-1.7-1.9 0-1 .8-1.9 1.7-1.9s1.7.9 1.7 1.9c0 1-.8 1.9-1.7 1.9Z"/></svg>
          Synced with Discord
        </div>
        <div className="space-y-2">
          {HUB_ANNOUNCEMENTS.map((a, i) => (
            <div key={i} className="rounded-xl border-2 border-[#17120F] bg-[#FFF8D8] p-3 flex items-start gap-2">
              <HubAvatar name={a.author} tone="ink" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-black text-sm text-[#17120F] truncate">{a.author}</p>
                  {a.host && <span className="rounded bg-[#E51F1F] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">Host</span>}
                  <span className="ml-auto text-[10px] font-bold text-[#8B2D1F]/70">{a.time}</span>
                </div>
                <p className="mt-0.5 text-sm font-bold text-[#3A2410] leading-snug">{a.text}</p>
              </div>
            </div>
          ))}
        </div>
      </HubSection>

      {/* Squad */}
      <HubSection title="Squad" jp="相席">
        <p className="text-xs font-bold text-[#5B3428] mb-3">Pair up or form a group — sit with the people you came for.</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex -space-x-2">
            <HubAvatar name="You" />
            <HubAvatar name="Senpai" tone="white" />
          </div>
          <span className="text-xs font-black text-[#17120F]">You + Senpai</span>
          <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#17120F] flex items-center justify-center font-black text-[#8B2D1F]">+</div>
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest text-[#8B2D1F] mb-2">Looking to sit together</p>
        <div className="space-y-2">
          {HUB_SUGGESTIONS.map(n => (
            <div key={n} className="flex items-center gap-3 rounded-xl border-2 border-[#17120F] bg-white p-2.5 shadow-[3px_3px_0_rgba(23,18,15,0.2)]">
              <HubAvatar name={n} />
              <p className="font-black text-sm text-[#17120F] flex-1">{n}</p>
              <button disabled className="brand-action-alt rounded-lg border-2 border-[#17120F] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest opacity-60">Invite</button>
            </div>
          ))}
        </div>
      </HubSection>

      {/* Table */}
      <HubSection title="Your Table" jp="卓">
        <div className="brand-ticket rounded-2xl border-2 border-[#17120F] p-4 mb-4 flex items-center gap-4 shadow-[4px_4px_0_#E51F1F]">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-[#17120F] bg-[#E51F1F] text-white shadow-[2px_2px_0_#17120F]">
            <span className="font-brush text-sm leading-none">卓</span>
            <span className="font-display text-2xl leading-none">3</span>
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-[#8B2D1F]">You&apos;re seated at</p>
            <p className="font-display text-xl uppercase tracking-tight text-[#17120F] leading-none">Table 3</p>
            <p className="mt-1 text-xs font-bold text-[#5B3428]">with You, Senpai · 4 more</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {HUB_TABLES.map(t => (
            <div key={t.n} className={`flex flex-col items-center justify-center rounded-xl border-2 border-[#17120F] py-3 ${t.yours ? 'bg-[#E51F1F] text-white shadow-[3px_3px_0_#17120F]' : 'bg-[#FFF8D8] text-[#17120F]'}`}>
              <span className="font-display text-2xl leading-none">{t.n}</span>
              <span className="mt-0.5 text-[8px] font-black uppercase tracking-widest opacity-70">Table</span>
              {t.yours && <span className="mt-1 rounded bg-white px-1.5 text-[8px] font-black uppercase tracking-wider text-[#E51F1F]">You</span>}
            </div>
          ))}
        </div>
      </HubSection>

      {/* Settle Up */}
      <HubSection title="Settle Up" jp="お会計">
        <p className="text-xs font-bold text-[#5B3428] mb-3">At check-out the organiser shares how to pay — cash, or cashless if enabled.</p>
        <div className="rounded-2xl border-2 border-[#17120F] bg-[#FFF8D8] p-4 shadow-[4px_4px_0_rgba(23,18,15,0.2)]">
          <div className="flex items-end justify-between border-b-2 border-dashed border-[#17120F]/40 pb-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#8B2D1F]">Your share</p>
              <p className="font-display text-3xl text-[#17120F] leading-none">¥3,200</p>
            </div>
            <p className="text-[10px] font-bold text-[#5B3428] text-right">割り勘<br />party of 2 · ¥6,400</p>
          </div>
          <div className="flex items-center gap-2 pt-3">
            <HubAvatar name="Fadekyun" tone="ink" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#8B2D1F]">Pay the host</p>
              <p className="font-black text-sm text-[#17120F]">Fadekyun</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <button disabled className="flex flex-col items-center gap-1 rounded-xl border-2 border-[#17120F] bg-[#9FE870] py-3 font-black text-[#163300] opacity-70 shadow-[3px_3px_0_#17120F]">
            <span className="text-sm leading-none">Wise</span><span className="text-[8px] uppercase tracking-widest">Cashless</span>
          </button>
          <button disabled className="flex flex-col items-center gap-1 rounded-xl border-2 border-[#17120F] bg-[#FF0033] py-3 font-black text-white opacity-70 shadow-[3px_3px_0_#17120F]">
            <span className="text-sm leading-none">PayPay</span><span className="text-[8px] uppercase tracking-widest">JP</span>
          </button>
          <button disabled className="flex flex-col items-center gap-1 rounded-xl border-2 border-[#17120F] bg-white py-3 font-black text-[#17120F] opacity-70 shadow-[3px_3px_0_#17120F]">
            <span className="text-sm leading-none">Cash</span><span className="text-[8px] uppercase tracking-widest">At table</span>
          </button>
        </div>
      </HubSection>
    </div>
  )
}

function AttendeeView() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [view, setView] = useState<ViewState>('loading')
  const [data, setData] = useState<AttendeeData | null>(null)

  useEffect(() => {
    if (!token) {
      const id = setTimeout(() => setView('no_token'), 0)
      return () => clearTimeout(id)
    }

    fetch(`/api/attendee?token=${encodeURIComponent(token)}`)
      .then(async r => ({ ok: r.ok, status: r.status, body: await r.json() }))
      .then(({ ok, status, body }) => {
        if (ok) { setData(body); setView('ready') }
        else if (status === 404) setView('not_found')
        else if (status >= 500) setView('unavailable')
        else setView('invalid')
      })
      .catch(() => setView('unavailable'))
  }, [token])

  if (view === 'loading') return (
    <div className="brand-rays min-h-dvh flex items-center justify-center">
      <div className="brand-seal px-5 py-3 text-sm font-black uppercase tracking-widest text-white animate-pulse">Loading...</div>
    </div>
  )
  if (view === 'no_token') return <NoToken />
  if (view === 'invalid') return <InvalidToken reason="invalid" />
  if (view === 'not_found') return <InvalidToken reason="not_found" />
  if (view === 'unavailable') return <InvalidToken reason="unavailable" />
  if (view === 'ready' && data) return <RSVPCard data={data} token={token!} />
  return null
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="brand-rays min-h-dvh flex items-center justify-center">
        <div className="brand-seal px-5 py-3 text-sm font-black uppercase tracking-widest text-white">Loading...</div>
      </div>
    }>
      <AttendeeView />
    </Suspense>
  )
}
