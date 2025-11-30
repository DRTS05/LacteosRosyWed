import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { ProductGrid } from "./components/ProductGrid";
import { Cart } from "./components/Cart";
import { AuthDialog } from "./components/AuthDialog";
import { OrderHistory } from "./components/OrderHistory";
import { getProducts } from "./utils/supabase/api";

// ============================================
// INTERFACES Y TIPOS
// ============================================

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  image: string;
  category: string;
}

export interface CartItem extends Product {
  quantity: number;
}

interface CustomerAppProps {
  onBack: () => void;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function CustomerApp({ onBack }: CustomerAppProps) {
  // ============================================
  // ESTADO DEL COMPONENTE
  // ============================================
  
  const [cartItems, setCartItems] = useState<CartItem[]>([]); // Productos en el carrito
  const [isCartOpen, setIsCartOpen] = useState(false); // Mostrar/ocultar carrito
  const [isAuthOpen, setIsAuthOpen] = useState(false); // Mostrar/ocultar login
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false); // Mostrar/ocultar historial
  const [products, setProducts] = useState<Product[]>([]); // Productos del catálogo
  const [loading, setLoading] = useState(true); // Estado de carga
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Estado de sesión del cliente
  const [customerEmail, setCustomerEmail] = useState<string | null>(null); // Email del cliente logueado

  // ============================================
  // VERIFICAR SESIÓN AL CARGAR
  // ============================================
  
  useEffect(() => {
    const email = localStorage.getItem('customerEmail');
    if (email) {
      setIsLoggedIn(true);
      setCustomerEmail(email);
    }
  }, []);

  // ============================================
  // CARGAR PRODUCTOS DESDE EL SERVIDOR
  // ============================================
  // Esta función se ejecuta al montar el componente y cada 5 segundos
  // para mantener los datos sincronizados con los cambios del admin
  
  useEffect(() => {
    loadProducts();
    
    // Recargar productos cada 5 segundos para ver cambios del admin
    const interval = setInterval(loadProducts, 5000);
    
    return () => clearInterval(interval); // Limpiar intervalo al desmontar
  }, []);

  async function loadProducts() {
    const data = await getProducts();
    setProducts(data);
    setLoading(false);
  }

  // ============================================
  // FUNCIONES DEL CARRITO
  // ============================================

  /**
   * Agrega un producto al carrito
   * Si ya existe, incrementa la cantidad
   */
  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id);
      if (existingItem) {
        // Producto ya existe, incrementar cantidad
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Producto nuevo, agregar al carrito
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  /**
   * Elimina un producto del carrito
   */
  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  };

  /**
   * Actualiza la cantidad de un producto en el carrito
   * Si la cantidad es 0, elimina el producto
   */
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  // ============================================
  // CÁLCULOS DEL CARRITO
  // ============================================

  // Subtotal de productos (sin incluir envío)
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Cantidad total de productos en el carrito
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // ============================================
  // FUNCIONES DE AUTENTICACIÓN
  // ============================================

  /**
   * Maneja el login exitoso del cliente
   */
  const handleLoginSuccess = (email: string) => {
    setIsLoggedIn(true);
    setCustomerEmail(email);
    localStorage.setItem('customerEmail', email);
    setIsAuthOpen(false);
  };

  /**
   * Maneja el logout del cliente
   */
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCustomerEmail(null);
    localStorage.removeItem('customerEmail');
    setCartItems([]); // Limpiar carrito al cerrar sesión
  };

  /**
   * Maneja el intento de abrir el historial
   * Si no está logueado, abre el diálogo de login
   */
  const handleHistoryClick = () => {
    if (!isLoggedIn) {
      setIsAuthOpen(true);
    } else {
      setIsOrderHistoryOpen(true);
    }
  };

  /**
   * Maneja la creación exitosa de un pedido
   * Limpia el carrito y muestra mensaje de éxito
   */
  const handleOrderSuccess = () => {
    setCartItems([]);
    alert('¡Pedido realizado con éxito! Puedes ver tu pedido en el historial.');
  };

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header con navegación y carrito */}
      <Header
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
        onAuthClick={() => setIsAuthOpen(true)}
        onBack={onBack}
        onHistoryClick={handleHistoryClick}
        isLoggedIn={isLoggedIn}
        customerEmail={customerEmail}
        onLogout={handleLogout}
      />
      
      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Título y descripción */}
        <div className="text-center mb-16">
          <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 mb-4">
            Productos Lácteos Artesanales
          </h1>
          <p className="text-gray-700 text-lg max-w-3xl mx-auto leading-relaxed">
            Elaborados con leche fresca del día, nuestros productos mantienen la tradición y calidad que nos caracteriza
          </p>
        </div>

        {/* Grid de productos */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No hay productos disponibles en este momento.</p>
            <p className="text-sm text-gray-400">Por favor, recarga la página o contacta al administrador.</p>
          </div>
        ) : (
          <ProductGrid
            products={products}
            onAddToCart={addToCart}
          />
        )}
      </main>

      {/* Carrito de compras (panel lateral) */}
      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemove={removeFromCart}
        total={cartTotal}
        isLoggedIn={isLoggedIn}
        onLoginRequired={() => {
          setIsCartOpen(false);
          setIsAuthOpen(true);
        }}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Diálogo de autenticación/registro */}
      <AuthDialog
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Historial de pedidos del cliente */}
      <OrderHistory
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
      />
    </div>
  );
}