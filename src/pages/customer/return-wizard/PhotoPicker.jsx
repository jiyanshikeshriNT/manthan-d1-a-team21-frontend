import { useEffect, useId, useMemo, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from '../../../domain/returns'

/** Optional single photo with client-side type/size checks, preview and remove. */
export default function PhotoPicker({ file, onChange, itemName }) {
  const id = useId()
  const [error, setError] = useState('')
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function pick(e) {
    const f = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again after removing it
    if (!f) return
    if (!PHOTO_TYPES.includes(f.type)) return setError('Use a JPEG, PNG or WebP image.')
    if (f.size > MAX_PHOTO_BYTES) return setError('This photo is larger than 5 MB. Choose a smaller one.')
    setError('')
    onChange(f)
  }

  if (file && preview) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-line bg-canvas p-2">
        <img src={preview} alt={`Your photo of ${itemName}`} className="size-16 rounded-md object-cover" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="truncate font-medium">{file.name}</p>
          <p className="text-muted tabular">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-danger hover:bg-danger-soft"
        >
          <Trash2 className="size-4" aria-hidden="true" /> Remove
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium">
        Photo <span className="font-normal text-muted">(optional, helps us check damage faster)</span>
      </span>
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong px-4 py-3 text-sm font-medium text-secondary hover:bg-secondary-soft focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent"
      >
        <ImagePlus className="size-5" aria-hidden="true" />
        Add a photo
        <span className="font-normal text-muted">JPEG, PNG or WebP · up to 5 MB</span>
        <input
          id={id}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          onChange={pick}
          className="sr-only"
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          aria-label={`Add a photo of ${itemName}`}
        />
      </label>
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm font-medium text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
