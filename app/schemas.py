from pydantic import BaseModel

class ProductBase(BaseModel):
    name: str
    brand: str
    description: str
    estimated_lifespan: str
    recall_notice: str

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    class Config:
        orm_mode = True