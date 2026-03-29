import AuthenticatedHeader from "@/components/shared/headers/authenticated-header";

export default function InnerAuthenticatedLayout({ children }){

    return (
        <main className={styles.innerAuthenticatedContainer}>
            <div className={styles.innerAuthenticatedHeader}>
                <AuthenticatedHeader />
            </div>
            <div className={styles.innerAuthenticatedContent}>
                <div className={styles.innerAuthenticatedContentInner}>
            
                </div>
            </div>
        </main>
    )
}