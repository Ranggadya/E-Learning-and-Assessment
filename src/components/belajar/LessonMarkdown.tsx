import { CopyCodeButton } from "./CopyCodeButton";
import type { MarkdownBlock } from "@/types/belajar";

export function LessonMarkdown({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-ink">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.depth === 1) {
            return (
              <h2
                key={index}
                id={block.id}
                className="mt-7 text-xl font-extrabold tracking-tight text-ink sm:text-2xl"
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          }
          if (block.depth === 2) {
            return (
              <h2
                key={index}
                id={block.id}
                className="mt-7 border-b border-line pb-2 text-lg font-extrabold tracking-tight text-ink sm:text-xl"
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          }
          if (block.depth === 3) {
            return (
              <h3
                key={index}
                id={block.id}
                className="mt-5 text-base font-bold text-ink sm:text-lg"
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );
          }
          return (
            <h4
              key={index}
              id={block.id}
              className="mt-4 text-sm font-bold text-ink sm:text-base"
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          );
        }

        if (block.type === "paragraph") {
          return (
            <p
              key={index}
              className="leading-relaxed text-ink"
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          );
        }

        if (block.type === "code") {
          return (
            <div
              key={index}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3.5 py-2">
                <span className="font-mono text-xs font-semibold text-slate-400">
                  {block.lang}
                </span>
                <CopyCodeButton code={block.code} />
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-100 sm:text-[13px]">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={index}
              className="rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink-secondary"
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={index}
              className={`space-y-1.5 pl-5 ${
                block.ordered ? "list-decimal" : "list-disc"
              }`}
            >
              {block.itemsHtml.map((itemHtml, itemIdx) => (
                <li
                  key={itemIdx}
                  className="leading-relaxed text-ink"
                  dangerouslySetInnerHTML={{ __html: itemHtml }}
                />
              ))}
            </ListTag>
          );
        }

        if (block.type === "table") {
          return (
            <div
              key={index}
              className="overflow-x-auto rounded-xl border border-line bg-surface"
            >
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-line bg-canvas text-xs font-bold text-ink-secondary">
                  <tr>
                    {block.headersHtml.map((th, thIdx) => (
                      <th
                        key={thIdx}
                        scope="col"
                        className="px-3.5 py-2.5"
                        dangerouslySetInnerHTML={{ __html: th }}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {block.rowsHtml.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-canvas/60">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3.5 py-2.5 align-top text-ink"
                          dangerouslySetInnerHTML={{ __html: cell }}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === "image") {
          return (
            <figure
              key={index}
              className="my-5 overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-xs"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.src}
                alt={block.alt}
                loading="lazy"
                className="mx-auto max-h-[540px] w-auto rounded-lg bg-white p-2 object-contain"
              />
              {block.captionHtml ? (
                <figcaption
                  className="mt-2.5 border-t border-line/70 pt-2 text-center text-xs leading-relaxed text-ink-secondary"
                  dangerouslySetInnerHTML={{ __html: block.captionHtml }}
                />
              ) : null}
            </figure>
          );
        }

        if (block.type === "details") {
          return (
            <details
              key={index}
              className="group my-4 overflow-hidden rounded-xl border border-line bg-canvas"
            >
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-brand-text transition hover:bg-subtle/70">
                <span dangerouslySetInnerHTML={{ __html: block.summaryHtml }} />
              </summary>
              <div className="border-t border-line bg-surface px-4 py-3.5">
                <LessonMarkdown blocks={block.blocks} />
              </div>
            </details>
          );
        }

        return <hr key={index} className="my-6 border-line" />;
      })}
    </div>
  );
}
