import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

export default function IndicesCloud() {
  const [indices, setIndices] = useState([]);
  const [textInput, setTextInput] = useState("");

const [loading, setLoading] = useState(false);
const [success, setSuccess] = useState(false);

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
  setLoading(true); // ➡️ Commence loading
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
    setAnalyseResult(response.data.details);
    setSuccess(true); // ✅ Affiche la validation
    setTimeout(() => setSuccess(false), 1000); // ✅ Cache la validation après 1 secondes

  } catch (error) {
    console.error("Erreur lors de l'analyse :", error);
    alert("Erreur pendant l'analyse");

  } finally {
    setLoading(false);
  }
};

const handleSaveAnalysis = async () => {
  if (!analyseResult) return;

  const dataToSave = {
    title: analyseResult.titre || "Produit analysé automatiquement",
    description: "Fiche générée à partir des indices.",
    marque: analyseResult.marque || "",
    modele: analyseResult.modele || "",
    puissance: analyseResult.puissance || "",
    dimensions: analyseResult.dimensions || "",
    indice_ip: analyseResult.indice_ip || "",
    numero_serie: analyseResult.numero_serie || "",
    certifications: analyseResult.certifications || "",
    pays_fabrication: analyseResult.pays_fabrication || "",
    resume_ia: JSON.stringify(analyseResult), // tu stockes aussi toute l'analyse brute si besoin
  };

  try {
    await axios.post("http://localhost:8000/save_analysis", dataToSave);
    alert("Analyse sauvegardée ✅");
  } catch (error) {
    console.error("Erreur sauvegarde :", error);
    alert("Erreur lors de la sauvegarde");
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


{analyseResult?.analyse_globale && (
  <motion.div 
    className="mt-8 p-6 border-2 border-blue-400 bg-blue-50 rounded-xl shadow-lg text-blue-800"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.8 }}
  >
    <h4 className="text-2xl font-bold mb-4 text-center">✨ Résumé intelligent IA ✨</h4>
    <p className="text-sm whitespace-pre-line leading-relaxed">{analyseResult.analyse_globale}</p>
  </motion.div>
)}

        {analyseResult && (
  <div className="text-center mt-6">
    <button
      onClick={handleSaveAnalysis}
      className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
    >
      💾 Sauvegarder cette analyse
    </button>
  </div>
)}

{analyseResult && (
  <motion.div 
    className="mt-8 p-6 border border-green-300 bg-green-50 rounded-lg shadow-md text-green-800"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.8 }}
  >        {/* Résultats actuels */}
    <h4 className="text-lg font-bold mb-4">Résultat de l'analyse :</h4>

    {/* Résultats des fichiers analysés */}
    {analyseResult.analyse_fichiers && analyseResult.analyse_fichiers.length > 0 && (
      <div className="mb-6">
        <h5 className="font-semibold mb-2">Analyse des fichiers :</h5>
        <ul className="list-disc list-inside text-sm space-y-2">
          {analyseResult.analyse_fichiers.map((file, idx) => (
            <li key={idx}>
              <div className="font-bold">{file.filename}</div>
              {file.analyse_ia ? (
                <p>{file.analyse_ia}</p>
              ) : file.texte_detecté ? (
                <p>{file.texte_detecté}</p>
              ) : file.extrait ? (
                <p>{file.extrait}</p>
              ) : (
                <p className="italic text-gray-500">Pas d'information disponible</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Résultats des textes saisis */}
    {analyseResult.analyse_textes && analyseResult.analyse_textes.length > 0 && (
      <div>
        <h5 className="font-semibold mb-2">Analyse des textes saisis :</h5>
        <ul className="list-disc list-inside text-sm space-y-2">
          {analyseResult.analyse_textes.map((item, idx) => (
            <li key={idx}>
              {item.type === "texte" ? (
                <>
                  <strong>Texte :</strong> "{item.texte_original}"<br/>
                  <strong>Mots importants :</strong> {item.mots_importants.join(", ")}
                </>
              ) : item.type === "url" ? (
                <>
                  <strong>Lien analysé :</strong> <a href={item.infos.url} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{item.infos.titre || item.infos.url}</a><br/>
                  <strong>Description :</strong> {item.infos.description || "Pas de description trouvée."}
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    )}
  </motion.div>
)}

{loading && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg text-center">
      <div className="mb-4 animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
      <p className="text-lg font-semibold text-gray-800">Analyse en cours...</p>
    </div>
  </div>
)}

    </div>
  );
}