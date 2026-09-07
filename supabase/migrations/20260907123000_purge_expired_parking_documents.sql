-- ============================================================
-- MIGRATION: Expurgar documentos sensíveis de estacionamento (RG, CNH, CRLV)
-- Data: 2026-09-07
-- Descrição:
--   1. Função RPC para expurgar arquivos do storage 'parking-docs' e
--      limpar as colunas cnh_url, crlv_url e identidade_url de solicitações
--      analisadas há mais de 5 dias.
--   2. Verificação de segurança: impede armazenamento perpétuo de dados sensíveis.
-- ============================================================

CREATE OR REPLACE FUNCTION public.purge_expired_parking_documents()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_req RECORD;
    v_purged_count INTEGER := 0;
    v_filename TEXT;
BEGIN
    -- Permitir que esta função de limpeza exclua objetos de storage
    PERFORM set_config('storage.allow_delete_query', 'true', true);

    FOR v_req IN
        SELECT id, cnh_url, crlv_url, identidade_url
        FROM public.parking_requests
        WHERE status IN ('Aprovado', 'Rejeitado')
          AND (aprovado_em IS NOT NULL AND aprovado_em < (NOW() - INTERVAL '5 days'))
          AND (cnh_url IS NOT NULL OR crlv_url IS NOT NULL OR identidade_url IS NOT NULL)
    LOOP
        -- 1. Deletar CNH do bucket se existir
        IF v_req.cnh_url IS NOT NULL THEN
            v_filename := substring(v_req.cnh_url from '[^/?]+(?:\?[^/]*)?$');
            v_filename := split_part(v_filename, '?', 1);
            IF v_filename IS NOT NULL AND v_filename <> '' THEN
                DELETE FROM storage.objects WHERE bucket_id = 'parking-docs' AND name = v_filename;
            END IF;
        END IF;

        -- 2. Deletar CRLV do bucket se existir
        IF v_req.crlv_url IS NOT NULL THEN
            v_filename := substring(v_req.crlv_url from '[^/?]+(?:\?[^/]*)?$');
            v_filename := split_part(v_filename, '?', 1);
            IF v_filename IS NOT NULL AND v_filename <> '' THEN
                DELETE FROM storage.objects WHERE bucket_id = 'parking-docs' AND name = v_filename;
            END IF;
        END IF;

        -- 3. Deletar Identidade do bucket se existir
        IF v_req.identidade_url IS NOT NULL THEN
            v_filename := substring(v_req.identidade_url from '[^/?]+(?:\?[^/]*)?$');
            v_filename := split_part(v_filename, '?', 1);
            IF v_filename IS NOT NULL AND v_filename <> '' THEN
                DELETE FROM storage.objects WHERE bucket_id = 'parking-docs' AND name = v_filename;
            END IF;
        END IF;

        -- 4. Atualizar registro no banco limpando os links
        UPDATE public.parking_requests
        SET cnh_url = NULL,
            crlv_url = NULL,
            identidade_url = NULL
        WHERE id = v_req.id;

        v_purged_count := v_purged_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'purged_requests', v_purged_count,
        'timestamp', NOW()
    );
END;
$$;
