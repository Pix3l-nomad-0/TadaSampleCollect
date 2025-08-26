/*
  # Système d'anonymisation du stockage

  1. Nouvelles colonnes
    - `storage_uuid` dans `profiles` pour anonymiser les chemins de stockage
    - `migrated_at` pour tracker les migrations

  2. Fonctions utilitaires
    - `get_storage_uuid_by_email` : Récupérer l'UUID de stockage par email
    - `get_email_by_storage_uuid` : Récupérer l'email par UUID (pour migration)

  3. Sécurité
    - Fonctions accessibles aux utilisateurs authentifiés
    - UUID généré automatiquement pour nouveaux profils
*/

-- Ajouter les colonnes storage_uuid et migrated_at à la table profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'storage_uuid'
  ) THEN
    ALTER TABLE profiles ADD COLUMN storage_uuid uuid DEFAULT gen_random_uuid() NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'migrated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN migrated_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Créer un index sur storage_uuid pour les performances
CREATE INDEX IF NOT EXISTS idx_profiles_storage_uuid ON profiles(storage_uuid);

-- Fonction pour récupérer l'UUID de stockage par email
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

-- Fonction pour récupérer l'email par UUID de stockage (pour migration)
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

-- Générer des UUIDs pour tous les profils existants qui n'en ont pas
UPDATE profiles 
SET storage_uuid = gen_random_uuid() 
WHERE storage_uuid IS NULL;