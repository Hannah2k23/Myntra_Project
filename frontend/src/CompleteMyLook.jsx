import React, { useState, useEffect } from 'react'

const getWeatherIcon = (category) => {
  switch(category) {
    case 'very_cold': return '🥶';
    case 'cool': return '😌';
    case 'warm': return '😊';
    case 'hot': return '🥵';
    default: return '🌡️';
  }
};

const getWeatherLabel = (category) => {
  switch(category) {
    case 'very_cold': return 'Very Cold Weather';
    case 'cool': return 'Cool Weather';
    case 'warm': return 'Warm Weather';
    case 'hot': return 'Hot Weather';
    default: return 'Weather Analysis';
  }
};

export default function CompleteMyLook() {
  const [formData, setFormData] = useState({
    uploaded_category: '',
    item_description: '',
    image: null,
    min_price: '',
    max_price: '',
    lat: null,
    lon: null,
    temp_c: null
  })
  const [imagePreview, setImagePreview] = useState('')
  const [locationPermission, setLocationPermission] = useState('pending')
  const [errors, setErrors] = useState({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)

  const categories = [
    { value: 'top', label: 'Upper Wear', description: 'Tops, Shirts, T-Shirts, Dresses' },
    { value: 'bottom', label: 'Bottom Wear', description: 'Jeans, Pants, Skirts, Shorts' },
    { value: 'footwear', label: 'Footwear', description: 'Shoes, Sandals, Heels, Sneakers' },
    { value: 'accessory', label: 'Accessories', description: 'Bags, Jewelry, Hats, Belts' }
  ]

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData(prev => ({ ...prev, image: file }))
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => setImagePreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleCategoryChange = (category) => {
    setFormData(prev => ({ ...prev, uploaded_category: category }))
    setErrors(prev => ({ ...prev, category: '' }))
  }

  const handleDescriptionChange = (description) => {
    setFormData(prev => ({ ...prev, item_description: description }))
    setErrors(prev => ({ ...prev, description: '' }))
  }

  const handlePriceChange = (field, value) => {
    const numValue = value === '' ? '' : parseFloat(value)
    setFormData(prev => ({ ...prev, [field]: numValue }))
    
    // Clear price validation errors
    if (field === 'min_price' || field === 'max_price') {
      setErrors(prev => ({ ...prev, price: '' }))
    }
  }

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setLocationPermission('not_supported')
      return
    }

    try {
      setLocationPermission('requesting')
      
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 600000 // 10 minutes
        })
      })

      const { latitude, longitude } = position.coords
      
      // Fetch real weather data using OpenWeatherMap API
      try {
        // Using free OpenWeatherMap API (you'll need to sign up for API key)
        // For demo purposes, using a public weather service
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`
        )
        
        if (!weatherResponse.ok) {
          throw new Error('Weather API failed')
        }
        
        const weatherData = await weatherResponse.json()
        const currentTemp = weatherData.current_weather?.temperature || null
        
        setFormData(prev => ({
          ...prev,
          lat: latitude,
          lon: longitude,
          temp_c: currentTemp
        }))
        
        setLocationPermission('granted')
      } catch (weatherError) {
        console.warn('Weather API failed, using location only:', weatherError)
        
        // Fallback: use location without weather data
        setFormData(prev => ({
          ...prev,
          lat: latitude,
          lon: longitude,
          temp_c: null
        }))
        
        setLocationPermission('granted')
      }
      
    } catch (error) {
      console.error('Location permission denied:', error)
      setLocationPermission('denied')
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.uploaded_category) {
      newErrors.category = 'Please select a category for your uploaded item'
    }

    if (!formData.item_description.trim()) {
      newErrors.description = 'Please describe your item (e.g., crop top, oversized hoodie, skinny jeans)'
    }

    if (!formData.image) {
      newErrors.image = 'Please upload an image'
    }

    if (formData.min_price === '' || formData.max_price === '') {
      newErrors.price = 'Please set both minimum and maximum price'
    } else if (formData.min_price > formData.max_price) {
      newErrors.price = 'Minimum price cannot be greater than maximum price'
    } else if (formData.min_price < 0 || formData.max_price < 0) {
      newErrors.price = 'Prices cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsAnalyzing(true)
    
    const submitData = new FormData()
    submitData.append('uploaded_category', formData.uploaded_category)
    submitData.append('item_description', formData.item_description)
    submitData.append('image', formData.image)
    submitData.append('min_price', formData.min_price)
    submitData.append('max_price', formData.max_price)
    
    if (formData.lat && formData.lon) {
      submitData.append('lat', formData.lat)
      submitData.append('lon', formData.lon)
    }
    
    if (formData.temp_c) {
      submitData.append('temp_c', formData.temp_c)
    }

    try {
      const response = await fetch('http://localhost:4001/api/analyze', {
        method: 'POST',
        body: submitData
      })
      
      const result = await response.json()
      
      if (response.ok) {
        // Handle successful analysis
        console.log('Analysis result:', result)
        setAnalysisResult(result)
        setErrors({}) // Clear any previous errors
      } else {
        setErrors({ submit: result.message || 'Analysis failed' })
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setIsAnalyzing(false)
    }
  }

  
  return (
    <div className="complete-my-look">
      <div className="cml-header">
        <h1 className="cml-title">Complete My Look</h1>
        <p className="cml-subtitle">Upload your item and discover the perfect outfit combinations</p>
      </div>

      <form onSubmit={handleSubmit} className="cml-form">
        {/* Category Selection */}
        <section className="form-section">
          <h3 className="section-title">What's your main character energy?</h3>
          <div className="category-grid">
            {categories.map(cat => (
              <div
                key={cat.value}
                className={`category-card ${formData.uploaded_category === cat.value ? 'selected' : ''}`}
                onClick={() => handleCategoryChange(cat.value)}
              >
                <h4>{cat.label}</h4>
                <p>{cat.description}</p>
              </div>
            ))}
          </div>
          {errors.category && <div className="error-msg">{errors.category}</div>}
        </section>

        {/* Item Description */}
        <section className="form-section">
          <h3 className="section-title">Describe your vibe</h3>
          <div className="description-input">
            <input
              type="text"
              placeholder="e.g., crop top, oversized hoodie, skinny jeans, denim jacket, maxi dress, cargo shorts..."
              value={formData.item_description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="description-field"
              maxLength="50"
            />
            <small className="description-hint">
              Tell us about your item style so we can suggest the perfect matches!
            </small>
          </div>
          {errors.description && <div className="error-msg">{errors.description}</div>}
        </section>

        {/* Image Upload */}
        <section className="form-section">
          <h3 className="section-title">Drop that fit check</h3>
          <div className="image-upload-area">
            {imagePreview ? (
              <div className="image-preview">
                <div className="image-container">
                  <img src={imagePreview} alt="Uploaded item" />
                  <div className="image-overlay">
                    <button
                      type="button"
                      className="change-image-btn overlay-btn"
                      onClick={() => document.getElementById('image-input').click()}
                    >
                      📷 Change Image
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="upload-placeholder"
                onClick={() => document.getElementById('image-input').click()}
              >
                <div className="upload-icon">📷</div>
                <p>Click to upload your item image</p>
                <small>Supports JPG, PNG up to 10MB</small>
              </div>
            )}
            <input
              id="image-input"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>
          {errors.image && <div className="error-msg">{errors.image}</div>}
        </section>

        {/* Budget Range */}
        <section className="form-section">
          <h3 className="section-title">What's your budget flex?</h3>
          <div className="price-range">
            <div className="price-input-group">
              <label>Minimum Price</label>
              <div className="input-wrapper">
                <span className="currency">₹</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="500"
                  value={formData.min_price}
                  onChange={(e) => handlePriceChange('min_price', e.target.value)}
                />
              </div>
            </div>
            <div className="price-separator">to</div>
            <div className="price-input-group">
              <label>Maximum Price</label>
              <div className="input-wrapper">
                <span className="currency">₹</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="2000"
                  value={formData.max_price}
                  onChange={(e) => handlePriceChange('max_price', e.target.value)}
                />
              </div>
            </div>
          </div>
          {errors.price && <div className="error-msg">{errors.price}</div>}
        </section>

        {/* Location Permission */}
        <section className="form-section">
          <h3 className="section-title">Seasonal style sync</h3>
          <div className="location-section">
            {locationPermission === 'pending' && (
              <div className="location-request">
                <p>Get personalized recommendations based on your local weather</p>
                <button
                  type="button"
                  className="btn outline location-btn"
                  onClick={requestLocation}
                >
                  Enable Location & Weather
                </button>
              </div>
            )}
            
            {locationPermission === 'requesting' && (
              <div className="location-requesting">
                <span className="location-status">Requesting location access...</span>
                <p>Please allow location access in your browser</p>
              </div>
            )}
            
            {locationPermission === 'granted' && (
              <div className="location-granted">
                <span className="location-status">✅ Location enabled</span>
                {formData.temp_c !== null ? (
                  <span className="temp-display">Current temp: {Math.round(formData.temp_c)}°C</span>
                ) : (
                  <span className="temp-display no-temp">Weather data unavailable</span>
                )}
              </div>
            )}
            
            {locationPermission === 'denied' && (
              <div className="location-denied">
                <span className="location-status">Location access denied</span>
                <p>You can still get great recommendations without weather data</p>
              </div>
            )}
            
            {locationPermission === 'not_supported' && (
              <div className="location-not-supported">
                <span className="location-status">Location not supported by your browser</span>
              </div>
            )}
          </div>
        </section>

        {/* Submit */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn pink cml-submit"
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing Your Style...' : 'Complete My Look'}
          </button>
          {errors.submit && <div className="error-msg">{errors.submit}</div>}
        </div>
      </form>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="analysis-results">
          <h2 className="results-title">Your Style Analysis</h2>

          {/* Weather Recommendations Section - ADD THIS ENTIRE SECTION */}
          {analysisResult.analysis.weather_recommendations && (
            <div className="weather-recommendations-section">
              <h3 className="section-title">
                Weather-Smart Recommendations 
                <span className="temp-badge">
                  {Math.round(analysisResult.analysis.temperature)}°C
                </span>
              </h3>
              
              <div className="weather-category">
                <div className={`weather-indicator ${analysisResult.analysis.weather_recommendations.weather_category}`}>
                  {getWeatherIcon(analysisResult.analysis.weather_recommendations.weather_category)}
                  <span className="weather-label">
                    {getWeatherLabel(analysisResult.analysis.weather_recommendations.weather_category)}
                  </span>
                </div>
              </div>

              <div className="recommendations-grid">
                {/* Materials Recommendation */}
                <div className="recommendation-card">
                  <h4 className="rec-title">Recommended Materials</h4>
                  <div className="material-tags">
                    {analysisResult.analysis.weather_recommendations.recommendations.materials.map((material, index) => (
                      <span key={index} className="material-tag recommended">
                        {material}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Features Recommendation */}
                <div className="recommendation-card">
                  <h4 className="rec-title">Key Features</h4>
                  <div className="feature-tags">
                    {analysisResult.analysis.weather_recommendations.recommendations.features.map((feature, index) => (
                      <span key={index} className="feature-tag recommended">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Avoid Recommendation */}
                {analysisResult.analysis.weather_recommendations.recommendations.avoid.length > 0 && (
                  <div className="recommendation-card avoid-card">
                    <h4 className="rec-title">Avoid for This Weather</h4>
                    <div className="avoid-tags">
                      {analysisResult.analysis.weather_recommendations.recommendations.avoid.map((item, index) => (
                        <span key={index} className="avoid-tag">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Complementary Items Section */}
          {analysisResult.analysis.weather_recommendations && analysisResult.analysis.weather_recommendations.recommendations.complementary_items && (
            <div className="complementary-items-section">
              <h3 className="section-title">
                Perfect Matches for Your {analysisResult.analysis.item_description}
              </h3>
              
              <div className="complementary-grid">
                {/* Upper Wear Suggestions */}
                {analysisResult.analysis.weather_recommendations.recommendations.complementary_items.upper_wear.length > 0 && (
                  <div className="complementary-category">
                    <h4 className="category-title">Upper Wear</h4>
                    <div className="complementary-tags">
                      {analysisResult.analysis.weather_recommendations.recommendations.complementary_items.upper_wear.map((item, index) => (
                        <span key={index} className="complementary-tag upper">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Wear Suggestions */}
                {analysisResult.analysis.weather_recommendations.recommendations.complementary_items.bottom_wear.length > 0 && (
                  <div className="complementary-category">
                    <h4 className="category-title">Bottom Wear</h4>
                    <div className="complementary-tags">
                      {analysisResult.analysis.weather_recommendations.recommendations.complementary_items.bottom_wear.map((item, index) => (
                        <span key={index} className="complementary-tag bottom">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footwear Suggestions */}
                {analysisResult.analysis.weather_recommendations.recommendations.complementary_items.footwear.length > 0 && (
                  <div className="complementary-category">
                    <h4 className="category-title">Footwear</h4>
                    <div className="complementary-tags">
                      {analysisResult.analysis.weather_recommendations.recommendations.complementary_items.footwear.map((item, index) => (
                        <span key={index} className="complementary-tag footwear">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accessories Suggestions */}
                {analysisResult.analysis.weather_recommendations.recommendations.complementary_items.accessories.length > 0 && (
                  <div className="complementary-category">
                    <h4 className="category-title">Accessories</h4>
                    <div className="complementary-tags">
                      {analysisResult.analysis.weather_recommendations.recommendations.complementary_items.accessories.map((item, index) => (
                        <span key={index} className="complementary-tag accessories">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Color Analysis Section */}
          {analysisResult.analysis.color_analysis && (
            <div className="color-analysis-section">
              <h3 className="section-title">Color Palette Extracted</h3>
              
              <div className="dominant-color">
                <h4>Dominant Color</h4>
                <div className="color-display">
                  <div 
                    className="color-swatch large"
                    style={{ backgroundColor: analysisResult.analysis.color_analysis.dominant_color.hex }}
                  ></div>
                  <div className="color-info">
                    <span className="hex-code">{analysisResult.analysis.color_analysis.dominant_color.hex}</span>
                    <span className="rgb-code">RGB({analysisResult.analysis.color_analysis.dominant_color.rgb.join(', ')})</span>
                  </div>
                </div>
              </div>

              <div className="recommended-colors">
                <h4>Recommended Color Combinations</h4>
                <div className="color-grid">
                  {Object.entries(analysisResult.analysis.color_analysis.recommended_colors).map(([colorType, colorData]) => (
                    <div key={colorType} className="color-option">
                      <div 
                        className="color-swatch"
                        style={{ backgroundColor: colorData.hex }}
                      ></div>
                      <div className="color-label">
                        <span className="color-name">{colorType.replace('_', ' ')}</span>
                        <span className="color-hex">{colorData.hex}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="extracted-palette">
                <h4>Full Color Palette</h4>
                <div className="palette-colors">
                  {analysisResult.analysis.color_analysis.palette.map((color, index) => (
                    <div key={index} className="palette-color">
                      <div 
                        className="color-swatch small"
                        style={{ backgroundColor: color.hex }}
                      ></div>
                      <span className="palette-hex">{color.hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}



// export default CompleteMyLook;