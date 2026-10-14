"""Retriever interface + LocalRetriever (embeddings in the DB, NumPy cosine, permission filter inside the SQL)."""
import json
from abc import ABC, abstractmethod

import numpy as np

from app.services.permissions import VIEWER_PERSON, visible_meeting_ids


class Retriever(ABC):
    @abstractmethod
    def index(self, db, kind: str, ref_id: str, text: str, owner_user_id: str | None = None, meeting_id: str | None = None): ...

    @abstractmethod
    def remove(self, db, kind: str, ref_id: str): ...

    @abstractmethod
    def search(self, db, viewer_id: str, query: str, kinds: list[str], k: int = 8) -> list[dict]: ...


class LocalRetriever(Retriever):
    KINDS = ("decision", "doc", "link", "note", "idea")

    def __init__(self, llm):
        self.llm = llm

    def index(self, db, kind, ref_id, text, owner_user_id=None, meeting_id=None):
        emb = self.llm.embed([text])[0]
        db.execute(
            "INSERT INTO search_index (kind, ref_id, owner_user_id, meeting_id, text, embedding) VALUES (?,?,?,?,?,?) "
            "ON CONFLICT(kind, ref_id) DO UPDATE SET text = excluded.text, embedding = excluded.embedding, "
            "owner_user_id = excluded.owner_user_id, meeting_id = excluded.meeting_id",
            (kind, ref_id, owner_user_id, meeting_id, text, json.dumps(emb)))

    def remove(self, db, kind, ref_id):
        db.execute("DELETE FROM search_index WHERE kind = ? AND ref_id = ?", (kind, ref_id))

    def search(self, db, viewer_id, query, kinds, k=8):
        kinds = [x for x in kinds if x in self.KINDS]
        if not kinds:
            return []
        marks = ",".join(f":k{i}" for i in range(len(kinds)))
        params = {f"k{i}": x for i, x in enumerate(kinds)}
        params["viewer_id"] = viewer_id
        # permission filter is part of the query: the model never sees a row the viewer cannot open
        sql = f"""
            SELECT si.kind, si.ref_id, si.text, si.embedding FROM search_index si
            WHERE si.kind IN ({marks}) AND (
                (si.kind IN ('note','idea','link') AND si.owner_user_id = :viewer_id)
                OR (si.kind = 'decision' AND si.meeting_id IN {visible_meeting_ids()}
                    AND EXISTS (SELECT 1 FROM decisions d WHERE d.id = si.ref_id AND d.deleted_at IS NULL AND d.status != 'DISMISSED'))
                OR (si.kind = 'doc' AND si.ref_id IN (SELECT da.document_id FROM document_acl da WHERE da.person_id = {VIEWER_PERSON}))
            )"""
        rows = db.execute(sql, params).fetchall()
        if not rows:
            return []
        q = np.array(self.llm.embed([query])[0])
        out = []
        for r in rows:
            v = np.array(json.loads(r["embedding"]))
            denom = (np.linalg.norm(q) * np.linalg.norm(v)) or 1.0
            out.append({"kind": r["kind"], "ref_id": r["ref_id"], "text": r["text"], "score": float(q @ v / denom)})
        out.sort(key=lambda x: -x["score"])
        return out[:k]
