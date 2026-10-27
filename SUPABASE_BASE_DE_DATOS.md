# Base de datos completa de Wiki UTOM en Supabase

Este archivo reemplaza el script de `SUPABASE_SETUP.md`: incluye todo lo que necesita la app actual (perfiles, hilos, comentarios, votos, guardados, avisos oficiales, notificaciones y archivos) y da de alta a los 18 alumnos de `USUARIOS_SEED.md`.

**Acceso temporal:** cada alumno entra con su **matrícula como usuario y como contraseña** (por ejemplo `UTOM2413TIID` / `UTOM2413TIID`). Cada cuenta se crea con la marca `must_change_password = true` para que la app pueda pedir el cambio de contraseña en el primer acceso.

Orden de ejecución:

1. [Crear el proyecto y las variables de entorno](#1-proyecto-y-variables-de-entorno)
2. [Configurar Authentication](#2-configurar-authentication)
3. [(Solo si ya ejecutaste el script anterior) Reiniciar la base](#3-reiniciar-la-base-solo-si-ya-ejecutaste-supabase_setupmd)
4. [Script SQL del esquema completo](#4-script-sql-del-esquema-completo)
5. [Script SQL de los usuarios](#5-script-sql-de-los-usuarios-matrícula--contraseña)
6. [Verificar](#6-verificar)
7. [Conectar la app y quitar los datos de prueba](#7-conectar-la-app-y-quitar-los-datos-de-prueba)

---

## 1. Proyecto y variables de entorno

1. En [supabase.com](https://supabase.com/) crea un proyecto (por ejemplo `wiki-utom`).
2. En **Project Settings → API** copia la **Project URL** y la **anon public key**.
3. Crea `.env.local` en la raíz del proyecto (ya está ignorado por git en `.gitignore`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

> Nunca pongas la **service_role key** en `.env.local` con prefijo `NEXT_PUBLIC_`: daría acceso total a la base desde el navegador.

---

## 2. Configurar Authentication

En **Authentication → Sign In / Providers → Email**:

- **Desactiva "Allow new users to sign up"**: solo podrán entrar los alumnos dados de alta por el script.
- "Confirm email" puede quedar activado: el script marca los correos como confirmados.

Supabase Auth necesita un correo por usuario. Como la lista solo trae matrícula, el script usa un correo interno con el formato:

```
matrícula en minúsculas + @utom.edu.mx   →   utom2413tiid@utom.edu.mx
```

La app convierte la matrícula que escribe el alumno a ese correo antes de iniciar sesión (ver sección 7). Si después se cargan los correos institucionales reales, solo hay que actualizar `auth.users.email` y `public.profiles.email`.

---

## 3. Reiniciar la base (solo si ya ejecutaste `SUPABASE_SETUP.md`)

El script anterior crea tablas con los mismos nombres pero otra estructura. Si ya lo corriste, ejecuta esto primero en **SQL Editor**. **Borra todas las tablas de la app y los usuarios de la lista; no se puede deshacer.**

```sql
-- ⚠️ DESTRUCTIVO: elimina tablas, funciones, tipos, políticas de storage y usuarios sembrados
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP VIEW  IF EXISTS public.feed_threads;
DROP TABLE IF EXISTS public.notifications, public.notices, public.saved_threads,
                     public.thread_votes, public.comments, public.threads, public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_thread_score() CASCADE;
DROP FUNCTION IF EXISTS public.update_thread_replies_count() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_comment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_on_notice() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

DROP TYPE IF EXISTS public.tipo_notificacion;
DROP TYPE IF EXISTS public.categoria_hilo;
DROP TYPE IF EXISTS public.carrera_utom;

DROP POLICY IF EXISTS "Lectura pública de materiales" ON storage.objects;
DROP POLICY IF EXISTS "Subida de materiales por usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Archivos visibles para usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios suben archivos a su carpeta" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios borran sus propios archivos" ON storage.objects;

DELETE FROM auth.users WHERE email LIKE 'utom%@utom.edu.mx';
```

---

## 4. Script SQL del esquema completo

Pégalo completo en **SQL Editor** y pulsa **Run**.

```sql
-- ====================================================================
-- 0. EXTENSIONES
-- ====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ====================================================================
-- 1. TIPOS
-- ====================================================================

-- Las 4 carreras oficiales de la UTOM
CREATE TYPE public.carrera_utom AS ENUM ('TI', 'Biotecnología', 'Mercadotecnia', 'Gastronomía');

-- Categorías del foro (las mismas que muestra la vista Carreras)
CREATE TYPE public.categoria_hilo AS ENUM (
  'TI', 'Biotecnología', 'Mercadotecnia', 'Gastronomía', 'Convocatorias', 'Preguntas Frecuentes'
);

-- Tipos de notificación que usa el panel de notificaciones
CREATE TYPE public.tipo_notificacion AS ENUM ('reply', 'mention', 'notice', 'trending');

-- ====================================================================
-- 2. PERFILES (uno por usuario de auth.users)
-- ====================================================================
CREATE TABLE public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id           TEXT NOT NULL UNIQUE,                         -- matrícula
  email                TEXT NOT NULL UNIQUE CHECK (email LIKE '%@utom.edu.mx'),
  full_name            TEXT NOT NULL,                                -- nombre oficial (no editable)
  display_name         TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 3 AND 40),
  initials             VARCHAR(4) NOT NULL,
  career               public.carrera_utom NOT NULL,
  bio                  TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 160),
  avatar_url           TEXT,
  role                 TEXT NOT NULL DEFAULT 'Estudiante UTOM',
  is_admin             BOOLEAN NOT NULL DEFAULT false,               -- puede publicar avisos oficiales
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  notif_replies        BOOLEAN NOT NULL DEFAULT true,                -- respuestas y menciones
  notif_notices        BOOLEAN NOT NULL DEFAULT true,                -- avisos del campus
  notif_digest         BOOLEAN NOT NULL DEFAULT false,               -- boletín / tendencias
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- 3. HILOS
-- ====================================================================
CREATE TABLE public.threads (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  category        public.categoria_hilo NOT NULL,
  title           TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 150),
  body            TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),
  tags            TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 5),
  image_url       TEXT,
  attachment_url  TEXT,
  attachment_name TEXT,
  attachment_size TEXT,
  score           INTEGER NOT NULL DEFAULT 0,   -- lo mantiene un trigger con los votos
  replies_count   INTEGER NOT NULL DEFAULT 0,   -- lo mantiene un trigger con los comentarios
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX threads_created_at_idx ON public.threads (created_at DESC);
CREATE INDEX threads_category_idx   ON public.threads (category);
CREATE INDEX threads_tags_idx       ON public.threads USING GIN (tags);

-- ====================================================================
-- 4. COMENTARIOS
-- ====================================================================
CREATE TABLE public.comments (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id  BIGINT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_thread_idx ON public.comments (thread_id, created_at);

-- ====================================================================
-- 5. VOTOS (uno por usuario y hilo)
-- ====================================================================
CREATE TABLE public.thread_votes (
  thread_id  BIGINT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type  SMALLINT NOT NULL CHECK (vote_type IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

-- ====================================================================
-- 6. HILOS GUARDADOS
-- ====================================================================
CREATE TABLE public.saved_threads (
  thread_id  BIGINT NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

-- ====================================================================
-- 7. AVISOS OFICIALES DEL CAMPUS
-- ====================================================================
CREATE TABLE public.notices (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 150),
  body         TEXT NOT NULL,
  created_by   UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- 8. NOTIFICACIONES (las crean los triggers, nunca el cliente)
-- ====================================================================
CREATE TABLE public.notifications (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        public.tipo_notificacion NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  thread_id   BIGINT REFERENCES public.threads(id) ON DELETE CASCADE,
  notice_id   BIGINT REFERENCES public.notices(id) ON DELETE CASCADE,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

-- ====================================================================
-- 9. VISTA DEL FEED (hilo + datos del autor)
-- ====================================================================
CREATE VIEW public.feed_threads
WITH (security_invoker = true) AS
SELECT
  t.*,
  p.display_name AS author_name,
  p.initials     AS author_initials,
  p.career       AS author_career,
  p.role         AS author_role
FROM public.threads t
JOIN public.profiles p ON p.id = t.author_id;

-- ====================================================================
-- 10. FUNCIONES Y TRIGGERS
-- ====================================================================

-- ¿El usuario actual es administrador? (para publicar avisos)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER threads_updated_at BEFORE UPDATE ON public.threads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Crea el perfil cuando se da de alta un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_meta      JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_full_name TEXT  := COALESCE(NULLIF(v_meta->>'full_name', ''), split_part(NEW.email, '@', 1));
  v_display   TEXT  := COALESCE(NULLIF(v_meta->>'display_name', ''), v_full_name);
BEGIN
  INSERT INTO public.profiles (
    id, student_id, email, full_name, display_name, initials, career, must_change_password
  ) VALUES (
    NEW.id,
    COALESCE(NULLIF(v_meta->>'student_id', ''), upper(split_part(NEW.email, '@', 1))),
    NEW.email,
    v_full_name,
    left(v_display, 40),
    COALESCE(NULLIF(v_meta->>'initials', ''), upper(left(v_full_name, 2))),
    COALESCE(NULLIF(v_meta->>'career', ''), 'TI')::public.carrera_utom,
    COALESCE((v_meta->>'must_change_password')::boolean, false)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recalcula el score del hilo y avisa al autor cuando entra en tendencia (≥ 60)
CREATE OR REPLACE FUNCTION public.update_thread_score()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_thread_id BIGINT := COALESCE(NEW.thread_id, OLD.thread_id);
  v_old       INTEGER;
  v_new       INTEGER;
  v_author    UUID;
  v_title     TEXT;
BEGIN
  SELECT score, author_id, title INTO v_old, v_author, v_title
  FROM public.threads WHERE id = v_thread_id;
  IF NOT FOUND THEN
    RETURN NULL; -- el hilo se está eliminando
  END IF;

  SELECT COALESCE(SUM(vote_type), 0) INTO v_new
  FROM public.thread_votes WHERE thread_id = v_thread_id;

  UPDATE public.threads SET score = v_new WHERE id = v_thread_id;

  IF v_old < 60 AND v_new >= 60 THEN
    INSERT INTO public.notifications (user_id, type, title, description, thread_id)
    VALUES (v_author, 'trending', 'Tu hilo está en tendencia',
            '"' || v_title || '" superó los 60 votos.', v_thread_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_vote_changed
AFTER INSERT OR UPDATE OR DELETE ON public.thread_votes
FOR EACH ROW EXECUTE FUNCTION public.update_thread_score();

-- Mantiene replies_count al día
CREATE OR REPLACE FUNCTION public.update_thread_replies_count()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_thread_id BIGINT := COALESCE(NEW.thread_id, OLD.thread_id);
BEGIN
  UPDATE public.threads
  SET replies_count = (SELECT COUNT(*) FROM public.comments WHERE thread_id = v_thread_id)
  WHERE id = v_thread_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_comment_changed
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.update_thread_replies_count();

-- Notifica al autor del hilo (respuesta) y a quien se mencione con @Nombre
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_author_id UUID;
  v_title     TEXT;
  v_commenter TEXT;
BEGIN
  SELECT author_id, title INTO v_author_id, v_title FROM public.threads WHERE id = NEW.thread_id;
  SELECT display_name INTO v_commenter FROM public.profiles WHERE id = NEW.author_id;

  IF v_author_id <> NEW.author_id THEN
    INSERT INTO public.notifications (user_id, type, title, description, thread_id)
    VALUES (v_author_id, 'reply', 'Nueva respuesta en tu hilo',
            v_commenter || ' comentó: "' || left(NEW.content, 80) || '"', NEW.thread_id);
  END IF;

  INSERT INTO public.notifications (user_id, type, title, description, thread_id)
  SELECT p.id, 'mention', 'Te mencionaron en un hilo',
         v_commenter || ' te mencionó en "' || v_title || '".', NEW.thread_id
  FROM public.profiles p
  WHERE p.id NOT IN (NEW.author_id, v_author_id)
    AND position(lower('@' || p.display_name) IN lower(NEW.content)) > 0;

  RETURN NULL;
END;
$$;

CREATE TRIGGER on_comment_notify
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Cada aviso oficial nuevo llega como notificación a todos los usuarios
CREATE OR REPLACE FUNCTION public.notify_on_notice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, description, notice_id)
  SELECT p.id, 'notice', 'Aviso: ' || NEW.title, left(NEW.body, 120), NEW.id
  FROM public.profiles p;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_notice_created
AFTER INSERT ON public.notices
FOR EACH ROW EXECUTE FUNCTION public.notify_on_notice();

-- ====================================================================
-- 11. PERMISOS POR COLUMNA
-- Evitan que un usuario se haga administrador, cambie su matrícula
-- o falsee score / replies_count desde el navegador.
-- ====================================================================
REVOKE INSERT, UPDATE ON public.profiles, public.threads, public.comments,
                         public.thread_votes, public.saved_threads,
                         public.notices, public.notifications
  FROM anon, authenticated;

GRANT UPDATE (display_name, initials, bio, avatar_url, must_change_password,
              notif_replies, notif_notices, notif_digest)
  ON public.profiles TO authenticated;

GRANT INSERT (category, title, body, tags, image_url, attachment_url, attachment_name, attachment_size),
      UPDATE (category, title, body, tags, image_url, attachment_url, attachment_name, attachment_size)
  ON public.threads TO authenticated;

GRANT INSERT (thread_id, content) ON public.comments TO authenticated;

GRANT INSERT (thread_id, vote_type), UPDATE (vote_type) ON public.thread_votes TO authenticated;

GRANT INSERT (thread_id) ON public.saved_threads TO authenticated;

GRANT INSERT (title, body, published_at), UPDATE (title, body, published_at)
  ON public.notices TO authenticated;

GRANT UPDATE (read) ON public.notifications TO authenticated;

GRANT SELECT ON public.feed_threads TO authenticated;

-- ====================================================================
-- 12. ROW LEVEL SECURITY
-- ====================================================================
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_votes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Perfiles
CREATE POLICY "Perfiles visibles para usuarios autenticados"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cada usuario edita su propio perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Hilos
CREATE POLICY "Hilos visibles para usuarios autenticados"
  ON public.threads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados crean hilos propios"
  ON public.threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Autores editan sus hilos"
  ON public.threads FOR UPDATE TO authenticated
  USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Autores o administradores eliminan hilos"
  ON public.threads FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());

-- Comentarios
CREATE POLICY "Comentarios visibles para usuarios autenticados"
  ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados comentan"
  ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Autores o administradores borran comentarios"
  ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_admin());

-- Votos
CREATE POLICY "Votos visibles para usuarios autenticados"
  ON public.thread_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Cada usuario gestiona su voto"
  ON public.thread_votes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Guardados
CREATE POLICY "Cada usuario gestiona sus guardados"
  ON public.saved_threads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Avisos oficiales
CREATE POLICY "Avisos visibles para usuarios autenticados"
  ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Solo administradores publican avisos"
  ON public.notices FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Solo administradores editan avisos"
  ON public.notices FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Solo administradores eliminan avisos"
  ON public.notices FOR DELETE TO authenticated USING (public.is_admin());

-- Notificaciones
CREATE POLICY "Cada usuario ve sus notificaciones"
  ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Cada usuario marca sus notificaciones"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Cada usuario descarta sus notificaciones"
  ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ====================================================================
-- 13. STORAGE: imágenes de hilos y materiales (PDF)
-- Cada usuario sube a una carpeta con su id: <bucket>/<auth.uid()>/archivo
-- ====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('thread-images', 'thread-images', true, 5242880,  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('materials',     'materials',     true, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Archivos visibles para usuarios autenticados"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('thread-images', 'materials'));

CREATE POLICY "Usuarios suben archivos a su carpeta"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('thread-images', 'materials')
              AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Usuarios borran sus propios archivos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('thread-images', 'materials')
         AND (storage.foldername(name))[1] = auth.uid()::text);

-- ====================================================================
-- 14. REALTIME (comentarios y notificaciones en vivo)
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments, public.notifications;
```

---

## 5. Script SQL de los usuarios (matrícula = contraseña)

Ejecútalo **después** del esquema. Da de alta a los 18 alumnos de `USUARIOS_SEED.md` en la carrera TI. Se puede ejecutar varias veces: omite a quien ya exista.

Para cada alumno genera:

| Campo | Ejemplo |
|---|---|
| Usuario / contraseña | `UTOM2413TIID` |
| Correo interno | `utom2413tiid@utom.edu.mx` |
| Nombre oficial | `Jose Jesus Alvarado Gervacio` |
| Nombre para mostrar | `Jose Alvarado` (editable en Ajustes) |
| Iniciales | `JA` |

```sql
DO $$
DECLARE
  r       RECORD;
  v_id    UUID;
  v_email TEXT;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ( 1, 'JOSE JESUS',       'ALVARADO GERVACIO',  'UTOM2413TIID'),
      ( 2, 'ALEJANDRO',        'BALDERAS RIOS',      'UTOM2432TIID'),
      ( 3, 'IVONNE',           'BARRIENTOS VALENCIA','UTOM2412TIID'),
      ( 4, 'LEON ULISES',      'BAUTISTA MENDIOLA',  'UTOM2429TIID'),
      ( 5, 'CRISTOFER',        'CASTRO ALVAREZ',     'UTOM2435TIID'),
      ( 6, 'CARLOS ANTONIO',   'CRUZ CRUZ',          'UTOM2431TIID'),
      ( 7, 'DANIEL',           'GARCIA CERECERO',    'UTOM2436TIID'),
      ( 8, 'DANNA PAOLA',      'GARCIA GARCIA',      'UTOM2420TIID'),
      ( 9, 'ANGEL MARTIN',     'MARTINEZ GARCIA',    'UTOM2442TIID'),
      (10, 'LUIS ANTONIO',     'MORA MEDINA',        'UTOM2433TIID'),
      (11, 'MARIA ESTEFANIA',  'PEDRAZA LOPEZ',      'UTOM2411TIID'),
      (12, 'ANA PAOLA',        'PERDOMO AVILA',      'UTOM2424TIID'),
      (13, 'CITLALLI',         'PEREZ TELLEZ',       'UTOM2414TIID'),
      (14, 'SAMANTHA LIZETT',  'QUINTO RAMIREZ',     'UTOM2418TIID'),
      (15, 'MARCO ADRIAN',     'RENTERIA LOA',       'UTOM2421TIID'),
      (16, 'PETRA',            'RIVERA MORALES',     'UTOM2402TIID'),
      (17, 'CARLOS AXEL',      'RODEA PEREZ',        'UTOM2417TIID'),
      (18, 'JESUS',            'SEGUNDO ALVAREZ',    'UTOM2407TIID')
    ) AS t(numero_lista, nombres, apellidos, matricula)
  LOOP
    v_email := lower(r.matricula) || '@utom.edu.mx';
    CONTINUE WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = v_email);

    v_id := gen_random_uuid();

    -- Usuario de Supabase Auth con contraseña = matrícula (cifrada con bcrypt)
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
      extensions.crypt(r.matricula, extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object(
        'student_id',           r.matricula,
        'full_name',            initcap(r.nombres || ' ' || r.apellidos),
        'display_name',         initcap(split_part(r.nombres, ' ', 1) || ' ' || split_part(r.apellidos, ' ', 1)),
        'initials',             left(r.nombres, 1) || left(r.apellidos, 1),
        'career',               'TI',
        'must_change_password', true
      ),
      now(), now(), '', '', '', ''
    );

    -- Identidad de correo (necesaria para iniciar sesión con correo y contraseña)
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_id, v_id::text,
      jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
    -- El trigger on_auth_user_created crea su fila en public.profiles
  END LOOP;
END $$;
```

**Opcional: nombrar un administrador** (puede publicar avisos oficiales). Cambia la matrícula por la que corresponda:

```sql
UPDATE public.profiles SET is_admin = true, role = 'Administración UTOM'
WHERE student_id = 'UTOM2413TIID';
```

**Opcional: publicar un primer aviso** (como administrador desde la app, o aquí desde el SQL Editor; todos los usuarios recibirán la notificación):

```sql
INSERT INTO public.notices (title, body)
VALUES ('Bienvenidos a Wiki UTOM', 'Ya pueden publicar hilos, comentar y guardar material de estudio.');
```

---

## 6. Verificar

```sql
-- Deben aparecer los 18 alumnos
SELECT student_id, display_name, full_name, email, career, must_change_password
FROM public.profiles
ORDER BY student_id;

-- Comprobar que la contraseña de un alumno es su matrícula (debe devolver true)
SELECT encrypted_password = extensions.crypt('UTOM2413TIID', encrypted_password) AS contraseña_ok
FROM auth.users
WHERE email = 'utom2413tiid@utom.edu.mx';
```

Prueba también el inicio de sesión real en **Authentication → Users**: los 18 usuarios deben aparecer como confirmados.

---

## 7. Conectar la app y quitar los datos de prueba

### 7.1 Dependencias y cliente

```bash
bun add @supabase/supabase-js @supabase/ssr
```

`lib/supabase.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 7.2 Inicio de sesión con matrícula

El alumno escribe su matrícula (o el correo) y la contraseña. La app convierte la matrícula al correo interno:

```typescript
const supabase = createClient()

const toEmail = (input: string) => {
  const value = input.trim().toLowerCase()
  return value.includes('@') ? value : `${value}@utom.edu.mx`
}

const { data, error } = await supabase.auth.signInWithPassword({
  email: toEmail(matriculaOCorreo),
  password, // de momento, la misma matrícula: UTOM2413TIID
})
if (error) setErrorMessage('Matrícula o contraseña incorrectas.')

const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', data.user!.id)
  .single()
// profile.must_change_password === true → llevar al alumno a Ajustes › Cambiar contraseña
```

La sesión la guarda Supabase en el navegador; `supabase.auth.signOut()` la cierra.

### 7.3 Qué datos de prueba se sustituyen

| En la app hoy (datos fijos) | Fuente real en Supabase |
|---|---|
| `handleLogin` y accesos rápidos demo de `login-view.tsx` | `supabase.auth.signInWithPassword` (eliminar los 4 perfiles demo) |
| Sesión en `localStorage` de `app/page.tsx` | `supabase.auth.getSession()` y `onAuthStateChange` |
| Lista `threads` inicial de `forum-view.tsx` | `from('feed_threads').select('*').order('created_at', { ascending: false })` |
| Comentarios dentro de cada hilo | `from('comments').select('*, author:profiles(display_name, initials)').eq('thread_id', id)` |
| Crear hilo / comentar | `from('threads').insert({...})` / `from('comments').insert({ thread_id, content })` |
| Votos (`votes`) | `from('thread_votes').upsert({ thread_id, vote_type })`; quitar voto: `.delete()` |
| Guardados (`saved`) | `from('saved_threads').insert({ thread_id })` / `.delete()` |
| `campusNotices` | `from('notices').select('*').order('published_at', { ascending: false })` |
| Lista `notifications` | `from('notifications').select('*').order('created_at', { ascending: false })`; marcar leída: `.update({ read: true })` |
| Ajustes › Perfil y notificaciones | `from('profiles').update({ display_name, bio, notif_replies, notif_notices, notif_digest })` |
| Ajustes › Cambiar contraseña | `supabase.auth.updateUser({ password })` y luego `profiles.update({ must_change_password: false })` |
| Imagen y PDF adjuntos | `storage.from('thread-images' \| 'materials').upload(`${user.id}/${archivo}`, file)` |

La carrera se guarda con su nombre (`TI`, `Biotecnología`, `Mercadotecnia`, `Gastronomía`); la app la muestra con su código corto (`TI`, `BIO`, `MKT`, `GAST`), así que hay que mapearla al leer el perfil.

---

## Notas de seguridad

- **Matrícula = contraseña es solo temporal.** Las matrículas son fáciles de conocer, así que cualquiera que sepa la de un compañero puede entrar en su cuenta. Activa el cambio obligatorio usando `must_change_password` antes de abrir la plataforma a todo el grupo.
- El script de usuarios escribe directamente en `auth.users`; es la forma más directa de sembrar cuentas desde el SQL Editor. Si una versión futura de Supabase lo impide, la alternativa es crearlos con la Admin API (`supabase.auth.admin.createUser`) desde un script local con la **service_role key**, nunca desde el navegador.
- Los nombres de `USUARIOS_SEED.md` vienen sin acentos (por ejemplo "Jose", "Maria"); cada alumno puede corregir su nombre para mostrar en Ajustes. El nombre oficial (`full_name`) solo se cambia desde el SQL Editor.
