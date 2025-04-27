import React, { useEffect, useState, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const MAX_INDICES = 6;
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const IndicesCloud = ({ selectedProduct }) => {
  const [indices, setIndices] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [analyseResult, setAnalyseResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (indices.length >= MAX_INDICES) return;
      const newIndices = acceptedFiles.map((file) => ({
        id: uuidv4(),
        type: "file",
        content: file,
        preview: URL.createObjectURL(file),
      })).slice(0, MAX_INDICES - indices.length);
      setIndices((prev) => [...prev, ...newIndices]);
    },
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg', '.gif'],
      'application/pdf': ['.pdf']
    }
  });

  useEffect(() => {
    return () => {
      indices.forEach((item) => {
        if (item.preview) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [indices]);

  const handleDeleteIndice = (id) => {
    setIndices((prev) => prev.filter((indice) => indice.id !== id));
  };

  const extraireInfos = (ficheTechnique) => {
    const lignes = ficheTechnique.split("\n").map(l => l.trim());

    const infos = {
      marque: "Non précisé",
      modele: "Non précisé",
      puissance: "Non précisé",
      dimensions: "Non précisé",
      indice_protection: "Non précisé",
      numero_serie: "Non précisé",
      certifications: "Non précisé",
      pays_fabrication: "Non précisé",
      annee_fabrication: "Non précisé",
      autres: "Non précisé"
    };

    lignes.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes("marque")) infos.marque = line.split(":")[1]?.trim() || infos.marque;
      if (lower.includes("modèle")) infos.modele = line.split(":")[1]?.trim() || infos.modele;
      if (lower.includes("puissance")) infos.puissance = line.split(":")[1]?.trim() || infos.puissance;
      if (lower.includes("dimension")) infos.dimensions = line.split(":")[1]?.trim() || infos.dimensions;
      if (lower.includes("ip")) infos.indice_protection = line.split(":")[1]?.trim() || infos.indice_protection;
      if (lower.includes("numéro de série")) infos.numero_serie = line.split(":")[1]?.trim() || infos.numero_serie;
      if (lower.includes("certifications") || lower.includes("certification")) infos.certifications = line.split(":")[1]?.trim() || infos.certifications;
      if (lower.includes("pays de fabrication")) infos.pays_fabrication = line.split(":")[1]?.trim() || infos.pays_fabrication;
      if (lower.includes("année de fabrication")) infos.annee_fabrication = line.split(":")[1]?.trim() || infos.annee_fabrication;
    });

    return infos;
  };

  const handleAnalyse = async () => {
    if (indices.length === 0 || isLoading) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      indices.forEach((indice) => {
        if (indice.type === "file") {
          formData.append("files", indice.content);
        } else {
          formData.append("texts", indice.content);
        }
      });

      const response = await axios.post(`${API_URL}/analyse`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAnalyseResult(response.data);
      console.log("analyseResult:", response.data);
      setIndices([]);
    } catch (error) {
      console.error("Erreur lors de l'analyse", error);
    }
    setIsLoading(false);
  };

  const handleAddText = () => {
    if (!textInput.trim() || indices.length >= MAX_INDICES) return;
    setIndices((prev) => [
      ...prev,
      {
        id: uuidv4(),
        type: "text",
        content: textInput.trim(),
      },
    ]);
    setTextInput("");
  };

  const handleSaveAnalysis = async () => {
    if (!analyseResult) return;

    const ficheTechnique = analyseResult.fiche_technique 
                        || analyseResult.details?.analyse_globale 
                        || "";
    const infosTechniques = extraireInfos(ficheTechnique);

    const productToSave = {
      title: analyseResult.title || "Produit sans titre",
      description: analyseResult.description || "Pas de description disponible",
      fiche_technique: ficheTechnique,
      resume_ia: analyseResult.details?.analyse_globale || "", 
      marque: infosTechniques.marque,
      modele: infosTechniques.modele,
      puissance: infosTechniques.puissance,
      dimensions: infosTechniques.dimensions,
      indice_protection: infosTechniques.indice_protection,
      numero_serie: infosTechniques.numero_serie,
      certifications: infosTechniques.certifications,
      pays_fabrication: infosTechniques.pays_fabrication,
      annee_fabrication: infosTechniques.annee_fabrication,
      autres_caracteristiques: infosTechniques.autres,
    };

    try {
      await axios.post(`${API_URL}/save_analysis`, productToSave);
      alert("Analyse sauvegardée ✅");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde", error);
      alert("Erreur lors de la sauvegarde ❌");
    }
  };

  const generatePosition = (index, total) => {
    const angle = (index / total) * 2 * Math.PI;
    const radius = 180;
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
    };
  };

  return (
    <div className="relative w-full h-[700px] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-blue-50 to-white" ref={containerRef}>

      {!analyseResult && (
        <div
          {...getRootProps()}
          className={`absolute inset-0 z-0 transition-all duration-300 ${
            isDragActive ? 'bg-blue-100 border-4 border-dashed border-blue-400' : 'bg-transparent'
          } cursor-pointer`}
        >
          <input {...getInputProps()} />
        </div>
      )}

      {!analyseResult && (
        <div className="absolute top-8 text-gray-400 text-sm z-10">
          Déposez ici ou cliquez pour ajouter un fichier indice
        </div>
      )}

      <svg className="absolute w-full h-full top-0 left-0 pointer-events-none z-0">
        {containerRef.current && indices.map((indice, idx) => {
          const { x, y } = generatePosition(idx, indices.length);
          const centerX = containerRef.current.offsetWidth / 2;
          const centerY = containerRef.current.offsetHeight / 2;
          return (
            <line
              key={"line-" + indice.id}
              x1={centerX}
              y1={centerY}
              x2={centerX + x}
              y2={centerY + y}
              stroke="#a0c4ff"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
          );
        })}
      </svg>

      <motion.div
        onClick={indices.length > 0 && !analyseResult ? handleAnalyse : undefined}
        className={`relative flex items-center justify-center rounded-full border-4 shadow-2xl transition-transform duration-300 z-10 ${
          (indices.length > 0 && !analyseResult) ? 'cursor-pointer hover:scale-105' : 'cursor-default'
        } ${isDragActive ? 'ring-4 ring-blue-300 animate-pulse' : ''} ${isLoading ? 'border-green-300 bg-green-100' : 'border-blue-300 bg-blue-100'}`}
        style={{ width: 200, height: 200 }}
        animate={{
          y: analyseResult ? -250 : 0,
          scale: analyseResult ? 1 : [1, 1.05, 1],
          x: analyseResult ? 0 : [0, 3, -3, 0],
        }}
        transition={{ duration: analyseResult ? 1 : 8, ease: "easeInOut" }}
      >
        <span className="text-center text-blue-700 px-4">
          {analyseResult?.details?.analyse_globale ? (analyseResult.title || "Objet identifié") : (indices.length > 0 ? (isLoading ? "Analyse..." : "Analyser") : "")}
        </span>
      </motion.div>

      <AnimatePresence>
        {!analyseResult && indices.map((indice, idx) => {
          const { x, y } = generatePosition(idx, indices.length);
          return (
            <motion.div
              key={indice.id}
              className="absolute w-16 h-16 rounded-full bg-white border border-blue-300 shadow-md flex items-center justify-center text-center p-1 z-10"
              style={{ top: '50%', left: '50%', transform: `translate(-50%, -50%)` }}
              animate={{
                x: [x, x + 5, x - 5, x],
                y: [y, y - 5, y + 5, y],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.5 } }}
            >
              {indice.type === "text" ? (
                <span className="text-xs text-gray-600">{indice.content}</span>
              ) : (
                <img src={indice.preview} alt="indice" className="w-12 h-12 object-cover rounded-full" />
              )}
              <button
                onClick={() => handleDeleteIndice(indice.id)}
                className="absolute top-0 right-0 text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center transform translate-x-1/2 -translate-y-1/2"
                aria-label="Supprimer indice"
              >×</button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {analyseResult?.details?.analyse_globale && (
        <div className="absolute top-[350px] flex justify-center z-10 px-4">
          <div className="bg-blue-100 text-blue-900 p-6 rounded-lg shadow text-left max-w-2xl w-full">
            <pre className="whitespace-pre-wrap">{analyseResult.details.analyse_globale}</pre>
          </div>
        </div>
      )}

      {analyseResult && (
        <div className="absolute bottom-8 flex justify-center z-10">
          <button
            onClick={handleSaveAnalysis}
            className="bg-blue-500 text-white px-6 py-3 rounded-full hover:bg-blue-600 shadow"
          >
            Sauvegarder l'analyse
          </button>
        </div>
      )}

      {!analyseResult && (
        <div className="absolute bottom-20 flex gap-2 items-center z-10">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddText();
              }
            }}
            placeholder="Ajouter un indice texte"
            className="p-2 border border-blue-300 rounded-full w-48 text-center text-sm"
          />
          <button
            onClick={handleAddText}
            disabled={!textInput.trim() || indices.length >= MAX_INDICES}
            className="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 disabled:opacity-50"
            aria-label="Ajouter texte"
          >
            ➕
          </button>
        </div>
      )}

    </div>
  );
};

export default IndicesCloud;