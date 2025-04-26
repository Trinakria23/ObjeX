from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from .database import Base

class ProductAnalysis(Base):
    __tablename__ = "product_analyses"

    id = Column(Integer, primary_key=True, index=True)
    image_filename = Column(String, nullable=False)
    marque = Column(String, nullable=True)
    modele = Column(String, nullable=True)
    puissance = Column(String, nullable=True)
    numero_serie = Column(String, nullable=True)
    resume_ia = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

from sqlalchemy import Column, Integer, String, Text

# ✅ Définition de ta table products
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)  # ➡️ Titre général
    description = Column(Text, nullable=True)  # ➡️ Description libre
    marque = Column(String, nullable=True)  # ➡️ Marque extraite
    modele = Column(String, nullable=True)  # ➡️ Modèle
    puissance = Column(String, nullable=True)  # ➡️ Puissance (ex : 1000W)
    dimensions = Column(String, nullable=True)  # ➡️ Dimensions (ex : 460x560x100 mm)
    indice_ip = Column(String, nullable=True)  # ➡️ IP24 par exemple
    numero_serie = Column(String, nullable=True)  # ➡️ Numéro de série
    certifications = Column(String, nullable=True)  # ➡️ CE, NF, etc.
    pays_fabrication = Column(String, nullable=True)  # ➡️ France, Chine, etc.
    resume_ia = Column(Text, nullable=True)  # ➡️ Résumé complet généré par l'IA
    created_at = Column(DateTime, default=datetime.utcnow)