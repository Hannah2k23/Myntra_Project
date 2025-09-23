// frontend/src/ImagineModal.jsx
import React, { useRef, useState } from 'react'

export default function ImagineModal({ productImage, onClose }){
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [userImg, setUserImg] = useState(null) // dataURL of person photo
  const [imageSource, setImageSource] = useState(null) // Track source: 'camera' or 'upload'
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resultImage, setResultImage] = useState(null)

  // Target dimensions for consistent output
  const TARGET_WIDTH = 512
  const TARGET_HEIGHT = 768

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
    
    // Resize to target dimensions
    canvasRef.current.width = TARGET_WIDTH
    canvasRef.current.height = TARGET_HEIGHT
    
    // Calculate aspect ratios to maintain proportions while fitting
    const videoAspect = vw / vh
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT
    
    let drawWidth, drawHeight, offsetX, offsetY
    
    if (videoAspect > targetAspect) {
      // Video is wider - fit by height
      drawHeight = TARGET_HEIGHT
      drawWidth = drawHeight * videoAspect
      offsetX = (TARGET_WIDTH - drawWidth) / 2
      offsetY = 0
    } else {
      // Video is taller - fit by width
      drawWidth = TARGET_WIDTH
      drawHeight = drawWidth / videoAspect
      offsetX = 0
      offsetY = (TARGET_HEIGHT - drawHeight) / 2
    }
    
    // Fill background with neutral color
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)
    
    ctx.drawImage(videoRef.current, offsetX, offsetY, drawWidth, drawHeight)
    setUserImg(canvasRef.current.toDataURL('image/jpeg'))
    setImageSource('camera') // Set source as camera
    stopCamera()
  }

  function onUpload(e){
    const f = e.target.files[0]
    if(!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        // Resize uploaded image to target dimensions
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        canvas.width = TARGET_WIDTH
        canvas.height = TARGET_HEIGHT
        
        const imgAspect = img.width / img.height
        const targetAspect = TARGET_WIDTH / TARGET_HEIGHT
        
        let drawWidth, drawHeight, offsetX, offsetY
        
        if (imgAspect > targetAspect) {
          drawHeight = TARGET_HEIGHT
          drawWidth = drawHeight * imgAspect
          offsetX = (TARGET_WIDTH - drawWidth) / 2
          offsetY = 0
        } else {
          drawWidth = TARGET_WIDTH
          drawHeight = drawWidth / imgAspect
          offsetX = 0
          offsetY = (TARGET_HEIGHT - drawHeight) / 2
        }
        
        // Fill background
        ctx.fillStyle = '#f0f0f0'
        ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
        setUserImg(canvas.toDataURL('image/jpeg'))
        setImageSource('upload') // Set source as upload
      }
      img.src = reader.result
    }
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

  // fetch and resize product image
  async function fetchAndResizeProductBlob(url) {
    const r = await fetch(url)
    if(!r.ok) throw new Error('Failed to fetch product image')
    const blob = await r.blob()
    
    // Resize product image to match target dimensions
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = TARGET_WIDTH
        canvas.height = TARGET_HEIGHT
        
        const imgAspect = img.width / img.height
        const targetAspect = TARGET_WIDTH / TARGET_HEIGHT
        
        let drawWidth, drawHeight, offsetX, offsetY
        
        if (imgAspect > targetAspect) {
          drawHeight = TARGET_HEIGHT
          drawWidth = drawHeight * imgAspect
          offsetX = (TARGET_WIDTH - drawWidth) / 2
          offsetY = 0
        } else {
          drawWidth = TARGET_WIDTH
          drawHeight = drawWidth / imgAspect
          offsetX = 0
          offsetY = (TARGET_HEIGHT - drawHeight) / 2
        }
        
        // Fill background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)
        
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
        
        canvas.toBlob((resizedBlob) => {
          resolve(resizedBlob)
        }, 'image/jpeg', 0.9)
      }
      img.src = URL.createObjectURL(blob)
    })
  }

  // call backend /api/tryon with consistent dimensions
  async function callAIStyleMirror(){
    try {
      setLoading(true)
      setResultImage(null)

      const productBlob = await fetchAndResizeProductBlob(productImage)

      if(!userImg || !imageSource) {
        alert('Please capture or upload a person image first.')
        setLoading(false)
        return
      }
      const userBlob = dataURLtoBlob(userImg)

      const form = new FormData()
      form.append('image1', productBlob, 'product.jpg')
      form.append('image2', userBlob, 'person.jpg')
      // Add the source type explicitly
      form.append('source_type', imageSource) // 'camera' or 'upload'
      // Add dimension parameters for backend if supported
      form.append('target_width', TARGET_WIDTH.toString())
      form.append('target_height', TARGET_HEIGHT.toString())
      // Add explicit prompt for better try-on results
      form.append('prompt', 'Virtual try-on: Show the person wearing the product clothing item. The person should be wearing the exact clothing item from image1. Maintain the person\'s face and body pose from image2, but replace their clothing with the product from image1. High quality, realistic, natural lighting.')

      const resp = await fetch('http://localhost:4000/api/tryon', { method: 'POST', body: form })
      const data = await resp.json()

      // Process result and FORCE consistent dimensions
      let imageUrl = null
      if (data.resultUrl) {
        imageUrl = data.resultUrl.startsWith('http') ? data.resultUrl : `http://localhost:4000${data.resultUrl}`
      } else if (data.resultDataUrl) {
        imageUrl = data.resultDataUrl
      } else if (data.output_url) {
        imageUrl = data.output_url
      } else if (data.raw && data.raw.output && data.raw.output[0] && data.raw.output[0].image) {
        imageUrl = data.raw.output[0].image
      } else {
        console.warn('Tryon response did not include an image. Full response:', data)
        alert('No image returned by model. Check backend logs / Banana response. See console.')
        return
      }

      // ALWAYS resize AI result to match our target dimensions
      if (imageUrl) {
        console.log('Original AI result URL:', imageUrl)
        console.log('Source type detected:', data.inputTypeDetected)
        const resizedResult = await forceResizeImage(imageUrl)
        setResultImage(resizedResult)
        console.log('Resized to:', TARGET_WIDTH, 'x', TARGET_HEIGHT)
      }
    } catch (err) {
      console.error('callAIStyleMirror error', err)
      alert('Error calling AI try-on: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // FORCE resize any image to exact target dimensions
  async function forceResizeImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        console.log('Original image dimensions:', img.width, 'x', img.height)
        
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // FORCE exact dimensions - no aspect ratio preservation
        canvas.width = TARGET_WIDTH
        canvas.height = TARGET_HEIGHT
        
        // Fill with white background first
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)
        
        // Option 1: Stretch to fit (may distort)
        // ctx.drawImage(img, 0, 0, TARGET_WIDTH, TARGET_HEIGHT)
        
        // Option 2: Crop to fit (maintains aspect ratio, may crop content)
        const imgAspect = img.width / img.height
        const targetAspect = TARGET_WIDTH / TARGET_HEIGHT
        
        let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height
        
        if (imgAspect > targetAspect) {
          // Image is wider - crop sides
          sourceWidth = img.height * targetAspect
          sourceX = (img.width - sourceWidth) / 2
        } else {
          // Image is taller - crop top/bottom
          sourceHeight = img.width / targetAspect
          sourceY = (img.height - sourceHeight) / 2
        }
        
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT)
        
        const result = canvas.toDataURL('image/jpeg', 0.95)
        console.log('Resized image to:', TARGET_WIDTH, 'x', TARGET_HEIGHT)
        resolve(result)
      }
      
      img.onerror = () => {
        console.error('Failed to load image for resizing:', imageUrl)
        reject(new Error('Failed to load image for resizing'))
      }
      
      img.src = imageUrl
    })
  }

  async function onDownloadResult(){
    if(!resultImage) return
    const a = document.createElement('a')
    a.href = resultImage
    a.download = `stylemirror-ai-result-${TARGET_WIDTH}x${TARGET_HEIGHT}.jpg`
    a.click()
  }

  // Updated local mock with consistent dimensions
  async function mergeImages(){
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Set consistent output dimensions
    canvas.width = TARGET_WIDTH
    canvas.height = TARGET_HEIGHT
    
    // Fill background
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)
    
    const base = new Image()
    base.crossOrigin = 'anonymous'
    base.src = userImg
    await new Promise(res => base.onload = res)
    
    // Draw user image to fill canvas
    const userAspect = base.width / base.height
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT
    
    let baseWidth, baseHeight, baseX, baseY
    if (userAspect > targetAspect) {
      baseHeight = TARGET_HEIGHT
      baseWidth = baseHeight * userAspect
      baseX = (TARGET_WIDTH - baseWidth) / 2
      baseY = 0
    } else {
      baseWidth = TARGET_WIDTH
      baseHeight = baseWidth / userAspect
      baseX = 0
      baseY = (TARGET_HEIGHT - baseHeight) / 2
    }
    
    ctx.drawImage(base, baseX, baseY, baseWidth, baseHeight)

    const overlay = new Image()
    overlay.crossOrigin = 'anonymous'
    overlay.src = productImage
    await new Promise(res => overlay.onload = res)

    // Overlay product with consistent sizing
    const targetW = TARGET_WIDTH * 0.6
    const aspect = overlay.width / overlay.height
    const targetH = targetW / aspect
    const x = (TARGET_WIDTH - targetW) / 2
    const y = TARGET_HEIGHT * 0.12
    ctx.drawImage(overlay, x, y, targetW, targetH)

    const result = canvas.toDataURL('image/jpeg', 0.9)
    const a = document.createElement('a')
    a.href = result
    a.download = `stylemirror-result-${TARGET_WIDTH}x${TARGET_HEIGHT}.jpg`
    a.click()
  }

  return (
    <div className="modal">
      <div className="modal-content small" style={{ maxWidth: 900 }}>
        <button className="close" onClick={() => { stopCamera(); onClose(); }}>✕</button>

        <div style={{ marginBottom: 10, fontSize: 12, color: '#666' }}>
          Output dimensions: {TARGET_WIDTH} × {TARGET_HEIGHT}px
          {imageSource && <span> | Source: {imageSource}</span>}
        </div>

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
                <p style={{ margin:0, fontSize:13 }}>Person image will be resized to {TARGET_WIDTH}×{TARGET_HEIGHT}px</p>
              </div>
            </div>
          </>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {userImg && (
          <div style={{ display:'flex', gap:12, marginTop:12, alignItems:'center' }}>
            <div>
              <img src={userImg} alt="person" style={{ maxWidth:200, borderRadius:6, border:'1px solid #ddd' }} />
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                {TARGET_WIDTH} × {TARGET_HEIGHT}px ({imageSource})
              </div>
            </div>
            <div>
              <button onClick={() => { 
                setUserImg(null); 
                setImageSource(null); 
              }}>Retake / Upload Again</button>
            </div>
          </div>
        )}

        <div style={{ marginTop:12, display:'flex', gap:10 }}>
          <button disabled={loading} onClick={callAIStyleMirror} className="btn pink">
            {loading ? 'Processing…' : 'StyleMirror AI'}
          </button>
          <button onClick={mergeImages} className="btn">Generate Local Mock (download)</button>
          <button onClick={() => { 
            setUserImg(null); 
            setImageSource(null); 
            setResultImage(null); 
          }}>Clear</button>
        </div>

        <div style={{ marginTop:12 }}>
          <strong>Product preview:</strong>
          <div style={{ marginTop:8 }}>
            <img src={productImage} alt="product" style={{ maxWidth:200, borderRadius:6, border:'1px solid #ddd' }} />
          </div>
        </div>

        <div style={{ marginTop:18 }}>
          { resultImage && (
            <>
              {/* <h4>AI Result (FORCED to {TARGET_WIDTH} × {TARGET_HEIGHT}px)</h4> */}
              <div style={{ border: '2px solid #007bff', padding: 4, display: 'inline-block', borderRadius: 8 }}>
                <img src={resultImage} alt="AI Result" 
                     style={{ 
                       width: `${TARGET_WIDTH/2}px`, 
                       height: `${TARGET_HEIGHT/2}px`, 
                       display: 'block',
                       objectFit: 'contain'
                     }} />
              </div>
              <div style={{ marginTop:8, fontSize: 12, color: '#666' }}>
                Displayed at 50% scale for preview. Actual size: {TARGET_WIDTH}×{TARGET_HEIGHT}px
              </div>
              <div style={{ marginTop:8 }}>
                <button onClick={onDownloadResult}>Download Result</button>
              </div>
            </>
          ) }
        </div>

        <p className="small-note">
          All images are standardized to {TARGET_WIDTH}×{TARGET_HEIGHT}px for consistency. 
          StyleMirror AI merges product+person by calling a backend model (Gemini Nano via Banana).
        </p>
      </div>
    </div>
  )
}