/**
 * auth header
 * 
 * The header used in authenticated pages such as Login, Signup, and forgot password
 * 
 * @module /src/components/shared/headers
 */

import styles from "@/styles/shared/headers/auth-header.module.scss"
import Link from "next/link";

export default function AuthHeader() {

    return (
        <header className={styles.header}>
            <div className={styles.innerHeader}>
                <div className={styles.branding}>
                    <Link href="/">
                        <h3>Kanflow</h3>
                    </Link>
                </div>
                <div className={styles.navigation}>
                    <nav className={styles.innerNav}>
                        <ul>
                            <li><Link href="/login">Login</Link></li>
                            <li><Link href="/signup">Signup</Link></li>
                        </ul>
                    </nav>
                </div>
            </div>
        </header>
    );
}