export function LeafIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

const features = [
  'Upload a photo of any leaf',
  'Get a diagnosis in seconds',
  'Clear treatment steps made for home gardeners',
]

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left side: the form */}
      <div className="flex flex-col justify-center bg-white px-6 py-8 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-white">
              <LeafIcon />
            </span>
            <span className="text-xl font-extrabold tracking-tight text-green-900">GreenBuddy</span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-1 text-gray-500">{subtitle}</p>

          <div className="mt-6">{children}</div>

          <p className="mt-6 text-sm text-gray-500">{footer}</p>
        </div>
      </div>

      {/* Right side: the photo (hidden on small screens, stays in place) */}
      <div
        className="relative hidden items-center bg-green-900 bg-cover bg-center lg:sticky lg:top-0 lg:flex lg:h-screen"
        style={{
          backgroundImage:
                "linear-gradient(to right, rgba(2, 44, 34, 0.8), rgba(2, 44, 34, 0.3)), url('/login-bg.jpg')",
        }}
      >
        <div className="max-w-xl p-14 text-white">
          <h2 className="text-4xl font-extrabold leading-tight">
            Keep your plants healthy, one leaf at a time.
          </h2>
          <p className="mt-4 text-lg text-green-100">
            Snap a photo of a leaf. GreenBuddy tells you what is wrong and how to fix it.
          </p>
          <ul className="mt-8 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-green-50">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/30 text-sm">
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}