from pydantic import BaseModel, Field
from typing import Optional

class TestModel(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2)

try:
    print("Testing with None...")
    m = TestModel(name=None)
    print(f"Success: {m}")
except Exception as e:
    print(f"Failed with None: {e}")

try:
    print("Testing missing...")
    m = TestModel()
    print(f"Success: {m}")
except Exception as e:
    print(f"Failed missing: {e}")

try:
    print("Testing with short string...")
    m = TestModel(name="a")
    print(f"Success: {m}")
except Exception as e:
    print(f"Failed with short string: {e}")
