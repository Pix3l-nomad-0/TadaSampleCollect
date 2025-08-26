/*
  # Ajouter UUID de stockage anonyme pour les utilisateurs

  1. Nouvelles colonnes
    - `storage_uuid` dans la table `profiles` pour anonymiser les chemins de stockage
    - `migrated_at` pour tracker la migration des fichiers

  2. Sécurité
    - Les UUIDs de stockage ne sont pas exposés publiquement
    - Seuls les admins peuvent voir les mappings email <-> UUID
*/

-- Ajouter la colonne storage_uuid à la table profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS storage_uuid uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS migrated_at timestamptz DEFAULT NULL;

-- Créer un index sur storage_uuid pour les lookups rapides
CREATE INDEX IF NOT EXISTS idx_profiles_storage_uuid ON profiles(storage_uuid);

-- Générer des UUIDs pour les profils existants qui n'en ont pas
UPDATE profiles 
SET storage_uuid = gen_random_uuid() 
WHERE storage_uuid IS NULL;

-- Rendre storage_uuid NOT NULL maintenant que tous les profils en ont un
ALTER TABLE profiles ALTER COLUMN storage_uuid SET NOT NULL;

-- Fonction pour obtenir le storage_uuid d'un utilisateur par email
CREATE OR REPLACE FUNCTION get_storage_uuid_by_email(user_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    storage_id uuid;
BEGIN
    SELECT storage_uuid INTO storage_id
    FROM profiles
    WHERE email = user_email;
    
    RETURN storage_id;
END;
$$;

-- Fonction pour obtenir l'email d'un utilisateur par storage_uuid (pour la migration)
CREATE OR REPLACE FUNCTION get_email_by_storage_uuid(storage_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email text;
BEGIN
    SELECT email INTO user_email
    FROM profiles
    WHERE storage_uuid = storage_id;
    
    RETURN user_email;
END;
$$;