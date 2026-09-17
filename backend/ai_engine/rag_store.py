"""
RAG Store — FAISS-backed vector index for historical incident retrieval.

Stores resolved/closed incidents as 384-dim embeddings (all-MiniLM-L6-v2).
Persists to BASE_DIR/rag_data/ as two files:
  - rag_index.faiss   : the FAISS flat-L2 index
  - rag_meta.json     : parallel list of incident metadata dicts

Thread-safe: uses a module-level RLock for index writes.
"""
import json
import os
import threading
import logging

logger = logging.getLogger(__name__)

_lock = threading.RLock()
_embedder = None       # lazy-loaded SentenceTransformer
_index = None          # lazy-loaded faiss.IndexFlatL2
_meta = []             # parallel list of metadata dicts
_initialized = False

EMBED_DIM = 384        # all-MiniLM-L6-v2 output dimension


# ──────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────

def _get_paths():
    """Return (index_path, meta_path) based on Django settings."""
    from django.conf import settings
    rag_dir = getattr(settings, 'RAG_INDEX_DIR', None)
    if rag_dir is None:
        from pathlib import Path
        rag_dir = Path(__file__).resolve().parent.parent / 'rag_data'
    os.makedirs(rag_dir, exist_ok=True)
    return str(rag_dir / 'rag_index.faiss'), str(rag_dir / 'rag_meta.json')


def _load_embedder():
    global _embedder
    if _embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedder = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info('[RAG] Loaded sentence-transformers model: all-MiniLM-L6-v2')
        except ImportError:
            logger.warning('[RAG] sentence-transformers not installed — RAG disabled.')
    return _embedder


def _load_index():
    """Load or create the FAISS index and metadata from disk."""
    global _index, _meta, _initialized
    if _initialized:
        return

    try:
        import faiss
        import numpy as np
    except ImportError:
        logger.warning('[RAG] faiss-cpu not installed — RAG disabled.')
        _initialized = True
        return

    index_path, meta_path = _get_paths()

    if os.path.exists(index_path) and os.path.exists(meta_path):
        try:
            _index = faiss.read_index(index_path)
            with open(meta_path, 'r') as f:
                _meta = json.load(f)
            logger.info(f'[RAG] Loaded FAISS index with {_index.ntotal} vectors.')
        except Exception as e:
            logger.warning(f'[RAG] Failed to load existing index ({e}), creating fresh index.')
            _index = faiss.IndexFlatL2(EMBED_DIM)
            _meta = []
    else:
        _index = faiss.IndexFlatL2(EMBED_DIM)
        _meta = []
        logger.info('[RAG] Created new FAISS index.')

    _initialized = True


def _save_index():
    """Persist the current FAISS index and metadata to disk."""
    try:
        import faiss
    except ImportError:
        return
    index_path, meta_path = _get_paths()
    faiss.write_index(_index, index_path)
    with open(meta_path, 'w') as f:
        json.dump(_meta, f, indent=2)


def _is_enabled():
    from django.conf import settings
    return getattr(settings, 'RAG_ENABLED', True)


# ──────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────

def embed(text: str):
    """
    Embed a text string into a 384-dim numpy float32 vector.
    Returns None if embedder is unavailable.
    """
    embedder = _load_embedder()
    if embedder is None:
        return None
    try:
        import numpy as np
        vec = embedder.encode([text], convert_to_numpy=True).astype('float32')
        return vec  # shape (1, 384)
    except Exception as e:
        logger.warning(f'[RAG] Embedding failed: {e}')
        return None


def add_incident(incident) -> bool:
    """
    Embed a resolved/closed incident and add it to the FAISS index.
    The text used for embedding combines the ai_summary, incident_type and location.
    Returns True if successfully indexed.
    """
    if not _is_enabled():
        return False

    with _lock:
        _load_index()
        if _index is None:
            return False

        # Build a rich text blob from the incident
        text = (
            f"Incident type: {incident.incident_type}. "
            f"Location: {incident.location}. "
            f"Summary: {incident.ai_summary or ''}. "
            f"Severity factors: {', '.join(incident.severity_factors or [])}. "
            f"Spread potential: {incident.spread_potential}. "
            f"People exposed: {incident.people_exposed}. "
            f"Required capabilities: {', '.join(incident.required_capabilities or [])}."
        )

        vec = embed(text)
        if vec is None:
            return False

        _index.add(vec)
        _meta.append({
            'incident_id': incident.incident_id,
            'incident_type': incident.incident_type,
            'location': incident.location,
            'priority': incident.priority,
            'risk_score': float(incident.risk_score),
            'spread_potential': incident.spread_potential,
            'people_exposed': int(incident.people_exposed),
            'required_capabilities': list(incident.required_capabilities or []),
            'ai_summary': incident.ai_summary or '',
            'severity_factors': list(incident.severity_factors or []),
            'status': incident.status,
        })
        _save_index()
        logger.info(f'[RAG] Indexed incident {incident.incident_id} (total: {_index.ntotal})')
        return True


def search(query_text: str, k: int = None) -> list:
    """
    Find the top-K most similar past incidents to query_text.
    Returns a list of metadata dicts (empty list if unavailable).
    """
    if not _is_enabled():
        return []

    from django.conf import settings
    if k is None:
        k = getattr(settings, 'RAG_TOP_K', 3)

    with _lock:
        _load_index()
        if _index is None or _index.ntotal == 0:
            return []

        vec = embed(query_text)
        if vec is None:
            return []

        try:
            import numpy as np
            actual_k = min(k, _index.ntotal)
            distances, indices = _index.search(vec, actual_k)
            results = []
            for dist, idx in zip(distances[0], indices[0]):
                if idx < 0 or idx >= len(_meta):
                    continue
                entry = dict(_meta[idx])
                entry['similarity_distance'] = float(dist)
                results.append(entry)
            return results
        except Exception as e:
            logger.warning(f'[RAG] Search failed: {e}')
            return []


def get_index_size() -> int:
    """Return the number of incidents currently indexed in FAISS."""
    with _lock:
        _load_index()
        if _index is None:
            return 0
        return int(_index.ntotal)


def rebuild_from_db():
    """
    Wipe and rebuild the FAISS index from all RESOLVED/CLOSED incidents in DB.
    Called by the `rebuild_rag` management command.
    """
    global _index, _meta, _initialized

    try:
        import faiss
    except ImportError:
        logger.error('[RAG] faiss-cpu not installed — cannot rebuild.')
        return 0

    from incidents.models import Incident, IncidentStatus

    incidents = Incident.objects.filter(
        status__in=[IncidentStatus.RESOLVED, IncidentStatus.CLOSED]
    )

    with _lock:
        _index = faiss.IndexFlatL2(EMBED_DIM)
        _meta = []
        _initialized = True

        count = 0
        for incident in incidents:
            text = (
                f"Incident type: {incident.incident_type}. "
                f"Location: {incident.location}. "
                f"Summary: {incident.ai_summary or ''}. "
                f"Severity factors: {', '.join(incident.severity_factors or [])}. "
                f"Spread potential: {incident.spread_potential}. "
                f"People exposed: {incident.people_exposed}. "
                f"Required capabilities: {', '.join(incident.required_capabilities or [])}."
            )
            vec = embed(text)
            if vec is None:
                continue
            _index.add(vec)
            _meta.append({
                'incident_id': incident.incident_id,
                'incident_type': incident.incident_type,
                'location': incident.location,
                'priority': incident.priority,
                'risk_score': float(incident.risk_score),
                'spread_potential': incident.spread_potential,
                'people_exposed': int(incident.people_exposed),
                'required_capabilities': list(incident.required_capabilities or []),
                'ai_summary': incident.ai_summary or '',
                'severity_factors': list(incident.severity_factors or []),
                'status': incident.status,
            })
            count += 1

        _save_index()
        logger.info(f'[RAG] Rebuilt index with {count} incidents.')
        return count
