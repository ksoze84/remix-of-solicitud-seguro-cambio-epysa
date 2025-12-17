import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from "@/components/admin/UserManagement";
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
          Gestión de usuarios, bancos y ejecutivos
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users">Crear Usuario</TabsTrigger>
          <TabsTrigger value="banks">Bancos y Ejecutivos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="banks" className="mt-6">
          <BankManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
