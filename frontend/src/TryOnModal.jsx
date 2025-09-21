import React, { useEffect, useRef, useState } from 'react'

export default function TryOnModal({ productImage, onClose }){
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [pos, setPos] = useState({ x: 100, y: 50, w: 300, h: 400, dragging: false, start: null })

  useEffect(()=>{
    async function start(){
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        setStream(s)
        if(videoRef.current) videoRef.current.srcObject = s
      } catch(e){
        alert('Could not open camera: ' + e.message)
      }
    }
    start()
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()) }
  }, [])

  // Simple drag handlers
  function onMouseDown(e){
    const rect = overlayRef.current.getBoundingClientRect()
    setPos(p => ({ ...p, dragging: true, start: { mx: e.clientX, my: e.clientY, ox: p.x, oy: p.y } }))
  }
  function onMouseMove(e){
    setPos(p => {
      if (!p.dragging || !p.start) return p
      const dx = e.clientX - p.start.mx
      const dy = e.clientY - p.start.my
      return { ...p, x: p.start.ox + dx, y: p.start.oy + dy }
    })
  }
  function onMouseUp(){ setPos(p => ({ ...p, dragging: false, start: null })) }

  // simple wheel to scale
  function onWheel(e){
    e.preventDefault()
    setPos(p => {
      const delta = e.deltaY < 0 ? 20 : -20
      return { ...p, w: Math.max(50, p.w + delta), h: Math.max(50, p.h + delta) }
    })
  }

  return (
    <div className="modal" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div className="modal-content">
        <button className="close" onClick={onClose}>✕</button>
        <div className="tryon-wrap">
          <video ref={videoRef} autoPlay playsInline muted className="camera" />
          <img
            ref={overlayRef}
            src={productImage}
            alt="overlay"
            className="overlay"
            onMouseDown={onMouseDown}
            onWheel={onWheel}
            style={{ left: pos.x, top: pos.y, width: pos.w, height: pos.h, position: 'absolute', pointerEvents: 'auto', opacity: 0.95 }}
          />
        </div>
        <div className="note">Drag overlay to position. Use mouse wheel to scale. (Mobile: pinch/resize not implemented.)</div>
      </div>
    </div>
  )
}
