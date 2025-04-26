import React from 'react';
import { useEffect, useState } from 'react';
import api from '../api';

function ProductList({ onSelect }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/products').then(res => setProducts(res.data));
  }, []);

  return (
    <div>
      <h2>Mes produits</h2>
      <ul>
        {products.map(p => (
          <li key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: 'pointer' }}>
            {p.name} – {p.brand}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProductList;