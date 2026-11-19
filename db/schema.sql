-- Skema database e-assessment (PostgreSQL)
-- Hierarki: companies (Astra) -> test_packages (Paket 1, 2, ...) -> subtests -> questions

-- Migrasi dari versi lama yang belum punya tabel companies. Data latihan lama dibuang karena
-- seluruh soal dapat diimpor ulang dari file paket (db/packs/*.json).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_packages')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'test_packages' AND column_name = 'company_id'
     ) THEN
    DROP TABLE IF EXISTS answers, attempts, questions, subtests, test_packages CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS companies (
  id          SERIAL PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_packages (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);

CREATE TABLE IF NOT EXISTS subtests (
  id               SERIAL PRIMARY KEY,
  test_package_id  INTEGER NOT NULL REFERENCES test_packages(id) ON DELETE CASCADE,
  slug             TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  duration_seconds INTEGER NOT NULL,
  order_index      INTEGER NOT NULL,
  UNIQUE (test_package_id, slug)
);

-- type: TEXT (soal teks), IMAGE (soal bergambar SVG), MEMORY (working memory), SPEED (perceptual speed)
CREATE TABLE IF NOT EXISTS questions (
  id             SERIAL PRIMARY KEY,
  subtest_id     INTEGER NOT NULL REFERENCES subtests(id) ON DELETE CASCADE,
  type           TEXT NOT NULL DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'IMAGE', 'MEMORY', 'SPEED')),
  order_index    INTEGER NOT NULL,
  prompt         TEXT NOT NULL,
  image_svg      TEXT,
  options        JSONB NOT NULL,
  correct_option TEXT NOT NULL,
  explanation    TEXT
);

CREATE INDEX IF NOT EXISTS questions_subtest_order_index ON questions (subtest_id, order_index);

CREATE TABLE IF NOT EXISTS attempts (
  id              SERIAL PRIMARY KEY,
  subtest_id      INTEGER NOT NULL REFERENCES subtests(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  score           INTEGER,
  total_questions INTEGER
);

CREATE TABLE IF NOT EXISTS answers (
  id              SERIAL PRIMARY KEY,
  attempt_id      INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id     INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option TEXT,
  is_correct      BOOLEAN NOT NULL,
  UNIQUE (attempt_id, question_id)
);
