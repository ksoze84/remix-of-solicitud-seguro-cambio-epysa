import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Filter, Download, Eye, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { CoverageIndicator } from "@/components/ui/coverage-indicator";

import { CurrencyRequest, UserRole, RequestStatus } from "@/types";
import { formatCurrency, calculateCoverage, formatNumber } from "@/utils/coverage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useViewRole } from "@/contexts/ViewRoleContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: authUser, userProfile, signOut } = useAuth();
  const { currentViewRole } = useViewRole();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [requests, setRequests] = useState<CurrencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch requests and current user
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser || !userProfile) return;

        setCurrentUserId(authUser.id);

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
          payments: req.payments as any[],
          estado: req.estado as RequestStatus,
          createdAt: new Date(req.created_at),
          updatedAt: new Date(req.updated_at)
        }));

        setRequests(convertedRequests);

        // Fetch seller names for admin view
        if (userProfile.role === 'ADMIN') {
          const uniqueSellerIds = [...new Set(convertedRequests.map(req => req.sellerId))];
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, nombre_apellido')
            .in('user_id', uniqueSellerIds);

          if (!profileError && profiles) {
            const namesMap: Record<string, string> = {};
            profiles.forEach(profile => {
              if (profile.user_id) {
                namesMap[profile.user_id] = profile.nombre_apellido || 'Sin nombre';
              }
            });
            setSellerNames(namesMap);
          }
        }
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
  }, [toast, userProfile]);

  if (!authUser || !userProfile) return null;

  const user = {
    email: authUser.email || '',
    role: userProfile.role === 'ADMIN' ? UserRole.ADMIN : (userProfile.role === 'COORDINADOR' ? UserRole.COORDINADOR : UserRole.VENDEDOR)
  };

  // Effective role for view (considers the view role selector for admins)
  const effectiveRole = currentViewRole || user.role;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const onNewRequest = () => navigate('/nueva-solicitud');
  const onViewRequest = (id: string) => navigate(`/solicitud/${id}`);
  const onEditRequest = (id: string) => navigate(`/solicitud/${id}`);

  const isAdmin = effectiveRole === UserRole.ADMIN;
  const isCoordinator = effectiveRole === UserRole.COORDINADOR;

  // Format request number (e.g., 0 -> #0001, 42 -> #0043)
  const formatRequestNumber = (num: number): string => {
    return `#${String(num + 1).padStart(4, '0')}`;
  };

  // Create request numbers based on creation date (oldest = 0, newest = highest)
  const sortedByDate = [...requests].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const requestNumbers = sortedByDate.reduce((acc, req, index) => {
    acc[req.id!] = index; // Oldest = 0, newest = n-1
    return acc;
  }, {} as Record<string, number>);

  // Filter requests based on user role and filters
  const filteredRequests = requests.filter(request => {
    // Role-based filtering: admins and coordinators see all, sellers see only their own
    if (!isAdmin && !isCoordinator && currentUserId && request.sellerId !== currentUserId) {
      return false;
    }

    // Search filter - buscar en múltiples campos
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesCliente = request.cliente.toLowerCase().includes(term);
      const matchesRut = request.rut.includes(searchTerm);
      const matchesBanco = request.banco?.toLowerCase().includes(term);
      const matchesNumeroSie = request.numeroSie?.toLowerCase().includes(term);
      const matchesNumerosInternos = request.numerosInternos.some(num => num.toLowerCase().includes(term));
      const matchesEstado = request.estado.toLowerCase().includes(term);
      const matchesNotas = request.notas?.toLowerCase().includes(term);
      
      if (!matchesCliente && !matchesRut && !matchesBanco && !matchesNumeroSie && 
          !matchesNumerosInternos && !matchesEstado && !matchesNotas) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== "all" && request.estado !== statusFilter) {
      return false;
    }

    // Bank filter
    if (bankFilter !== "all" && request.banco !== bankFilter) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort by creation date (newest first), then by request number (highest first)
    const dateCompare = b.createdAt.getTime() - a.createdAt.getTime();
    if (dateCompare !== 0) return dateCompare;
    return requestNumbers[b.id!] - requestNumbers[a.id!];
  });


  const canEdit = (request: CurrencyRequest) => {
    return request.estado === RequestStatus.BORRADOR || request.estado === RequestStatus.EN_REVISION;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-muted-foreground">Cargando solicitudes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Actions and Filters */}
      <Card>
          <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <CardTitle>Solicitudes de seguro de cambio</CardTitle>
            {!isCoordinator && (
              <Button onClick={onNewRequest}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva solicitud
              </Button>
            )}
          </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Buscar por cualquier campo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value={RequestStatus.BORRADOR}>Borrador</SelectItem>
                  <SelectItem value={RequestStatus.EN_REVISION}>En revisión</SelectItem>
                  <SelectItem value={RequestStatus.APROBADA}>Aprobada</SelectItem>
                  <SelectItem value={RequestStatus.RECHAZADA}>Rechazada</SelectItem>
                  <SelectItem value={RequestStatus.ANULADA}>Anulada</SelectItem>
                </SelectContent>
              </Select>

              {isAdmin && (
                <Select value={bankFilter} onValueChange={setBankFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los bancos</SelectItem>
                    <SelectItem value="Banco Santander Chile">Santander</SelectItem>
                    <SelectItem value="Banco Estado">Estado</SelectItem>
                    <SelectItem value="Banco de Chile">Banco de Chile</SelectItem>
                    <SelectItem value="Scotiabank Chile">Scotiabank</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {/* Requests Table */}
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" || bankFilter !== "all" 
                    ? "No se encontraron solicitudes con los filtros aplicados"
                    : "No hay solicitudes creadas"
                  }
                </div>
                {!isCoordinator && (
                  <Button onClick={onNewRequest} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primera solicitud
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {isAdmin && <TableHead>Vendedor</TableHead>}
                        <TableHead>Cliente</TableHead>
                        <TableHead>N° Solicitud</TableHead>
                        {isAdmin ? (
                          <>
                            <TableHead>Unidades</TableHead>
                            <TableHead>Monto Negocio</TableHead>
                            <TableHead>Monto Cobertura</TableHead>
                            <TableHead>Banco</TableHead>
                            <TableHead>Creada</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead>Monto USD</TableHead>
                            <TableHead>Unidades</TableHead>
                            <TableHead>TC Cliente</TableHead>
                            <TableHead>N° SIE</TableHead>
                            <TableHead>Creada</TableHead>
                          </>
                        )}
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => {
                      const coverage = calculateCoverage(
                        request.payments, 
                        request.porcentajeCobertura, 
                        request.tcCliente, 
                        request.montoNegocioUsd
                      );
                      return (
                        <TableRow key={request.id}>
                          {isAdmin && (
                            <TableCell className="font-medium">
                              {sellerNames[request.sellerId] || '-'}
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{request.cliente}</TableCell>
                          <TableCell>{formatRequestNumber(requestNumbers[request.id!])}</TableCell>
                          {isAdmin ? (
                            <>
                              <TableCell>{formatNumber(request.unidades, 0)}</TableCell>
                              <TableCell>{formatCurrency(request.montoNegocioUsd, 'USD')}</TableCell>
                              <TableCell>
                                {formatCurrency(coverage.exposicionCubierta, 'USD')}
                              </TableCell>
                              <TableCell>
                                {request.banco ? (
                                  <Badge variant="outline">{request.banco}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {request.createdAt?.toLocaleDateString('es-CL')}
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>{formatCurrency(request.montoNegocioUsd, 'USD')}</TableCell>
                              <TableCell>{formatNumber(request.unidades, 0)}</TableCell>
                              <TableCell>
                                {request.estado === 'APROBADA' && request.tcCliente ? 
                                  `$${formatNumber(request.tcCliente, 4)}` : 
                                  <span className="text-muted-foreground">-</span>
                                }
                              </TableCell>
                              <TableCell>
                                <span className="text-muted-foreground">{request.numeroSie || '-'}</span>
                              </TableCell>
                              <TableCell>
                                {request.createdAt?.toLocaleDateString('es-CL')}
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <StatusBadge status={request.estado} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewRequest(request.id!)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!isCoordinator && canEdit(request) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditRequest(request.id!)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
