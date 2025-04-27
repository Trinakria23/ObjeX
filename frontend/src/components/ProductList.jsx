import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await axios.get("http://localhost:8000/products");
        setProducts(res.data);
      } catch (error) {
        console.error("Erreur chargement produits:", error);
      }
    }
    fetchProducts();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {products.map((product) => (
        <motion.div
          key={product.id}
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg cursor-pointer"
          whileHover={{ scale: 1.03 }}
        >
          <Link to={`/product/${product.id}`}>
            <h3 className="text-xl font-bold mb-2">{product.title}</h3>
            <p className="text-gray-600 text-sm">{product.description}</p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}