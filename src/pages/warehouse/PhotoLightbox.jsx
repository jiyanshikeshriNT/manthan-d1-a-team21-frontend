import { X } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

/** Customer photo in a modal. Esc, the Close button or a click outside closes it. */
export default function PhotoLightbox({ photo, onClose }) {
  return (
    <Modal open={Boolean(photo)} onClose={onClose} label="Customer photo">
      {photo && (
        <div className="grid gap-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{photo.title}</h2>
            <Button variant="ghost" onClick={onClose} aria-label="Close photo">
              <X className="size-4" aria-hidden="true" /> Close
            </Button>
          </div>
          <img src={photo.url} alt={`Customer photo of ${photo.title}`} className="max-h-[70dvh] w-full rounded-lg bg-canvas object-contain" />
        </div>
      )}
    </Modal>
  )
}
