export function PagePlaceholder({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="page-shell">
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
