import { Routes, Route } from "react-router-dom";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import IndicesCloud from "./components/IndicesCloud";

export default function App() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-blue-700">Objex - Gestion des Objets</h1>
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/indices" element={<IndicesCloud />} />
      </Routes>
    </div>
  );
}