import React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function ProductList({ onSelect }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function fetchProducts() {
      const res = await axios.get("http://localhost:8000/products");
      setProducts(res.data);
    }
    fetchProducts();
  }, []);


  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">📦 Liste des produits analysés</h2>

      {products.length === 0 ? (
        <p className="text-gray-500">Aucun produit enregistré pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
              <Link 
                to={`/product/${product.id}`}
                onClick={() => onSelect(product.id)} // 🛠️ Important ici !!! 
                className="cursor-pointer bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition"
              >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {product.title || "Produit sans titre"}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{product.description || "Pas de description disponible."}</p>

              <ul className="text-sm text-gray-700 space-y-1">
                {product.marque && <li><strong>Marque :</strong> {product.marque}</li>}
                {product.modele && <li><strong>Modèle :</strong> {product.modele}</li>}
                {product.puissance && <li><strong>Puissance :</strong> {product.puissance}</li>}
                {product.dimensions && <li><strong>Dimensions :</strong> {product.dimensions}</li>}
                {product.indice_ip && <li><strong>Indice IP :</strong> {product.indice_ip}</li>}
                {product.numero_serie && <li><strong>Numéro de série :</strong> {product.numero_serie}</li>}
                {product.certifications && <li><strong>Certifications :</strong> {product.certifications}</li>}
                {product.pays_fabrication && <li><strong>Pays de fabrication :</strong> {product.pays_fabrication}</li>}
              </ul>

              <div className="mt-4">
                <span className="text-xs text-gray-400">ID: {product.id}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}