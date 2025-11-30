// ============================================
// COMPONENTE: GESTIÓN DE PRODUCTOS (ADMIN)
// ============================================
// Permite al administrador ver, agregar, editar y eliminar productos
// Incluye funcionalidad para subir imágenes personalizadas
// Los cambios se sincronizan automáticamente con el módulo de clientes

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
import { Plus, Edit, Trash2, Search, Upload, Loader2 } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { 
  getProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct,
  uploadProductImage 
} from "../../utils/supabase/api";

// ============================================
// INTERFACES
// ============================================

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  image: string;
  category: string;
  stock: number;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ProductsManagement() {
  // ============================================
  // ESTADO DEL COMPONENTE
  // ============================================
  
  const [searchTerm, setSearchTerm] = useState(""); // Término de búsqueda
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Mostrar/ocultar diálogo
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); // Producto en edición
  const [products, setProducts] = useState<Product[]>([]); // Lista de productos
  const [loading, setLoading] = useState(true); // Estado de carga
  const [uploading, setUploading] = useState(false); // Estado de subida de imagen
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Archivo seleccionado

  // Datos del formulario
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    unit: "lb",
    category: "Quesos",
    stock: "",
    image: "",
  });

  // ============================================
  // CARGAR PRODUCTOS DESDE EL SERVIDOR
  // ============================================
  // Se ejecuta al montar el componente y cada 5 segundos
  // para mantener sincronizado con los cambios de clientes
  
  useEffect(() => {
    loadProducts();
    
    // Recargar productos cada 5 segundos para sincronización
    const interval = setInterval(loadProducts, 5000);
    
    return () => clearInterval(interval); // Limpiar intervalo al desmontar
  }, []);

  async function loadProducts() {
    const data = await getProducts();
    setProducts(data);
    setLoading(false);
  }

  // ============================================
  // FUNCIONES DE GESTIÓN DE PRODUCTOS
  // ============================================

  /**
   * Abre el diálogo para agregar un nuevo producto
   */
  const handleAddProduct = () => {
    setEditingProduct(null);
    setSelectedFile(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      unit: "lb",
      category: "Quesos",
      stock: "",
      image: "",
    });
    setIsDialogOpen(true);
  };

  /**
   * Abre el diálogo para editar un producto existente
   */
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setSelectedFile(null);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      unit: product.unit,
      category: product.category,
      stock: product.stock.toString(),
      image: product.image,
    });
    setIsDialogOpen(true);
  };

  /**
   * Elimina un producto del catálogo
   */
  const handleDeleteProduct = async (productId: string) => {
    if (confirm("¿Está seguro de eliminar este producto?")) {
      const result = await deleteProduct(productId);
      if (result.success) {
        // Actualizar lista local inmediatamente
        setProducts(products.filter((p) => p.id !== productId));
      } else {
        alert("Error eliminando producto: " + result.error);
      }
    }
  };

  /**
   * Maneja la selección de archivo de imagen
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor seleccione un archivo de imagen válido');
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar los 5MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  /**
   * Sube la imagen seleccionada al servidor
   */
  const handleUploadImage = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    const result = await uploadProductImage(selectedFile);
    setUploading(false);
    
    if (result.success) {
      // Actualizar la URL de la imagen en el formulario
      setFormData({ ...formData, image: result.imageUrl });
      setSelectedFile(null);
      alert('✅ Imagen subida exitosamente');
    } else {
      alert('❌ Error subiendo imagen: ' + result.error);
    }
  };

  /**
   * Guarda el producto (crear nuevo o actualizar existente)
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que haya una imagen
    if (!formData.image && !editingProduct) {
      alert('Por favor suba una imagen para el producto');
      return;
    }
    
    const productData = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      unit: formData.unit,
      category: formData.category,
      stock: formData.stock,
      image: formData.image,
    };
    
    if (editingProduct) {
      // Actualizar producto existente
      const result = await updateProduct(editingProduct.id, productData);
      if (result.success) {
        // Actualizar lista local inmediatamente
        setProducts(
          products.map((p) =>
            p.id === editingProduct.id ? result.data : p
          )
        );
        setIsDialogOpen(false);
      } else {
        alert("Error actualizando producto: " + result.error);
      }
    } else {
      // Crear nuevo producto
      const result = await addProduct(productData);
      if (result.success) {
        // Agregar a la lista local inmediatamente
        setProducts([...products, result.data]);
        setIsDialogOpen(false);
      } else {
        alert("Error agregando producto: " + result.error);
      }
    }
  };

  // ============================================
  // FILTRADO DE PRODUCTOS
  // ============================================
  
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-purple-50">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-6 h-6" />
                Gestión de Productos
              </CardTitle>
              <CardDescription className="text-purple-100">
                Administra el catálogo de productos. Los cambios se reflejan automáticamente en el módulo de clientes.
              </CardDescription>
            </div>
            <Button 
              onClick={handleAddProduct} 
              className="bg-white text-purple-600 hover:bg-purple-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Barra de búsqueda */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar productos por nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-6 rounded-2xl border-2 border-purple-100 focus:border-purple-400 shadow-md transition-all duration-300"
            />
          </div>

          {/* Grid de productos */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Cargando productos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-white to-gray-50 overflow-hidden group"
                >
                  <CardContent className="p-5">
                    {/* Imagen del producto */}
                    <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-purple-100 to-pink-100 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                      <ImageWithFallback
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    
                    {/* Información del producto */}
                    <div className="mb-4">
                      <h3 className="text-gray-900 mb-2">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between text-sm mb-3 p-3 bg-purple-50 rounded-xl">
                        <span className="text-purple-700">C$ {product.price}/{product.unit}</span>
                        <span className="text-gray-700 bg-white px-3 py-1 rounded-full">Stock: {product.stock}</span>
                      </div>
                      <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full shadow-md">
                        {product.category}
                      </span>
                    </div>
                    
                    {/* Botones de acción */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Mensaje cuando no hay productos */}
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* DIÁLOGO: AGREGAR/EDITAR PRODUCTO */}
      {/* ============================================ */}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Producto" : "Agregar Nuevo Producto"}
            </DialogTitle>
            <DialogDescription>
              Complete la información del producto. Los cambios se sincronizarán automáticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre del producto */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Producto</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Precio y Unidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (C$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unidad</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lb">lb (libra)</SelectItem>
                    <SelectItem value="lt">lt (litro)</SelectItem>
                    <SelectItem value="unidad">unidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Categoría y Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quesos">Quesos</SelectItem>
                    <SelectItem value="Cuajadas">Cuajadas</SelectItem>
                    <SelectItem value="Lácteos">Lácteos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Disponible</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Subida de imagen */}
            <div className="space-y-2">
              <Label htmlFor="image">Imagen del Producto</Label>
              <div className="flex gap-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleUploadImage}
                  disabled={!selectedFile || uploading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Subir
                    </>
                  )}
                </Button>
              </div>
              {formData.image && (
                <div className="mt-2">
                  <p className="text-sm text-green-600">✓ Imagen cargada</p>
                  <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden bg-gray-100">
                    <ImageWithFallback
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                {editingProduct ? "Guardar Cambios" : "Agregar Producto"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}