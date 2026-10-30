export default function FormField({ label, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        {...inputProps}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 shadow-sm transition focus:border-green-600 focus:outline-none focus:ring-4 focus:ring-green-100"
      />
    </label>
  )
}