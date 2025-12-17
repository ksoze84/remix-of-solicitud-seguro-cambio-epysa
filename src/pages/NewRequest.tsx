import { useNavigate } from "react-router-dom";
import { RequestForm } from "@/components/forms/request-form";
import { CurrencyRequest, RequestStatus, UserRole } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error("Usuario no autenticado");
      }

      // Convert request data to database format
      // If admin and selectedUserId is provided, use that; otherwise use current user
      const dbRequest = {
        user_id: selectedUserId || currentUser.id,
        cliente: requestData.cliente!,
        rut: requestData.rut!,
        monto_negocio_usd: requestData.montoNegocioUsd!,
        unidades: requestData.unidades!,
        numeros_internos: requestData.numerosInternos || [],
        notas: requestData.notas,
        payments: requestData.payments || [],
        estado: status,
        tc_referencial: requestData.tcReferencial
      };

      const { data, error } = await supabase
        .from('currency_requests')
        .insert([dbRequest] as any)
        .select()
        .single();

      if (error) throw error;

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