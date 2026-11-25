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
  kind             TEXT NOT NULL DEFAULT 'QUIZ' CHECK (kind IN ('QUIZ', 'PERSONALITY', 'PAULI', 'DRAWING')),
  config           JSONB,
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
  total_questions INTEGER,
  result          JSONB
);

CREATE INDEX IF NOT EXISTS attempts_subtest_id_idx ON attempts (subtest_id);

CREATE TABLE IF NOT EXISTS answers (
  id              SERIAL PRIMARY KEY,
  attempt_id      INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id     INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option TEXT,
  is_correct      BOOLEAN NOT NULL,
  UNIQUE (attempt_id, question_id)
);

-- Migrasi kolom subtests.kind, subtests.config, dan attempts.result jika belum ada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subtests' AND column_name = 'kind'
  ) THEN
    ALTER TABLE subtests ADD COLUMN kind TEXT NOT NULL DEFAULT 'QUIZ'
      CHECK (kind IN ('QUIZ', 'PERSONALITY', 'PAULI', 'DRAWING'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subtests' AND column_name = 'config'
  ) THEN
    ALTER TABLE subtests ADD COLUMN config JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attempts' AND column_name = 'result'
  ) THEN
    ALTER TABLE attempts ADD COLUMN result JSONB;
  END IF;
END $$;

-- Pembahasan lengkap: langkah pengerjaan, alasan opsi lain salah, dan quick tip (semuanya opsional).
ALTER TABLE questions ADD COLUMN IF NOT EXISTS steps JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS wrong_notes JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS quick_tip TEXT;

-- Log audit impor dan perubahan paket/subtes untuk panel admin.
CREATE TABLE IF NOT EXISTS import_audit_logs (
  id                SERIAL PRIMARY KEY,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_type       TEXT NOT NULL CHECK (action_type IN (
                      'PACK_NEW',
                      'PACK_OVERWRITE',
                      'PACK_DUPLICATE_FORCED',
                      'EXPLANATION_NEW',
                      'EXPLANATION_OVERWRITE',
                      'EXPLANATION_DUPLICATE_FORCED',
                      'IMPORT_REJECTED',
                      'IMPORT_FAILED',
                      'PACKAGE_UPDATED',
                      'SUBTEST_UPDATED',
                      'PACKAGE_DELETED',
                      'SUBTEST_DELETED'
                    )),
  status            TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FORCED', 'REJECTED', 'FAILED')),
  company_slug      TEXT,
  package_slug      TEXT,
  target_label      TEXT,
  file_name         TEXT,
  content_hash      TEXT,
  forced_overwrite  BOOLEAN NOT NULL DEFAULT false,
  summary           JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS import_audit_logs_created_at_idx
  ON import_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS import_audit_logs_hash_status_idx
  ON import_audit_logs (content_hash, status)
  WHERE content_hash IS NOT NULL;

-- Fitur Materi Bahasa Inggris (Kamus & Spaced Repetition Kotak 1..5).
-- Dirancang umum (topic default 'kamus') agar materi berikutnya tinggal menambah file data.
CREATE TABLE IF NOT EXISTS english_words (
  id          SERIAL PRIMARY KEY,
  no          INTEGER NOT NULL UNIQUE,
  word        TEXT NOT NULL,
  pos         TEXT NOT NULL,
  meaning_id  TEXT NOT NULL,
  example_en  TEXT NOT NULL,
  example_id  TEXT NOT NULL,
  cefr        TEXT NOT NULL CHECK (cefr IN ('A1', 'A2', 'B1', 'B2', 'C1')),
  topic       TEXT NOT NULL DEFAULT 'kamus'
);

CREATE INDEX IF NOT EXISTS english_words_cefr_pos_idx
  ON english_words (cefr, pos);

CREATE TABLE IF NOT EXISTS english_progress (
  user_id        TEXT NOT NULL,
  word_id        INTEGER NOT NULL REFERENCES english_words(id) ON DELETE CASCADE,
  box            INTEGER NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  correct_count  INTEGER NOT NULL DEFAULT 0,
  wrong_count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, word_id)
);

CREATE INDEX IF NOT EXISTS english_progress_user_review_idx
  ON english_progress (user_id, next_review_at);


