import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  MapPin, 
  Calendar,
  Truck
} from "lucide-react";
import { Separator } from "./ui/separator";
import { getCustomerOrders, cancelOrder, markOrderAsDelivered } from "../utils/supabase/api";

interface OrderProduct {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  products: OrderProduct[];
  total: number;
  subtotal?: number;
  deliveryCost?: number;
  status: "Pendiente" | "En Camino" | "Entregado" | "Cancelado";
  date: string;
  createdAt: string;
  address: string;
  municipality: string;
  department: string;
  vehicleName?: string;
  vehiclePlate?: string;
  vehicleType?: "Camioneta" | "Moto";
}

interface OrderHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrderHistory({ isOpen, onClose }: OrderHistoryProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const customerOrders = await getCustomerOrders();
      
      const formattedOrders = customerOrders.map((order: any) => ({
        id: order.id,
        products: order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total: order.total,
        subtotal: order.subtotal,
        deliveryCost: order.deliveryCost,
        status: order.status,
        date: new Date(order.createdAt).toLocaleDateString('es-NI', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        createdAt: order.createdAt, // Guardar createdAt para ordenamiento
        address: order.deliveryAddress,
        municipality: order.municipality,
        department: order.department,
        vehicleName: order.vehicleName,
        vehiclePlate: order.vehiclePlate,
        vehicleType: order.vehicleType,
      }));
      
      // Ordenar pedidos por fecha (más recientes primero)
      const sortedOrders = formattedOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setOrders(sortedOrders);
      setLoading(false);
    };

    if (isOpen) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Actualizar selectedOrder cuando cambian los orders
  useEffect(() => {
    if (selectedOrder && orders.length > 0) {
      const updatedOrder = orders.find(o => o.id === selectedOrder.id);
      if (updatedOrder) {
        setSelectedOrder(updatedOrder);
      }
    }
  }, [orders]);

  const getStatusBadge = (status: Order["status"]) => {
    let bgColor = "bg-orange-100";
    let textColor = "text-orange-700";
    let StatusIcon = Clock;

    if (status === "En Camino") {
      bgColor = "bg-purple-100";
      textColor = "text-purple-700";
      StatusIcon = Truck;
    } else if (status === "Entregado") {
      bgColor = "bg-green-100";
      textColor = "text-green-700";
      StatusIcon = CheckCircle;
    } else if (status === "Cancelado") {
      bgColor = "bg-red-100";
      textColor = "text-red-700";
      StatusIcon = XCircle;
    }

    return (
      <Badge className={`${bgColor} ${textColor} flex items-center gap-1 w-fit`}>
        <StatusIcon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const handleViewReceipt = (order: Order) => {
    setSelectedOrder(order);
    setIsReceiptOpen(true);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    // Buscar el pedido actualizado en la lista actual para verificar su estado real
    const currentOrder = orders.find(o => o.id === selectedOrder.id);
    
    if (!currentOrder) {
      alert("❌ No se encontró el pedido. Por favor, recarga la página.");
      setIsReceiptOpen(false);
      setSelectedOrder(null);
      return;
    }

    // Validar el estado ACTUAL del pedido (no el del snapshot)
    if (currentOrder.status !== "Pendiente" && currentOrder.status !== "En Camino") {
      alert(`❌ No se puede cancelar este pedido. El estado actual es: ${currentOrder.status}`);
      
      // Actualizar selectedOrder con los datos actuales
      setSelectedOrder(currentOrder);
      return;
    }

    if (confirm("¿Está seguro de cancelar este pedido?")) {
      setIsCancelling(true);
      const result = await cancelOrder(selectedOrder.id);
      
      if (result.success) {
        // Recargar todos los pedidos desde el servidor para tener datos frescos
        const customerOrders = await getCustomerOrders();
        
        const formattedOrders = customerOrders.map((order: any) => ({
          id: order.id,
          products: order.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          total: order.total,
          status: order.status,
          date: new Date(order.createdAt).toLocaleDateString('es-NI', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          address: order.deliveryAddress,
          municipality: order.municipality,
          department: order.department,
          vehicleName: order.vehicleName,
          vehiclePlate: order.vehiclePlate,
          vehicleType: order.vehicleType,
        }));
        
        setOrders(formattedOrders);
        setIsReceiptOpen(false);
        setSelectedOrder(null);
        alert("✅ Pedido cancelado exitosamente");
      } else {
        // Mostrar error al usuario
        alert(`❌ Error: ${result.error}`);
        
        // Recargar los pedidos para tener el estado actualizado
        const customerOrders = await getCustomerOrders();
        const formattedOrders = customerOrders.map((order: any) => ({
          id: order.id,
          products: order.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          total: order.total,
          status: order.status,
          date: new Date(order.createdAt).toLocaleDateString('es-NI', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          address: order.deliveryAddress,
          municipality: order.municipality,
          department: order.department,
          vehicleName: order.vehicleName,
          vehiclePlate: order.vehiclePlate,
          vehicleType: order.vehicleType,
        }));
        
        setOrders(formattedOrders);
        setIsReceiptOpen(false);
        setSelectedOrder(null);
      }
      setIsCancelling(false);
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!selectedOrder) {
      return;
    }

    // Buscar el pedido actualizado en la lista actual para verificar su estado real
    const currentOrder = orders.find(o => o.id === selectedOrder.id);
    
    if (!currentOrder) {
      alert("❌ No se encontró el pedido. Por favor, recarga la página.");
      setIsReceiptOpen(false);
      setSelectedOrder(null);
      return;
    }

    // Solo se pueden marcar como entregado pedidos que están "En Camino"
    if (currentOrder.status !== "En Camino") {
      alert(`❌ Solo puedes marcar como entregado pedidos que están en camino. Estado actual: ${currentOrder.status}`);
      
      // Actualizar selectedOrder con los datos actuales
      setSelectedOrder(currentOrder);
      return;
    }

    if (confirm("¿Confirmas que has recibido este pedido?")) {
      setIsDelivering(true);
      const result = await markOrderAsDelivered(selectedOrder.id);
      
      if (result.success) {
        // Recargar todos los pedidos desde el servidor para tener datos frescos
        const customerOrders = await getCustomerOrders();
        
        const formattedOrders = customerOrders.map((order: any) => ({
          id: order.id,
          products: order.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          total: order.total,
          subtotal: order.subtotal,
          deliveryCost: order.deliveryCost,
          status: order.status,
          date: new Date(order.createdAt).toLocaleDateString('es-NI', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          createdAt: order.createdAt,
          address: order.deliveryAddress,
          municipality: order.municipality,
          department: order.department,
          vehicleName: order.vehicleName,
          vehiclePlate: order.vehiclePlate,
          vehicleType: order.vehicleType,
        }));
        
        // Ordenar pedidos por fecha (más recientes primero)
        const sortedOrders = formattedOrders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setOrders(sortedOrders);
        setIsReceiptOpen(false);
        setSelectedOrder(null);
        alert("✅ Pedido marcado como entregado exitosamente. ¡Gracias por tu compra!");
      } else {
        // Mostrar error al usuario
        alert(`❌ Error: ${result.error}`);
        
        // Recargar los pedidos para tener el estado actualizado
        const customerOrders = await getCustomerOrders();
        const formattedOrders = customerOrders.map((order: any) => ({
          id: order.id,
          products: order.items.map((item: any) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          total: order.total,
          subtotal: order.subtotal,
          deliveryCost: order.deliveryCost,
          status: order.status,
          date: new Date(order.createdAt).toLocaleDateString('es-NI', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          createdAt: order.createdAt,
          address: order.deliveryAddress,
          municipality: order.municipality,
          department: order.department,
          vehicleName: order.vehicleName,
          vehiclePlate: order.vehiclePlate,
          vehicleType: order.vehicleType,
        }));
        
        const sortedOrders = formattedOrders.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setOrders(sortedOrders);
        setIsReceiptOpen(false);
        setSelectedOrder(null);
      }
      setIsDelivering(false);
    }
  };

  const canCancelOrder = (status: Order["status"]) => {
    return status === "Pendiente" || status === "En Camino";
  };

  // Verificar si el pedido seleccionado se puede cancelar usando el estado ACTUAL de orders
  const canCancelCurrentOrder = () => {
    if (!selectedOrder) return false;
    
    // Buscar el pedido en la lista actual para obtener el estado más reciente
    const currentOrder = orders.find(o => o.id === selectedOrder.id);
    if (!currentOrder) return false;
    
    return currentOrder.status === "Pendiente" || currentOrder.status === "En Camino";
  };

  // Verificar si el pedido seleccionado se puede marcar como entregado usando el estado ACTUAL de orders
  const canMarkAsDelivered = () => {
    if (!selectedOrder) return false;
    
    // Buscar el pedido en la lista actual para obtener el estado más reciente
    const currentOrder = orders.find(o => o.id === selectedOrder.id);
    if (!currentOrder) return false;
    
    return currentOrder.status === "En Camino";
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Pedidos</DialogTitle>
            <DialogDescription>
              Revisa todos tus pedidos anteriores
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Cargando...</p>
              </div>
            ) : (
              orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-gray-900">{order.id}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {order.date}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {order.municipality}, {order.department}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900 mb-1">C$ {order.total.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">
                          {order.products.length} {order.products.length === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>
                    </div>

                    {order.vehicleName && (
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-200 mb-3">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-gray-900">{order.vehicleName}</p>
                          <p className="text-xs text-gray-500">{order.vehiclePlate}</p>
                        </div>
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleViewReceipt(order)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Ver Recibo
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}

            {orders.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-gray-500">No tienes pedidos aún</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Recibo */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recibo del Pedido</DialogTitle>
            <DialogDescription>
              Detalles completos de tu pedido {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Encabezado */}
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-blue-600 mb-1">Lácteos Rosy</h3>
                <p className="text-sm text-gray-600">Frescos y naturales</p>
                <p className="text-xs text-gray-500 mt-2">{selectedOrder.date}</p>
              </div>

              {/* Estado y ID */}
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">Pedido</p>
                  <p className="text-gray-900">{selectedOrder.id}</p>
                </div>
                <div>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <Separator />

              {/* Dirección de Entrega */}
              <div>
                <p className="text-sm text-gray-900 mb-2">Dirección de Entrega</p>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-700">{selectedOrder.address}</p>
                  <p className="text-sm text-gray-500">{selectedOrder.municipality}, {selectedOrder.department}</p>
                </div>
              </div>

              {/* Vehículo */}
              {selectedOrder.vehicleName && (
                <div>
                  <p className="text-sm text-gray-900 mb-2">Vehículo de Entrega</p>
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-900">{selectedOrder.vehicleName}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.vehiclePlate} - {selectedOrder.vehicleType}</p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Productos */}
              <div>
                <p className="text-sm text-gray-900 mb-3">Productos</p>
                <div className="space-y-2">
                  {selectedOrder.products.map((product, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-900">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          {product.quantity} x C$ {product.price.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-900">
                        C$ {(product.price * product.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator className="my-3" />

                {/* Subtotal - solo mostrar si existe */}
                {selectedOrder.subtotal !== undefined && (
                  <div className="flex justify-between items-center text-sm">
                    <p className="text-gray-600">Subtotal</p>
                    <p className="text-gray-600">C$ {selectedOrder.subtotal.toFixed(2)}</p>
                  </div>
                )}
                
                {/* Costo de Entrega - solo mostrar si existe */}
                {selectedOrder.deliveryCost !== undefined && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <p className="text-gray-600">Costo de Entrega</p>
                    <p className="text-gray-600">C$ {selectedOrder.deliveryCost.toFixed(2)}</p>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t mt-2">
                  <p className="text-gray-900">Total</p>
                  <p className="text-gray-900">C$ {selectedOrder.total.toFixed(2)}</p>
                </div>
              </div>

              {/* Botones de acciones del cliente */}
              {(canMarkAsDelivered() || canCancelCurrentOrder()) && (
                <div className="pt-4 border-t space-y-3">
                  {/* Botón de Marcar como Entregado */}
                  {canMarkAsDelivered() && (
                    <div>
                      <Button
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                        onClick={handleMarkAsDelivered}
                        disabled={isDelivering}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {isDelivering ? 'Confirmando...' : 'Confirmar Entrega'}
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Marca este pedido como entregado cuando lo hayas recibido
                      </p>
                    </div>
                  )}

                  {/* Botón de Cancelar */}
                  {canCancelCurrentOrder() && (
                    <div>
                      <Button
                        variant="outline"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                        onClick={handleCancelOrder}
                        disabled={isCancelling}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {isCancelling ? 'Cancelando...' : 'Cancelar Pedido'}
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Solo puedes cancelar pedidos pendientes o en camino
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}