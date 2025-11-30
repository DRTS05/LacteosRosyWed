// ============================================
// COMPONENTE: GESTIÓN DE PEDIDOS (ADMIN)
// ============================================
// Permite al administrador ver y gestionar todos los pedidos de clientes
// Los cambios se sincronizan automáticamente con el módulo de clientes
// Incluye filtrado, búsqueda, cambio de estado y asignación de vehículos

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
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
import { Search, Eye, CheckCircle, XCircle, Clock, Truck, MapPin, User, Phone, ShoppingCart } from "lucide-react";
import { Separator } from "../ui/separator";
import { getOrders, getVehicles, updateOrder } from "../../utils/supabase/api";

// ============================================
// INTERFACES
// ============================================

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  municipality: string;
  department: string;
  items: any[];
  subtotal: number;
  deliveryCost: number;
  total: number;
  status: "Pendiente" | "En Camino" | "Entregado" | "Cancelado";
  vehicleId?: string | null;
  createdAt: string;
  updatedAt: string;
}

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

export function OrdersManagement() {
  // ============================================
  // ESTADO DEL COMPONENTE
  // ============================================
  
  const [searchTerm, setSearchTerm] = useState(""); // Término de búsqueda
  const [filterStatus, setFilterStatus] = useState("all"); // Filtro por estado
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); // Pedido seleccionado para editar
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // Mostrar/ocultar diálogo
  const [selectedVehicle, setSelectedVehicle] = useState<string>(""); // Vehículo seleccionado
  const [selectedStatus, setSelectedStatus] = useState<Order["status"]>("Pendiente"); // Estado seleccionado
  const [orders, setOrders] = useState<Order[]>([]); // Lista de pedidos
  const [vehicles, setVehicles] = useState<Vehicle[]>([]); // Lista de vehículos
  const [loading, setLoading] = useState(true); // Estado de carga

  // ============================================
  // CARGAR DATOS DESDE EL SERVIDOR
  // ============================================
  // Se ejecuta al montar el componente y cada 5 segundos
  // para mantener sincronizado con acciones de clientes
  
  useEffect(() => {
    loadData();
    
    // Recargar datos cada 5 segundos para sincronización
    const interval = setInterval(loadData, 5000);
    
    return () => clearInterval(interval); // Limpiar intervalo al desmontar
  }, []);

  async function loadData() {
    const [ordersData, vehiclesData] = await Promise.all([
      getOrders(),
      getVehicles()
    ]);
    
    // Ordenar pedidos por fecha (más recientes primero)
    const sortedOrders = ordersData.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    setOrders(sortedOrders);
    setVehicles(vehiclesData);
    setLoading(false);
  }

  // ============================================
  // FUNCIONES DE GESTIÓN
  // ============================================

  /**
   * Genera el badge de estado con color e ícono apropiados
   */
  const getStatusBadge = (status: Order["status"]) => {
    const config = {
      "Pendiente": {
        variant: "bg-orange-100 text-orange-700",
        Icon: Clock
      },
      "En Camino": {
        variant: "bg-purple-100 text-purple-700",
        Icon: Truck
      },
      "Entregado": {
        variant: "bg-green-100 text-green-700",
        Icon: CheckCircle
      },
      "Cancelado": {
        variant: "bg-red-100 text-red-700",
        Icon: XCircle
      }
    };

    // Usar configuración por defecto si el status no existe
    const statusConfig = config[status] || {
      variant: "bg-gray-100 text-gray-700",
      Icon: Clock
    };

    const { variant, Icon } = statusConfig;

    return (
      <Badge className={`${variant} flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  /**
   * Filtra los pedidos según búsqueda y estado
   */
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm);
    
    const matchesFilter = filterStatus === "all" || order.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  /**
   * Abre el diálogo de detalles para un pedido
   */
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setSelectedStatus(order.status);
    setSelectedVehicle(order.vehicleId || "none");
    setIsDetailsOpen(true);
  };



  /**
   * Guarda los cambios del pedido (estado y vehículo)
   */
  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    
    // Si el pedido está cancelado, no permitir edición
    if (selectedOrder.status === "Cancelado") {
      alert("Este pedido fue cancelado por el cliente y no puede ser modificado.");
      return;
    }
    
    console.log('🔄 ========== ACTUALIZACIÓN DE PEDIDO ==========');
    console.log('🔄 ID del pedido:', selectedOrder.id);
    console.log('🔄 Nuevo estado:', selectedStatus);
    console.log('🔄 Nuevo vehículo:', selectedVehicle);
    console.log('🔄 Token en localStorage:', localStorage.getItem('admin_token') ? 'SÍ' : 'NO');
    
    const result = await updateOrder(selectedOrder.id, {
      status: selectedStatus,
      vehicleId: selectedVehicle === "none" ? null : selectedVehicle,
    });
    
    console.log('📦 Resultado de actualización:', result);
    
    if (result.success) {
      console.log('✅ Pedido actualizado exitosamente');
      alert('✅ Pedido actualizado exitosamente');
      
      // Actualizar lista local inmediatamente
      setOrders(
        orders.map((order) =>
          order.id === selectedOrder.id
            ? { 
                ...order, 
                status: selectedStatus, 
                vehicleId: selectedVehicle === "none" ? null : selectedVehicle 
              }
            : order
        )
      );
      setIsDetailsOpen(false);
      setSelectedOrder(null);
      
      // Recargar datos para sincronizar
      loadData();
    } else {
      console.error('❌ ========== ERROR ACTUALIZANDO PEDIDO ==========');
      console.error('❌ Error:', result.error);
      console.error('❌ Código:', result.code);
      console.error('❌ Resultado completo:', JSON.stringify(result, null, 2));
      console.error('❌ ================================================');
      
      const errorMessage = result.error || 'Error desconocido (sin mensaje del servidor)';
      
      // Verificar si es un error de autenticación o JWT inválido
      if (errorMessage.includes('token') || 
          errorMessage.includes('autenticación') || 
          errorMessage.includes('expirado') ||
          errorMessage.toLowerCase().includes('jwt') ||
          errorMessage.toLowerCase().includes('invalid') ||
          result.code === 401) {
        
        // Informar al usuario sin revelar credenciales
        if (result.shouldReload) {
          alert(
            "⚠️ SESIÓN EXPIRADA\n\n" +
            "Tu sesión ha expirado (probablemente el servidor se reinició).\n\n" +
            "Por favor, cierra sesión e inicia sesión nuevamente."
          );
        } else {
          alert(
            "⚠️ ERROR DE AUTENTICACIÓN\n\n" +
            "Tu sesión de administrador ha caducado.\n\n" +
            "Para continuar, por favor:\n" +
            "1. Cierra sesión usando el botón de logout\n" +
            "2. Vuelve a iniciar sesión\n\n" +
            "Error técnico: " + errorMessage
          );
        }
      } else {
        alert(
          "❌ ERROR AL ACTUALIZAR PEDIDO\n\n" +
          "Detalles: " + errorMessage + "\n\n" +
          "Abre la consola del navegador (F12) para ver más información técnica.\n\n" +
          "Si el problema persiste, intenta cerrar sesión y volver a iniciar sesión."
        );
      }
    }
  };

  /**
   * Obtiene la información del vehículo asignado a un pedido
   */
  const getAssignedVehicle = (vehicleId?: string | null) => {
    if (!vehicleId) return null;
    return vehicles.find((v) => v.id === vehicleId);
  };

  /**
   * Formatea la fecha para mostrarla
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-NI', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Gestión de Pedidos
          </CardTitle>
          <CardDescription className="text-blue-100">
            Administra todos los pedidos de los clientes. Los cambios se sincronizan automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Barra de búsqueda y filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar por ID, nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-6 rounded-2xl border-2 border-blue-100 focus:border-blue-400 shadow-md transition-all duration-300"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-56 py-6 rounded-2xl border-2 border-blue-100 shadow-md">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="En Camino">En Camino</SelectItem>
                <SelectItem value="Entregado">Entregado</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lista de pedidos */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Cargando pedidos...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => (
                <Card 
                  key={order.id} 
                  className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50"
                >
                  <CardContent className="p-6">
                    {/* Información principal del pedido */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-gray-900">{order.id}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-gray-600">{order.customerName}</p>
                        <p className="text-sm text-gray-500">{order.customerPhone}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {order.municipality}, {order.department}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900 mb-1">C$ {order.total.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>

                    {/* Información del vehículo asignado (si existe) */}
                    <div className="border-t pt-4">
                      {order.vehicleId && (() => {
                        const vehicle = getAssignedVehicle(order.vehicleId);
                        if (!vehicle) return null;
                        return (
                          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200 mb-4">
                            <Truck className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm text-gray-900">
                                Vehículo: {vehicle.model}
                              </p>
                              <p className="text-xs text-gray-500">
                                {vehicle.plate} - Conductor: {vehicle.driver}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Botón para ver detalles */}
                      <Button 
                        size="sm" 
                        onClick={() => handleViewDetails(order)}
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Mensaje cuando no hay pedidos */}
          {!loading && filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron pedidos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* DIÁLOGO: DETALLES DEL PEDIDO */}
      {/* ============================================ */}
      
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Pedido {selectedOrder?.id}</DialogTitle>
            <DialogDescription>
              Gestiona el estado y vehículo asignado al pedido
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Información del Cliente */}
              <div className="space-y-3">
                <h4 className="text-gray-900">Información del Cliente</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{selectedOrder.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{selectedOrder.customerPhone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-600">{selectedOrder.deliveryAddress}</p>
                      <p className="text-gray-500">
                        {selectedOrder.municipality}, {selectedOrder.department}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Productos del Pedido */}
              <div className="space-y-3">
                <h4 className="text-gray-900">Productos</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="text-sm text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500">
                          Cantidad: {item.quantity} {item.unit} × C$ {item.price}
                        </p>
                      </div>
                      <p className="text-sm text-gray-900">
                        C$ {(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  
                  {/* Resumen de totales */}
                  <div className="space-y-1 pt-3 border-t">
                    <div className="flex justify-between items-center text-sm">
                      <p className="text-gray-600">Subtotal</p>
                      <p className="text-gray-600">C$ {selectedOrder.subtotal.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <p className="text-gray-600">Costo de Entrega</p>
                      <p className="text-gray-600">C$ {selectedOrder.deliveryCost.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <p className="text-gray-900">Total</p>
                      <p className="text-gray-900">C$ {selectedOrder.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Cambiar Estado del Pedido */}
              <div className="space-y-3">
                <Label htmlFor="status">Estado del Pedido</Label>
                {selectedOrder.status === "Cancelado" ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      ⚠️ Este pedido fue cancelado por el cliente. No se puede modificar.
                    </p>
                  </div>
                ) : selectedOrder.status === "Entregado" ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      ✅ Este pedido fue marcado como entregado por el cliente. Solo el cliente puede cambiar este estado.
                    </p>
                  </div>
                ) : (
                  <Select 
                    value={selectedStatus} 
                    onValueChange={(value: Order["status"]) => setSelectedStatus(value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                      <SelectItem value="En Camino">En Camino</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Asignar Vehículo */}
              <div className="space-y-3">
                <Label htmlFor="vehicle">Vehículo Asignado</Label>
                <Select 
                  value={selectedVehicle} 
                  onValueChange={setSelectedVehicle}
                  disabled={selectedOrder.status === "Cancelado"}
                >
                  <SelectTrigger id="vehicle">
                    <SelectValue placeholder="Sin vehículo asignado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vehículo</SelectItem>
                    {vehicles
                      .filter((vehicle) => vehicle.status !== "Mantenimiento")
                      .map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.model} ({vehicle.plate})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {vehicles.filter((v) => v.status === "Mantenimiento").length > 0 && (
                  <p className="text-xs text-orange-600">
                    * Los vehículos en mantenimiento no están disponibles para asignación
                  </p>
                )}
                {selectedVehicle && selectedVehicle !== "none" && (() => {
                  const vehicle = getAssignedVehicle(selectedVehicle);
                  if (!vehicle) return null;
                  return (
                    <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                      <p className="text-sm text-gray-900">{vehicle.model}</p>
                      <p className="text-xs text-gray-500">
                        Conductor: {vehicle.driver} | Capacidad: {vehicle.capacity}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDetailsOpen(false)}
                  className="flex-1"
                >
                  Cerrar
                </Button>
                {selectedOrder.status !== "Cancelado" && selectedOrder.status !== "Entregado" && (
                  <Button 
                    type="button"
                    onClick={handleUpdateOrder}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Guardar Cambios
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}