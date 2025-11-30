// ============================================
// COMPONENTE: GESTIÓN DE CLIENTES (ADMIN)
// ============================================
// Permite al administrador ver la lista de clientes registrados
// Muestra el historial completo de pedidos de cada cliente
// Los datos se sincronizan automáticamente con registros de clientes

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Search, Mail, Phone, MapPin, Eye, User, Users, Calendar, CheckCircle, XCircle, Clock, Truck, Edit, Trash2 } from "lucide-react";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";
import { getCustomers, getOrders, updateCustomer, deleteCustomer } from "../../utils/supabase/api";

// ============================================
// INTERFACES
// ============================================

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  municipality: string;
  department: string;
  registeredAt: string;
}

interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: any[];
  total: number;
  status: "Pendiente" | "Procesando" | "En Camino" | "Entregado" | "Cancelado";
  createdAt: string;
  vehicleId?: string | null;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function CustomersManagement() {
  // ============================================
  // ESTADO DEL COMPONENTE
  // ============================================
  
  const [searchTerm, setSearchTerm] = useState(""); // Término de búsqueda
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null); // Cliente seleccionado
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // Mostrar/ocultar diálogo
  const [customers, setCustomers] = useState<Customer[]>([]); // Lista de clientes
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Todos los pedidos
  const [loading, setLoading] = useState(true); // Estado de carga

  // ============================================
  // CARGAR DATOS DESDE EL SERVIDOR
  // ============================================
  // Se ejecuta al montar el componente y cada 5 segundos
  // para mantener sincronizado con nuevos registros
  
  useEffect(() => {
    loadData();
    
    // Recargar datos cada 5 segundos para sincronización
    const interval = setInterval(loadData, 5000);
    
    return () => clearInterval(interval); // Limpiar intervalo al desmontar
  }, []);

  async function loadData() {
    const [customersData, ordersData] = await Promise.all([
      getCustomers(),
      getOrders()
    ]);
    
    setCustomers(customersData);
    setAllOrders(ordersData);
    setLoading(false);
  }

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================

  /**
   * Calcula estadísticas de un cliente
   */
  const getCustomerStats = (customerId: string) => {
    const customerOrders = allOrders.filter(o => o.customerId === customerId);
    const totalOrders = customerOrders.length;
    const totalSpent = customerOrders.reduce((sum, order) => sum + order.total, 0);
    const lastOrder = customerOrders.length > 0 
      ? customerOrders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0].createdAt
      : null;
    
    return { totalOrders, totalSpent, lastOrder };
  };

  /**
   * Obtiene los pedidos de un cliente específico
   */
  const getCustomerOrders = (customerId: string) => {
    return allOrders
      .filter(o => o.customerId === customerId)
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  };

  /**
   * Genera el badge de estado con color e ícono apropiados
   */
  const getStatusBadge = (status: Order["status"]) => {
    const variants = {
      Pendiente: "bg-orange-100 text-orange-700",
      Procesando: "bg-blue-100 text-blue-700",
      "En Camino": "bg-purple-100 text-purple-700",
      Entregado: "bg-green-100 text-green-700",
      Cancelado: "bg-red-100 text-red-700",
    };

    const icons = {
      Pendiente: Clock,
      Procesando: Clock,
      "En Camino": Truck,
      Entregado: CheckCircle,
      Cancelado: XCircle,
    };

    const Icon = icons[status];

    return (
      <Badge className={`${variants[status]} flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
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

  /**
   * Filtra clientes según término de búsqueda
   */
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Abre el diálogo de detalles para un cliente
   */
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-green-50">
        <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gestión de Clientes
          </CardTitle>
          <CardDescription className="text-green-100">
            Consulta la información de clientes registrados y su historial de pedidos
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Barra de búsqueda */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar clientes por nombre, email, teléfono o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-6 rounded-2xl border-2 border-green-100 focus:border-green-400 shadow-md transition-all duration-300"
            />
          </div>

          {/* Lista de clientes */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Cargando clientes...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCustomers.map((customer) => {
                const stats = getCustomerStats(customer.id);
                return (
                  <Card 
                    key={customer.id} 
                    className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50 overflow-hidden"
                  >
                    <CardContent className="p-6">
                      {/* Información del cliente */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                          <User className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-gray-900 mb-2">{customer.name}</h3>
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg">
                              <Mail className="w-4 h-4 text-green-600" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                              <Phone className="w-4 h-4 text-blue-600" />
                              <span>{customer.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg">
                              <MapPin className="w-4 h-4 text-purple-600" />
                              <span>{customer.municipality}, {customer.department}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* Estadísticas del cliente */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gradient-to-br from-green-50 to-teal-50 p-3 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Total Pedidos</p>
                          <p className="text-gray-900">{stats.totalOrders}</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Total Gastado</p>
                          <p className="text-gray-900">C$ {stats.totalSpent.toFixed(2)}</p>
                        </div>
                      </div>

                      {stats.lastOrder && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-1">Último Pedido</p>
                          <p className="text-sm text-gray-600">{formatDate(stats.lastOrder)}</p>
                        </div>
                      )}

                      {/* Botón para ver detalles */}
                      <Button
                        size="sm"
                        onClick={() => handleViewCustomer(customer)}
                        className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Historial Completo
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Mensaje cuando no hay clientes */}
          {!loading && filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron clientes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* DIÁLOGO: DETALLES DEL CLIENTE */}
      {/* ============================================ */}
      
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Información del Cliente</DialogTitle>
            <DialogDescription>
              Detalles completos del cliente y su historial de pedidos
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* Información Personal */}
              <div className="space-y-3">
                <h4 className="text-gray-900">Datos Personales</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Nombre Completo</p>
                    <p className="text-gray-900">{selectedCustomer.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Teléfono</p>
                    <p className="text-gray-900">{selectedCustomer.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">Correo Electrónico</p>
                    <p className="text-gray-900">{selectedCustomer.email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">Dirección</p>
                    <p className="text-gray-900">{selectedCustomer.address}</p>
                    <p className="text-gray-600 mt-1">
                      {selectedCustomer.municipality}, {selectedCustomer.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Fecha de Registro</p>
                    <p className="text-gray-900">{formatDate(selectedCustomer.registeredAt)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Historial de Pedidos */}
              <div className="space-y-3">
                <h4 className="text-gray-900">Historial de Pedidos</h4>
                {(() => {
                  const customerOrders = getCustomerOrders(selectedCustomer.id);
                  
                  if (customerOrders.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Este cliente aún no ha realizado pedidos</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {customerOrders.map((order) => (
                        <Card key={order.id}>
                          <CardContent className="p-4">
                            {/* Encabezado del pedido */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-900">{order.id}</span>
                                {getStatusBadge(order.status)}
                              </div>
                              <p className="text-sm text-gray-900">C$ {order.total.toFixed(2)}</p>
                            </div>

                            {/* Productos del pedido */}
                            <div className="space-y-1 mb-3">
                              {order.items.map((item: any, idx: number) => (
                                <div key={idx} className="text-sm text-gray-600">
                                  • {item.productName} ({item.quantity} {item.unit})
                                </div>
                              ))}
                            </div>

                            {/* Fecha del pedido */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              {formatDate(order.createdAt)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {/* Resumen de estadísticas */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-blue-600 mb-1">Total de Pedidos</p>
                            <p className="text-gray-900">{customerOrders.length}</p>
                          </div>
                          <div>
                            <p className="text-blue-600 mb-1">Total Gastado</p>
                            <p className="text-gray-900">
                              C$ {customerOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Botón de cerrar */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setIsDetailsOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}