import { useState, useEffect } from "react";
import { TrendingUp, Building2, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyRequest, RequestStatus } from "@/types";
import { formatCurrency, calculateCoverage, formatNumber } from "@/utils/coverage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardAdmin() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<CurrencyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch requests
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('currency_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Convert database format to app format
        const convertedRequests: CurrencyRequest[] = data.map(req => ({
          id: req.id,
          sellerId: req.user_id,
          cliente: req.cliente,
          rut: req.rut,
          montoNegocioUsd: parseFloat(req.monto_negocio_usd.toString()),
          unidades: req.unidades,
          numerosInternos: req.numeros_internos,
          numeroSie: (req as any).numero_sie,
          tcCliente: (req as any).tc_cliente ? parseFloat((req as any).tc_cliente.toString()) : undefined,
          notas: req.notas,
          banco: req.banco,
          diasForward: req.dias_forward,
          porcentajeCobertura: req.porcentaje_cobertura ? parseFloat(req.porcentaje_cobertura.toString()) : undefined,
          puntosForwards: req.puntos_forwards ? parseFloat(req.puntos_forwards.toString()) : undefined,
          fechaVencimiento: req.fecha_vencimiento ? new Date(req.fecha_vencimiento) : undefined,
          payments: req.payments as any[],
          estado: req.estado as RequestStatus,
          createdAt: new Date(req.created_at),
          updatedAt: new Date(req.updated_at)
        }));

        setRequests(convertedRequests);
      } catch (error) {
        console.error('Error fetching requests:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las solicitudes",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Cargando métricas...</div>
        </div>
      </div>
    );
  }

  // Calculate metrics for approved requests
  const hoy = new Date();
  const allApprovedRequests = requests.filter(r => r.estado === RequestStatus.APROBADA);
  
  // Vigentes: approved with future expiration date
  const vigentesRequests = allApprovedRequests.filter(r => {
    if (!r.fechaVencimiento) return false;
    const vencimiento = new Date(r.fechaVencimiento);
    return vencimiento > hoy;
  });
  
  // 1. Total Monto Cobertura - Vigente y Total
  const totalCoberturaVigente = vigentesRequests.reduce((acc, r) => {
    const coverage = calculateCoverage(r.payments, r.porcentajeCobertura, r.tcCliente, r.montoNegocioUsd);
    return acc + coverage.exposicionCubierta;
  }, 0);
  
  const totalCoberturaTotal = allApprovedRequests.reduce((acc, r) => {
    const coverage = calculateCoverage(r.payments, r.porcentajeCobertura, r.tcCliente, r.montoNegocioUsd);
    return acc + coverage.exposicionCubierta;
  }, 0);
  
  // TC All-in Promedio Ponderado - Vigente y Total
  const tcAllInVigente = vigentesRequests.length > 0 && totalCoberturaVigente > 0
    ? vigentesRequests.reduce((acc, r) => {
        const coverage = calculateCoverage(r.payments, r.porcentajeCobertura, r.tcCliente, r.montoNegocioUsd);
        return acc + (r.tcCliente || 0) * coverage.exposicionCubierta;
      }, 0) / totalCoberturaVigente
    : 0;
    
  const tcAllInTotal = allApprovedRequests.length > 0 && totalCoberturaTotal > 0
    ? allApprovedRequests.reduce((acc, r) => {
        const coverage = calculateCoverage(r.payments, r.porcentajeCobertura, r.tcCliente, r.montoNegocioUsd);
        return acc + (r.tcCliente || 0) * coverage.exposicionCubierta;
      }, 0) / totalCoberturaTotal
    : 0;

  // 2. Montos y Participación por Banco - Vigente y Total
  const bancoStatsVigente = vigentesRequests.reduce((acc, r) => {
    if (!r.banco) return acc;
    const coverage = calculateCoverage(r.payments, r.porcentajeCobertura, r.tcCliente, r.montoNegocioUsd);
    if (!acc[r.banco]) {
      acc[r.banco] = 0;
    }
    acc[r.banco] += coverage.exposicionCubierta;
    return acc;
  }, {} as Record<string, number>);

  const bancoStatsTotal = allApprovedRequests.reduce((acc, r) => {
    if (!r.banco) return acc;
    const coverage = calculateCoverage(r.payments, r.porcentajeCobertura, r.tcCliente, r.montoNegocioUsd);
    if (!acc[r.banco]) {
      acc[r.banco] = 0;
    }
    acc[r.banco] += coverage.exposicionCubierta;
    return acc;
  }, {} as Record<string, number>);

  const totalBancosVigente = Object.values(bancoStatsVigente).reduce((sum, val) => sum + val, 0);
  const totalBancosTotal = Object.values(bancoStatsTotal).reduce((sum, val) => sum + val, 0);
  
  const bancoParticipacionVigente = Object.entries(bancoStatsVigente).map(([banco, monto]) => ({
    banco,
    monto,
    participacion: totalBancosVigente > 0 ? (monto / totalBancosVigente) * 100 : 0
  })).sort((a, b) => b.monto - a.monto);
  
  const bancoParticipacionTotal = Object.entries(bancoStatsTotal).map(([banco, monto]) => ({
    banco,
    monto,
    participacion: totalBancosTotal > 0 ? (monto / totalBancosTotal) * 100 : 0
  })).sort((a, b) => b.monto - a.monto);

  // 3. Días Forward - Vigentes y Totales
  const diasForwardVigentes = vigentesRequests
    .filter(r => r.diasForward)
    .map(r => r.diasForward!);
  
  const diasForwardTotales = allApprovedRequests
    .filter(r => r.diasForward)
    .map(r => r.diasForward!);

  const diasStats = {
    vigentes: {
      min: diasForwardVigentes.length > 0 ? Math.min(...diasForwardVigentes) : 0,
      promedio: diasForwardVigentes.length > 0 
        ? diasForwardVigentes.reduce((a, b) => a + b, 0) / diasForwardVigentes.length 
        : 0,
      max: diasForwardVigentes.length > 0 ? Math.max(...diasForwardVigentes) : 0
    },
    totales: {
      min: diasForwardTotales.length > 0 ? Math.min(...diasForwardTotales) : 0,
      promedio: diasForwardTotales.length > 0 
        ? diasForwardTotales.reduce((a, b) => a + b, 0) / diasForwardTotales.length 
        : 0,
      max: diasForwardTotales.length > 0 ? Math.max(...diasForwardTotales) : 0
    }
  };

  // 4. Costo Puntos Forward - Vigentes y Total
  const puntosForwardVigente = vigentesRequests
    .filter(r => r.puntosForwards)
    .reduce((acc, r, _, arr) => acc + (r.puntosForwards || 0) / arr.length, 0);
    
  const puntosForwardTotal = allApprovedRequests
    .filter(r => r.puntosForwards)
    .reduce((acc, r, _, arr) => acc + (r.puntosForwards || 0) / arr.length, 0);

  // 5. Próximos Vencimientos a 30 días (solo vigentes)
  const treintaDias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
  const proximosVencimientos = vigentesRequests
    .filter(r => {
      if (!r.fechaVencimiento) return false;
      const vencimiento = new Date(r.fechaVencimiento);
      return vencimiento >= hoy && vencimiento <= treintaDias;
    })
    .sort((a, b) => {
      const dateA = new Date(a.fechaVencimiento!);
      const dateB = new Date(b.fechaVencimiento!);
      return dateA.getTime() - dateB.getTime();
    });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">Métricas y análisis de coberturas vigentes</p>
        </div>
      </div>

      {/* Row 1: Monto Cobertura y TC All-in */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monto Cobertura</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vigente</p>
                <div className="text-2xl font-bold">{formatCurrency(totalCoberturaVigente, 'USD')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {vigentesRequests.length} solicitudes vigentes
                </p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <div className="text-2xl font-bold">{formatCurrency(totalCoberturaTotal, 'USD')}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {allApprovedRequests.length} solicitudes aprobadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TC All-in Promedio Ponderado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vigente</p>
                <div className="text-2xl font-bold">
                  ${formatNumber(tcAllInVigente, 4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ponderado por monto cobertura
                </p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <div className="text-2xl font-bold">
                  ${formatNumber(tcAllInTotal, 4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ponderado por monto cobertura
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Participación por Banco */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Montos y Participación por Banco</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vigente */}
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-semibold">Vigente</p>
              <div className="space-y-3">
                {bancoParticipacionVigente.map(({ banco, monto, participacion }) => (
                  <div key={banco} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{banco}</Badge>
                        <span className="text-sm font-medium">{formatCurrency(monto, 'USD')}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${participacion}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold ml-4 min-w-[60px] text-right">
                      {formatNumber(participacion, 1)}%
                    </span>
                  </div>
                ))}
                {bancoParticipacionVigente.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay datos disponibles
                  </p>
                )}
              </div>
            </div>
            
            {/* Total */}
            <div>
              <p className="text-xs text-muted-foreground mb-3 font-semibold">Total</p>
              <div className="space-y-3">
                {bancoParticipacionTotal.map(({ banco, monto, participacion }) => (
                  <div key={banco} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{banco}</Badge>
                        <span className="text-sm font-medium">{formatCurrency(monto, 'USD')}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${participacion}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold ml-4 min-w-[60px] text-right">
                      {formatNumber(participacion, 1)}%
                    </span>
                  </div>
                ))}
                {bancoParticipacionTotal.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay datos disponibles
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Días Forward y Puntos Forward */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Días Forward</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vigentes (Aprobadas)</p>
                <div className="flex items-center gap-4 text-sm">
                  <span>Min: <strong>{diasStats.vigentes.min}</strong></span>
                  <span>Prom: <strong>{formatNumber(diasStats.vigentes.promedio, 0)}</strong></span>
                  <span>Max: <strong>{diasStats.vigentes.max}</strong></span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Totales</p>
                <div className="flex items-center gap-4 text-sm">
                  <span>Min: <strong>{diasStats.totales.min}</strong></span>
                  <span>Prom: <strong>{formatNumber(diasStats.totales.promedio, 0)}</strong></span>
                  <span>Max: <strong>{diasStats.totales.max}</strong></span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo Puntos Forward</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Vigente</p>
                <div className="text-2xl font-bold">
                  {formatNumber(puntosForwardVigente, 2)} pts
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <div className="text-2xl font-bold">
                  {formatNumber(puntosForwardTotal, 2)} pts
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Promedio en solicitudes aprobadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Próximos Vencimientos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Próximos Vencimientos (30 días)</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {proximosVencimientos.length > 0 ? (
            <div className="space-y-2">
              {proximosVencimientos.slice(0, 5).map((request) => {
                const coverage = calculateCoverage(request.payments, request.porcentajeCobertura, request.tcCliente, request.montoNegocioUsd);
                return (
                  <div key={request.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{request.cliente}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.fechaVencimiento!).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(coverage.exposicionCubierta, 'USD')}</p>
                      <Badge variant="outline" className="text-xs">{request.banco}</Badge>
                    </div>
                  </div>
                );
              })}
              {proximosVencimientos.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{proximosVencimientos.length - 5} vencimientos más
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay vencimientos próximos en los siguientes 30 días
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
