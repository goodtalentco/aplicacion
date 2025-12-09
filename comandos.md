cd frontend
npm run dev

# Ver qué cambió
git status

# Agregar cambios
git add .

# Hacer commit
git commit -m "Agregué nueva funcionalidad de login"

# Subir a GitHub
git push

-- Solo usar si tienes problemas con dependencias:
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

supabase functions deploy extract-cedula-ocr

npx tsc --noEmit