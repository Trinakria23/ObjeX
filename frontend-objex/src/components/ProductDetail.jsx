import { useEffect, useState } from 'react';
import api from '../api';

function ProductDetail({ id, onBack }) {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    api.get(`/products/${id}`).then(res => setProduct(res.data));
  }, [id]);

  if (!product) return <p>Chargement…</p>;

  return (
    <div>
      <button onClick={onBack}>← Retour</button>
      <h2>{product.name}</h2>
      <p><strong>Marque :</strong> {product.brand}</p>
      <p>{product.description}</p>
      <p><strong>Durée de vie estimée :</strong> {product.estimated_lifespan}</p>
      <p><strong>Rappel constructeur :</strong> {product.recall_notice}</p>
    </div>
  );
}

export default ProductDetail;