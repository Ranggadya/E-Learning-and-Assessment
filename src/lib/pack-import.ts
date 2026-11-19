import { databasePool } from "./db";
import type { PackFile } from "./pack-schema";

const OPTION_KEYS = ["A", "B", "C", "D", "E"];

export interface ImportedSubtestSummary {
  slug: string;
  name: string;
  questionCount: number;
  durationSeconds: number;
  status: "baru" | "diganti";
  // Jumlah percobaan lama pada subtes ini yang detail jawabannya ikut terhapus saat soal diganti.
  replacedAttemptCount: number;
}

export interface ImportSummary {
  companyName: string;
  companyStatus: "baru" | "diperbarui";
  packageName: string;
  packageStatus: "baru" | "diperbarui";
  subtests: ImportedSubtestSummary[];
  totalQuestions: number;
  dryRun: boolean;
}

// Menambah atau memperbarui perusahaan, paket, dan subtes berdasarkan slug. Soal pada subtes yang
// sudah ada diganti seluruhnya. Subtes lain di paket yang sama tidak disentuh, sehingga file ini juga
// bisa dipakai untuk menambah subtes baru ke paket yang sudah ada.
// Dengan dryRun, semua langkah dijalankan lalu dibatalkan, sehingga ringkasannya sama persis dengan impor sungguhan.
export async function importPack(pack: PackFile, options: { dryRun: boolean }): Promise<ImportSummary> {
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");

    const existingCompany = await client.query<{ id: number }>("SELECT id FROM companies WHERE slug = $1", [pack.company.slug]);
    const companyResult = await client.query<{ id: number }>(
      `INSERT INTO companies (slug, name, description) VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
       RETURNING id`,
      [pack.company.slug, pack.company.name, pack.company.description ?? null],
    );
    const companyId = companyResult.rows[0].id;

    const existingPackage = await client.query<{ id: number }>(
      "SELECT id FROM test_packages WHERE company_id = $1 AND slug = $2",
      [companyId, pack.package.slug],
    );
    const packageResult = await client.query<{ id: number }>(
      `INSERT INTO test_packages (company_id, slug, name, description) VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
       RETURNING id`,
      [companyId, pack.package.slug, pack.package.name, pack.package.description ?? null],
    );
    const packageId = packageResult.rows[0].id;

    const maxOrderResult = await client.query<{ max_order: number | null }>(
      "SELECT MAX(order_index) AS max_order FROM subtests WHERE test_package_id = $1",
      [packageId],
    );
    let nextOrderIndex = (maxOrderResult.rows[0].max_order ?? 0) + 1;

    const subtestSummaries: ImportedSubtestSummary[] = [];
    let totalQuestions = 0;

    for (const subtest of pack.subtests) {
      const existingSubtest = await client.query<{ id: number; order_index: number }>(
        "SELECT id, order_index FROM subtests WHERE test_package_id = $1 AND slug = $2",
        [packageId, subtest.slug],
      );

      let subtestId: number;
      let replacedAttemptCount = 0;
      if (existingSubtest.rows.length > 0) {
        subtestId = existingSubtest.rows[0].id;
        const attemptCount = await client.query<{ total: string }>("SELECT COUNT(*) AS total FROM attempts WHERE subtest_id = $1", [subtestId]);
        replacedAttemptCount = Number(attemptCount.rows[0].total);
        await client.query(
          "UPDATE subtests SET name = $1, description = $2, duration_seconds = $3 WHERE id = $4",
          [subtest.name, subtest.description ?? null, subtest.durationSeconds, subtestId],
        );
        await client.query("DELETE FROM questions WHERE subtest_id = $1", [subtestId]);
      } else {
        const inserted = await client.query<{ id: number }>(
          `INSERT INTO subtests (test_package_id, slug, name, description, duration_seconds, order_index)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [packageId, subtest.slug, subtest.name, subtest.description ?? null, subtest.durationSeconds, nextOrderIndex],
        );
        subtestId = inserted.rows[0].id;
        nextOrderIndex += 1;
      }

      for (let index = 0; index < subtest.questions.length; index += 1) {
        const question = subtest.questions[index];
        const optionObjects = question.options.map(function toOption(label, optionIndex) {
          return { key: OPTION_KEYS[optionIndex], label };
        });
        await client.query(
          `INSERT INTO questions (subtest_id, type, order_index, prompt, image_svg, options, correct_option, explanation)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            subtestId,
            question.type ?? "TEXT",
            index + 1,
            question.prompt,
            question.imageSvg ?? null,
            JSON.stringify(optionObjects),
            OPTION_KEYS[question.correctIndex],
            question.explanation,
          ],
        );
      }

      totalQuestions += subtest.questions.length;
      subtestSummaries.push({
        slug: subtest.slug,
        name: subtest.name,
        questionCount: subtest.questions.length,
        durationSeconds: subtest.durationSeconds,
        status: existingSubtest.rows.length > 0 ? "diganti" : "baru",
        replacedAttemptCount,
      });
    }

    if (options.dryRun) {
      await client.query("ROLLBACK");
    } else {
      await client.query("COMMIT");
    }

    return {
      companyName: pack.company.name,
      companyStatus: existingCompany.rows.length > 0 ? "diperbarui" : "baru",
      packageName: pack.package.name,
      packageStatus: existingPackage.rows.length > 0 ? "diperbarui" : "baru",
      subtests: subtestSummaries,
      totalQuestions,
      dryRun: options.dryRun,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
