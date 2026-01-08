import { useNavigate } from "react-router-dom";
import { RequestForm } from "@/components/forms/request-form";
import { CurrencyRequest, RequestStatus, UserRole } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { exec } from "@/integrations/epy/EpysaApi";

export default function NewRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, userProfile } = useAuth();

  if (!authUser || !userProfile) return null;

  const user = {
    email: authUser.email || '',
    role: userProfile.role === 'ADMIN' ? UserRole.ADMIN : UserRole.VENDEDOR
  };

  const handleSave = async (requestData: Partial<CurrencyRequest>, status: RequestStatus, selectedUserId?: string) => {
    try {
      // Convert request data to database format
      // If admin and selectedUserId is provided, use that; otherwise use current user
      const dbRequest = {
        user_id: selectedUserId || authUser.login,
        cliente: requestData.cliente,
        rut: requestData.rut,
        monto_negocio_usd: requestData.montoNegocioUsd,
        unidades: requestData.unidades,
        numeros_internos: requestData.numerosInternos || [],
        notas: requestData.notas,
        payments: requestData.payments || [],
        estado: status,
        tc_referencial: requestData.tcReferencial
      };


      await exec('frwrd/save_currency_request', dbRequest);
      

      toast({
        title: "Éxito",
        description: "Solicitud guardada correctamente",
      });
      
      navigate("/");
    } catch (error) {
      console.error('Error saving request:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la solicitud. Intenta nuevamente.",
        variant: "destructive"
      });
      throw error;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <RequestForm
        onSave={handleSave}
        onCancel={() => navigate("/")}
        isAdmin={user.role === UserRole.ADMIN}
      />
    </div>
  );
}