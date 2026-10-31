export function formatDate(iso) {
  // The server sends UTC times without a timezone marker, so add one
  const utc = /Z|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`
  return new Date(utc).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
  export function statusOf(scan) {
  if (scan.not_a_leaf) return { label: 'Not a leaf', className: 'bg-gray-100 text-gray-700' }
  if (scan.low_confidence) return { label: 'Unsure', className: 'bg-gray-100 text-gray-700' }
  if (scan.is_healthy) return { label: 'Healthy', className: 'bg-green-100 text-green-800' }
  return { label: 'Needs attention', className: 'bg-amber-100 text-amber-800' }
}

export function scanTitle(scan) {
  if (scan.not_a_leaf) return 'Not a leaf'
  if (scan.low_confidence) return 'Could not identify'
  if (scan.is_healthy) return `${scan.crop}: healthy`
  return `${scan.crop}: ${scan.disease}`
}