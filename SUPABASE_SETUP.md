# Guía de Configuración de Base de Datos con Supabase · Wiki UTOM

**Supabase es la mejor opción técnica y operativa para Wiki UTOM** debido a:
1. **Autenticación nativa lista para usar**: Permite registrar usuarios con correo `@utom.edu.mx`, gestión de sesiones segura con cookies para Next.js (`@supabase/ssr`) y recuperación de contraseña sin configurar servidores SMTP propios.
2. **PostgreSQL Relacional**: Es ideal para modelar la relación entre estudiantes, las 4 carreras oficiales (**Gastronomía, Biotecnología, Mercadotecnia y TI**), publicaciones, comentarios y votos.
3. **Row Level Security (RLS)**: Las reglas de seguridad se ejecutan a nivel de base de datos, garantizando que solo el autor pueda editar sus publicaciones y previniendo votos duplicados.
4. **Storage Integrado**: Incluye almacenamiento tipo S3 para subir archivos PDF (guías de estudio) e imágenes de los hilos.
5. **Realtime**: Permite escuchar nuevos comentarios y votos en vivo fácilmente.

---

## 1. Crear el Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com/) e inicia sesión.
2. Haz clic en **"New Project"**.
3. Asigna un nombre (ej. `wiki-utom`) y una contraseña segura para la base de datos.
4. Selecciona la región más cercana (ej. `us-east-1` o `us-west-1`).

---

## 2. Variables de Entorno en Next.js

Crea o edita tu archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

*(Encuentra estos valores en Supabase -> Project Settings -> API)*.

---

## 3. Script SQL Completo (Copiar y Pegar en el SQL Editor de Supabase)

Entra en tu proyecto de Supabase, ve a la pestaña **SQL Editor** (ícono de consola SQL en la barra lateral izquierda), pega el siguiente script completo y haz clic en **Run**:

```sql
-- ====================================================================
-- 1. TIPOS Y ENUMS
-- ====================================================================

-- Definición de las 4 carreras oficiales de la UTOM
CREATE TYPE public.carrera_utom AS ENUM (
  'TI',
  'Biotecnología',
  'Mercadotecnia',
  'Gastronomía'
);

-- ====================================================================
-- 2. TABLA DE PERFILES DE USUARIO (Sincronizada con auth.users)
-- ====================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  initials VARCHAR(4) NOT NULL,
  career public.carrera_utom NOT NULL,
  student_id TEXT, -- Matrícula opcional
  avatar_url TEXT,
  role TEXT DEFAULT 'Estudiante UTOM',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ====================================================================
-- 3. TABLA DE HILOS / PUBLICACIONES
-- ====================================================================

CREATE TABLE public.threads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  career public.carrera_utom NOT NULL,
  category TEXT NOT NULL, -- 'TI', 'Biotecnología', 'Mercadotecnia', 'Gastronomía', 'Convocatorias', 'Preguntas Frecuentes'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size TEXT,
  is_official BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0 NOT NULL,
  replies_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ====================================================================
-- 4. TABLA DE COMENTARIOS
-- ====================================================================

CREATE TABLE public.comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ====================================================================
-- 5. TABLA DE VOTOS (Evita votos duplicados por usuario)
-- ====================================================================

CREATE TABLE public.thread_votes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)), -- 1 = Upvote, -1 = Downvote
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT unique_user_thread_vote UNIQUE (thread_id, user_id)
);

-- ====================================================================
-- 6. TABLA DE HILOS GUARDADOS / FAVORITOS
-- ====================================================================

CREATE TABLE public.saved_threads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id BIGINT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT unique_user_saved_thread UNIQUE (thread_id, user_id)
);

-- ====================================================================
-- 7. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ====================================================================

-- Función para recalcular automáticamente el score de un hilo
CREATE OR REPLACE FUNCTION public.update_thread_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.threads
  SET score = COALESCE((
    SELECT SUM(vote_type) 
    FROM public.thread_votes 
    WHERE thread_id = COALESCE(NEW.thread_id, OLD.thread_id)
  ), 0)
  WHERE id = COALESCE(NEW.thread_id, OLD.thread_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vote_changed
AFTER INSERT OR UPDATE OR DELETE ON public.thread_votes
FOR EACH ROW EXECUTE FUNCTION public.update_thread_score();

-- Función para actualizar conteo de respuestas automáticamente
CREATE OR REPLACE FUNCTION public.update_thread_replies_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.threads
  SET replies_count = (
    SELECT COUNT(*) 
    FROM public.comments 
    WHERE thread_id = COALESCE(NEW.thread_id, OLD.thread_id)
  )
  WHERE id = COALESCE(NEW.thread_id, OLD.thread_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_changed
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_thread_replies_count();

-- Función para crear automáticamente el perfil al registrar usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_career public.carrera_utom;
  v_initials TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_career := COALESCE((NEW.raw_user_meta_data->>'career')::public.carrera_utom, 'TI');
  
  -- Cálculo de iniciales
  v_initials := UPPER(SUBSTRING(v_full_name FROM 1 FOR 2));

  INSERT INTO public.profiles (id, email, full_name, initials, career, student_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_initials,
    v_career,
    NEW.raw_user_meta_data->>'student_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 8. POLÍTICAS DE SEGURIDAD (Row Level Security - RLS)
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_threads ENABLE ROW LEVEL SECURITY;

-- Políticas de Perfiles
CREATE POLICY "Perfiles visibles para usuarios autenticados"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Políticas de Hilos (Threads)
CREATE POLICY "Cualquiera autenticado puede leer hilos"
  ON public.threads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear hilos"
  ON public.threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Autores pueden editar sus propios hilos"
  ON public.threads FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Autores pueden eliminar sus propios hilos"
  ON public.threads FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Políticas de Comentarios
CREATE POLICY "Cualquiera autenticado puede ver comentarios"
  ON public.comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden comentar"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Autores pueden borrar sus comentarios"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Políticas de Votos
CREATE POLICY "Usuarios pueden ver votos"
  ON public.thread_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios pueden votar o actualizar su voto"
  ON public.thread_votes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas de Hilos Guardados
CREATE POLICY "Usuarios pueden gestionar sus hilos guardados"
  ON public.saved_threads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- 9. CONFIGURACIÓN DE STORAGE (Para Guías y Materiales)
-- ====================================================================

-- Crear bucket público de almacenamiento para materiales y guías
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lectura pública de materiales"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'materials');

CREATE POLICY "Subida de materiales por usuarios autenticados"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'materials' AND auth.uid() IS NOT NULL);
```

---

## 4. Instalación de Dependencias en Next.js

Para conectar la app de Next.js a Supabase ejecuta:

```bash
bun add @supabase/supabase-js @supabase/ssr
```

---

## 5. Cliente de Supabase en la App

Crea el archivo `lib/supabase.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## 6. Validación de Dominio Institucional (Opcional)

Si deseas restringir el acceso **únicamente** a correos `@utom.edu.mx`:
1. En el panel de Supabase ve a **Authentication -> Providers -> Email**.
2. O bien, agrega este check en la tabla `profiles`:
   ```sql
   ALTER TABLE public.profiles 
   ADD CONSTRAINT check_correo_institucional 
   CHECK (email LIKE '%@utom.edu.mx');
   ```
