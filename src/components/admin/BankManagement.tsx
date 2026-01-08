import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BankExecutive } from "@/types";
import { bankExecutiveSchema } from "@/schemas/bankSchema";
import { secureLogger } from "@/utils/secureLogger";
import { exec } from "@/integrations/epy/EpysaApi";
import { useAuth } from "@/hooks/useAuth";

export default function BankManagement() {
  const { userProfile } = useAuth();
  const [executives, setExecutives] = useState<BankExecutive[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExecutive, setEditingExecutive] = useState<BankExecutive | null>(null);
  const [newExecutive, setNewExecutive] = useState({
    name: "",
    contactNumber: "",
    bankName: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchExecutives();
  }, []);

  const fetchExecutives = async () => {
    try {
      setLoading(true);

      const data = (await exec('frwrd/list_bank_executives')).data;

      // Map database fields to interface fields
      const mappedExecutives: BankExecutive[] = (data || []).map(exec => ({
        id: exec.id,
        name: exec.name,
        contactNumber: exec.contact_number,
        bankName: exec.bank_name,
        createdAt: new Date(exec.created_at),
        updatedAt: new Date(exec.updated_at)
      }));

      setExecutives(mappedExecutives);
    } catch (err) {
      console.error('Error fetching executives:', err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los ejecutivos bancarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleCreateExecutive = async () => {
    // Validate with Zod schema
    const validation = bankExecutiveSchema.safeParse(newExecutive);

    if (!validation.success) {
      toast({
        title: "Error de validación",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    try {

      await exec('frwrd/save_bank_executive', {
        name: newExecutive.name,
        contact_number: newExecutive.contactNumber,
        bank_name: newExecutive.bankName,
        user_id: userProfile?.login
      });



      await fetchExecutives(); // Refresh the list

      toast({
        title: "Éxito",
        description: "Ejecutivo bancario creado correctamente",
      });

      setNewExecutive({ name: "", contactNumber: "", bankName: "" });
      setDialogOpen(false);
    } catch (err) {
      secureLogger.error('Error creating executive:', err);
      toast({
        title: "Error",
        description: "No se pudo crear el ejecutivo bancario",
        variant: "destructive",
      });
    }
  };

  const handleEditExecutive = (executive: BankExecutive) => {
    setEditingExecutive(executive);
    setEditDialogOpen(true);
  };

  const handleUpdateExecutive = async () => {
    if (!editingExecutive) return;

    // Validate with Zod schema
    const validation = bankExecutiveSchema.safeParse({
      name: editingExecutive.name,
      contactNumber: editingExecutive.contactNumber,
      bankName: editingExecutive.bankName
    });

    if (!validation.success) {
      toast({
        title: "Error de validación",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    try {

      await exec('frwrd/save_bank_executive', {
        id: editingExecutive.id,
        name: editingExecutive.name,
        contact_number: editingExecutive.contactNumber,
        bank_name: editingExecutive.bankName,
        user_id: userProfile?.login
      });

      await fetchExecutives(); // Refresh the list

      toast({
        title: "Éxito",
        description: "Ejecutivo bancario actualizado correctamente",
      });

      setEditingExecutive(null);
      setEditDialogOpen(false);
    } catch (err) {
      secureLogger.error('Error updating executive:', err);
      toast({
        title: "Error",
        description: "No se pudo actualizar el ejecutivo bancario",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExecutive = async (executiveId: string, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${name}?`)) {
      return;
    }

    try {

      await exec('frwrd/delete_bank_executive', { id: executiveId, user_id: userProfile?.login });

      await fetchExecutives(); // Refresh the list

      toast({
        title: "Éxito",
        description: "Ejecutivo bancario eliminado correctamente",
      });
    } catch (err) {
      console.error('Error deleting executive:', err);
      toast({
        title: "Error",
        description: "No se pudo eliminar el ejecutivo bancario",
        variant: "destructive",
      });
    }
  };

  // Group and sort executives by bank
  const groupedExecutives = executives //NOSONAR
    .sort((a, b) => a.bankName.localeCompare(b.bankName)) //NOSONAR
    .reduce((groups, executive) => {
      const bank = executive.bankName;
      if (!groups[bank]) {
        groups[bank] = [];
      }
      groups[bank].push(executive);
      return groups;
    }, {} as Record<string, BankExecutive[]>);

  if (loading) {
    return <div className="flex justify-center p-8">Cargando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Bancos y Ejecutivos</CardTitle>
            <CardDescription>
              Gestiona los ejecutivos bancarios y sus datos de contacto
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Ejecutivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Ejecutivo Bancario</DialogTitle>
                <DialogDescription>
                  Completa la información del nuevo ejecutivo bancario
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre del Ejecutivo</Label>
                  <Input
                    id="name"
                    value={newExecutive.name}
                    onChange={(e) => setNewExecutive({
                      ...newExecutive,
                      name: e.target.value
                    })}
                    placeholder="Ingresa el nombre completo"
                  />
                </div>
                <div>
                  <Label htmlFor="bank">Banco</Label>
                  <Input
                    id="bank"
                    value={newExecutive.bankName}
                    onChange={(e) => setNewExecutive({
                      ...newExecutive,
                      bankName: e.target.value.toUpperCase()
                    })}
                    placeholder="Ingresa el nombre del banco"
                  />
                </div>
                <div>
                  <Label htmlFor="contact">Número de Contacto</Label>
                  <Input
                    id="contact"
                    value={newExecutive.contactNumber}
                    onChange={(e) => setNewExecutive({
                      ...newExecutive,
                      contactNumber: e.target.value
                    })}
                    placeholder="Ejemplo: +56 9 1234 5678"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateExecutive}>
                    Crear Ejecutivo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Ejecutivo Bancario</DialogTitle>
                <DialogDescription>
                  Modifica la información del ejecutivo bancario
                </DialogDescription>
              </DialogHeader>
              {editingExecutive && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-bank">Banco</Label>
                    <Input
                      id="edit-bank"
                      value={editingExecutive.bankName}
                      onChange={(e) => setEditingExecutive({
                        ...editingExecutive,
                        bankName: e.target.value.toUpperCase()
                      })}
                      placeholder="Ingresa el nombre del banco"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-name">Nombre del Ejecutivo</Label>
                    <Input
                      id="edit-name"
                      value={editingExecutive.name}
                      onChange={(e) => setEditingExecutive({
                        ...editingExecutive,
                        name: e.target.value
                      })}
                      placeholder="Ingresa el nombre completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-contact">Número de Contacto</Label>
                    <Input
                      id="edit-contact"
                      value={editingExecutive.contactNumber}
                      onChange={(e) => setEditingExecutive({
                        ...editingExecutive,
                        contactNumber: e.target.value
                      })}
                      placeholder="Ejemplo: +56 9 1234 5678"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleUpdateExecutive}>
                      Actualizar Ejecutivo
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {executives.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay ejecutivos bancarios registrados
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedExecutives).map(([bank, bankExecutives]) => (
                bankExecutives.map((executive, index) => (
                  <TableRow key={executive.id}>
                    <TableCell className="font-medium">
                      {index === 0 ? bank : ""}
                    </TableCell>
                    <TableCell>{executive.name}</TableCell>
                    <TableCell>{executive.contactNumber}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditExecutive(executive)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExecutive(executive.id, executive.name)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}