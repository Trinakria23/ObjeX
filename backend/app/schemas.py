from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProductBase(BaseModel):
    title: str
    description: Optional[str] = None
    marque: Optional[str] = None
    modele: Optional[str] = None
    puissance: Optional[str] = None
    dimensions: Optional[str] = None
    indice_ip: Optional[str] = None
    numero_serie: Optional[str] = None
    certifications: Optional[str] = None
    pays_fabrication: Optional[str] = None
    resume_ia: Optional[str] = None

    class Config:
        from_attributes = True  # (Ex orm_mode=True en V1)

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    created_at: Optional[datetime]
    