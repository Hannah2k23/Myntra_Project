const getWeatherBasedRecommendations = (tempC, category, itemDescription = '') => {
  const recommendations = {
    materials: [],
    styles: [],
    features: [],
    avoid: [],
    complementary_items: {
      upper_wear: [],
      bottom_wear: [],
      footwear: [],
      accessories: []
    }
  };

  // Temperature-based recommendations
  if (tempC <= 10) {
    // Very Cold (≤ 10°C)
    recommendations.materials = ['wool', 'fleece', 'cashmere', 'thick cotton', 'denim', 'leather'];
    recommendations.features = ['full sleeves', 'high neck', 'lined', 'thermal', 'windproof', 'waterproof'];
    recommendations.avoid = ['shorts', 'sleeveless', 'thin cotton', 'linen', 'mesh'];
    
    switch(category) {
      case 'top':
        recommendations.styles = ['hoodie', 'sweater', 'cardigan', 'jacket', 'coat', 'thermal wear', 'turtleneck'];
        break;
      case 'bottom': 
        recommendations.styles = ['jeans', 'thermal pants', 'wool pants', 'leggings with fleece lining', 'track pants'];
        break;
      case 'footwear':
        recommendations.styles = ['boots', 'closed shoes', 'sneakers with thick sole', 'winter boots'];
        break;
      case 'accessory':
        recommendations.styles = ['scarf', 'gloves', 'beanie', 'warm socks', 'muffler'];
        break;
    }
  } 
  else if (tempC <= 20) {
    // Cool (11-20°C)
    recommendations.materials = ['cotton blend', 'light wool', 'denim', 'jersey', 'polyester blend'];
    recommendations.features = ['full sleeves', 'light layering', 'breathable'];
    recommendations.avoid = ['heavy wool', 'thick fleece'];
    
    switch(category) {
      case 'top':
        recommendations.styles = ['light sweater', 'shirt', 'light jacket', 'cardigan', 'long sleeve t-shirt'];
        break;
      case 'bottom':
        recommendations.styles = ['jeans', 'chinos', 'track pants', 'jeggings'];
        break;
      case 'footwear':
        recommendations.styles = ['sneakers', 'casual shoes', 'loafers'];
        break;
      case 'accessory':
        recommendations.styles = ['light scarf', 'cap', 'belt'];
        break;
    }
  }
  else if (tempC <= 30) {
    // Warm (21-30°C)
    recommendations.materials = ['cotton', 'linen blend', 'viscose', 'rayon', 'modal'];
    recommendations.features = ['breathable', 'moisture-wicking', 'comfortable fit'];
    recommendations.avoid = ['wool', 'fleece', 'heavy materials'];
    
    switch(category) {
      case 'top':
        recommendations.styles = ['t-shirt', 'polo shirt', 'light shirt', 'blouse', 'tank top'];
        break;
      case 'bottom':
        recommendations.styles = ['jeans', 'chinos', 'palazzo', 'culottes', 'light pants'];
        break;
      case 'footwear':
        recommendations.styles = ['sneakers', 'canvas shoes', 'loafers', 'flats'];
        break;
      case 'accessory':
        recommendations.styles = ['sunglasses', 'light bag', 'watch'];
        break;
    }
  }
  else {
    // Hot (>30°C)
    recommendations.materials = ['cotton', 'linen', 'bamboo', 'modal', 'breathable synthetics'];
    recommendations.features = ['breathable', 'moisture-wicking', 'UV protection', 'loose fit', 'sleeveless'];
    recommendations.avoid = ['dark colors', 'tight fit', 'synthetic blends', 'wool'];
    
    switch(category) {
      case 'top':
        recommendations.styles = ['tank top', 'sleeveless blouse', 'light t-shirt', 'crop top', 'summer dress'];
        break;
      case 'bottom':
        recommendations.styles = ['shorts', 'skirts', 'palazzo', 'capri', 'light pants'];
        break;
      case 'footwear':
        recommendations.styles = ['sandals', 'flip flops', 'canvas shoes', 'breathable sneakers'];
        break;
      case 'accessory':
        recommendations.styles = ['sunglasses', 'hat', 'light scarf', 'summer bag'];
        break;
    }
  }

  // Generate complementary items based on category and description
  recommendations.complementary_items = getComplementaryItems(tempC, category, itemDescription);

  return {
    temperature: tempC,
    weather_category: getWeatherCategory(tempC),
    recommendations
  };
};

// Helper function to generate complementary items based on category and description
const getComplementaryItems = (tempC, userCategory, itemDescription) => {
  const complementary = {
    upper_wear: [],
    bottom_wear: [],
    footwear: [],
    accessories: []
  };

  const desc = itemDescription.toLowerCase();

  // Generate complementary items based on user's uploaded category
  if (userCategory === 'top') {
    // User uploaded upper wear, suggest bottom wear, footwear, accessories
    
    // Bottom wear suggestions based on description
    if (desc.includes('crop') || desc.includes('cropped')) {
      complementary.bottom_wear = tempC > 25 
        ? ['palazzo pants', 'long skirt', 'maxi skirt', 'culottes']
        : ['high-waisted jeans', 'palazzo pants', 'long skirt', 'wide leg pants'];
    } else if (desc.includes('oversized') || desc.includes('loose')) {
      complementary.bottom_wear = tempC > 25
        ? ['fitted shorts', 'skinny jeans', 'pencil skirt', 'bike shorts']
        : ['skinny jeans', 'leggings', 'fitted pants', 'pencil skirt'];
    } else if (desc.includes('fitted') || desc.includes('tight') || desc.includes('bodycon')) {
      complementary.bottom_wear = tempC > 25
        ? ['palazzo pants', 'flowy skirt', 'culottes']
        : ['wide leg pants', 'palazzo pants', 'flowy skirt', 'culottes'];
    } else if (desc.includes('formal') || desc.includes('shirt') || desc.includes('blouse') || desc.includes('top')) {
      complementary.bottom_wear = tempC > 25
        ? ['formal shorts', 'pencil skirt', 'culottes', 'straight pants']
        : ['formal pants', 'pencil skirt', 'straight leg trousers', 'midi skirt'];
    } else {
      // Default suggestions for tops
      complementary.bottom_wear = tempC > 25
        ? ['shorts', 'skirt', 'palazzo pants', 'culottes']
        : ['jeans', 'pants', 'skirt', 'palazzo pants'];
    }

  } else if (userCategory === 'bottom') {
    // User uploaded bottom wear, suggest upper wear, footwear, accessories
    
    if (desc.includes('skinny') || desc.includes('fitted') || desc.includes('tight')) {
      complementary.upper_wear = tempC > 25
        ? ['oversized shirt', 'flowy blouse', 'loose t-shirt', 'crop top']
        : ['oversized sweater', 'loose shirt', 'cardigan', 'flowy blouse'];
    } else if (desc.includes('wide') || desc.includes('palazzo') || desc.includes('flowy')) {
      complementary.upper_wear = tempC > 25
        ? ['fitted t-shirt', 'crop top', 'bodycon top', 'tank top']
        : ['fitted sweater', 'bodycon top', 'fitted shirt', 'turtleneck'];
    } else if (desc.includes('formal') || desc.includes('dress pants') || desc.includes('trousers')) {
      complementary.upper_wear = tempC > 25
        ? ['button-up shirt', 'blouse', 'polo shirt', 'formal t-shirt']
        : ['button-up shirt', 'sweater', 'cardigan', 'blazer'];
    } else if (desc.includes('shorts')) {
      complementary.upper_wear = tempC > 25
        ? ['crop top', 't-shirt', 'tank top', 'blouse']
        : ['long sleeve shirt', 'light sweater', 'cardigan', 'hoodie'];
    } else {
      // Default suggestions for bottoms
      complementary.upper_wear = tempC > 25
        ? ['t-shirt', 'tank top', 'blouse', 'crop top']
        : ['shirt', 'sweater', 'hoodie', 'cardigan'];
    }

  } else if (userCategory === 'footwear') {
    // User uploaded footwear, suggest upper wear, bottom wear, accessories
    
    if (desc.includes('heels') || desc.includes('formal') || desc.includes('dress shoes')) {
      complementary.upper_wear = tempC > 25
        ? ['blouse', 'dress shirt', 'elegant top']
        : ['blazer', 'dress shirt', 'cardigan'];
      complementary.bottom_wear = ['dress pants', 'pencil skirt', 'formal shorts', 'midi dress'];
    } else if (desc.includes('sneakers') || desc.includes('casual') || desc.includes('sports')) {
      complementary.upper_wear = tempC > 25
        ? ['t-shirt', 'hoodie', 'casual top']
        : ['hoodie', 'sweatshirt', 'casual shirt'];
      complementary.bottom_wear = ['jeans', 'track pants', 'shorts', 'leggings'];
    } else if (desc.includes('sandals') || desc.includes('flip flops')) {
      complementary.upper_wear = tempC > 25
        ? ['tank top', 'summer dress', 'casual t-shirt']
        : ['light cardigan', 'casual shirt'];
      complementary.bottom_wear = ['shorts', 'skirt', 'palazzo pants', 'capri'];
    } else {
      // Default suggestions for footwear
      complementary.upper_wear = tempC > 25
        ? ['t-shirt', 'blouse', 'tank top']
        : ['shirt', 'sweater', 'cardigan'];
      complementary.bottom_wear = tempC > 25
        ? ['shorts', 'skirt', 'pants']
        : ['jeans', 'pants', 'skirt'];
    }

  } else if (userCategory === 'accessory') {
    // User uploaded accessories, suggest complete outfit
    
    complementary.upper_wear = tempC > 25
      ? ['t-shirt', 'blouse', 'tank top', 'crop top']
      : ['shirt', 'sweater', 'hoodie', 'cardigan'];
    
    complementary.bottom_wear = tempC > 25
      ? ['shorts', 'skirt', 'palazzo pants', 'culottes']
      : ['jeans', 'pants', 'skirt', 'leggings'];
  }

  // Add temperature-appropriate footwear for all categories (except when user uploaded footwear)
  if (userCategory !== 'footwear') {
    if (tempC > 30) {
      complementary.footwear = ['sandals', 'flip flops', 'canvas shoes', 'breathable sneakers'];
    } else if (tempC > 20) {
      complementary.footwear = ['sneakers', 'loafers', 'casual shoes', 'flats'];
    } else if (tempC > 10) {
      complementary.footwear = ['sneakers', 'boots', 'closed shoes', 'ankle boots'];
    } else {
      complementary.footwear = ['boots', 'winter boots', 'closed shoes', 'thick sole shoes'];
    }
  }

  // Add temperature-appropriate accessories for all categories (except when user uploaded accessory)
  if (userCategory !== 'accessory') {
    if (tempC > 30) {
      complementary.accessories = ['sunglasses', 'sun hat', 'light bag', 'minimal jewelry'];
    } else if (tempC > 20) {
      complementary.accessories = ['sunglasses', 'watch', 'bag', 'jewelry'];
    } else if (tempC > 10) {
      complementary.accessories = ['scarf', 'bag', 'watch', 'cap'];
    } else {
      complementary.accessories = ['scarf', 'gloves', 'beanie', 'warm bag'];
    }
  }

  return complementary;
};

const getWeatherCategory = (tempC) => {
  if (tempC <= 10) return 'very_cold';
  if (tempC <= 20) return 'cool';
  if (tempC <= 30) return 'warm';
  return 'hot';
};

module.exports = {
  getWeatherBasedRecommendations,
  getWeatherCategory
};