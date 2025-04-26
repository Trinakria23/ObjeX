from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from . import models, schemas, crud
from .database import SessionLocal, engine
from fastapi.middleware.cors import CORSMiddleware

# 1️⃣ Tu crées l'app AVANT
app = FastAPI()

models.Base.metadata.create_all(bind=engine)


# 2️⃣ Puis tu ajoutes le middleware CORS
# Autorise les appels depuis localhost:5173 (Vite)
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


from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List


# 3️⃣ Puis tu crées tes routes API
# Ta route pour analyser
@app.post("/analyse")
async def analyse_indices(files: List[UploadFile] = File(default=[]), texts: List[str] = Form(default=[])):
    print("➡️ FICHIERS :", [f.filename for f in files])
    print("➡️ TEXTES :", texts)
    return {
        "message": "Analyse réussie ✅",
        "details": {
            "fichiers_reçus": [f.filename for f in files],
            "textes_reçus": texts
        }
    }