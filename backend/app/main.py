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
import openai
import re

# App interne
from app import models, schemas, crud
from app.database import SessionLocal, engine

# ========== ENVIRONNEMENT & OPENAI ==========

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ========== INIT FASTAPI APP ==========

app = FastAPI()
models.Base.metadata.create_all(bind=engine)

# ========== CORS POLICY ==========
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "*",  # ⚠️ Optionnel pour tout autoriser, utile en dev uniquement
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

# ========== UTILS ==========

import re

def parser_reponse_ia(texte):
    titre = ""
    description = ""
    fiche_technique = ""

    try:
        titre_match = re.search(r"Titre\s*\*\*?\s*[:\-]\s*(.*)", texte, re.IGNORECASE)
        description_match = re.search(r"Description\s*\*\*?\s*[:\-]\s*(.*)", texte, re.IGNORECASE)
        fiche_match = re.search(r"Fiche Technique\s*\*\*?\s*[:\-]([\s\S]*)", texte, re.IGNORECASE)

        if titre_match:
            titre = titre_match.group(1).strip()

        if description_match:
            description = description_match.group(1).strip()

        if fiche_match:
            fiche_technique = fiche_match.group(1).strip()
        
    except Exception as e:
        print("Erreur parsing IA:", e)

    return {
        "titre": titre,
        "description": description,
        "fiche_technique": fiche_technique
    }

async def extract_text_from_pdf(content: bytes) -> str:
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

async def analyse_image_with_openai(file_content: bytes, filename: str) -> str:
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
                "Structure stricte : Titre, Description, Fiche Technique."
            ),
            model="gpt-4o",
            tools=[{"type": "code_interpreter"}]
        )

        thread = openai.beta.threads.create()

        openai.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=[
                {"type": "text", "text": "Merci d'analyser cette image industrielle."},
                {"type": "image_file", "image_file": {"file_id": uploaded_file.id}}
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

async def fusionner_et_analyser(image_texts: List[str], ocr_texts: List[str], user_texts: List[str]) -> dict:
    try:
        messages = [
            {"role": "system", "content": (
                "Tu es un expert en analyse d'objets industriels, techniques et électroniques. "
                "Structure la réponse avec **Titre**, **Description**, **Fiche Technique**."
            )}
        ]

        for text in image_texts + ocr_texts + user_texts:
            if text:
                messages.append({"role": "user", "content": text})

        print("Contenu fusionné envoyé à OpenAI :", messages)

        chat_completion = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
        )

        texte_ia = chat_completion.choices[0].message.content
        resultats_parses = parser_reponse_ia(texte_ia)

        return {
            "details": {
                "analyse_globale": texte_ia,
            },
            "title": resultats_parses["titre"],
            "description": resultats_parses["description"],
            "fiche_technique": resultats_parses["fiche_technique"]
        }

    except Exception as e:
        print("Erreur analyse fusionnée:", e)
        return {
            "details": {
                "analyse_globale": f"Erreur pendant l'analyse fusionnée : {str(e)}"
            },
            "title": "",
            "description": "",
            "fiche_technique": ""
        }

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

@app.post("/save_analysis", response_model=schemas.Product)
def save_analysis(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    return crud.create_product(db, product)

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

    fusion_result = await fusionner_et_analyser(image_texts, ocr_texts, user_texts)

    return {
        "message": "Analyse complète IA réussie ✅",
        "details": {
            "analyse_fichiers": results["analyse_fichiers"],
            "analyse_textes": results["analyse_textes"],
            "analyse_globale": fusion_result["details"]["analyse_globale"],
        },
        "title": fusion_result["title"],
        "description": fusion_result["description"],
        "fiche_technique": fusion_result["fiche_technique"]
    }