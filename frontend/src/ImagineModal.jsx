import React, { useRef, useState, useEffect } from 'react'

export default function ImagineModal({ productImage, onClose }){
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [userImg, setUserImg] = useState(null)
  const [imageSource, setImageSource] = useState(null)
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resultImage, setResultImage] = useState(null)

  // Consistent dimensions - portrait orientation like Myntra
  const TARGET_WIDTH = 512
  const TARGET_HEIGHT = 768
  

  useEffect(() => {
    // cleanup on unmount: stop camera
    return () => {
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startCamera(){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera API not supported in this browser')
      return
    }

    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })

      if (!videoRef.current) {
        setStreaming(true)
        await new Promise(resolve => setTimeout(resolve, 50))
      } else {
        setStreaming(true)
      }

      if (videoRef.current) {
        videoRef.current.srcObject = s
        try { await videoRef.current.play() } catch(e) { /* autoplay blocked */ }
        setStreaming(true)
      } else {
        s.getTracks().forEach(t => t.stop())
        throw new Error('Video element not available')
      }
    } catch(e){
      console.error('startCamera error', e)
      alert('Camera access denied: ' + (e && e.message ? e.message : e))
    }
  }

  function stopCamera(){
    try {
      const vid = videoRef.current
      if (vid?.srcObject) {
        const stream = vid.srcObject
        if (typeof stream.getTracks === 'function') {
          stream.getTracks().forEach(t => t.stop())
        }
        vid.srcObject = null
      }
    } catch (err) {
      console.warn('stopCamera error', err)
    } finally {
      setStreaming(false)
    }
  }

  function resizeImageToCanvas(source, canvas) {
    const ctx = canvas.getContext('2d')
    canvas.width = TARGET_WIDTH
    canvas.height = TARGET_HEIGHT

    const srcW = source.videoWidth ?? source.width
    const srcH = source.videoHeight ?? source.height

    const sourceAspect = srcW / srcH
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT

    let drawWidth, drawHeight, offsetX, offsetY

    if (sourceAspect > targetAspect) {
      drawHeight = TARGET_HEIGHT
      drawWidth = drawHeight * sourceAspect
      offsetX = (TARGET_WIDTH - drawWidth) / 2
      offsetY = 0
    } else {
      drawWidth = TARGET_WIDTH
      drawHeight = drawWidth / sourceAspect
      offsetX = 0
      offsetY = (TARGET_HEIGHT - drawHeight) / 2
    }

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)
    ctx.drawImage(source, offsetX, offsetY, drawWidth, drawHeight)

    return canvas.toDataURL('image/jpeg', 0.92)
  }

  function takeSnapshot(){
    if (!videoRef.current) {
      alert('Video not ready')
      return
    }
    const canvas = canvasRef.current ?? document.createElement('canvas')
    const dataUrl = resizeImageToCanvas(videoRef.current, canvas)
    setUserImg(dataUrl)
    setImageSource('camera')
    stopCamera()
  }

  function onUpload(e){
    const f = e.target.files && e.target.files[0]
    if(!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current ?? document.createElement('canvas')
        const dataUrl = resizeImageToCanvas(img, canvas)
        setUserImg(dataUrl)
        setImageSource('upload')
      }
      img.onerror = () => alert('Failed to load uploaded image')
      img.src = reader.result
    }
    reader.onerror = () => alert('Failed to read file')
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',')
    const mime = arr[0].match(/:(.*?);/)[1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while(n--) u8arr[n] = bstr.charCodeAt(n)
    return new Blob([u8arr], { type: mime })
  }

  async function fetchAndResizeProductBlob(url) {
    const r = await fetch(url)
    if(!r.ok) throw new Error('Failed to fetch product image')
    const blob = await r.blob()

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const dataUrl = resizeImageToCanvas(img, canvas)
        canvas.toBlob((resizedBlob) => {
          if (!resizedBlob) return reject(new Error('Failed to create resized blob'))
          resolve(resizedBlob)
        }, 'image/jpeg', 0.92)
      }
      img.onerror = () => reject(new Error('Failed to load product image'))
      img.src = URL.createObjectURL(blob)
    })
  }

  async function callAIStyleMirror(){
    const startTime = Date.now()
    try {
      setLoading(true)
      setResultImage(null)

      if(!userImg || !imageSource) {
        alert('Please capture or upload your photo first.')
        setLoading(false)
        return
      }

      console.log('🚀 Starting AI try-on...')

      console.log('📦 Preparing images...')
      const productBlob = await fetchAndResizeProductBlob(productImage)
      const userBlob = dataURLtoBlob(userImg)
      console.log(`✅ Images prepared (${Date.now() - startTime}ms)`)

      const form = new FormData()
      form.append('image1', productBlob, 'product.jpg')
      form.append('image2', userBlob, 'person.jpg')
      form.append('prompt',   `You are an expert AI photo editor specializing in realistic virtual try-ons and object replacement. Your task is to seamlessly integrate clothing from one person onto another.

Input Images:

Subject Image: This is the image featuring the person whose clothing will be replaced.

Garment Reference Image: This image contains the specific piece of clothing that will be digitally transferred.

Core Action - Garment Transfer:
Identify the primary piece of upper body clothing (e.g., shirt, top, blouse, jacket, dress bodice) worn by the individual in the Subject Image. Precisely remove this garment. Subsequently, take the most prominent upper body garment from the Garment Reference Image and apply it to the person in the Subject Image.

Critical Style & Fit Replication:

Exact Garment Replication: The transferred garment must be an identical replica of the one in the Garment Reference Image in terms of its color, pattern, texture, embroidery, and any unique design details (e.g., collar type, neckline, button placement, embellishments).

Realistic Fit and Drape: The garment must conform naturally to the body shape of the individual in the Subject Image. Simulate realistic folds, wrinkles, and stretching of the fabric, consistent with how that specific material would behave on a human body in that pose.

Style Preservation: Crucially, preserve the wearing style from the Garment Reference Image. This includes:

Sleeve length and style: If the reference garment has short, long, or three-quarter sleeves, ensure the transferred garment reflects this.

Hemline and tuck: If the reference garment is tucked in, untucked, cropped, or has a specific peplum or layered hem, replicate this on the subject.

Overall silhouette: Maintain the original volume and shape of the garment (e.g., fitted, loose, A-line, boxy) as seen in the Garment Reference Image.

Strict Preservation Rules (Non-Negotiables):

Subject's Identity & Appearance: Do NOT alter the face, hair, skin tone, facial expression, posture, or any other physical characteristics of the person in the Subject Image.

Subject's Other Attire: Any clothing not specified for replacement (e.g., pants, skirt, shoes, accessories like watches or earrings) in the Subject Image must remain completely unchanged and perfectly integrated with the new upper garment.

Background and Environment: The entire background, lighting conditions, shadows, reflections, and overall atmosphere of the Subject Image must be preserved without any modifications or artifacts from the transfer process.

Seamless Blending: The transferred garment must blend flawlessly into the existing lighting and shadow environment of the Subject Image, ensuring a cohesive and photorealistic final appearance.

Output Requirements:
The final generated image must be a high-resolution, photorealistic composite where the transferred garment appears to have been naturally worn by the person in the Subject Image, with no visual cues that indicate digital manipulation.`);
      console.log('📡 Sending request to backend...')
      const resp = await fetch('http://localhost:4000/api/tryon', { 
        method: 'POST', 
        body: form 
      })
      console.log(`✅ Response received (${Date.now() - startTime}ms)`)
      
      if (!resp.ok) {
        const txt = await resp.text()
        throw new Error(`Server error: ${resp.status} ${txt}`)
      }

      // Backend returns image directly as blob
      console.log('🖼️ Processing image response...')
      const blob = await resp.blob()
      console.log(`✅ Blob created: ${blob.size} bytes (${Date.now() - startTime}ms)`)
      
      const imageUrl = URL.createObjectURL(blob)
      console.log('✅ Blob URL created:', imageUrl)

      // Resize the image to ensure consistent display
      console.log('🎨 Resizing image for display...')
      const resized = await forceResizeImage(imageUrl)
      console.log(`✅ Image resized (${Date.now() - startTime}ms)`)
      
      // Clean up blob URL
      URL.revokeObjectURL(imageUrl)
      console.log('🧹 Blob URL cleaned up')
      
      setResultImage(resized)
      console.log(`🎉 Complete! Total time: ${Date.now() - startTime}ms`)
    } catch (err) {
      console.error('❌ AI try-on error', err)
      alert('Error: ' + (err && err.message ? err.message : err))
    } finally {
      setLoading(false)
    }
  }

  async function forceResizeImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Image resize timeout after 30 seconds'))
      }, 30000)

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        clearTimeout(timeout)
        try {
          console.log(`📏 Image loaded: ${img.width}x${img.height}`)
          const canvas = document.createElement('canvas')
          const dataUrl = resizeImageToCanvas(img, canvas)
          console.log('✅ Canvas conversion complete')
          resolve(dataUrl)
        } catch (err) {
          reject(new Error('Canvas processing failed: ' + err.message))
        }
      }
      img.onerror = (e) => {
        clearTimeout(timeout)
        console.error('Image load error:', e)
        reject(new Error('Failed to load image'))
      }
      console.log('🔄 Loading image from:', imageUrl.substring(0, 50) + '...')
      img.src = imageUrl
    })
  }

  function onDownloadResult(){
    if(!resultImage) return
    const a = document.createElement('a')
    a.href = resultImage
    a.download = `virtual-tryon-${Date.now()}.jpg`
    a.click()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '1100px',
        width: '100%',
        maxHeight: '95vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          borderBottom: '1px solid #e5e7eb',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(to right, #ff3e6c, #ff527b)'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', margin: 0 }}>Virtual Try-On</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', marginTop: '4px' }}>See how this product looks on you</p>
          </div>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '24px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Main Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* Left Column - Input */}
            <div>
              <div style={{
                background: 'linear-gradient(135deg, #fef3f5 0%, #fce7f3 100%)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #fbbfdc',
                marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📷 Your Photo
                </h3>

                {!userImg ? (
                  <div>
                    {/* Camera View */}
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        style={{
                          display: streaming ? 'block' : 'none',
                          width: '100%',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          aspectRatio: `${TARGET_WIDTH}/${TARGET_HEIGHT}`,
                          objectFit: 'cover'
                        }}
                      />
                      {streaming && (
                        <div style={{
                          position: 'absolute',
                          bottom: '16px',
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}>
                          <button 
                            onClick={takeSnapshot}
                            style={{
                              background: '#ff3e6c',
                              color: 'white',
                              border: 'none',
                              padding: '12px 32px',
                              borderRadius: '24px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(255,62,108,0.4)',
                              fontSize: '16px'
                            }}
                          >
                            ✓ Capture
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Upload Options */}
                    {!streaming && (
                      <div>
                        <button 
                          onClick={startCamera}
                          style={{
                            width: '100%',
                            background: '#ff3e6c',
                            color: 'white',
                            border: 'none',
                            padding: '16px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '16px',
                            marginBottom: '12px'
                          }}
                        >
                          📷 Open Camera
                        </button>

                        <div style={{ textAlign: 'center', margin: '12px 0', color: '#9ca3af', fontSize: '14px' }}>or</div>

                        <label style={{
                          display: 'block',
                          width: '100%',
                          background: 'white',
                          border: '2px dashed #d1d5db',
                          padding: '16px',
                          borderRadius: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '16px',
                          textAlign: 'center',
                          color: '#4b5563'
                        }}>
                          📤 Upload Photo
                          <input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
                        </label>

                        <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '12px' }}>
                          Images will be resized to {TARGET_WIDTH}×{TARGET_HEIGHT}px
                        </p>
                      </div>
                    )}

                    {streaming && (
                      <button 
                        onClick={stopCamera}
                        style={{
                          width: '100%',
                          background: '#e5e7eb',
                          color: '#374151',
                          border: 'none',
                          padding: '12px',
                          borderRadius: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                      <img 
                        src={userImg} 
                        alt="Your photo" 
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          aspectRatio: `${TARGET_WIDTH}/${TARGET_HEIGHT}`,
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: '#10b981',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        ✓ Ready
                      </div>
                    </div>
                    <button 
                      onClick={() => { setUserImg(null); setImageSource(null); }}
                      style={{
                        width: '100%',
                        background: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ↻ Retake Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Product Preview */}
              <div style={{
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Product</h3>
                <img 
                  src={productImage} 
                  alt="Product" 
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    aspectRatio: `${TARGET_WIDTH}/${TARGET_HEIGHT}`,
                    objectFit: 'cover'
                  }}
                />
              </div>
            </div>

            {/* Right Column - Result */}
            <div>
              <div style={{
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #ddd6fe',
                minHeight: '500px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ✨ AI Try-On Result
                </h3>

                {!resultImage && !loading && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#9ca3af' }}>
                    <div>
                      <div style={{ fontSize: '64px', marginBottom: '16px' }}>✨</div>
                      <p style={{ fontSize: '18px', fontWeight: '500', margin: 0 }}>Your result will appear here</p>
                      <p style={{ fontSize: '14px', marginTop: '8px' }}>Upload your photo and click "Try It On"</p>
                    </div>
                  </div>
                )}

                {loading && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <div>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        border: '4px solid #f3f4f6',
                        borderTop: '4px solid #ff3e6c',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                      }}></div>
                      <p style={{ fontSize: '18px', fontWeight: '600', color: '#374151', margin: 0 }}>Creating your try-on...</p>
                      <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>This may take 15-20 seconds</p>
                    </div>
                  </div>
                )}

                {resultImage && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: '8px', padding: '16px' }}>
                      <img 
                        src={resultImage} 
                        alt="Try-on result" 
                        style={{
                          maxWidth: '100%',
                          maxHeight: '500px',
                          borderRadius: '8px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          aspectRatio: `${TARGET_WIDTH}/${TARGET_HEIGHT}`,
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                    <button 
                      onClick={onDownloadResult}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(to right, #ff3e6c, #a855f7)',
                        color: 'white',
                        border: 'none',
                        padding: '16px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '16px',
                        boxShadow: '0 4px 12px rgba(255,62,108,0.3)'
                      }}
                    >
                      ⬇️ Download Result
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            <button 
              disabled={loading || !userImg}
              onClick={callAIStyleMirror}
              style={{
                background: loading || !userImg ? '#d1d5db' : 'linear-gradient(to right, #ff3e6c, #a855f7)',
                color: 'white',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '18px',
                cursor: loading || !userImg ? 'not-allowed' : 'pointer',
                boxShadow: loading || !userImg ? 'none' : '0 4px 12px rgba(255,62,108,0.4)'
              }}
            >
              ✨ {loading ? 'Processing...' : 'Try It On with AI'}
            </button>
            
            {resultImage && (
              <button 
                onClick={() => { setUserImg(null); setImageSource(null); setResultImage(null); }}
                style={{
                  background: 'white',
                  border: '2px solid #d1d5db',
                  color: '#374151',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ↻ Start Over
              </button>
            )}
          </div>

          {/* Info Footer */}
          <div style={{
            marginTop: '24px',
            background: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
              <strong>✨ AI-Powered Virtual Try-On</strong> • Processing takes ~15 seconds • Images standardized to {TARGET_WIDTH}×{TARGET_HEIGHT}px
            </p>
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}