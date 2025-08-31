import React from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageModalProps {
  isOpen: boolean
  images: string[]
  captions: string[]
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  images,
  captions,
  currentIndex,
  onClose,
  onNavigate
}) => {
  if (!isOpen) return null

  const currentImage = images[currentIndex]
  const currentCaption = captions[currentIndex] || ''
  const hasMultipleImages = images.length > 1

  const handlePrevious = () => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
    onNavigate(newIndex)
  }

  const handleNext = () => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
    onNavigate(newIndex)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowLeft') {
      handlePrevious()
    } else if (e.key === 'ArrowRight') {
      handleNext()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="relative max-w-6xl max-h-full w-full">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
          aria-label="Close modal"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Navigation arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Image */}
        <div className="flex flex-col items-center">
          <img
            src={currentImage}
            alt={`Example ${currentIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            loading="lazy"
          />
          
          {/* Caption */}
          {currentCaption && (
            <div className="mt-4 text-center text-white max-w-2xl">
              <p className="text-lg">{currentCaption}</p>
            </div>
          )}
          
          {/* Image counter */}
          {hasMultipleImages && (
            <div className="mt-4 text-white text-sm">
              {currentIndex + 1} of {images.length}
            </div>
          )}
        </div>

        {/* Keyboard navigation hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm opacity-70">
          {hasMultipleImages && (
            <span>Use ← → arrow keys to navigate</span>
          )}
          <span className="ml-4">Press ESC to close</span>
        </div>
      </div>
    </div>
  )
}
