import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const footerLinks = [
  { to: '/about', labelKey: 'footer.links.about' },
  { to: '/privacy', labelKey: 'footer.links.privacy' },
  { to: '/terms', labelKey: 'footer.links.terms' },
  { to: '/contact', labelKey: 'footer.links.contact' },
] as const

export const AppFooter = () => {
  const { t } = useTranslation('common')

  return (
    <footer className="border-t-[0.5px] border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 text-sm text-text-subtle lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <Link to="/" className="font-heading text-xl font-bold tracking-[0.28em] text-primary">
            {t('brand.name')}
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="font-medium text-text-muted transition hover:text-text-primary"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
        </div>
        <p className="max-w-4xl leading-6 text-text-muted">{t('footer.disclaimer')}</p>
        <div className="flex flex-col justify-between gap-2 border-t-[0.5px] border-border pt-5 md:flex-row md:items-center">
          <span>{t('footer.copyright')}</span>
          <span>{t('footer.educational')}</span>
        </div>
      </div>
    </footer>
  )
}
