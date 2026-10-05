export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <p>{description}</p>
      <p className="muted">Ready for feature development.</p>
    </section>
  );
}
