from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import pytesseract
from PIL import Image
import pdfplumber
import io
import os
import tempfile
import ocrmypdf

from . import models, schemas, crud
from .database import SessionLocal, engine


import requests
from bs4 import BeautifulSoup

def analyse_url(url: str):
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        title = soup.title.string.strip() if soup.title else "Pas de titre trouvé"
        
        description_tag = soup.find("meta", attrs={"name": "description"})
        description = description_tag["content"].strip() if description_tag and "content" in description_tag.attrs else "Pas de description trouvée"
        
        return {
            "url": url,
            "titre": title,
            "description": description
        }
    except Exception as e:
        return {
            "url": url,
            "erreur": str(e)
        }

app = FastAPI()

models.Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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

@app.post("/analyse")
async def analyse_indices(files: List[UploadFile] = File(default=[]), texts: List[str] = Form(default=[])):
    print("fichiers_reçus :", [f.filename for f in files])
    print("textes_reçus :", texts)

    results = {
        "analyse_fichiers": [],
        "analyse_textes": [],
    }

    for file in files:
        content = await file.read()
        filename = file.filename.lower()

        if filename.endswith((".jpg", ".jpeg", ".png")):
            try:
                image = Image.open(io.BytesIO(content))

                # 🔧 Convertir en niveaux de gris
                gray = image.convert("L")

                # 🔧 Binarisation pour améliorer le contraste
                bw = gray.point(lambda x: 0 if x < 128 else 255, '1')

                # 🔍 Lancer OCR avec un mode adapté au texte aligné (étiquette)
                ocr_result = pytesseract.image_to_string(bw, config="--psm 6")

                print("🧠 OCR:", repr(ocr_result))

                results["analyse_fichiers"].append({
                    "filename": file.filename,
                    "type": "image",
                    "extrait": ocr_result.strip() or "OCR n’a rien trouvé."
                })

            except Exception as e:
                results["analyse_fichiers"].append({
                    "filename": file.filename,
                    "type": "image",
                    "erreur": str(e)
                })

        elif filename.endswith(".pdf"):
            try:
                text_content = ""
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    for page in pdf.pages:
                        if page.extract_text():
                            text_content += page.extract_text()

                if not text_content.strip():
                    # Fallback OCR PDF
                    import tempfile, ocrmypdf, os
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_in:
                        temp_in.write(content)
                        temp_in.flush()
                        temp_out = temp_in.name.replace(".pdf", "_ocr.pdf")
                        ocrmypdf.ocr(temp_in.name, temp_out, force_ocr=True)

                        with pdfplumber.open(temp_out) as pdf_ocr:
                            for page in pdf_ocr.pages:
                                if page.extract_text():
                                    text_content += page.extract_text()

                    os.remove(temp_out)
                    os.remove(temp_in.name)

                results["analyse_fichiers"].append({
                    "filename": file.filename,
                    "type": "pdf",
                    "extrait": text_content.strip() or "OCR n'a rien trouvé."
                })

            except Exception as e:
                results["analyse_fichiers"].append({
                    "filename": file.filename,
                    "type": "pdf",
                    "erreur": str(e)
                })

    for text in texts:
        if text.startswith("http://") or text.startswith("https://"):
            # ➡️ C'est un lien web ➔ traiter comme URL
            url_infos = analyse_url(text)
            results["analyse_textes"].append({
                "type": "url",
                "infos": url_infos
            })
        else:
            # ➡️ Sinon traiter comme texte normal
            mots = text.split()
            mots_importants = [m for m in mots if len(m) > 3]
            results["analyse_textes"].append({
                "type": "texte",
                "texte_original": text,
                "mots_importants": mots_importants
            })

    return {
        "message": "Analyse réussie ✅",
        "details": results
    }