import React, { useCallback, useRef, useState } from 'react'
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'

export default function ImageNodeView({ node, updateAttributes, selected, editor, getPos }: NodeViewProps) {
  const { src, width, height } = node.attrs
  const [resizing, setResizing] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const selectNode = useCallback(() => {
    if (editor && typeof getPos === 'function') {
      const pos = getPos()
      if (typeof pos === 'number') {
        editor.chain().focus().setNodeSelection(pos).run()
      }
    }
  }, [editor, getPos])

  const onResizeStart = useCallback((e: React.MouseEvent, direction: 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = imageRef.current?.offsetWidth || 400

    const onMouseMove = (ev: MouseEvent) => {
      const delta = (direction === 'se' || direction === 'ne')
        ? ev.clientX - startXRef.current
        : startXRef.current - ev.clientX
      const newWidth = Math.max(100, startWidthRef.current + delta)
      const aspect = (imageRef.current?.naturalHeight || 1) / (imageRef.current?.naturalWidth || 1)
      updateAttributes({ width: `${newWidth}px`, height: `${Math.round(newWidth * aspect)}px` })
    }

    const onMouseUp = () => {
      setResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [updateAttributes])

  return (
    <NodeViewWrapper className="image-node-wrapper">
      <div
        className={`relative inline-block group ${selected ? 'ring-2 ring-blue-500 rounded' : ''}`}
        data-drag-handle
        onClick={selectNode}
        style={{ cursor: 'grab' }}
      >
        <img
          ref={imageRef}
          src={src}
          width={width}
          height={height}
          className="max-w-full h-auto rounded"
          draggable={false}
          alt=""
        />
        {selected && (['nw', 'ne', 'sw', 'se'] as const).map((dir) => (
          <div
            key={dir}
            className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm hover:scale-110 transition-transform"
            style={{
              [dir.includes('n') ? 'top' : 'bottom']: '-5px',
              [dir.includes('w') ? 'left' : 'right']: '-5px',
              pointerEvents: resizing ? 'none' : ('auto' as const),
              cursor: `${dir}-resize`,
            }}
            onMouseDown={(e) => onResizeStart(e, dir)}
          />
        ))}
      </div>
    </NodeViewWrapper>
  )
}
