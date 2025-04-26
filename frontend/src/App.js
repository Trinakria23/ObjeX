import { useState } from "react";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import IndicesCloud from "./components/IndicesCloud";

export default function App() {
  const [selectedProductId, setSelectedProductId] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-center mb-8 text-blue-700">Objex - Gestion des Objets</h1>

      <div className="max-w-6xl mx-auto">
        {selectedProductId ? (
          <ProductDetail id={selectedProductId} onBack={() => setSelectedProductId(null)} />
        ) : (
          <ProductList onSelect={setSelectedProductId} />
        )}

        <hr className="my-10" />

        <h2 className="text-2xl font-semibold mb-4 text-blue-600">Nuage d'indices</h2>
        <IndicesCloud />
      </div>
    </div>
  );
}