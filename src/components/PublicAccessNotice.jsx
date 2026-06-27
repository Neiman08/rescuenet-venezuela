export default function PublicAccessNotice({ text = "No necesitas crear cuenta para pedir ayuda o buscar a un familiar." }) {
  return (
    <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
      {text}
    </div>
  );
}
