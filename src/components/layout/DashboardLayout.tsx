import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types";
import { ViewRoleProvider, useViewRole } from "@/contexts/ViewRoleContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { user: authUser, userProfile, signOut } = useAuth();
  const { currentViewRole, setCurrentViewRole } = useViewRole();

  if (!authUser || !userProfile) return null;

  const user = {
    email: authUser.email || '',
    role: userProfile.role === 'ADMIN' ? UserRole.ADMIN : (userProfile.role === 'COORDINADOR' ? UserRole.COORDINADOR : UserRole.VENDEDOR)
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar userRole={currentViewRole || user.role} />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header 
            user={user} 
            onLogout={handleLogout} 
            currentViewRole={currentViewRole} 
            onViewRoleChange={setCurrentViewRole}
          />

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ViewRoleProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </ViewRoleProvider>
  );
}
