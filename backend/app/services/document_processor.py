import os
from pypdf import PdfReader
from typing import List, Dict
from app.config import settings


class DocumentProcessor:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

    def extract_text_from_pdf(self, file_path: str) -> str:
        reader = PdfReader(file_path)
        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

        return "\n\n".join(text_parts)

    def extract_text_from_txt(self, file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + chunk_size

            if end < text_len:
                sentence_end = text.rfind(".", start, end)
                if sentence_end > start:
                    end = sentence_end + 1

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            start = end - overlap

        return chunks

    async def process_file(self, file_path: str, source_name: str, doc_type: str = "user_upload") -> List[Dict]:
        ext = os.path.splitext(file_path)[1].lower()

        if ext == ".pdf":
            text = self.extract_text_from_pdf(file_path)
        elif ext in [".txt", ".md"]:
            text = self.extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        chunks = self.chunk_text(text)

        documents = []
        for i, chunk in enumerate(chunks):
            documents.append({
                "text": chunk,
                "metadata": {
                    "source": source_name,
                    "doc_type": doc_type,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
            })

        return documents

    def save_uploaded_file(self, content: bytes, filename: str) -> str:
        file_path = os.path.join(self.upload_dir, filename)
        with open(file_path, "wb") as f:
            f.write(content)
        return file_path


document_processor = DocumentProcessor()
