import { ShoppingCart } from "lucide-react";
import { Product } from "../App";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-gradient-to-br from-white to-blue-50 group">
      <div className="relative h-56 overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100">
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      <div className="p-5">
        <h3 className="text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
          {product.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="bg-blue-50 px-4 py-2 rounded-xl">
            <span className="text-blue-700">C$ {product.price.toFixed(2)}</span>
            <span className="text-gray-500 text-sm ml-1">/ {product.unit}</span>
          </div>
          <Button
            size="sm"
            onClick={onAddToCart}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Agregar
          </Button>
        </div>
      </div>
    </Card>
  );
}