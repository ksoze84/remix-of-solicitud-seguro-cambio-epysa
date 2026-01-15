import { Settings } from "lucide-react";
import BankManagement from "@/components/admin/BankManagement";

export default function Configuration() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8" />
          Configuración
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión de bancos y ejecutivos
        </p>
      </div>

      <div className="w-full mt-6">
        <BankManagement />
      </div>
    </div>
  );
}
