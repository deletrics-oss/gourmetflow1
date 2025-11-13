-- Criar bucket para imagens de cardápio
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);

-- Políticas RLS para o bucket
CREATE POLICY "Permitir visualização pública de imagens"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

CREATE POLICY "Permitir upload de imagens autenticadas"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Permitir atualização de imagens autenticadas"
ON storage.objects FOR UPDATE
USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "Permitir exclusão de imagens autenticadas"
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');