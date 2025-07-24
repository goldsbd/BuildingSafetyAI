import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { TopNavigation } from "./TopNavigation"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-shrink-0">
            <TopNavigation />
          </div>
          <main className="flex-1 overflow-y-auto bg-gradient-surface">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}