from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Produit(BaseModel):
    id: int
    nom: str
    marque: str
    modele: str
    description: Optional[str] = ""
    notice_url: Optional[str] = ""
    pieces_compatibles: List[str] = []
    rappel: Optional[str] = ""

db = []

@app.get("/produits", response_model=List[Produit])
def list_produits():
    return db

@app.post("/produits", response_model=Produit)
def create_produit(produit: Produit):
    db.append(produit)
    return produit
