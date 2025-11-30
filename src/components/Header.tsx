import { ShoppingCart, Milk, User, LogOut, History, Home } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface HeaderProps {
  cartCount: number;
  onCartClick: () => void;
  onAuthClick: () => void;
  onBack: () => void;
  onHistoryClick: () => void;
  isLoggedIn?: boolean;
  customerEmail?: string | null;
  onLogout?: () => void;
}

export function Header({ 
  cartCount, 
  onCartClick, 
  onAuthClick, 
  onBack, 
  onHistoryClick,
  isLoggedIn = false,
  customerEmail = null,
  onLogout
}: HeaderProps) {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-blue-100 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
            <Milk className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Lácteos Rosy</h2>
            <p className="text-gray-600 text-sm">Frescos y naturales</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón Volver al Inicio */}
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="hidden sm:flex hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
          >
            <Home className="w-5 h-5 mr-2" />
            Volver al Inicio
          </Button>
          
          {/* Versión móvil solo con ícono */}
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex sm:hidden hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
          >
            <Home className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className={isLoggedIn 
                  ? "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-md" 
                  : "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-md"
                }
              >
                <User className="w-5 h-5 mr-2" />
                {isLoggedIn ? 'Mi Cuenta' : 'Perfil'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isLoggedIn ? (
                <>
                  {/* Usuario logueado */}
                  {customerEmail && (
                    <div className="px-2 py-1.5 text-sm text-gray-500 border-b">
                      {customerEmail}
                    </div>
                  )}
                  <DropdownMenuItem onClick={onHistoryClick}>
                    <History className="w-4 h-4 mr-2" />
                    Historial de Pedidos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  {/* Usuario no logueado */}
                  <DropdownMenuItem onClick={onAuthClick}>
                    <User className="w-4 h-4 mr-2" />
                    Iniciar Sesión / Registrarse
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onHistoryClick} disabled>
                    <History className="w-4 h-4 mr-2" />
                    Historial (Requiere sesión)
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            onClick={onCartClick}
            className="relative bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Carrito
            {cartCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white border-2 border-white shadow-lg animate-pulse">
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}