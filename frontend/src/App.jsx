import React from "react";
import { Routes, Route } from "react-router-dom";
import ProductList from "./components/ProductList";
import ProductDetail from "./components/ProductDetail";
import IndicesCloud from "./components/IndicesCloud";

export default function App() {

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-center mb-8 text-blue-700">
        ObjeX - Gestion des Objets
      </h1>

      <div className="max-w-6xl mx-auto">
        <Routes>
          <Route path="/" element={<>
            <ProductList />
            <hr className="my-10" />
            <h2 className="text-2xl font-semibold mb-4 text-blue-600">Nuage d'indices</h2>
            <IndicesCloud />
          </>} />

          <Route path="/product/:id" element={<>
            <ProductDetail />
            <hr className="my-10" />
            <h2 className="text-2xl font-semibold mb-4 text-blue-600">Nuage d'indices</h2>
            <IndicesCloud />
          </>} />
        </Routes>
      </div>
    </div>
  );
}