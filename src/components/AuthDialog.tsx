import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { loginCustomer, registerCustomer } from "../utils/supabase/api";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (email: string) => void;
  onLogout?: () => void;
}

export function AuthDialog({ isOpen, onClose, onLoginSuccess, onLogout }: AuthDialogProps) {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    phone: "",
    domicilio: "",
    municipio: "",
    departamento: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const departamentos = [
    "Boaco",
    "Carazo",
    "Chinandega",
    "Chontales",
    "Estelí",
    "Granada",
    "Jinotega",
    "León",
    "Madriz",
    "Managua",
    "Masaya",
    "Matagalpa",
    "Nueva Segovia",
    "Río San Juan",
    "Rivas",
    "RACCS (Región Autónoma de la Costa Caribe Sur)",
    "RACCN (Región Autónoma de la Costa Caribe Norte)"
  ];



  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const result = await loginCustomer(loginData.email, loginData.password);
      
      if (result.success) {
        console.log("✅ Login exitoso");
        if (onLoginSuccess) {
          onLoginSuccess(loginData.email);
        }
        onClose();
      } else {
        setError(result.error || "Error al iniciar sesión");
      }
    } catch (err) {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que todos los campos estén completos
    if (!registerData.name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    
    if (!registerData.email.trim()) {
      setError("El correo electrónico es obligatorio");
      return;
    }
    
    if (!registerData.phone.trim()) {
      setError("El teléfono es obligatorio");
      return;
    }
    
    // Validar que el teléfono tenga exactamente 8 dígitos numéricos
    if (!/^\d{8}$/.test(registerData.phone)) {
      setError("El teléfono debe tener exactamente 8 dígitos");
      return;
    }
    
    if (!registerData.domicilio.trim()) {
      setError("El domicilio es obligatorio");
      return;
    }
    
    if (!registerData.municipio.trim()) {
      setError("El municipio es obligatorio");
      return;
    }
    
    if (!registerData.departamento) {
      setError("Debe seleccionar un departamento");
      return;
    }
    
    if (!registerData.password) {
      setError("La contraseña es obligatoria");
      return;
    }
    
    if (!registerData.confirmPassword) {
      setError("Debe confirmar la contraseña");
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const result = await registerCustomer({
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
        phone: registerData.phone,
        address: registerData.domicilio,
        municipality: registerData.municipio,
        department: registerData.departamento,
      });
      
      if (result.success) {
        console.log("✅ Registro exitoso");
        if (onLoginSuccess) {
          onLoginSuccess(registerData.email);
        }
        onClose();
      } else {
        setError(result.error || "Error al registrarse");
      }
    } catch (err) {
      setError("Error de conexión. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bienvenido a Lácteos Rosy</DialogTitle>
          <DialogDescription>
            Inicia sesión o crea una cuenta para continuar
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Registrarse</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="login-email">Correo electrónico</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="register-name">Nombre completo</Label>
                <Input
                  id="register-name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={registerData.name}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, name: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Correo electrónico</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, email: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-phone">Teléfono (8 dígitos)</Label>
                <Input
                  id="register-phone"
                  type="tel"
                  placeholder="88888888"
                  value={registerData.phone}
                  onChange={(e) => {
                    // Solo permitir números y máximo 8 dígitos
                    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setRegisterData({ ...registerData, phone: value });
                  }}
                  pattern="[0-9]{8}"
                  maxLength={8}
                  required
                  disabled={loading}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-gray-900 mb-3">Información de Domicilio</h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-domicilio">Domicilio / Dirección</Label>
                    <Input
                      id="register-domicilio"
                      type="text"
                      placeholder="Ej: De la rotonda 2 cuadras al sur"
                      value={registerData.domicilio}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, domicilio: e.target.value })
                      }
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-municipio">Municipio</Label>
                    <Input
                      id="register-municipio"
                      type="text"
                      placeholder="Ej: Managua"
                      value={registerData.municipio}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, municipio: e.target.value })
                      }
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-departamento">Departamento</Label>
                    <Select
                      value={registerData.departamento}
                      onValueChange={(value) =>
                        setRegisterData({ ...registerData, departamento: value })
                      }
                      required
                      disabled={loading}
                    >
                      <SelectTrigger id="register-departamento">
                        <SelectValue placeholder="Seleccione un departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-gray-900 mb-3">Seguridad</h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Contraseña</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, password: e.target.value })
                      }
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Confirmar contraseña</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        setRegisterData({
                          ...registerData,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? "Creando cuenta..." : "Crear Cuenta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}