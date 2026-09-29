import { useTranslation } from 'react-i18next'
import { ArrowRight, MapPin, Sparkles, Store } from 'lucide-react'
import hotpot from '@/assets/hotpot.jpg'
import { Button } from '@/components/ui/button'
import { tableAreas } from '@/data/menu'

interface WelcomeViewProps {
  table: string
  onEnter: () => void
}

export function WelcomeView({ table, onEnter }: WelcomeViewProps) {
  const { t } = useTranslation()
  const areaKey = tableAreas[table]
  const tableLabel = areaKey ? `${table} · ${t(areaKey)}` : table

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-rice-100 paper-noise dark:bg-dark-bg">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-chili-100 blur-3xl dark:bg-chili-500/10" />
      <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-amber-100 blur-3xl dark:bg-amber-500/10" />

      <div className="relative mx-auto w-full max-w-md px-5 py-10">
        <section className="animate-rise overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-float backdrop-blur dark:border-dark-text/10 dark:bg-dark-surface/90 dark:shadow-dark-float">
          {/* 门店图片 */}
          <div className="relative h-48 overflow-hidden sm:h-56">
            <img src={hotpot} alt={t('welcome.img_alt')} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-charcoal-900/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
              <div className="flex items-center gap-2">
                <Store size={18} className="opacity-80" />
                <div>
                  <p className="text-xs opacity-80">{t('common.simulated_store')}</p>
                  <h2 className="text-lg font-bold">{t('common.store_name')}</h2>
                </div>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">{t('common.open')}</span>
            </div>
          </div>

          {/* 问候语 */}
          <div className="px-6 py-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-chili-500/20 bg-chili-50 px-3 py-1.5 text-xs font-bold text-chili-600 dark:bg-chili-500/20 dark:text-chili-400">
              <Sparkles size={13} /> {t('welcome.badge')}
            </div>
            <h1 className="text-3xl font-extrabold leading-tight text-charcoal-900 sm:text-4xl dark:text-dark-text">
              {t('welcome.title')}
            </h1>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-base font-semibold text-charcoal-500 dark:text-dark-muted">
              <MapPin size={16} className="text-chili-500" />
              {t('welcome.you_at')} {tableLabel}
            </p>
          </div>

          {/* 进入点餐按钮 */}
          <div className="px-6 pb-7">
            <Button onClick={onEnter} className="w-full">
              {t('welcome.enter')}
              <ArrowRight size={17} />
            </Button>
          </div>
        </section>
      </div>
    </main>
  )
}
