import { Bot, MessageSquare} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronRight, MapPin, QrCode, Sparkles, Users } from 'lucide-react'
import hotpot from '@/assets/hotpot.jpg'
import { Button } from '@/components/ui/button'
import { getRecommendedProducts } from '@/data/menu'
import { money } from '@/lib/utils'

const tableOptions = [
  { code: 'A08', areaKey: 'bind.area.hall', seats: 4 },
  { code: 'B12', areaKey: 'bind.area.booth', seats: 6 },
  { code: 'C06', areaKey: 'bind.area.room', seats: 4 },
  { code: 'D03', areaKey: 'bind.area.window', seats: 6 },
]

interface HomeViewProps { onBind: (table: string) => void; onCarAssistant?: () => void }

export function HomeView({ onBind, onCarAssistant }: HomeViewProps) {
  const { t } = useTranslation()
  const recommended = getRecommendedProducts()
  return (<>
    <main className="relative overflow-hidden bg-rice-100 paper-noise">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-chili-100 blur-3xl" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-amber-100 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-5 py-4 lg:grid-cols-2 lg:px-10 lg:py-5">
        <section className="animate-rise">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-chili-500/20 bg-white/80 px-3 py-2 text-xs font-bold text-chili-600 shadow-sm">
            <Sparkles size={14} /> {t('common.concept_badge')}
          </div>
          <p className="mb-2 text-sm font-bold tracking-widest text-chili-500">{t('common.concept_en')}</p>
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight text-charcoal-900 sm:text-5xl lg:text-5xl">
            {t('bind.title_l1')}<br /><span className="text-chili-500">{t('bind.title_l2')}</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-6 text-charcoal-500">{t('bind.desc')}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm text-charcoal-700">
            {[t('bind.feature1'), t('bind.feature2'), t('bind.feature3')].map((item) => (
              <span key={item} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm"><Check size={15} className="text-chili-500" />{item}</span>
            ))}
          </div>
        </section>

        <section className="animate-rise rounded-3xl border border-white/80 bg-white/90 p-3 shadow-float backdrop-blur sm:p-5">
          <div className="relative mb-4 h-40 overflow-hidden rounded-2xl sm:h-48">
            <img src={hotpot} alt={t('bind.img_alt')} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/70 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
              <div><p className="text-xs opacity-80">{t('common.simulated_store')}</p><h2 className="text-lg font-bold">{t('common.store_name')}</h2></div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">{t('common.open')}</span>
            </div>
          </div>
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-rice-100 p-3">
            <span className="rounded-xl bg-white p-2.5 text-chili-500 shadow-sm"><QrCode size={18} /></span>
            <div className="min-w-0 flex-1"><p className="font-bold text-charcoal-900">{t('bind.qr_title')}</p><p className="text-xs text-charcoal-500">{t('bind.qr_desc')}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {tableOptions.map(({ code, areaKey, seats }, index) => (
              <button key={code} onClick={() => onBind(code)} className="group rounded-2xl border border-charcoal-900/10 bg-white p-3 text-left transition hover:-translate-y-1 hover:border-chili-500 hover:shadow-card">
                <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-rice-100 text-xs font-extrabold text-chili-500">{index + 1}</span>
                <p className="text-sm font-bold text-charcoal-900">{code} · {t(areaKey)}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-charcoal-500"><Users size={12} /> {t('bind.seats', { count: seats })}</p>
                <ChevronRight size={15} className="ml-auto mt-1 text-charcoal-500 transition group-hover:translate-x-1 group-hover:text-chili-500" />
              </button>
            ))}
          </div>
          <Button onClick={() => onBind('A08')} className="mt-3 w-full h-10 text-sm"><MapPin size={16} />{t('bind.quick_enter')}</Button>
        </section>
      </div>

      <section className="relative mx-auto w-full max-w-6xl px-5 pb-6 lg:px-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-charcoal-900">
            <Sparkles size={16} className="text-chili-500" />
            {t('home.recommend.title')}
          </h2>
        </div>
        {recommended.length === 0 ? (
          <p className="rounded-2xl border border-charcoal-900/5 bg-white/80 p-5 text-center text-sm text-charcoal-500">{t('home.recommend.empty')}</p>
        ) : (
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:gap-3">
            {recommended.map((product, index) => (
              <button
                key={product.id}
                onClick={() => onBind('A08')}
                className="group animate-rise w-40 shrink-0 overflow-hidden rounded-2xl border border-charcoal-900/5 bg-white text-left shadow-card transition hover:-translate-y-1 hover:border-chili-500 sm:w-auto sm:shrink"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="relative h-20 overflow-hidden sm:h-24">
                  <img src={product.image} alt={t(product.name)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/45 to-transparent" />
                  {product.badge && <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-extrabold text-charcoal-900">{t(product.badge)}</span>}
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-1 text-sm font-bold text-charcoal-900">{t(product.name)}</h3>
                  <p className="mt-1 text-base font-extrabold text-chili-500">{money(product.price)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>

      {/* ─── 车机 AI 对话助手入口 ─── */}
      <section className="relative mx-auto w-full max-w-6xl px-5 pb-6 lg:px-10">
        <button
          onClick={onCarAssistant}
          className="group relative w-full overflow-hidden rounded-3xl border border-rice-200/80 bg-gradient-to-br from-chili-50 via-white to-amber-50 p-5 text-left shadow-card transition hover:-translate-y-1 hover:shadow-float sm:p-6"
        >
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-chili-500/10 to-amber-500/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-chili-500 to-amber-500 text-2xl text-white shadow-lg transition group-hover:scale-105">
              <Bot size={28} />
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-extrabold text-charcoal-900">小狼助手 · 车机 AI 对话</h3>
              <p className="mt-1 text-sm text-charcoal-500">试试对我说：导航去公司 / 播放周杰伦 / 打开空调 / 今天天气怎么样</p>
            </div>
            <span className="hidden items-center gap-1 rounded-full bg-chili-500 px-4 py-2 text-sm font-bold text-white transition group-hover:bg-chili-600 sm:flex">
              <MessageSquare size={16} /> 开始体验
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['🗺 导航', '🎵 音乐', '❄️ 空调', '🌤 天气'].map((tag) => (
              <span key={tag} className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-charcoal-500 shadow-sm backdrop-blur">{tag}</span>
            ))}
          </div>
        </button>
      </section>
  </>)
}
