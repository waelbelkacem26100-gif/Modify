import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        variables: {
          colorBackground: '#111113',
          colorInputBackground: '#1C1C1F',
          colorInputText: '#FAFAFA',
          colorText: '#FAFAFA',
          colorTextSecondary: '#A1A1AA',
          colorPrimary: '#FF6B35',
          colorDanger: '#EF4444',
          borderRadius: '12px',
          fontFamily: 'var(--font-dm-sans)',
        },
        elements: {
          card: 'bg-surface border border-border shadow-2xl',
          headerTitle: 'font-syne text-text-primary',
          headerSubtitle: 'text-text-secondary',
          formFieldLabel: 'text-text-secondary text-sm',
          formFieldInput: 'bg-surface-2 border-border text-text-primary focus:border-primary/50',
          footerActionLink: 'text-primary hover:text-primary-dark',
          dividerLine: 'bg-border',
          dividerText: 'text-text-muted',
          socialButtonsBlockButton: 'border-border bg-surface-2 text-text-primary hover:bg-surface',
          socialButtonsBlockButtonText: 'text-text-primary',
        },
      }}
    />
  )
}
