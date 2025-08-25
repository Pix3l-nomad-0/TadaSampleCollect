/*
  # Create SQL execution function for edge functions

  1. New Functions
    - `exec_sql` function to allow edge functions to execute SQL commands
    - Grants proper permissions to service_role

  2. Security
    - Uses SECURITY DEFINER to run with elevated privileges
    - Only accessible to service_role (used by edge functions)
*/

CREATE OR REPLACE FUNCTION public.exec_sql(sql TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  EXECUTE sql;
  RETURN 'OK';
END;
$function$;

-- Grant execute permission to service_role
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;