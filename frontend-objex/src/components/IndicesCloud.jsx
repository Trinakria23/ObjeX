import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";

export default function IndicesCloud() {
  const [indices, setIndices] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const onDrop = (acceptedFiles) => {
    const newIndices = acceptedFiles.map((file) => ({
      id: Date.now() + Math.random(),
      type: file.type.startsWith("image") ? "image" : "file",
      name: file.name,
      file: URL.createObjectURL(file),
    }));
    setIndices((prev) => [...prev, ...newIndices]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleAddTextIndice = () => {
    if (inputValue.trim() !== "") {
      setIndices((prev) => [
        ...prev,
        { id: Date.now() + Math.random(), type: "text", name: inputValue.trim() }
      ]);
      setInputValue("");
    }
  };

  const handleRemoveIndice = (id) => {
    setIndices((prev) => prev.filter((indice) => indice.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">Ajoutez vos indices</h1>

      <div
        {...getRootProps()}
        className="w-full max-w-2xl border-4 border-dashed border-blue-400 rounded-lg p-10 mb-6 bg-white text-center cursor-pointer"
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Déposez vos fichiers ici...</p>
        ) : (
          <p>Glissez et déposez des fichiers ici ou cliquez pour sélectionner</p>
        )}
      </div>

      <div className="flex gap-4 mb-8">
        <input
          type="text"
          className="border border-gray-400 p-2 rounded w-64"
          placeholder="Ex : Radiateur Acova 1500W"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTextIndice()}
        />
        <button
          onClick={handleAddTextIndice}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          ➡️
        </button>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <AnimatePresence>
          {indices.map((indice) => (
            <motion.div
              key={indice.id}
              className="relative p-4 bg-white rounded-xl shadow-md flex flex-col items-center text-center w-32"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <button
                onClick={() => handleRemoveIndice(indice.id)}
                className="absolute top-1 right-1 text-red-500 hover:text-red-700 text-xl font-bold"
              >
                ×
              </button>

              {indice.type === "image" && (
                <img src={indice.file} alt={indice.name} className="h-16 object-cover mb-2" />
              )}
              {indice.type === "file" && (
                <div className="text-6xl">📄</div>
              )}
              {indice.type === "text" && (
                <div className="text-sm font-semibold">{indice.name}</div>
              )}
              {indice.type !== "text" && (
                <div className="text-xs mt-2">{indice.name}</div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}