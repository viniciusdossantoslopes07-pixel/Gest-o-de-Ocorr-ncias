-- ============================================================
-- MIGRATION: Restringir uploads no bucket parking-docs
-- Data: 2026-09-07
-- Descrição:
--   1. Define file_size_limit para 5MB (5242880 bytes).
--   2. Restringe allowed_mime_types para PDF, JPEG, JPG e PNG.
--   3. Garante segurança no servidor sem quebrar as solicitações.
-- ============================================================

UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ]
WHERE id = 'parking-docs';
