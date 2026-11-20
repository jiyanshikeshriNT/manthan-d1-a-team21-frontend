// Temporary block listing what a page will contain. Remove as each page is built.
export default function PagePlaceholder({ title, items }) {
  return (
    <section className="card placeholder">
      <h2>{title}</h2>
      <ul>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  )
}
