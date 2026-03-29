import AuthenticatedHeader from "@/components/shared/headers/authenticated-header";
import Sidebar from "@/components/shared/sidebar/Sidebar";
import styles from "@/styles/layouts/inner_authenticated.module.scss";

export default function InnerAuthenticatedLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.innerAuthenticatedContainer}>
            <AuthenticatedHeader />
            <div className={styles.innerAuthenticatedBody}>
                <Sidebar />
                <main className={styles.innerAuthenticatedContent}>
                    {children}
                </main>
            </div>
        </div>
    );
}