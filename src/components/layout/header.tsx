import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/types";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface HeaderProps {
  user?: {
    email: string;
    role: UserRole;
  };
  onLogout?: () => void;
  currentViewRole?: UserRole;
  onViewRoleChange?: (role: UserRole) => void;
}

export function Header({ user, onLogout, currentViewRole, onViewRoleChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
        </div>

        <div className="flex items-center gap-4">
          {user?.role === UserRole.ADMIN && (
            <Select
              value={currentViewRole || user.role}
              onValueChange={(value) => onViewRoleChange?.(value as UserRole)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                <SelectItem value={UserRole.COORDINADOR}>Coordinador</SelectItem>
                <SelectItem value={UserRole.VENDEDOR}>Vendedor</SelectItem>
              </SelectContent>
            </Select>
          )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.role === UserRole.ADMIN ? 'Administrador' : 
                         user.role === UserRole.COORDINADOR ? 'Coordinador' : 'Vendedor'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}