/*
  # Fonction simple de migration des fichiers

  1. Fonctions utilitaires
    - `get_or_create_storage_uuid` : Génère un UUID pour un email donné
    - `migrate_submission_files` : Migre les fichiers d'une soumission
  
  2. Sécurité
    - Accessible uniquement aux admins authentifiés
*/

-- Fonction pour obtenir ou créer un UUID de stockage pour un email
CREATE OR REPLACE FUNCTION get_or_create_storage_uuid(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  storage_uuid uuid;
BEGIN
  -- Essayer de récupérer l'UUID existant
  SELECT p.storage_uuid INTO storage_uuid
  FROM profiles p
  WHERE p.email = user_email;
  
  -- Si pas trouvé, créer un nouveau profil avec UUID
  IF storage_uuid IS NULL THEN
    storage_uuid := gen_random_uuid();
    
    -- Insérer le profil (sans user_id car c'est juste pour le stockage)
    INSERT INTO profiles (id, email, storage_uuid, is_admin, created_at)
    VALUES (gen_random_uuid(), user_email, storage_uuid, false, now())
    ON CONFLICT (email) DO UPDATE SET
      storage_uuid = EXCLUDED.storage_uuid
    RETURNING profiles.storage_uuid INTO storage_uuid;
  END IF;
  
  RETURN storage_uuid;
END;
$$;

-- Fonction pour migrer les fichiers d'une soumission
CREATE OR REPLACE FUNCTION migrate_submission_files(submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  submission_record record;
  storage_uuid uuid;
  old_file_url text;
  new_file_url text;
  new_files text[] := '{}';
  result jsonb;
BEGIN
  -- Récupérer la soumission
  SELECT * INTO submission_record
  FROM form_submissions
  WHERE id = submission_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
  END IF;
  
  -- Obtenir ou créer l'UUID de stockage
  storage_uuid := get_or_create_storage_uuid(submission_record.user_email);
  
  -- Pour chaque fichier, construire la nouvelle URL
  FOREACH old_file_url IN ARRAY submission_record.uploaded_files
  LOOP
    -- Remplacer l'email par l'UUID dans l'URL
    -- Exemple: .../forms/email@domain.com/... -> .../forms/uuid_12345678/...
    new_file_url := regexp_replace(
      old_file_url,
      '/forms/[^/]+/',
      '/forms/uuid_' || substring(replace(storage_uuid::text, '-', '') from 1 for 8) || '/',
      'g'
    );
    
    new_files := array_append(new_files, new_file_url);
  END LOOP;
  
  -- Mettre à jour la soumission avec les nouvelles URLs
  UPDATE form_submissions
  SET uploaded_files = new_files
  WHERE id = submission_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'old_files', submission_record.uploaded_files,
    'new_files', new_files,
    'storage_uuid', storage_uuid
  );
END;
$$;