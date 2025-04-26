import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

export default function ProductDetail({ id, onBack }) {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await axios.get(`http://localhost:8000/products/${id}`);
        setProduct(res.data);
      } catch (error) {
        console.error("Erreur chargement produit:", error);
      }
    }

    if (id) {
      fetchProduct();
    }
  }, [id]);

  if (!product) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-gray-600">Chargement du produit...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-3xl mx-auto p-8 bg-white shadow-lg rounded-lg mt-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <h1 className="text-3xl font-bold text-center text-blue-700 mb-6">{product.title}</h1>

      <p className="text-gray-700 text-center mb-8">{product.description}</p>

      <div className="grid grid-cols-1 gap-4 text-sm">
        <p><strong>Marque :</strong> {product.marque || "-"}</p>
        <p><strong>Modèle :</strong> {product.modele || "-"}</p>
        <p><strong>Puissance :</strong> {product.puissance || "-"}</p>
        <p><strong>Dimensions :</strong> {product.dimensions || "-"}</p>
        <p><strong>Indice IP :</strong> {product.indice_ip || "-"}</p>
        <p><strong>Numéro de série :</strong> {product.numero_serie || "-"}</p>
        <p><strong>Certifications :</strong> {product.certifications || "-"}</p>
        <p><strong>Pays de fabrication :</strong> {product.pays_fabrication || "-"}</p>
      </div>

      {product.resume_ia && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-bold mb-2 text-gray-700">Résumé IA :</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{product.resume_ia}</p>
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <button
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition"
        >
          ⬅️ Retour
        </button>
      </div>
    </motion.div>
  );
}