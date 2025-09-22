// frontend/src/ImagineModal.jsx
import React, { useRef, useState } from 'react'

export default function ImagineModal({ productImage, onClose }){
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [userImg, setUserImg] = useState(null) // dataURL of person photo
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resultImage, setResultImage] = useState(null)

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

  // helper: convert dataURL to Blob
  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while(n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new Blob([u8arr], { type: mime })
  }

  // fetch the product image from server as blob
  async function fetchProductBlob(url) {
    const r = await fetch(url)
    if(!r.ok) throw new Error('Failed to fetch product image')
    const b = await r.blob()
    return b
  }

  // call backend /api/tryon (only images, no prompt)
  async function callAIStyleMirror(){
    try {
      setLoading(true)
      setResultImage(null)

      // productImage is typically a URL (e.g., http://localhost:4000/images/deshi1.jpg)
      const productBlob = await fetchProductBlob(productImage)

      if(!userImg) {
        alert('Please capture or upload a person image first.')
        setLoading(false)
        return
      }
      const userBlob = dataURLtoBlob(userImg)

      const form = new FormData()
      form.append('image1', productBlob, 'product.jpg') // product from Myntra (image1)
      form.append('image2', userBlob, 'person.jpg')     // user / person (image2)
      // DO NOT append prompt - backend will use its default server-side prompt

      const resp = await fetch('http://localhost:4000/api/tryon', { method: 'POST', body: form })
      const data = await resp.json()

      // Prefer stable resultUrl returned by backend
      if (data.resultUrl) {
        const url = data.resultUrl.startsWith('http') ? data.resultUrl : `http://localhost:4000${data.resultUrl}`
        setResultImage(url)
      } else if (data.resultDataUrl) {
        setResultImage(data.resultDataUrl)
      } else if (data.output_url) {
        setResultImage(data.output_url)
      } else if (data.raw && data.raw.output && data.raw.output[0] && data.raw.output[0].image) {
        setResultImage(data.raw.output[0].image)
      } else {
        console.warn('Tryon response did not include an image. Full response:', data)
        alert('No image returned by model. Check backend logs / Banana response. See console.')
      }
    } catch (err) {
      console.error('callAIStyleMirror error', err)
      alert('Error calling AI try-on: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function onDownloadResult(){
    if(!resultImage) return
    const a = document.createElement('a')
    a.href = resultImage
    a.download = 'stylemirror-ai-result.jpg'
    a.click()
  }

  return (
    <div className="modal">
      <div className="modal-content small" style={{ maxWidth: 900 }}>
        <button className="close" onClick={() => { stopCamera(); onClose(); }}>✕</button>

        {!userImg && (
          <>
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
              <div>
                <button onClick={startCamera}>Open Camera</button>
                {streaming && <button onClick={takeSnapshot}>Capture Photo</button>}
                <button onClick={stopCamera}>Stop Camera</button>
              </div>
              <div>
                <input type="file" accept="image/*" onChange={onUpload} />
              </div>
            </div>

            <div className="camera-area" style={{ display:'flex', gap:10 }}>
              <video ref={videoRef} autoPlay playsInline muted className="camera-small" />
              <div>
                <p style={{ margin:0, fontSize:13 }}>Person image will be used as "image2".</p>
              </div>
            </div>
          </>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {userImg && (
          <div style={{ display:'flex', gap:12, marginTop:12, alignItems:'center' }}>
            <div>
              <img src={userImg} alt="person" style={{ maxWidth:200, borderRadius:6, border:'1px solid #ddd' }} />
            </div>
            <div>
              <button onClick={() => setUserImg(null)}>Retake / Upload Again</button>
            </div>
          </div>
        )}

        <div style={{ marginTop:12, display:'flex', gap:10 }}>
          <button disabled={loading} onClick={callAIStyleMirror} className="btn pink">
            {loading ? 'Processing…' : 'StyleMirror AI'}
          </button>
          <button onClick={mergeImages} className="btn">Generate Local Mock (download)</button>
          <button onClick={() => { setUserImg(null); setResultImage(null); }}>Clear</button>
        </div>

        <div style={{ marginTop:12 }}>
          <strong>Product preview (will be used as image1):</strong>
          <div style={{ marginTop:8 }}>
            <img src={productImage} alt="product" style={{ maxWidth:200, borderRadius:6, border:'1px solid #ddd' }} />
          </div>
        </div>

        <div style={{ marginTop:18 }}>
          { resultImage && (
            <>
              <h4>AI Result</h4>
              <img src={resultImage} alt="AI Result" style={{ maxWidth:'100%', borderRadius:6, border:'1px solid #ddd' }} />
              <div style={{ marginTop:8 }}>
                <button onClick={onDownloadResult}>Download Result</button>
              </div>
            </>
          ) }
        </div>

        <p className="small-note">StyleMirror AI merges product+person by calling a backend model (Gemini Nano via Banana). If no image is returned, check backend logs for the raw response.</p>
      </div>
    </div>
  )

  // local mock mergeImages kept for offline demo:
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

    const targetW = canvas.width * 0.6
    const aspect = overlay.width / overlay.height
    const targetH = targetW / aspect
    const x = (canvas.width - targetW) / 2
    const y = canvas.height * 0.12
    ctx.drawImage(overlay, x, y, targetW, targetH)

    const result = canvas.toDataURL('image/jpeg')
    const a = document.createElement('a')
    a.href = result
    a.download = 'stylemirror-result.jpg'
    a.click()
  }
}
