"""
Management command: rebuild_rag
Usage: python manage.py rebuild_rag

Wipes and rebuilds the FAISS vector index from all RESOLVED/CLOSED
incidents currently in the database. Run this after initial install or
if the rag_data/ directory gets deleted/corrupted.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Rebuild the FAISS RAG index from all resolved/closed incidents in the database.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('[RAG] Starting index rebuild...'))
        try:
            from ai_engine.rag_store import rebuild_from_db
            count = rebuild_from_db()
            self.stdout.write(
                self.style.SUCCESS(f'[RAG] Done. Indexed {count} incident(s) into FAISS store.')
            )
        except ImportError as e:
            self.stderr.write(
                self.style.ERROR(
                    f'[RAG] Missing dependency: {e}\n'
                    'Run: pip install faiss-cpu sentence-transformers numpy'
                )
            )
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'[RAG] Rebuild failed: {e}'))
