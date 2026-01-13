import { useState, useEffect } from "react";
import { Plus, UserCheck, UserX, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types";
import { userProfileSchema } from "@/schemas/userSchema";
import { secureLogger } from "@/utils/secureLogger";

interface User {
  id: string;
  email: string;
  role: UserRole;
  user_id?: string | null;
  created_at: string;
  nombre_apellido?: string | null;
  correo_jefatura_directa?: string | null;
  correo_gerente?: string | null;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.VENDEDOR);
  const [nombreApellido, setNombreApellido] = useState("");
  const [correoJefaturaDirecta, setCorreoJefaturaDirecta] = useState("");
  const [correoGerente, setCorreoGerente] = useState("");
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = { data: undefined, error: undefined }

      if (error) throw error;
      setUsers(data?.map(user => ({
        ...user,
        role: user.role as UserRole
      })) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    // Validate with Zod schema
    const validation = userProfileSchema.safeParse({
      email: newUserEmail,
      nombreApellido: nombreApellido,
      role: newUserRole,
      correoJefaturaDirecta: correoJefaturaDirecta || '',
      correoGerente: correoGerente || ''
    });

    if (!validation.success) {
      toast({
        title: "Error de validación",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      // Check if user already exists
      const { data: existingUser } = { data: undefined }

      if (existingUser) {
        toast({
          title: "Error",
          description: "Ya existe un usuario con este email",
          variant: "destructive"
        });
        setCreating(false);
        return;
      }

      // Create new user profile
      const { error } = {  error: undefined }

      if (error) {
        secureLogger.error('Error creating user:', error);
        throw error;
      }

      toast({
        title: "Usuario creado",
        description: `Usuario ${newUserEmail} creado exitosamente`,
      });

      setNewUserEmail("");
      setNewUserRole(UserRole.VENDEDOR);
      setNombreApellido("");
      setCorreoJefaturaDirecta("");
      setCorreoGerente("");
      setIsCreateDialogOpen(false);
      fetchUsers();
    } catch (error) {
      secureLogger.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el usuario. Verifica que tengas permisos de administrador.",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    try {
      const { error } ={  error: undefined }

      if (error) throw error;

      toast({
        title: "Usuario eliminado",
        description: `Usuario ${email} eliminado exitosamente`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el usuario",
        variant: "destructive"
      });
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNombreApellido(user.nombre_apellido || "");
    setNewUserEmail(user.email);
    setNewUserRole(user.role);
    setCorreoJefaturaDirecta(user.correo_jefatura_directa || "");
    setCorreoGerente(user.correo_gerente || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    // Validate with Zod schema
    const validation = userProfileSchema.safeParse({
      email: newUserEmail,
      nombreApellido: nombreApellido,
      role: newUserRole,
      correoJefaturaDirecta: correoJefaturaDirecta || '',
      correoGerente: correoGerente || ''
    });

    if (!validation.success) {
      toast({
        title: "Error de validación",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    setUpdating(true);
    try {
      const { error } = { error: undefined }

      if (error) throw error;

      // Update user role if user_id exists
      if (editingUser.user_id) {


        const { error: roleError } = {  error: undefined }
        if (roleError) {
          secureLogger.error('Error updating user role:', roleError);
        }
      }

      toast({
        title: "Usuario actualizado",
        description: `Usuario ${newUserEmail} actualizado exitosamente`,
      });

      setIsEditDialogOpen(false);
      setEditingUser(null);
      setNewUserEmail("");
      setNewUserRole(UserRole.VENDEDOR);
      setNombreApellido("");
      setCorreoJefaturaDirecta("");
      setCorreoGerente("");
      fetchUsers();
    } catch (error) {
      secureLogger.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el usuario",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "destructive";
      case UserRole.VENDEDOR:
        return "default";
      case UserRole.COORDINADOR:
        return "secondary";
      default:
        return "default";
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "Administrador";
      case UserRole.VENDEDOR:
        return "Vendedor";
      case UserRole.COORDINADOR:
        return "Coordinador";
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestión de Usuarios</CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombreApellido">Nombre y Apellido</Label>
                    <Input
                      id="nombreApellido"
                      type="text"
                      placeholder="Juan Pérez"
                      value={nombreApellido}
                      onChange={(e) => setNombreApellido(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email corporativo</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@epysa.cl"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Rol</Label>
                    <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                        <SelectItem value={UserRole.VENDEDOR}>Vendedor</SelectItem>
                        <SelectItem value={UserRole.COORDINADOR}>Coordinador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="correoJefaturaDirecta">Correo jefatura directa</Label>
                    <Input
                      id="correoJefaturaDirecta"
                      type="email"
                      placeholder="jefe@epysa.cl"
                      value={correoJefaturaDirecta}
                      onChange={(e) => setCorreoJefaturaDirecta(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="correoGerente">Correo gerente</Label>
                    <Input
                      id="correoGerente"
                      type="email"
                      placeholder="gerente@epysa.cl"
                      value={correoGerente}
                      onChange={(e) => setCorreoGerente(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateUser}
                      disabled={creating || !newUserEmail}
                    >
                      {creating ? "Creando..." : "Crear Usuario"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.nombre_apellido || user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.user_id ? (
                          <>
                            <UserCheck className="h-4 w-4 text-success" />
                            <span className="text-success text-sm">Activo</span>
                          </>
                        ) : (
                          <>
                            <UserX className="h-4 w-4 text-warning" />
                            <span className="text-warning text-sm">Pendiente</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('es-CL')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          disabled={user.email === 'gonzalo.calderon@epysa.cl' || user.email === 'bryan.vickers@epysa.cl'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nombreApellido">Nombre y Apellido</Label>
              <Input
                id="edit-nombreApellido"
                type="text"
                placeholder="Juan Pérez"
                value={nombreApellido}
                onChange={(e) => setNombreApellido(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email corporativo</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="usuario@epysa.cl"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Rol</Label>
              <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                  <SelectItem value={UserRole.VENDEDOR}>Vendedor</SelectItem>
                  <SelectItem value={UserRole.COORDINADOR}>Coordinador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-correoJefaturaDirecta">Correo jefatura directa</Label>
              <Input
                id="edit-correoJefaturaDirecta"
                type="email"
                placeholder="jefe@epysa.cl"
                value={correoJefaturaDirecta}
                onChange={(e) => setCorreoJefaturaDirecta(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-correoGerente">Correo gerente</Label>
              <Input
                id="edit-correoGerente"
                type="email"
                placeholder="gerente@epysa.cl"
                value={correoGerente}
                onChange={(e) => setCorreoGerente(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingUser(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateUser}
                disabled={updating || !newUserEmail}
              >
                {updating ? "Actualizando..." : "Actualizar Usuario"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}