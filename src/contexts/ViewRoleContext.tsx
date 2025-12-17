import { createContext, useContext, useState, ReactNode } from "react";
import { UserRole } from "@/types";

interface ViewRoleContextType {
  currentViewRole: UserRole | undefined;
  setCurrentViewRole: (role: UserRole | undefined) => void;
}

const ViewRoleContext = createContext<ViewRoleContextType | undefined>(undefined);

export function ViewRoleProvider({ children }: { children: ReactNode }) {
  const [currentViewRole, setCurrentViewRole] = useState<UserRole | undefined>();

  return (
    <ViewRoleContext.Provider value={{ currentViewRole, setCurrentViewRole }}>
      {children}
    </ViewRoleContext.Provider>
  );
}

export function useViewRole() {
  const context = useContext(ViewRoleContext);
  if (context === undefined) {
    throw new Error("useViewRole must be used within a ViewRoleProvider");
  }
  return context;
}
