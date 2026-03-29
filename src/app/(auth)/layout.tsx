import AuthHeader from "@/components/shared/headers/auth-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main>
      <div className="headerContainer">
        <AuthHeader />
      </div>
      <div className="pageContent">
        {children}
      </div>
    </main>
  );
}
