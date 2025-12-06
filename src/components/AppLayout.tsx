import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileSidebar } from "@/components/MobileSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile Header + Sidebar */}
      {isMobile && (
        <>
          <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} />
          <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
        </>
      )}

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'pt-0' : ''}`}>
        {children}
      </main>
    </div>
  );
}
