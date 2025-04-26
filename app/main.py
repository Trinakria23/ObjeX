# ========== IMPORTS ==========

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
import io
import time
import pdfplumber
import requests
from dotenv import load_dotenv
from openai import AsyncOpenAI

# App interne
from app import models, schemas, crud
from app.database import SessionLocal, engine

# ========== ENVIRONNEMENT & OPENAI ==========

# Chargement de la clé API
load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ========== INIT FASTAPI APP ==========

app = FastAPI()
models.Base.metadata.create_all(bind=engine)

# ========== CORS POLICY ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== BASE DB DEPENDENCY ==========

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ========== ROUTES PRODUITS EXISTANTES ==========

@app.get("/products", response_model=list[schemas.Product])
def read_products(db: Session = Depends(get_db)):
    return crud.get_products(db)

@app.post("/products", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    return crud.create_product(db, product)

@app.get("/products/{product_id}", response_model=schemas.Product)
def read_product(product_id: int, db: Session = Depends(get_db)):
    db_product = crud.get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return db_product

# Route pour sauvegarder une analyse
@app.post("/save_analysis", response_model=schemas.Product)
def save_analysis(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    return crud.create_product(db, product)

# ========== UTILS : OCR PDF SIMPLE ==========

async def extract_text_from_pdf(content: bytes) -> str:
    """
    Extraction simple du texte d'un PDF avec pdfplumber.
    """
    try:
        text_content = ""
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                if page.extract_text():
                    text_content += page.extract_text()
        return text_content.strip()
    except Exception as e:
        print("Erreur lecture PDF:", e)
        return ""

# ========== UTILS : ANALYSE D'UNE IMAGE AVEC OPENAI ASSISTANT ==========

async def analyse_image_with_openai(file_content: bytes, filename: str) -> str:
    """
    Envoie une image à l'Assistant OpenAI pour l'analyser.
    """
    try:
        uploaded_file = openai.files.create(
            file=(filename, io.BytesIO(file_content), "image/jpeg"),
            purpose="assistants"
        )

        assistant = openai.beta.assistants.create(
            name="Objex Vision Assistant",
            instructions=(
                "Tu es un expert en analyse de produits industriels. "
                "Analyse précisément les fichiers et textes fournis. "
                "Ton objectif est de produire une **fiche technique stricte et concise**, contenant uniquement les informations suivantes si disponibles :\n"
                "- **Marque**\n"
                "- **Modèle**\n"
                "- **Puissance** (en Watts, Volts, Hertz)\n"
                "- **Dimensions** (en mm)\n"
                "- **Indice de protection** (IP)\n"
                "- **Numéro de série**\n"
                "- **Certifications et Normes** (ex: CE, NF)\n"
                "- **Pays de fabrication**\n"
                "- **Autres caractéristiques techniques importantes**\n\n"
                "Structure la réponse avec des titres clairs et des listes à puces.\n"
                "NE DONNE AUCUN conseil d'utilisation, d'achat, de sécurité ou d'installation.\n"
                "NE RÉPONDS PAS par des phrases inutiles ou du texte commercial."
            ),
            model="gpt-4o",
            tools=[{"type": "code_interpreter"}]
        )

        thread = openai.beta.threads.create()

        openai.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=[
                {
                    "type": "text",
                    "text": "Merci d'analyser cette image industrielle."
                },
                {
                    "type": "image_file",
                    "image_file": {
                        "file_id": uploaded_file.id
                    }
                }
            ]
        )

        run = openai.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant.id,
        )

        while run.status not in ["completed", "failed"]:
            time.sleep(2)
            run = openai.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)

        messages = openai.beta.threads.messages.list(thread_id=thread.id)
        final_response = messages.data[0].content[0].text.value

        return final_response

    except Exception as e:
        print("Erreur analyse image:", e)
        return f"Erreur d'analyse OpenAI : {str(e)}"

# ========== UTILS : FUSIONNER ET ANALYSER TOUT (IMAGES, TEXTES, PDF) ==========

async def fusionner_et_analyser(image_texts: List[str], ocr_texts: List[str], user_texts: List[str]) -> str:
    """
    Fusionne tous les extraits d'indices pour demander une analyse globale à OpenAI.
    """
    try:
        messages = [
            {"role": "system", "content": (
                    "Tu es un expert en analyse d'objets industriels, techniques et électroniques. "
                    "À partir des données fournies (textes, photos, pdf), génère une FICHE PRODUIT structurée.\n\n"
                    "Structure ta réponse EXACTEMENT ainsi :\n"
                    "- **Titre** : Propose un titre clair et concis en moins de 100 caractères.\n"
                    "- **Description** : Rédige un résumé technique sobre (pas de blabla commercial).\n"
                    "- **Fiche Technique** : liste les caractéristiques détectées sous forme de liste à puces :\n"
                    "  - Marque\n"
                    "  - Modèle\n"
                    "  - Puissance (Watts, Volts, Hertz)\n"
                    "  - Dimensions (mm)\n"
                    "  - IP (Indice de protection)\n"
                    "  - Numéro de série\n"
                    "  - Certifications (CE, NF...)\n"
                    "  - Pays ou lieu de fabrication\n"
                    "  - Année de fabrication\n"
                    "  - Autres options spécifiques\n\n"
                    "Si une information est absente, indique 'Non précisé'.\n"
                    "NE DONNE AUCUN CONSEIL D'UTILISATION, D'ACHAT OU DE SÉCURITÉ.\n"
                    "Réponse 100% structurée et sobre."
                )}
        ]

        for text in image_texts:
            if text:
                messages.append({
                    "role": "user",
                    "content": text
                })

        for text in ocr_texts:
            if text:
                messages.append({
                    "role": "user",
                    "content": text
                })

        for text in user_texts:
            if text:
                messages.append({
                    "role": "user",
                    "content": text
                })

        print("Contenu fusionné envoyé à OpenAI :", messages)

        chat_completion = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
        )

        return chat_completion.choices[0].message.content

        import re

        def parser_reponse_ia(texte):
            titre = ""
            description = ""
            fiche_technique = ""

            titre_match = re.search(r"\*\*Titre\*\* ?: ?(.*)", texte)
            description_match = re.search(r"\*\*Description\*\* ?: ?(.*)", texte)
            fiche_match = re.search(r"\*\*Fiche Technique\*\* ?:?([\s\S]*)", texte)

            if titre_match:
                titre = titre_match.group(1).strip()

            if description_match:
                description = description_match.group(1).strip()

            if fiche_match:
                fiche_technique = fiche_match.group(1).strip()

            return {
                "titre": titre,
                "description": description,
                "fiche_technique": fiche_technique
            }


    except Exception as e:
        print("Erreur analyse fusionnée:", e)
        return "Erreur pendant l'analyse fusionnée."

# ========== ROUTE PRINCIPALE D'ANALYSE ==========

@app.post("/analyse")
async def analyse_indices(files: List[UploadFile] = File(default=[]), texts: List[str] = Form(default=[])):
    print("Fichiers reçus :", [f.filename for f in files])
    print("Textes reçus :", texts)

    results = {
        "analyse_fichiers": [],
        "analyse_textes": [],
    }

    image_texts = []
    ocr_texts = []
    user_texts = texts

    for file in files:
        content = await file.read()
        filename = file.filename.lower()

        if filename.endswith((".jpg", ".jpeg", ".png")):
            analyse_result = await analyse_image_with_openai(content, filename)
            image_texts.append(analyse_result)
            results["analyse_fichiers"].append({
                "filename": file.filename,
                "type": "image",
                "analyse_ia": analyse_result
            })

        elif filename.endswith(".pdf"):
            extracted_text = await extract_text_from_pdf(content)
            ocr_texts.append(extracted_text)
            results["analyse_fichiers"].append({
                "filename": file.filename,
                "type": "pdf",
                "texte_detecté": extracted_text
            })

    # ➡️ Analyse globale fusionnée
    texte_global = await fusionner_et_analyser(image_texts, ocr_texts, user_texts)
    results["analyse_globale"] = texte_global

    return {
        "message": "Analyse complète IA réussie ✅",
        "details": results
    }