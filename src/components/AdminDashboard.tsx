import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  LogOut,
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  Truck,
} from "lucide-react";

import { OrdersManagement } from "./admin/OrdersManagement";
import { ProductsManagement } from "./admin/ProductsManagement";
import { CustomersManagement } from "./admin/CustomersManagement";
import { VehiclesManagement } from "./admin/VehiclesManagement";
import { getOrders, getProducts, getCustomers, markAllOrdersAsRead } from "../utils/supabase/api";

interface AdminDashboardProps {
  onLogout: () => void;
  onBack: () => void;
}

export function AdminDashboard({ onLogout, onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  
  // Estados para datos dinámicos
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar todos los datos
  useEffect(() => {
    loadAllData();
    
    // Actualizar cada 30 segundos para ver cambios en tiempo real
    const interval = setInterval(loadAllData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Limpiar notificaciones cuando se entre a la pestaña de pedidos
  useEffect(() => {
    if (activeTab === 'orders' && newOrdersCount > 0) {
      // Marcar todos los pedidos como leídos después de un pequeño delay
      const timer = setTimeout(() => {
        markOrdersAsRead();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [activeTab, newOrdersCount]);

  async function loadAllData() {
    try {
      console.log('📊 Cargando datos del dashboard...');
      
      const [ordersData, productsData, customersData] = await Promise.all([
        getOrders(),
        getProducts(),
        getCustomers(),
      ]);
      
      // Verificar si alguna respuesta es un error de autenticación
      if ((ordersData as any)?.code === 401 || (productsData as any)?.code === 401 || (customersData as any)?.code === 401) {
        console.error('❌ Error de autenticación detectado - token inválido');
        console.error('🚪 Cerrando sesión automáticamente...');
        alert('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
        onLogout();
        return;
      }
      
      setOrders(ordersData);
      setProducts(productsData);
      setCustomers(customersData);
      
      // Contar pedidos nuevos (solo si no estamos en la pestaña de pedidos)
      if (activeTab !== 'orders') {
        const newOrders = ordersData.filter((order: any) => order.isNew === true);
        setNewOrdersCount(newOrders.length);
      }
      
      console.log(`📊 Datos cargados: ${ordersData.length} pedidos, ${productsData.length} productos, ${customersData.length} clientes`);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
      setLoading(false);
    }
  }

  // Marcar pedidos como leídos
  async function markOrdersAsRead() {
    try {
      console.log('✅ Marcando pedidos como leídos...');
      
      // Llamar al endpoint para marcar en la BD
      const result = await markAllOrdersAsRead();
      
      if (result.success) {
        setNewOrdersCount(0);
        console.log(`✅ ${result.markedCount} pedidos marcados como leídos en la BD`);
      }
    } catch (error) {
      console.error('❌ Error marcando pedidos como leídos:', error);
    }
  }

  // Calcular estadísticas dinámicas desde los datos reales
  const pendingOrders = orders.filter(o => o.status === 'Pendiente').length;
  const todayOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });
  const todaySales = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  
  // Calcular productos más vendidos
  const productSales = orders.reduce((acc: any, order) => {
    order.items.forEach((item: any) => {
      const key = item.productName || item.name;
      if (!acc[key]) {
        acc[key] = { name: key, quantity: 0, amount: 0 };
      }
      acc[key].quantity += item.quantity;
      acc[key].amount += item.price * item.quantity;
    });
    return acc;
  }, {});
  
  const topProducts = Object.values(productSales)
    .sort((a: any, b: any) => b.quantity - a.quantity)
    .slice(0, 4);
  
  // Obtener pedidos recientes (últimas 24 horas)
  const recentOrders = orders
    .filter(o => {
      const orderDate = new Date(o.createdAt);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return orderDate >= oneDayAgo;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  // Estadísticas dinámicas
  const stats = [
    {
      title: "Ventas del Día",
      value: `C$ ${todaySales.toLocaleString()}`,
      icon: DollarSign,
      trend: `${todayOrders.length} pedidos`,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pedidos Pendientes",
      value: pendingOrders.toString(),
      icon: ShoppingCart,
      trend: newOrdersCount > 0 ? `${newOrdersCount} nuevos` : "Actualizado",
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Productos",
      value: products.length.toString(),
      icon: Package,
      trend: "En catálogo",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Clientes",
      value: customers.length.toString(),
      icon: Users,
      trend: "Registrados",
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Panel de Administración</h1>
              <p className="text-gray-600 text-sm">Lácteos Rosy - Dashboard</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Inicio
            </Button>
            <Button
              onClick={onLogout}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 max-w-4xl mx-auto bg-white/90 backdrop-blur-sm shadow-xl border border-blue-100 p-2 rounded-2xl">
            <TabsTrigger 
              value="overview" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Resumen
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="relative rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Pedidos
              {newOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse shadow-lg ring-2 ring-white">
                  {newOrdersCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Productos
            </TabsTrigger>
            <TabsTrigger 
              value="customers" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Clientes
            </TabsTrigger>
            <TabsTrigger 
              value="vehicles" 
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
            >
              Vehículos
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Cargando estadísticas...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, index) => (
                    <Card 
                      key={index} 
                      className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-blue-50"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-4 rounded-2xl ${stat.bgColor} shadow-lg transform hover:scale-110 transition-transform duration-300`}>
                            <stat.icon className={`w-7 h-7 ${stat.color}`} />
                          </div>
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{stat.title}</p>
                        <p className="text-gray-900 mb-2">{stat.value}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          {stat.trend}
                        </p>
                      </CardContent>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/20 to-transparent rounded-full -mr-16 -mt-16"></div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Productos Más Vendidos
                      </CardTitle>
                      <CardDescription className="text-purple-100">Todos los pedidos</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {topProducts.length > 0 ? (
                          topProducts.map((product: any, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="text-gray-900">{product.name}</p>
                                  <p className="text-sm text-gray-500">{product.quantity} unidades vendidas</p>
                                </div>
                              </div>
                              <p className="text-purple-600">C$ {product.amount.toLocaleString()}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-8">No hay datos de ventas aún</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Pedidos Recientes
                      </CardTitle>
                      <CardDescription className="text-blue-100">Últimas 24 horas</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        {recentOrders.length > 0 ? (
                          recentOrders.map((order: any, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                              <div>
                                <p className="text-gray-900">{order.customerName}</p>
                                <p className="text-sm text-gray-500">#{order.id.substring(0, 10)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-900 mb-1">C$ {order.total.toLocaleString()}</p>
                                <span className={`text-xs px-3 py-1 rounded-full ${
                                  order.status === "Entregado" ? "bg-green-100 text-green-700" :
                                  order.status === "En Camino" ? "bg-blue-100 text-blue-700" :
                                  order.status === "Pendiente" ? "bg-orange-100 text-orange-700" :
                                  "bg-gray-100 text-gray-700"
                                }`}>{order.status}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-8">No hay pedidos recientes</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <OrdersManagement />
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <ProductsManagement />
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <CustomersManagement />
          </TabsContent>

          {/* Vehicles Tab */}
          <TabsContent value="vehicles">
            <VehiclesManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
