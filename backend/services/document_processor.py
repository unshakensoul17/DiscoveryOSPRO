import os
import uuid
import json
from typing import List, Dict, Any

class DocumentProcessor:
    def __init__(self):
        pass

    def extract_and_chunk(self, file_path: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[Dict[str, Any]]:
        """Extract text from the file and split it into chunks with overlap."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at {file_path}")

        file_type = os.path.splitext(file_path)[1].lower()
        content = ""

        # Extract based on file type
        if file_type == ".json":
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        content = json.dumps(data, indent=2)
                    elif isinstance(data, list):
                        content = "\n".join([json.dumps(item) for item in data])
                    else:
                        content = str(data)
            except Exception as e:
                # Fallback to reading as raw text
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
        elif file_type == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(file_path)
                text_list = []
                for page in reader.pages:
                    t = page.extract_text()
                    if t:
                        text_list.append(t)
                content = "\n".join(text_list)
            except Exception:
                # Fallback to raw text read (not recommended for binary files)
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
        elif file_type == ".docx":
            try:
                import docx
                doc = docx.Document(file_path)
                content = "\n".join([p.text for p in doc.paragraphs])
            except Exception:
                # Fallback to raw text read
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
        else:
            # Treat other files as raw text
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

        if not content.strip():
            return []

        # Split into chunks
        chunks = []
        words = content.split()
        
        # Simple word-based chunking with overlap
        chunk_word_size = chunk_size // 6  # Avg word length ~ 6 chars
        overlap_word_size = chunk_overlap // 6
        
        if chunk_word_size <= 0:
            chunk_word_size = 100
        if overlap_word_size < 0:
            overlap_word_size = 20
            
        i = 0
        chunk_idx = 0
        while i < len(words):
            chunk_words = words[i : i + chunk_word_size]
            chunk_text = " ".join(chunk_words)
            
            chunks.append({
                "chunk_id": f"chunk-{chunk_idx}",
                "content": chunk_text,
                "word_count": len(chunk_words),
                "char_count": len(chunk_text)
            })
            
            chunk_idx += 1
            i += (chunk_word_size - overlap_word_size)
            if (chunk_word_size - overlap_word_size) <= 0:
                break

        return chunks
