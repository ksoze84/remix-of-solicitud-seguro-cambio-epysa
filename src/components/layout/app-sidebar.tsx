import { FileText, LayoutDashboard, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { UserRole } from "@/types";
import epsyaLogo from "@/assets/epysa-logo.jpg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  userRole: UserRole;
}

export function AppSidebar({ userRole }: AppSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isAdmin = userRole === UserRole.ADMIN;

  // Menu items for Solicitudes
  const solicitudesItems = [
    { title: "Solicitudes", url: "/", icon: FileText },
  ];

  // Menu items for Dashboard (only admin)
  const dashboardItems = isAdmin ? [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  ] : [];

  // Menu items for Configuration (only admin)
  const configurationItems = isAdmin ? [
    { title: "Configuración", url: "/configuracion", icon: Settings },
  ] : [];

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img 
            src={epsyaLogo} 
            alt="Epysa Logo" 
            className="h-10 w-10 object-contain flex-shrink-0 rounded-lg"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <h2 className="text-lg font-bold text-sidebar-foreground truncate">SSC Epysa</h2>
              <p className="text-xs text-sidebar-foreground/60 truncate">Seguro de Cambio</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        {/* Solicitudes Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {solicitudesItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className={cn(
                      "transition-all duration-200",
                      isActive(item.url) 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <NavLink to={item.url} end className="flex items-center gap-3 px-4 py-3">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dashboard Menu (Admin only) */}
        {isAdmin && dashboardItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {dashboardItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      className={cn(
                        "transition-all duration-200",
                        isActive(item.url) 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <NavLink to={item.url} className="flex items-center gap-3 px-4 py-3">
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Configuration Menu (Admin only) */}
        {isAdmin && configurationItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {configurationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      className={cn(
                        "transition-all duration-200",
                        isActive(item.url) 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <NavLink to={item.url} className="flex items-center gap-3 px-4 py-3">
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
