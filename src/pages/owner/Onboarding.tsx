import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Link2, Check, Loader2, RotateCcw } from 'lucide-react'
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
  | 'product-selection'
  | 'goals'
  | 'program-loading'
  | 'program-review'
  | 'submitting'

type Goal = 'gain_members' | 'retain_customers' | 'increase_revenue'
type VisitFreq = 'weekly' | 'monthly_2_3' | 'monthly_1'
type RewardType = 'discounts' | 'perks' | 'points' | 'not_sure'

type ThreadMessage = { role: 'ai' | 'user'; text: string }

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function AiMessage({ text }: { text: string }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="shrink-0 size-7 rounded-full bg-foreground flex items-center justify-center mt-0.5">
        <span className="text-background text-[10px] font-bold">E</span>
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-[80%]">
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
        selected
          ? 'border-foreground bg-foreground/5'
          : 'border-border hover:border-foreground/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">{children}</span>
        {selected && <Check size={16} className="shrink-0 text-foreground" />}
      </div>
    </button>
  )
}

export default function OwnerOnboarding() {
  const { user, isOwner, isOwnerLoading, setOwnedBusinessId } = useAuth()
  const navigate = useNavigate()
  const threadEndRef = useRef<HTMLDivElement>(null)

  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [step, setStep] = useState<Step>('business-name')

  // Form state
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

  // If already an owner, redirect to dashboard
  useEffect(() => {
    if (!isOwnerLoading && isOwner) navigate('/owner/dashboard', { replace: true })
  }, [isOwner, isOwnerLoading, navigate])

  // Auto-scroll thread
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread, step])

  // Kick off URL-based product extraction when step changes to product-loading
  useEffect(() => {
    if (step !== 'product-loading') return
    const source = websiteUrl.trim() || urlInput.trim()
    if (!source) return
    extractProductsFromUrl(source).then(products => {
      setExtractedProducts(products)
      setSelectedIdxs(new Set(products.map((_, i) => i)))
      push('ai', products.length > 0
        ? `I found ${products.length} products. Select the ones you'd like to include.`
        : "I couldn't find any products automatically. You can add them manually later.",
      )
      setStep('product-selection')
    })
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  // Kick off program generation
  useEffect(() => {
    if (step !== 'program-loading' || !goal || !visitFreq || !rewardType) return
    generateLoyaltyProgram({
      businessName,
      goal,
      visitFrequency: visitFreq,
      rewardType,
      products: extractedProducts.filter((_, i) => selectedIdxs.has(i)),
    }).then(program => {
      setGeneratedProgram(program)
      push('ai', `Here's your loyalty program — ${program.program_name}. ${program.summary}`)
      setStep('program-review')
    })
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  function push(role: 'ai' | 'user', text: string) {
    setThread(t => [...t, { role, text }])
  }

  function reset() {
    setThread([])
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
  }

  function toggleProduct(idx: number) {
    setSelectedIdxs(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  async function handleSubmit() {
    if (!generatedProgram) return

    // Dev mode without a real session: skip DB write, go straight to dashboard
    if (import.meta.env.DEV && !user) {
      setStep('submitting')
      await new Promise(r => setTimeout(r, 800))
      setOwnedBusinessId('dev-mock')
      navigate('/owner/dashboard', { replace: true })
      return
    }

    if (!user) return
    setStep('submitting')

    const slug = slugify(businessName)

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      setSlugError(`The URL handle "${slug}" is already taken. Your business was saved with a unique ID.`)
    }

    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug

    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .insert({
        owner_id: user.id,
        name: businessName,
        slug: finalSlug,
        tagline: null,
        logo_url: null,
        cover_image_url: null,
        address: null,
        hours: null,
        industry: null,
        brand_color: null,
      })
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

    // Insert selected products
    const selectedProducts = extractedProducts.filter((_, i) => selectedIdxs.has(i))
    if (selectedProducts.length > 0) {
      await supabase.from('services').insert(
        selectedProducts.map(p => ({
          business_id: biz.id,
          name: p.name,
          description: p.description,
          price_cents: p.price_cents,
          category: p.category,
          status: 'active' as const,
          image_url: null,
          points_value: null,
        })),
      )
    }

    setOwnedBusinessId(biz.id)
    navigate('/owner/dashboard', { replace: true })
  }

  // ── Step content ──────────────────────────────────────────────────────────

  function renderCurrentStep() {
    switch (step) {
      case 'business-name':
        return (
          <StepWrapper
            aiText={`Hi ${firstName}! I'll help you set up your business and create a loyalty program in just a few steps.\n\nWhat's the name of your business?`}
          >
            <form
              onSubmit={e => {
                e.preventDefault()
                if (!businessName.trim()) return
                push('user', businessName.trim())
                push('ai', "What's your website? I'll use it to find your products. (Optional — you can skip.)")
                setStep('website-url')
              }}
              className="flex gap-2"
            >
              <Input
                autoFocus
                placeholder="e.g. Corner Cup"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
              />
              <Button type="submit" disabled={!businessName.trim()}>
                <ArrowIcon />
              </Button>
            </form>
          </StepWrapper>
        )

      case 'website-url':
        return (
          <StepWrapper aiText={null}>
            <form
              onSubmit={e => {
                e.preventDefault()
                const url = websiteUrl.trim()
                if (url) {
                  push('user', url)
                  push('ai', "Got it — let me scan your site for products.")
                  setStep('product-loading')
                } else {
                  push('user', 'Skipped')
                  push('ai', "No problem. How would you like to share your products?")
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
          </StepWrapper>
        )

      case 'product-input':
        // Only shown when no URL was provided and we need alternate input
        return (
          <StepWrapper aiText={null}>
            <ProductInputOptions
              onUrl={url => {
                setUrlInput(url)
                push('user', url)
                push('ai', "Let me scan that for products.")
                setStep('product-loading')
              }}
              onFile={file => {
                push('user', `Uploaded: ${file.name}`)
                push('ai', "Reading your file...")
                extractProductsFromFile(file).then(products => {
                  setExtractedProducts(products)
                  setSelectedIdxs(new Set(products.map((_, i) => i)))
                  push('ai', `Found ${products.length} products. Select the ones to include.`)
                  setStep('product-selection')
                })
              }}
            />
          </StepWrapper>
        )

      case 'product-loading':
        return (
          <StepWrapper aiText={null}>
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
              <Loader2 size={16} className="animate-spin" />
              <span>Scanning for products…</span>
            </div>
          </StepWrapper>
        )

      case 'product-selection':
        return (
          <StepWrapper aiText={null}>
            <div className="flex flex-col gap-2">
              {extractedProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No products found — you can add them after setup.
                </p>
              ) : (
                extractedProducts.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleProduct(i)}
                    className={cn(
                      'w-full text-left rounded-xl border px-4 py-3 transition-colors',
                      selectedIdxs.has(i)
                        ? 'border-foreground bg-foreground/5'
                        : 'border-border hover:border-foreground/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>
                        )}
                        {p.price_cents != null && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            ${(p.price_cents / 100).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div className={cn(
                        'shrink-0 size-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                        selectedIdxs.has(i) ? 'bg-foreground border-foreground' : 'border-border',
                      )}>
                        {selectedIdxs.has(i) && <Check size={11} className="text-background" />}
                      </div>
                    </div>
                  </button>
                ))
              )}
              <Button
                className="mt-2"
                onClick={() => {
                  const count = selectedIdxs.size
                  push('user', count > 0 ? `Selected ${count} product${count !== 1 ? 's' : ''}` : 'No products selected')
                  push('ai', "Great — now let's design your loyalty program.")
                  setStep('goals')
                }}
              >
                Continue
              </Button>
            </div>
          </StepWrapper>
        )

      case 'goals':
        return (
          <StepWrapper aiText={null}>
            <div className="flex flex-col gap-5">
              <GoalGroup
                question="What's your primary goal?"
                options={[
                  { value: 'gain_members', label: 'Gain new members', description: 'Attract customers and expand your client base' },
                  { value: 'retain_customers', label: 'Retain customers', description: 'Keep current customers happy and coming back' },
                  { value: 'increase_revenue', label: 'Increase recurring revenue', description: 'Boost predictable income through repeat visits' },
                ]}
                value={goal}
                onChange={v => setGoal(v as Goal)}
              />
              <GoalGroup
                question="How often does a typical customer visit?"
                options={[
                  { value: 'weekly', label: 'Weekly or more', description: 'Regulars who need ongoing incentives' },
                  { value: 'monthly_2_3', label: '2–3 times a month', description: 'Typical customers who visit with the right nudge' },
                  { value: 'monthly_1', label: 'Once a month', description: 'Occasional visitors to bring back on a rhythm' },
                ]}
                value={visitFreq}
                onChange={v => setVisitFreq(v as VisitFreq)}
              />
              <GoalGroup
                question="What reward would your customers love most?"
                options={[
                  { value: 'discounts', label: 'Discounts & free items', description: 'A percentage off or a free item after visits' },
                  { value: 'perks', label: 'Exclusive perks & status', description: 'Early access, VIP treatment, members-only offers' },
                  { value: 'points', label: 'Points they can redeem', description: 'A flexible currency that builds up over time' },
                  { value: 'not_sure', label: "I'm not sure", description: "We'll figure it out" },
                ]}
                value={rewardType}
                onChange={v => setRewardType(v as RewardType)}
              />
              <Button
                disabled={!goal || !visitFreq || !rewardType}
                onClick={() => {
                  const goalLabel = goal === 'gain_members' ? 'Gain new members' : goal === 'retain_customers' ? 'Retain customers' : 'Increase revenue'
                  push('user', `${goalLabel} · ${visitFreq === 'weekly' ? 'Weekly visits' : visitFreq === 'monthly_2_3' ? '2–3×/month' : 'Monthly'} · ${rewardType === 'discounts' ? 'Discounts' : rewardType === 'perks' ? 'Perks' : rewardType === 'points' ? 'Points' : 'Not sure'}`)
                  push('ai', "Got it — creating your loyalty program now.")
                  setStep('program-loading')
                }}
              >
                Continue
              </Button>
            </div>
          </StepWrapper>
        )

      case 'program-loading':
        return (
          <StepWrapper aiText={null}>
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
              <Loader2 size={16} className="animate-spin" />
              <span>Creating your loyalty program…</span>
            </div>
          </StepWrapper>
        )

      case 'program-review':
        if (!generatedProgram) return null
        return (
          <StepWrapper aiText={null}>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border p-4 flex flex-col gap-3">
                <div>
                  <p className="font-semibold text-sm">{generatedProgram.program_name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{generatedProgram.summary}</p>
                </div>
                <div className="flex flex-col gap-1.5 text-sm">
                  <Row label="Currency" value={generatedProgram.currency_name} />
                  <Row label="Earn rule" value={`1 ${generatedProgram.currency_name.toLowerCase().replace(/s$/, '')} per $1 spent`} />
                  <Row
                    label="Referral"
                    value={`${generatedProgram.referral_rules.referrer_points} pts for referrer · ${generatedProgram.referral_rules.referee_points} pts for new customer`}
                  />
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
              </div>
              {slugError && (
                <p className="text-xs text-muted-foreground">{slugError}</p>
              )}
              <Button onClick={handleSubmit}>
                Done — launch my program
              </Button>
              <button
                type="button"
                className="text-sm text-muted-foreground text-center hover:text-foreground transition-colors"
                onClick={reset}
              >
                Start over
              </button>
            </div>
          </StepWrapper>
        )

      case 'submitting':
        return (
          <StepWrapper aiText={null}>
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
              <Loader2 size={16} className="animate-spin" />
              <span>Setting up your business…</span>
            </div>
          </StepWrapper>
        )
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background text-[10px] font-bold">E</span>
          </div>
          <span className="font-semibold text-sm">Enroll</span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw size={12} />
          Start over
        </button>
      </header>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
        {thread.map((msg, i) =>
          msg.role === 'ai'
            ? <AiMessage key={i} text={msg.text} />
            : <UserMessage key={i} text={msg.text} />,
        )}
        <div ref={threadEndRef} />
        {renderCurrentStep()}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StepWrapper({ aiText, children }: { aiText: string | null; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      {aiText && <AiMessage text={aiText} />}
      <div className="ml-9">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground shrink-0 w-20">{label}</span>
      <span>{value}</span>
    </div>
  )
}

function GoalGroup({
  question,
  options,
  value,
  onChange,
}: {
  question: string
  options: { value: string; label: string; description: string }[]
  value: string | null
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{question}</p>
      {options.map(o => (
        <OptionCard key={o.value} selected={value === o.value} onClick={() => onChange(o.value)}>
          <span className="font-medium">{o.label}</span>
          <span className="block text-xs text-muted-foreground mt-0.5">{o.description}</span>
        </OptionCard>
      ))}
    </div>
  )
}

function ProductInputOptions({
  onUrl,
  onFile,
}: {
  onUrl: (url: string) => void
  onFile: (file: File) => void
}) {
  const [urlMode, setUrlMode] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  if (urlMode) {
    return (
      <form
        onSubmit={e => {
          e.preventDefault()
          if (urlValue.trim()) onUrl(urlValue.trim())
        }}
        className="flex gap-2"
      >
        <Input
          autoFocus
          type="url"
          placeholder="https://yourbusiness.com"
          value={urlValue}
          onChange={e => setUrlValue(e.target.value)}
        />
        <Button type="submit" disabled={!urlValue.trim()}>
          <ArrowIcon />
        </Button>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setUrlMode(true)}
        className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:border-foreground/40 transition-colors"
      >
        <Link2 size={16} className="text-muted-foreground shrink-0" />
        <span>Enter your website URL</span>
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:border-foreground/40 transition-colors"
      >
        <Upload size={16} className="text-muted-foreground shrink-0" />
        <span>Upload a file or image</span>
      </button>
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:border-foreground/40 transition-colors"
      >
        <Camera size={16} className="text-muted-foreground shrink-0" />
        <span>Take a photo of your menu</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
        }}
      />
    </div>
  )
}
