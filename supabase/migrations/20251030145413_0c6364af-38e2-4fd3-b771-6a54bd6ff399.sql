-- Create storage bucket for assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

-- Enable public access to assets bucket
CREATE POLICY "Public access to assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'assets');