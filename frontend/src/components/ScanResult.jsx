import { API_URL } from '../api'

const categoryLabels = {
  fungal: 'Fungal disease',
  bacterial: 'Bacterial disease',
  viral: 'Viral disease',
  pest: 'Pest problem',
  healthy: 'Healthy',
}

const categoryColors = {
  fungal: 'bg-amber-100 text-amber-800',
  bacterial: 'bg-orange-100 text-orange-800',
  viral: 'bg-purple-100 text-purple-800',
  pest: 'bg-red-100 text-red-800',
  healthy: 'bg-green-100 text-green-800',
}

const supportedCrops =
  'apple, blueberry, cherry, corn, grape, orange, peach, bell pepper, potato, raspberry, soybean, squash, strawberry and tomato'

function barColor(confidence) {
  if (confidence >= 0.85) return 'bg-green-600'
  if (confidence >= 0.6) return 'bg-amber-500'
  return 'bg-red-500'
}

function percent(confidence) {
  return `${(confidence * 100).toFixed(1)}%`
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  )
}

export default function ScanResult({ result }) {
  const { prediction, alternatives = [], low_confidence, not_a_leaf, details, image_url, disclaimer } = result
  const healthy = details.is_healthy
  const unsure = low_confidence
    if (not_a_leaf) {
    return (
      <div className="overflow-hidden rounded-2xl bg-white shadow">
        <div className="grid md:grid-cols-2">
          <img
            src={`${API_URL}${image_url}`}
            alt="The photo you scanned"
            className="h-64 w-full object-cover md:h-full"
          />
          <div className="p-6">
            <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Not a leaf
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-gray-900">
              This doesn&apos;t look like a leaf
            </h2>
            <p className="mt-2 text-gray-600">
              GreenBuddy only works on photos of plant leaves. Please try again with a close-up of
              one leaf in good daylight.
            </p>
          </div>
        </div>
      </div>
    )
  }



  const bestGuess = healthy
    ? `${prediction.crop} (healthy)`
    : `${prediction.disease} on ${prediction.crop}`

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow">
      <div className="grid md:grid-cols-2">
        <img
          src={`${API_URL}${image_url}`}
          alt="The leaf you scanned"
          className="h-64 w-full object-cover md:h-full"
        />

        <div className="p-6">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              unsure
                ? 'bg-gray-100 text-gray-700'
                : categoryColors[details.category] || 'bg-gray-100 text-gray-700'
            }`}
          >
            {unsure ? 'Not sure' : categoryLabels[details.category] || details.category}
          </span>

          <h2 className="mt-3 text-2xl font-extrabold text-gray-900">
            {unsure
              ? "We couldn't identify this leaf"
              : healthy
                ? `${prediction.crop} leaf looks healthy`
                : prediction.disease}
          </h2>
          <p className="text-gray-500">
            {unsure ? `Best guess: ${bestGuess}` : prediction.crop}
          </p>

          <div className="mt-5">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Confidence</span>
              <span className="font-semibold text-gray-900">{percent(prediction.confidence)}</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${barColor(prediction.confidence)}`}
                style={{ width: percent(prediction.confidence) }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 border-t border-gray-100 p-6">
        {unsure ? (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">The result is too uncertain to give advice.</p>
              <p className="mt-1">
                Giving treatment for the wrong problem could do more harm than good, so we are not
                showing any.
              </p>
            </div>

            <Section title="For a better photo">
              <ul className="list-disc space-y-1 pl-5 text-gray-700">
                <li>Photograph one leaf and fill most of the frame with it</li>
                <li>Use daylight, and avoid flash and harsh shadows</li>
                <li>Keep the leaf in sharp focus, with a plain background if possible</li>
                <li>Make sure it is a plant leaf, not a whole plant, a fruit or something else</li>
              </ul>
            </Section>

            <Section title="What GreenBuddy knows">
              <p className="text-gray-700">
                Right now it recognises diseases of: {supportedCrops}.
              </p>
            </Section>
          </>
        ) : (
          <>
            <Section title={healthy ? 'What we see' : 'What it looks like'}>
              <p className="text-gray-700">{details.symptoms}</p>
            </Section>

            <Section title={healthy ? 'Good news' : 'What to do'}>
              <ol className="space-y-2">
                {details.treatment.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-800">
                      {i + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="How to prevent it">
              <ul className="list-disc space-y-1 pl-5 text-gray-700">
                {details.prevention.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </Section>

            {alternatives.length > 0 && (
              <Section title="Other possibilities">
                <ul className="space-y-1 text-sm text-gray-600">
                  {alternatives.map((alt, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {alt.crop}: {alt.disease}
                      </span>
                      <span>{percent(alt.confidence)}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <p className="text-xs text-gray-400">{disclaimer}</p>
          </>
        )}
      </div>
    </div>
  )
}