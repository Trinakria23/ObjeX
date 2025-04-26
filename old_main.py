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
import requests
from bs4 import BeautifulSoup
import cv2
import numpy as np
import easyocr

from app import models, schemas, crud
from app.database import SessionLocal, engine

app = FastAPI()

reader = easyocr.Reader(['fr'], gpu=False)  # 'fr' pour le français, GPU désactivé

# 🔥 Fonction pour booster l'OCR sur les images
def preprocess_for_ocr(pil_image):
    img = np.array(pil_image)

    # Convertir en gris
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    # Améliorer contraste
    gray = cv2.equalizeHist(gray)

    # Appliquer un léger flou pour lisser les petits bruits
    blurred = cv2.GaussianBlur(gray, (3,3), 0)

    # Binarisation adaptative plus agressive
    adaptive = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        25,
        10
    )

    # Nettoyer un peu plus le bruit
    denoised = cv2.fastNlMeansDenoising(adaptive, h=20)

    return Image.fromarray(denoised)

# 🔎 Analyse des liens web
def analyse_url(url: str):
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        if soup.title and soup.title.string:
            title = soup.title.string.strip()
        else:
            title = url  # 🛡️ Fallback

        description_tag = soup.find("meta", attrs={"name": "description"})
        if description_tag and "content" in description_tag.attrs:
            description = description_tag["content"].strip()
        else:
            # Fallback premier paragraphe
            p_tag = soup.find("p")
            description = p_tag.text.strip() if p_tag else None

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

                # 🧠 On passe par EasyOCR directement
                with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_img:
                    image.save(tmp_img.name)
                    result = reader.readtext(tmp_img.name)

                extracted_text = " ".join([detection[1] for detection in result])

                print("🧠 EasyOCR:", repr(extracted_text))

                results["analyse_fichiers"].append({
                    "filename": file.filename,
                    "type": "image",
                    "extrait": extracted_text.strip() or "OCR n’a rien trouvé."
                })

                os.remove(tmp_img.name)

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
                    # OCR fallback pour PDF vides
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
            try:
                url_infos = analyse_url(text)
                results["analyse_textes"].append({
                    "type": "url",
                    "infos": url_infos
                })
            except Exception as e:
                results["analyse_textes"].append({
                    "type": "url",
                    "infos": {
                        "url": text,
                        "erreur": str(e)
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
        "message": "Analyse réussie ✅",
        "details": results
    }