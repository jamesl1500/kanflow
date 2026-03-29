import styles from "@/styles/onboarding.module.scss"

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Make sure we're authenticated
    return (
        <div className={styles.layout}>
            <nav className={styles.nav}>
                <span>KanFlow</span>
                <p>Setting up your account</p>
            </nav>
            {children}
        </div>
    )
}
