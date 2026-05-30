import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Link2, Check, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  extractProductsFromUrl,
  extractProductsFromFile,
  generateLoyaltyProgram,
} from '@/lib/ai'
import type { ExtractedProduct, GeneratedProgram } from '@/lib/ai'

type Step =
  | 'business-name'
  | 'website-url'
  | 'product-input'
  | 'product-loading'
  | 'file-loading'
  | 'product-retry'
  | 'product-selection'
  | 'goal-primary'
  | 'goal-frequency'
  | 'goal-rewards'
  | 'program-loading'
  | 'program-review'
  | 'submitting'

type Goal = 'gain_members' | 'retain_customers' | 'increase_revenue'
type VisitFreq = 'weekly' | 'monthly_2_3' | 'monthly_1'
type RewardType = 'discounts' | 'perks' | 'points' | 'not_sure'

type ThreadMessage = { role: 'ai' | 'user'; text: string }
type Snapshot = { step: Step; thread: ThreadMessage[] }
type Option = { value: string; label: string; description: string }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const PROGRESS: Record<Step, number> = {
  'business-name': 8,
  'website-url': 18,
  'product-input': 24,
  'product-loading': 30,
  'file-loading': 30,
  'product-retry': 28,
  'product-selection': 36,
  'goal-primary': 50,
  'goal-frequency': 62,
  'goal-rewards': 74,
  'program-loading': 84,
  'program-review': 94,
  'submitting': 100,
}

const GOAL_OPTIONS: Option[] = [
  { value: 'gain_members', label: 'Gain new members', description: 'Attract customers and expand your client base' },
  { value: 'retain_customers', label: 'Retain customers', description: 'Keep current customers happy and coming back' },
  { value: 'increase_revenue', label: 'Increase recurring revenue', description: 'Boost predictable income through repeat visits' },
]
const FREQ_OPTIONS: Option[] = [
  { value: 'weekly', label: 'Weekly or more', description: 'Regulars who need ongoing incentives' },
  { value: 'monthly_2_3', label: '2–3 times a month', description: 'Typical customers who visit with the right nudge' },
  { value: 'monthly_1', label: 'Once a month', description: 'Occasional visitors to bring back on a rhythm' },
]
const REWARD_OPTIONS: Option[] = [
  { value: 'discounts', label: 'Discounts & free items', description: 'A percentage off or a free item after visits' },
  { value: 'perks', label: 'Exclusive perks & status', description: 'Early access, VIP treatment, members-only offers' },
  { value: 'points', label: 'Points they can redeem', description: 'A flexible currency that builds up over time' },
  { value: 'not_sure', label: "I'm not sure", description: "We'll figure it out together" },
]

const labelOf = (options: Option[], value: string | null) =>
  options.find(o => o.value === value)?.label ?? ''

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function phaseHeader(step: Step, firstName: string) {
  if (step.startsWith('goal') || step === 'program-loading') {
    return {
      title: 'Setting up the loyalty program',
      subtitle: "I'll guide you through creating a program that works like the pros'.",
    }
  }
  if (step === 'program-review' || step === 'submitting') {
    return {
      title: 'Review your loyalty program',
      subtitle: "Take a look at what I put together, then launch when you're ready.",
    }
  }
  return {
    title: `Hi ${firstName}!`,
    subtitle: "I'll help you set up your business and create a loyalty program in just a few steps.",
  }
}

export default function OwnerOnboarding() {
  const { user, isOwner, isOwnerLoading, setOwnedBusinessId } = useAuth()
  const navigate = useNavigate()
  const threadEndRef = useRef<HTMLDivElement>(null)
  const didInit = useRef(false)

  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [typing, setTyping] = useState(false)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [step, setStep] = useState<Step>('business-name')

  const [businessName, setBusinessName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([])
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set())
  const [goal, setGoal] = useState<Goal | null>(null)
  const [visitFreq, setVisitFreq] = useState<VisitFreq | null>(null)
  const [rewardType, setRewardType] = useState<RewardType | null>(null)
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedProgram | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)

  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? '').split(' ')[0] || 'there'
  const header = phaseHeader(step, firstName)

  useEffect(() => {
    if (!isOwnerLoading && isOwner) navigate('/owner/dashboard', { replace: true })
  }, [isOwner, isOwnerLoading, navigate])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread, step, typing])

  // First question, with a thinking delay like every other AI message
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    pushAi("What's the name of your business?")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 'product-loading') return
    const source = websiteUrl.trim() || urlInput.trim()
    if (!source) return
    let active = true
    extractProductsFromUrl(source).then(async products => {
      if (!active) return
      setExtractedProducts(products)
      setSelectedIdxs(new Set(products.map((_, i) => i)))
      if (products.length > 0) {
        setStep('product-selection')
        await pushAi(`I found ${products.length} products. Select the ones you'd like to include.`)
      } else {
        setStep('product-retry')
        await pushAi("I couldn't find any products on that page. Upload a file or take a photo of your menu instead.")
      }
    }).catch(async () => {
      if (!active) return
      setStep('product-retry')
      await pushAi("I had trouble reading that page. Upload a file or take a photo of your menu instead.")
    })
    return () => { active = false }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step !== 'program-loading' || !goal || !visitFreq || !rewardType) return
    let active = true
    generateLoyaltyProgram({
      businessName,
      goal,
      visitFrequency: visitFreq,
      rewardType,
      products: extractedProducts.filter((_, i) => selectedIdxs.has(i)),
    }).then(async program => {
      if (!active) return
      setGeneratedProgram(program)
      setStep('program-review')
      await pushAi(`Here's your loyalty program — ${program.program_name}. ${program.summary}`)
    })
    return () => { active = false }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  function pushUser(text: string) {
    setThread(t => [...t, { role: 'user', text }])
  }

  async function pushAi(text: string) {
    setTyping(true)
    await sleep(700)
    setThread(t => [...t, { role: 'ai', text }])
    setTyping(false)
  }

  function snapshot() {
    setHistory(h => [...h, { step, thread }])
  }

  function goBack() {
    setHistory(h => {
      if (!h.length) return h
      const prev = h[h.length - 1]
      setStep(prev.step)
      setThread(prev.thread)
      setTyping(false)
      return h.slice(0, -1)
    })
  }

  function reset() {
    setThread([])
    setHistory([])
    setTyping(false)
    setStep('business-name')
    setBusinessName('')
    setWebsiteUrl('')
    setUrlInput('')
    setExtractedProducts([])
    setSelectedIdxs(new Set())
    setGoal(null)
    setVisitFreq(null)
    setRewardType(null)
    setGeneratedProgram(null)
    setSlugError(null)
    pushAi("What's the name of your business?")
  }

  function toggleProduct(idx: number) {
    setSelectedIdxs(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  function handleFile(file: File) {
    snapshot()
    pushUser(`Uploaded: ${file.name}`)
    setStep('file-loading')
    extractProductsFromFile(file).then(async products => {
      setExtractedProducts(products)
      setSelectedIdxs(new Set(products.map((_, i) => i)))
      if (products.length > 0) {
        setStep('product-selection')
        await pushAi(`Found ${products.length} products. Select the ones to include.`)
      } else {
        setStep('product-retry')
        await pushAi("I couldn't read any products from that. Try another file or a photo of your menu.")
      }
    }).catch(async () => {
      setStep('product-retry')
      await pushAi("Something went wrong reading that file. Try another file or a photo of your menu.")
    })
  }

  async function selectGoal(v: string) {
    setGoal(v as Goal)
    snapshot()
    pushUser(labelOf(GOAL_OPTIONS, v))
    setStep('goal-frequency')
    await pushAi('How often does a typical customer visit?')
  }

  async function selectFreq(v: string) {
    setVisitFreq(v as VisitFreq)
    snapshot()
    pushUser(labelOf(FREQ_OPTIONS, v))
    setStep('goal-rewards')
    await pushAi('What reward would your customers love most?')
  }

  async function selectReward(v: string) {
    setRewardType(v as RewardType)
    snapshot()
    pushUser(labelOf(REWARD_OPTIONS, v))
    setStep('program-loading')
  }

  async function handleSubmit() {
    if (!generatedProgram) return

    if (import.meta.env.DEV && !user) {
      setStep('submitting')
      await sleep(800)
      setOwnedBusinessId('dev-mock')
      navigate('/owner/dashboard', { replace: true })
      return
    }

    if (!user) return
    setStep('submitting')

    const slug = slugify(businessName)
    const { data: existing } = await supabase.from('businesses').select('id').eq('slug', slug).maybeSingle()
    if (existing) setSlugError(`The URL handle "${slug}" is already taken. Your business was saved with a unique ID.`)
    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug

    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .insert({ owner_id: user.id, name: businessName, slug: finalSlug, tagline: null, logo_url: null, cover_image_url: null, address: null, hours: null, industry: null, brand_color: null })
      .select('id')
      .single()

    if (bizErr || !biz) { setStep('program-review'); return }

    await supabase.from('loyalty_programs').insert({
      business_id: biz.id,
      program_name: generatedProgram.program_name,
      currency_name: generatedProgram.currency_name,
      earn_rules: generatedProgram.earn_rules,
      reward_tiers: generatedProgram.reward_tiers,
      referral_rules: generatedProgram.referral_rules,
      brand_voice: generatedProgram.brand_voice,
    })

    const selectedProducts = extractedProducts.filter((_, i) => selectedIdxs.has(i))
    if (selectedProducts.length > 0) {
      await supabase.from('services').insert(
        selectedProducts.map(p => ({ business_id: biz.id, name: p.name, description: p.description, price_cents: p.price_cents, category: p.category, status: 'active' as const, image_url: null, points_value: null })),
      )
    }

    setOwnedBusinessId(biz.id)
    navigate('/owner/dashboard', { replace: true })
  }

  // Rich content rendered in the scrollable thread for the current step
  function renderThreadContent() {
    switch (step) {
      case 'product-loading':
        return <LoadingRow text="Scanning for products…" />
      case 'file-loading':
        return <LoadingRow text="Reading your file…" />
      case 'product-selection':
        return (
          <div className="flex flex-col gap-2">
            {extractedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products found — you can add them after setup.</p>
            ) : extractedProducts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleProduct(i)}
                className={cn(
                  'w-full text-left rounded-xl border px-4 py-3 transition-colors',
                  selectedIdxs.has(i) ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/40',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>}
                    {p.price_cents != null && <p className="text-xs text-muted-foreground mt-0.5">${(p.price_cents / 100).toFixed(2)}</p>}
                  </div>
                  <div className={cn('shrink-0 size-5 rounded-full border-2 flex items-center justify-center mt-0.5', selectedIdxs.has(i) ? 'bg-foreground border-foreground' : 'border-border')}>
                    {selectedIdxs.has(i) && <Check size={11} className="text-background" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      case 'goal-primary':
        return <OptionList options={GOAL_OPTIONS} selected={goal} onSelect={selectGoal} />
      case 'goal-frequency':
        return <OptionList options={FREQ_OPTIONS} selected={visitFreq} onSelect={selectFreq} />
      case 'goal-rewards':
        return <OptionList options={REWARD_OPTIONS} selected={rewardType} onSelect={selectReward} />
      case 'program-loading':
        return <LoadingRow text="Creating your loyalty program…" />
      case 'program-review':
        if (!generatedProgram) return null
        return (
          <div className="rounded-xl border p-4 flex flex-col gap-3">
            <div>
              <p className="font-semibold text-sm">{generatedProgram.program_name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{generatedProgram.summary}</p>
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              <Row label="Currency" value={generatedProgram.currency_name} />
              <Row label="Earn rule" value={`1 ${generatedProgram.currency_name.toLowerCase().replace(/s$/, '')} per $1 spent`} />
              <Row label="Referral" value={`${generatedProgram.referral_rules.referrer_points} pts for referrer · ${generatedProgram.referral_rules.referee_points} pts for new customer`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tiers</p>
              {generatedProgram.reward_tiers.tiers.map(t => (
                <div key={t.name} className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium w-20 shrink-0">{t.name}</span>
                  <span className="text-muted-foreground text-xs">{t.min_points} pts · {t.perks[0]}</span>
                </div>
              ))}
            </div>
            {slugError && <p className="text-xs text-muted-foreground">{slugError}</p>}
          </div>
        )
      case 'submitting':
        return <LoadingRow text="Setting up your business…" />
      default:
        return null
    }
  }

  // Input rendered in the fixed bottom bar
  function renderBottomInput() {
    switch (step) {
      case 'business-name':
        return (
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!businessName.trim()) return
              snapshot()
              pushUser(businessName.trim())
              setStep('website-url')
              pushAi("What's your website? I'll use it to find your products. (Optional — you can skip.)")
            }}
            className="flex gap-2"
          >
            <Input
              autoFocus
              placeholder="e.g. Corner Cup"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
            />
            <Button type="submit" disabled={!businessName.trim()}><ArrowIcon /></Button>
          </form>
        )

      case 'website-url':
        return (
          <form
            onSubmit={e => {
              e.preventDefault()
              const url = websiteUrl.trim()
              snapshot()
              if (url) {
                pushUser(url)
                pushAi('Got it — let me scan your site for products.')
                setStep('product-loading')
              } else {
                pushUser('Skipped')
                pushAi('No problem. How would you like to share your products?')
                setStep('product-input')
              }
            }}
            className="flex gap-2"
          >
            <Input
              autoFocus
              type="url"
              placeholder="https://yourbusiness.com (optional)"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
            />
            <Button type="submit" variant={websiteUrl.trim() ? 'default' : 'outline'}>
              {websiteUrl.trim() ? <ArrowIcon /> : 'Skip'}
            </Button>
          </form>
        )

      case 'product-input':
        return (
          <ProductInputOptions
            onUrl={url => {
              snapshot()
              setUrlInput(url)
              pushUser(url)
              pushAi('Let me scan that for products.')
              setStep('product-loading')
            }}
            onFile={handleFile}
          />
        )

      case 'product-retry':
        return (
          <div className="flex flex-col gap-2">
            <ProductInputOptions showUrl={false} onUrl={() => {}} onFile={handleFile} />
            <button
              type="button"
              className="text-xs text-muted-foreground text-center py-1 hover:text-foreground transition-colors"
              onClick={() => {
                snapshot()
                pushUser("I'll add products later")
                setStep('goal-primary')
                pushAi("No problem. Now let's design your program. What's your primary goal?")
              }}
            >
              Skip — I'll add products later
            </button>
          </div>
        )

      case 'product-selection':
        return (
          <Button
            className="w-full"
            onClick={() => {
              const count = selectedIdxs.size
              snapshot()
              pushUser(count > 0 ? `Selected ${count} product${count !== 1 ? 's' : ''}` : 'No products selected')
              setStep('goal-primary')
              pushAi("Now let's design your program. What's your primary goal?")
            }}
          >
            Continue
          </Button>
        )

      case 'program-review':
        return (
          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={handleSubmit}>
              Done — launch my program
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground text-center py-1 hover:text-foreground transition-colors"
              onClick={reset}
            >
              Start over
            </button>
          </div>
        )

      default:
        return null
    }
  }

  const showBack =
    history.length > 0 &&
    !typing &&
    step !== 'product-loading' &&
    step !== 'program-loading' &&
    step !== 'submitting'

  const bottom = !typing ? renderBottomInput() : null

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header: back arrow + progress bar + phase title/subtitle */}
      <header className="shrink-0 px-6 pt-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={!showBack}
            className={cn(
              'shrink-0 size-9 rounded-xl bg-muted flex items-center justify-center transition-opacity',
              showBack ? 'hover:bg-muted/70' : 'opacity-30 pointer-events-none',
            )}
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-500"
              style={{ width: `${PROGRESS[step]}%` }}
            />
          </div>
          <button
            type="button"
            onClick={reset}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Start over
          </button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mt-5">{header.title}</h1>
        <p className="text-sm text-muted-foreground mt-1.5">{header.subtitle}</p>
      </header>

      {/* Scrollable thread */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4 min-h-0">
        {thread.map((msg, i) =>
          msg.role === 'ai'
            ? <AiMessage key={i} text={msg.text} />
            : <UserMessage key={i} text={msg.text} />,
        )}

        {typing ? <TypingIndicator /> : renderThreadContent()}
        <div ref={threadEndRef} />
      </div>

      {/* Fixed bottom input bar */}
      {bottom && (
        <div className="shrink-0 border-t bg-background px-4 py-3">
          {bottom}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AiMessage({ text }: { text: string }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="shrink-0 size-7 rounded-full bg-foreground flex items-center justify-center mt-0.5">
        <span className="text-background text-[10px] font-bold">E</span>
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[80%] whitespace-pre-line">
        {text}
      </div>
    </div>
  )
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-foreground text-background rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%]">
        {text}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 items-start">
      <div className="shrink-0 size-7 rounded-full bg-foreground flex items-center justify-center mt-0.5">
        <Loader2 size={14} className="animate-spin text-background" />
      </div>
    </div>
  )
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LoadingRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground py-1">
      <Loader2 size={16} className="animate-spin shrink-0" />
      <span>{text}</span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground shrink-0 w-20">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border px-4 py-3 transition-colors',
        selected ? 'border-foreground bg-foreground/5' : 'border-border hover:border-foreground/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">{children}</span>
        {selected && <Check size={16} className="shrink-0 text-foreground" />}
      </div>
    </button>
  )
}

function OptionList({
  options,
  selected,
  onSelect,
}: {
  options: Option[]
  selected: string | null
  onSelect: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map(o => (
        <OptionCard key={o.value} selected={selected === o.value} onClick={() => onSelect(o.value)}>
          <span className="font-medium">{o.label}</span>
          <span className="block text-xs text-muted-foreground mt-0.5">{o.description}</span>
        </OptionCard>
      ))}
    </div>
  )
}

function ProductInputOptions({ onUrl, onFile, showUrl = true }: { onUrl: (url: string) => void; onFile: (file: File) => void; showUrl?: boolean }) {
  const [urlMode, setUrlMode] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  if (urlMode) {
    return (
      <form onSubmit={e => { e.preventDefault(); if (urlValue.trim()) onUrl(urlValue.trim()) }} className="flex gap-2">
        <Input autoFocus type="url" placeholder="https://yourbusiness.com" value={urlValue} onChange={e => setUrlValue(e.target.value)} />
        <Button type="submit" disabled={!urlValue.trim()}><ArrowIcon /></Button>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {showUrl && (
        <button type="button" onClick={() => setUrlMode(true)} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:border-foreground/40 transition-colors">
          <Link2 size={16} className="text-muted-foreground shrink-0" />
          <span>Enter your website URL</span>
        </button>
      )}
      <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:border-foreground/40 transition-colors">
        <Upload size={16} className="text-muted-foreground shrink-0" />
        <span>Upload a PDF or image of your menu</span>
      </button>
      <button type="button" onClick={() => cameraRef.current?.click()} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:border-foreground/40 transition-colors">
        <Camera size={16} className="text-muted-foreground shrink-0" />
        <span>Take a photo of your menu</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}
