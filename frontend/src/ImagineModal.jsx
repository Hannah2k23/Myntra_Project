import React, { useRef, useState } from 'react'

export default function ImagineModal({ productImage, onClose }){
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [userImg, setUserImg] = useState(null)
  const [streaming, setStreaming] = useState(false)

  async function startCamera(){
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = s
      await videoRef.current.play()
      setStreaming(true)
    } catch(e){
      alert('Camera error: ' + e.message)
    }
  }

  function stopCamera(){
    if(videoRef.current && videoRef.current.srcObject){
      videoRef.current.srcObject.getTracks().forEach(t=>t.stop())
    }
    setStreaming(false)
  }

  function takeSnapshot(){
    const vw = videoRef.current.videoWidth
    const vh = videoRef.current.videoHeight
    const ctx = canvasRef.current.getContext('2d')
    canvasRef.current.width = vw
    canvasRef.current.height = vh
    ctx.drawImage(videoRef.current, 0, 0, vw, vh)
    setUserImg(canvasRef.current.toDataURL('image/jpeg'))
    stopCamera()
  }

  function onUpload(e){
    const f = e.target.files[0]
    if(!f) return
    const reader = new FileReader()
    reader.onload = () => setUserImg(reader.result)
    reader.readAsDataURL(f)
  }

  async function mergeImages(){
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const base = new Image()
    base.crossOrigin = 'anonymous'
    base.src = userImg
    await new Promise(res => base.onload = res)
    canvas.width = base.width
    canvas.height = base.height
    ctx.drawImage(base, 0, 0)

    const overlay = new Image()
    overlay.crossOrigin = 'anonymous'
    overlay.src = productImage
    await new Promise(res => overlay.onload = res)

    // naive placement: draw overlay at center top, scaled to 60% width
    const targetW = canvas.width * 0.6
    const aspect = overlay.width / overlay.height
    const targetH = targetW / aspect
    const x = (canvas.width - targetW) / 2
    const y = canvas.height * 0.12
    ctx.drawImage(overlay, x, y, targetW, targetH)

    // show result as download link
    const result = canvas.toDataURL('image/jpeg')
    const a = document.createElement('a')
    a.href = result
    a.download = 'stylemirror-result.jpg'
    a.click()
  }

  return (
    <div className="modal">
      <div className="modal-content small">
        <button className="close" onClick={() => { stopCamera(); onClose(); }}>✕</button>

        {!userImg && (
          <>
            <div className="controls">
              <button onClick={startCamera}>Open Camera</button>
              <input type="file" accept="image/*" onChange={onUpload} />
            </div>
            <div className="camera-area">
              <video ref={videoRef} autoPlay playsInline muted className="camera-small" />
              <div>
                {streaming && <button onClick={takeSnapshot}>Capture Photo</button>}
              </div>
            </div>
          </>
        )}

        <canvas ref={canvasRef} style={{ maxWidth: '100%' }} />

        {userImg && (
          <div className="actions">
            <button onClick={mergeImages}>Generate StyleMirror (download)</button>
            <button onClick={() => { setUserImg(null); }}>Try Again</button>
          </div>
        )}

        <p className="small-note">StyleMirror produces a quick merged preview. For realistic try-on use segmentation / 3D fitting models.</p>
      </div>
    </div>
  )
}
