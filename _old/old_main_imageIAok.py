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
import openai

from app import models, schemas, crud
from app.database import SessionLocal, engine

from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import SessionLocal

# ➡️ Fonction pour récupérer une session DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ========== CHARGEMENT ENVIRONNEMENT ==========
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# ========== INIT APP ==========
app = FastAPI()
models.Base.metadata.create_all(bind=engine)

# ========== CORS ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Nouvelle route API
from app.schemas import ProductCreate, Product
from app import crud

@app.post("/save_analysis", response_model=Product)
def save_analysis(product: ProductCreate, db: Session = Depends(get_db)):
    return crud.create_product(db=db, product=product)

# ========== DATABASE ==========
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ========== ROUTES PRODUITS ==========
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

# ========== FONCTION D'ANALYSE AVEC ASSISTANT GPT-4o ==========
async def analyse_image_with_openai(file_content: bytes, filename: str):
    try:
        # 1️⃣ Upload du fichier image vers OpenAI
        uploaded_file = openai.files.create(
            file=(filename, io.BytesIO(file_content), "image/jpeg"),
            purpose="assistants"
        )
        
        # 2️⃣ Créer un assistant temporaire
        assistant = openai.beta.assistants.create(
            name="Objex Vision Assistant",
            instructions=(
                "Tu es un expert en analyse d'images techniques et industrielles. "
                "Ton rôle est de : "
                "1. Lire attentivement TOUT le texte visible, même petit ou flou. "
                "2. Décrire les éléments visuels (logos, pictogrammes, schémas, étiquettes). "
                "3. Extraire toutes les informations suivantes si possible : "
                "- Marque "
                "- Modèle "
                "- Puissance (Watts, Volts) "
                "- Année de fabrication "
                "- Numéro de série "
                "4. Résumer toute instruction ou caractéristique technique visible. "
                "5. Si aucune information utile n'est trouvée, répondre : 'Aucune information exploitable trouvée.' "
                "Réponds de manière claire et organisée."
            ),
            model="gpt-4o",
            tools=[{"type": "code_interpreter"}]
        )

        # 3️⃣ Créer un thread de conversation
        thread = openai.beta.threads.create()

        # 4️⃣ Envoyer un message au thread avec le fichier
        openai.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=[
                {
                    "type": "text",
                    "text": "Merci d'analyser cette image et d'extraire toutes les informations utiles."
                },
                {
                    "type": "image_file",
                    "image_file": {
                        "file_id": uploaded_file.id
                    }
                }
            ]
        )

        # 5️⃣ Lancer une run
        run = openai.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant.id,
        )

        # 6️⃣ Attendre que l'IA ait fini
        while run.status not in ["completed", "failed"]:
            time.sleep(2)
            run = openai.beta.threads.runs.retrieve(
                thread_id=thread.id,
                run_id=run.id
            )

        # 7️⃣ Récupérer la réponse
        messages = openai.beta.threads.messages.list(thread_id=thread.id)
        final_response = messages.data[0].content[0].text.value

        return final_response

    except Exception as e:
        return f"Erreur d'analyse OpenAI : {str(e)}"

# ========== ROUTE D'ANALYSE ==========
@app.post("/analyse")
async def analyse_indices(files: List[UploadFile] = File(default=[]), texts: List[str] = Form(default=[])):
    print("Fichiers reçus :", [f.filename for f in files])
    print("Textes reçus :", texts)

    results = {
        "analyse_fichiers": [],
        "analyse_textes": [],
    }

    for file in files:
        content = await file.read()
        filename = file.filename.lower()

        if filename.endswith((".jpg", ".jpeg", ".png")):
            # 📸 Envoyer l'image à l'Assistant pour analyse IA
            analyse_result = await analyse_image_with_openai(content, filename)

            results["analyse_fichiers"].append({
                "filename": file.filename,
                "type": "image",
                "analyse_ia": analyse_result
            })

        elif filename.endswith(".pdf"):
            try:
                text_content = ""
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    for page in pdf.pages:
                        if page.extract_text():
                            text_content += page.extract_text()

                results["analyse_fichiers"].append({
                    "filename": file.filename,
                    "type": "pdf",
                    "texte_detecté": text_content.strip()
                })

            except Exception as e:
                results["analyse_fichiers"].append({
                    "filename": file.filename,
                    "type": "pdf",
                    "erreur": str(e)
                })

    for text in texts:
        if text.startswith("http://") or text.startswith("https://"):
            results["analyse_textes"].append({
                "type": "url",
                "infos": {
                    "url": text
                }
            })
        else:
            mots = text.split()
            mots_importants = [m for m in mots if len(m) > 3]
            results["analyse_textes"].append({
                "type": "texte",
                "texte_original": text,
                "mots_importants": mots_importants
            })

    return {
        "message": "Analyse complète par IA ✅",
        "details": results
    }