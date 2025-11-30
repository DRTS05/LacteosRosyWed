// ============================================
// COMPONENTE: GESTIÓN DE VEHÍCULOS (ADMIN)
// ============================================
// Permite al administrador gestionar la flota de vehículos
// para entrega de pedidos. Incluye agregar, editar y eliminar vehículos
// Los cambios se sincronizan automáticamente con gestión de pedidos

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Truck, Pencil, Trash2, Plus } from "lucide-react";
import { Badge } from "../ui/badge";
import { getVehicles, addVehicle, updateVehicle, deleteVehicle } from "../../utils/supabase/api";

// ============================================
// INTERFACES
// ============================================

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  status: string;
  driver: string;
  capacity: string;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function VehiclesManagement() {
  // ============================================
  // ESTADO DEL COMPONENTE
  // ============================================
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); // Lista de vehículos
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Mostrar/ocultar diálogo
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null); // Vehículo en edición
  const [loading, setLoading] = useState(true); // Estado de carga

  // Datos del formulario
  const [formData, setFormData] = useState({
    plate: "",
    model: "",
    status: "Disponible",
    driver: "",
    capacity: "",
  });

  // ============================================
  // CARGAR VEHÍCULOS DESDE EL SERVIDOR
  // ============================================
  // Se ejecuta al montar el componente y cada 5 segundos
  // para mantener sincronizado con cambios en pedidos
  
  useEffect(() => {
    loadVehicles();
    
    // Recargar vehículos cada 5 segundos para sincronización
    const interval = setInterval(loadVehicles, 5000);
    
    return () => clearInterval(interval); // Limpiar intervalo al desmontar
  }, []);

  async function loadVehicles() {
    const data = await getVehicles();
    setVehicles(data);
    setLoading(false);
  }

  // ============================================
  // FUNCIONES DE GESTIÓN
  // ============================================

  /**
   * Abre el diálogo para agregar un nuevo vehículo
   */
  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setFormData({
      plate: "",
      model: "",
      status: "Disponible",
      driver: "",
      capacity: "",
    });
    setIsDialogOpen(true);
  };

  /**
   * Abre el diálogo para editar un vehículo existente
   */
  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate: vehicle.plate,
      model: vehicle.model,
      status: vehicle.status,
      driver: vehicle.driver,
      capacity: vehicle.capacity,
    });
    setIsDialogOpen(true);
  };

  /**
   * Elimina un vehículo de la flota
   */
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (confirm("¿Está seguro de eliminar este vehículo?")) {
      const result = await deleteVehicle(vehicleId);
      if (result.success) {
        // Actualizar lista local inmediatamente
        setVehicles(vehicles.filter((v) => v.id !== vehicleId));
      } else {
        alert("Error eliminando vehículo: " + result.error);
      }
    }
  };

  /**
   * Guarda el vehículo (crear nuevo o actualizar existente)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingVehicle) {
      // Actualizar vehículo existente
      const result = await updateVehicle(editingVehicle.id, formData);
      if (result.success) {
        // Actualizar lista local inmediatamente
        setVehicles(
          vehicles.map((v) =>
            v.id === editingVehicle.id ? result.data : v
          )
        );
        setIsDialogOpen(false);
      } else {
        alert("Error actualizando vehículo: " + result.error);
      }
    } else {
      // Crear nuevo vehículo
      const result = await addVehicle(formData);
      if (result.success) {
        // Agregar a la lista local inmediatamente
        setVehicles([...vehicles, result.data]);
        setIsDialogOpen(false);
      } else {
        alert("Error agregando vehículo: " + result.error);
      }
    }
  };

  /**
   * Obtiene el badge de estado con color apropiado
   */
  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      Disponible: "bg-green-100 text-green-700",
      Mantenimiento: "bg-orange-100 text-orange-700",
    };

    return (
      <Badge className={variants[status] || "bg-gray-100 text-gray-700"}>
        {status}
      </Badge>
    );
  };

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-6 h-6" />
                Gestión de Vehículos
              </CardTitle>
              <CardDescription className="text-blue-100">
                Administra la flota de vehículos para entrega de pedidos
              </CardDescription>
            </div>
            <Button 
              onClick={handleAddVehicle} 
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Vehículo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Grid de vehículos */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Cargando vehículos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <Card 
                  key={vehicle.id} 
                  className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50 overflow-hidden"
                >
                  <CardContent className="p-6 relative">
                    {/* Icono del vehículo */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg transform hover:scale-110 transition-transform duration-300">
                          <Truck className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-gray-900 mb-1">{vehicle.model}</h3>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            {vehicle.plate}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(vehicle.status)}
                    </div>

                    {/* Información del vehículo */}
                    <div className="space-y-3 text-sm mb-4 bg-white/50 backdrop-blur-sm p-4 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Conductor:</span>
                        <span className="text-gray-900">{vehicle.driver}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Capacidad:</span>
                        <span className="text-gray-900">{vehicle.capacity}</span>
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditVehicle(vehicle)}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Mensaje cuando no hay vehículos */}
          {!loading && vehicles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay vehículos registrados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* DIÁLOGO: AGREGAR/EDITAR VEHÍCULO */}
      {/* ============================================ */}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "Editar Vehículo" : "Agregar Nuevo Vehículo"}
            </DialogTitle>
            <DialogDescription>
              Complete la información del vehículo de entrega
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Placa */}
            <div className="space-y-2">
              <Label htmlFor="plate">Placa</Label>
              <Input
                id="plate"
                placeholder="Ej: MAN-001"
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                required
              />
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label htmlFor="model">Modelo del Vehículo</Label>
              <Input
                id="model"
                placeholder="Ej: Moto Honda 2001 o Camioneta Hilux 2017"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Disponible">Disponible</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conductor */}
            <div className="space-y-2">
              <Label htmlFor="driver">Conductor</Label>
              <Input
                id="driver"
                placeholder="Nombre del conductor"
                value={formData.driver}
                onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                required
              />
            </div>

            {/* Capacidad */}
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad de Carga</Label>
              <Input
                id="capacity"
                placeholder="Ej: 500 kg"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                required
              />
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1 hover:bg-gray-100 transition-all duration-300"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {editingVehicle ? "Guardar Cambios" : "Agregar Vehículo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
