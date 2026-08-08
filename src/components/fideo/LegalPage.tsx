import { Link } from "@tanstack/react-router";
import { BRAND_LOGO } from "@/lib/fideo";

function renderInline(text: string, key: string) {
  // bold **text** and links [label](href)
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(
        <strong key={`${key}-b${i}`} className="font-semibold text-foreground">
          {m[1]}
        </strong>,
      );
    } else if (m[2] && m[3]) {
      nodes.push(
        <a
          key={`${key}-a${i}`}
          href={m[3]}
          className="text-brand underline underline-offset-4"
          target={m[3].startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
        >
          {m[2]}
        </a>,
      );
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flush = (key: string) => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${key}`} className="list-disc space-y-2 pl-5 text-muted-foreground">
          {list.map((item, idx) => (
            <li key={idx}>{renderInline(item, `${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    const key = String(index);
    if (!line) {
      flush(key);
      return;
    }
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      return;
    }
    flush(key);
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={key} className="mt-8 text-lg font-bold">
          {renderInline(line.slice(4), key)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key} className="mt-10 text-xl font-extrabold">
          {renderInline(line.slice(3), key)}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key} className="font-display text-3xl font-extrabold">
          {renderInline(line.slice(2), key)}
        </h1>,
      );
    } else if (line.startsWith("|")) {
      blocks.push(
        <p key={key} className="text-sm text-muted-foreground">
          {renderInline(
            line
              .split("|")
              .filter((c) => c.trim() && !/^[-\s:]+$/.test(c))
              .join(" — "),
            key,
          )}
        </p>,
      );
    } else {
      blocks.push(
        <p key={key} className="leading-relaxed text-muted-foreground">
          {renderInline(line, key)}
        </p>,
      );
    }
  });
  flush("end");

  return <div className="space-y-4">{blocks}</div>;
}

export function LegalPage({ source }: { source: string }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={BRAND_LOGO} alt="Logo Fidéo" className="h-9 w-9 object-contain" />
          <span className="font-display text-lg font-extrabold">Fidéo</span>
        </Link>
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
          Se connecter
        </Link>
      </header>
      <article className="animate-fade mx-auto max-w-3xl px-5 pb-24">
        <Markdown source={source} />
      </article>
    </main>
  );
}