import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

export default function IndicesCloud() {
  const [indices, setIndices] = useState([]);
  const [textInput, setTextInput] = useState("");

const [analyseResult, setAnalyseResult] = useState(null);

const onDrop = (acceptedFiles) => {
  const newIndices = acceptedFiles.map((file) => {
    let category = "file";
    if (file.type.startsWith("image/")) {
      category = "image";
    } else if (file.type === "application/pdf") {
      category = "pdf";
    }

    return {
      type: category,
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random(),
      top: Math.random() * 80 + "%",
      left: Math.random() * 80 + "%",
    };
  });
  setIndices((prev) => [...prev, ...newIndices]);
};

  const handleAddText = () => {
    if (textInput.trim()) {
      const newIndex = {
        type: "text",
        content: textInput.trim(),
        id: Date.now(),
        top: Math.random() * 80 + "%",
        left: Math.random() * 80 + "%",
      };
      setIndices((prev) => [...prev, newIndex]);
      setTextInput("");
    }
  };

  const handleRemove = (id) => {
    setIndices((prev) => prev.filter((item) => item.id !== id));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const floatAnimation = {
    animate: {
      y: [0, -5, 0, 5, 0],
      x: [0, 3, 0, -3, 0],
      transition: {
        repeat: Infinity,
        duration: 6,
        ease: "easeInOut",
      },
    },
  };


const handleAnalyse = async () => {
  const formData = new FormData();

  indices.forEach((item) => {
    if (item.file) {
      formData.append("files", item.file);
    } else if (item.type === "text") {
      formData.append("texts", item.content);
    }
  });

  try {
    const response = await axios.post("http://localhost:8000/analyse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    console.log("Analyse réussie :", response.data);
    setAnalyseResult(response.data.details); // 👈 Stocke les détails ici
    alert("Analyse terminée ✅");

  } catch (error) {
    console.error("Erreur lors de l'analyse :", error);
    alert("Erreur pendant l'analyse");
  }
};

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-center">Ajoutez vos indices</h3>

      <div
        {...getRootProps()}
        className={`border-4 border-dashed p-6 rounded-xl transition duration-300 ${
          isDragActive ? "border-blue-600 bg-blue-50" : "border-blue-300 bg-white"
        } cursor-pointer text-center text-gray-600 shadow-md hover:shadow-lg`}
      >
        <input {...getInputProps()} />
        <p>Glissez et déposez des fichiers ici ou cliquez pour sélectionner</p>
      </div>

      <div className="flex gap-2 justify-center">
        <input
          type="text"
          placeholder="Ex : Radiateur Acova 1500W"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleAddText}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          ➕
        </button>
      </div>

      {/* Nuage d’indices visible dans une zone fixe */}
      <div className="relative w-full h-[300px] mt-10 bg-transparent overflow-hidden rounded-lg pointer-events-none">
        <AnimatePresence>
          {indices.map((item) => (
            <motion.div
              key={item.id}
              className="absolute px-3 py-2 rounded-lg bg-white text-blue-800 shadow-lg text-sm flex items-center gap-2 border border-blue-300"
              style={{
                top: item.top,
                left: item.left,
                zIndex: 10,
                pointerEvents: "auto",
              }}
              {...floatAnimation}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              {item.type === "text" ? (
                item.content
              ) : item.type === "image" ? (
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : item.type === "pdf" ? (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-red-600 text-2xl">📄</span>
                  <span className="text-xs">{item.file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-gray-600 text-2xl">📎</span>
                  <span className="text-xs">{item.file.name}</span>
                </div>
              )}
              <button
                onClick={() => handleRemove(item.id)}
                className="text-red-500 font-bold"
              >
                ×
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
        <div className="text-center mt-6">
          <button
            onClick={handleAnalyse}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            🧠 Analyser les indices
          </button>
        </div>

        {analyseResult && (
          <div className="mt-8 p-6 border border-green-300 bg-green-50 rounded-lg shadow-md text-green-800">
            <h4 className="text-lg font-bold mb-4">Résultat de l'analyse :</h4>

            {/* Fichiers analysés */}
            {analyseResult.analyse_fichiers && analyseResult.analyse_fichiers.length > 0 && (
              <div className="mb-6">
                <h5 className="font-semibold">Analyse des fichiers :</h5>
                <ul className="list-disc list-inside text-sm">
                  {analyseResult.analyse_fichiers.map((file, idx) => (
                    <li key={idx} className="mb-2">
                      <span className="font-semibold">{file.filename}</span> ➔ {file.extrait ? file.extrait.slice(0, 100) + "..." : "Erreur ou vide."}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Textes saisis analysés */}
            {analyseResult.analyse_textes && analyseResult.analyse_textes.length > 0 && (
              <div>
                <h5 className="font-semibold">Analyse des textes saisis :</h5>
                <ul className="list-disc list-inside text-sm">
                  {analyseResult.analyse_textes.map((text, idx) => (
                    <li key={idx}>
                      <strong>Texte :</strong> "{text.texte_original}"<br/>
                      <strong>Mots importants :</strong> {text.mots_importants.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

    </div>
  );
}