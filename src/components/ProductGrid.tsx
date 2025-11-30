import { Product } from "../App";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const categories = Array.from(new Set(products.map((p) => p.category)));

  return (
    <div className="space-y-16">
      {categories.map((category) => (
        <div key={category}>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {category}
            </h2>
            <div className="flex-1 h-1 bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-transparent rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products
              .filter((product) => product.category === category)
              .map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() => onAddToCart(product)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
