import React, { useState } from 'react';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import IndicesCloud from './components/IndicesCloud';

function App() {
  const [selectedProductId, setSelectedProductId] = useState(null);

  return (
    <div style={{ padding: 20 }}>
      <h1>Objex</h1>

      {selectedProductId ? (
        <ProductDetail
          id={selectedProductId}
          onBack={() => setSelectedProductId(null)}
        />
      ) : (
        <ProductList onSelect={setSelectedProductId} />
      )}

      <hr style={{ margin: "40px 0" }} />

      <h2>Nuage indices</h2>
      <IndicesCloud />
    </div>
  );
}

export default App;