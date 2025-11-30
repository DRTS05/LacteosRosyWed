import { Minus, Plus, ShoppingCart, Trash2, Truck } from "lucide-react";
import { CartItem } from "../App";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { createOrder } from "../utils/supabase/api";
import { useState } from "react";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  total: number;
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  onOrderSuccess?: () => void;
}

// Costo fijo de entrega a domicilio
const DELIVERY_COST = 70;

export function Cart({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemove,
  total,
  isLoggedIn = false,
  onLoginRequired,
  onOrderSuccess,
}: CartProps) {
  // Calcular total final incluyendo el costo de entrega
  const finalTotal = items.length > 0 ? total + DELIVERY_COST : 0;

  // Estado para manejar el proceso de creación de pedido
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Tu Carrito
          </SheetTitle>
          <SheetDescription>
            Revisa tus productos antes de hacer el pedido
          </SheetDescription>
        </SheetHeader>

        {/* Carrito vacío */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <ShoppingCart className="w-16 h-16 mb-4 text-gray-300" />
            <p>Tu carrito está vacío</p>
            <p className="text-gray-400 mt-1">Agrega productos para empezar</p>
          </div>
        ) : (
          <>
            {/* Lista de productos en el carrito */}
            <div className="flex-1 overflow-y-auto py-6">
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-gray-50 rounded-lg p-3">
                    {/* Imagen del producto */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Información del producto */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-900 mb-1">{item.name}</h4>
                      <p className="text-gray-600 mb-2">
                        C$ {item.price.toFixed(2)} / {item.unit}
                      </p>

                      {/* Controles de cantidad */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity - 1)
                          }
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-gray-900 min-w-[3rem] text-center">
                          {item.quantity} {item.unit}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity + 1)
                          }
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>

                        {/* Botón para eliminar producto */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemove(item.id)}
                          className="ml-auto text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen de totales */}
            <div className="border-t pt-4">
              <div className="space-y-3 mb-6">
                {/* Subtotal de productos */}
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>C$ {total.toFixed(2)}</span>
                </div>
                
                {/* Costo de entrega */}
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Costo de Entrega
                  </span>
                  <span>C$ {DELIVERY_COST.toFixed(2)}</span>
                </div>
                
                <Separator />
                
                {/* Total final */}
                <div className="flex justify-between text-gray-900">
                  <span>Total</span>
                  <span>C$ {finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Botón de realizar pedido */}
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isCreatingOrder}
                onClick={async () => {
                  if (!isLoggedIn && onLoginRequired) {
                    onLoginRequired();
                  } else {
                    try {
                      setIsCreatingOrder(true);
                      const result = await createOrder(items, finalTotal);
                      
                      if (result.success) {
                        if (onOrderSuccess) {
                          onOrderSuccess();
                        }
                        onClose();
                      } else {
                        alert('Error al crear el pedido: ' + (result.error || 'Error desconocido'));
                      }
                    } catch (error) {
                      console.error('Error al crear el pedido:', error);
                      alert('Error al crear el pedido. Por favor intenta de nuevo.');
                    } finally {
                      setIsCreatingOrder(false);
                    }
                  }
                }}
              >
                {isCreatingOrder ? 'Procesando...' : 'Realizar Pedido'}
              </Button>
              
              {/* Nota informativa */}
              <p className="text-center text-gray-500 mt-3">
                Contáctanos para coordinar la entrega
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}