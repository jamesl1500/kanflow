import styles from "@/styles/shared/sidebar/sidebar.module.scss";

export default function Sidebar() {
    return (
        <aside className={styles.sidebar}>
            <nav className={styles.sidebarNav}>
                <ul className={styles.sidebarNavList}>
                    <li className={styles.sidebarNavItem}>
                        <a href="/dashboard" className={styles.sidebarNavLink} title="Dashboard">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                        </a>
                    </li>
                    <li className={styles.sidebarNavItem}>
                        <a href="/settings" className={styles.sidebarNavLink} title="Settings">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                            </svg>
                        </a>
                    </li>
                </ul>
            </nav>
        </aside>
    );
}
