'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react'

interface DraggablePanelProps {
  children: React.ReactNode
  defaultX?: number
  defaultY?: number
  defaultWidth?: number
  title?: string
}

export function DraggablePanel({
  children,
  defaultX = 20,
  defaultY = 20,
  defaultWidth = 420,
  title = 'Controls'
}: DraggablePanelProps) {
  const [position, setPosition] = useState({ x: defaultX, y: defaultY })
  const [width, setWidth] = useState(defaultWidth)
  const [height, setHeight] = useState(500)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeMode, setResizeMode] = useState<'width' | 'height' | 'corner' | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isCollapsed, setIsCollapsed] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return

      if (isDragging) {
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y
        setPosition({ x: newX, y: newY })
      }

      if (isResizing && panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect()

        if (resizeMode === 'width' || resizeMode === 'corner') {
          const newWidth = e.clientX - rect.left
          // Minimum width of 300px, maximum of 800px
          setWidth(Math.max(300, Math.min(800, newWidth)))
        }

        if (resizeMode === 'height' || resizeMode === 'corner') {
          const newHeight = e.clientY - rect.top
          // Minimum height of 300px, maximum of 800px
          setHeight(Math.max(300, Math.min(800, newHeight)))
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeMode(null)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragOffset, resizeMode])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!headerRef.current) return

    const rect = headerRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setIsDragging(true)
  }

  const handleResizeMouseDown = (e: React.MouseEvent, mode: 'width' | 'height' | 'corner') => {
    e.preventDefault()
    setIsResizing(true)
    setResizeMode(mode)
  }

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bg-slate-900/95 backdrop-blur-md border border-medical-primary/30 rounded-lg shadow-xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${width}px`,
        height: isCollapsed ? 'auto' : `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        userSelect: isDragging || isResizing ? 'none' : 'auto'
      }}
    >
      {/* Header - Draggable */}
      <div
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between p-3 border-b border-medical-primary/20 cursor-grab active:cursor-grabbing bg-gradient-to-r from-medical-primary/10 to-yellow-500/10 rounded-t-lg"
      >
        <h2 className="text-sm font-semibold text-medical-primary">{title}</h2>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-medical-primary/20 rounded transition-colors"
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-medical-primary" />
          ) : (
            <ChevronUp className="h-4 w-4 text-medical-primary" />
          )}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {children}
        </div>
      )}

      {/* Resize Handle */}
      {!isCollapsed && (
        <>
          {/* Right edge - width resize */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'width')}
            className="absolute right-0 top-12 bottom-0 w-1 bg-transparent hover:bg-medical-primary/50 cursor-col-resize transition-colors"
            title="Drag to resize width"
          />

          {/* Bottom edge - height resize */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'height')}
            className="absolute bottom-0 left-0 right-0 h-1 bg-transparent hover:bg-medical-primary/50 cursor-row-resize transition-colors"
            title="Drag to resize height"
          />

          {/* Bottom-right corner - both dimensions */}
          <div
            onMouseDown={(e) => handleResizeMouseDown(e, 'corner')}
            className="absolute bottom-0 right-0 w-4 h-4 bg-transparent hover:bg-medical-primary/50 cursor-nwse-resize transition-colors"
            title="Drag to resize both"
          />
        </>
      )}
    </div>
  )
}
