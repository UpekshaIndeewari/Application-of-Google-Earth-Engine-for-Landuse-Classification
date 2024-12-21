// IMPORTING DATA
//Load Sentinel-2 Image Collection
// This collection contains harmonized Sentinel-2 data, which includes 13 spectral bands with a 5-day revisit time, useful for vegetation and urban analysis.
var s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED');

// Load the GAUL Level 2 administrative boundaries
// GAUL Level 2 boundary data is used to extract Münster's geometry for regional analysis.
var admin2 = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level2');

// Filter the FeatureCollection for Münster in Germany
// Münster's boundary is extracted by applying filters for country, state, and city names.
var munster = admin2
  .filter(ee.Filter.eq('ADM2_NAME', 'Muenster'))
  .filter(ee.Filter.eq('ADM1_NAME', 'Nordrhein-Westfalen'))
  .filter(ee.Filter.eq('ADM0_NAME', 'Germany'));

// Define Münster geometry
// Münster's boundary geometry is stored for spatial filtering and clipping.
var geometry = munster.geometry();

//---------------------------------------------------------------------------------------------------------

// VISUALIZATION PARAMETERS
// Visualization parameters for Sentinel-2 RGB
// Displays the true-color composite using Sentinel-2 bands for red, green, and blue (B4, B3, B2).
var rgbVis = {
  min: 0.0,
  max: 3000,
  bands: ['B4', 'B3', 'B2'], 
};

//---------------------------------------------------------------------------------------------------------

// FILTERING SENTINEL-2 DATA
// Function to filter Sentinel-2 data
// A function is defined to filter Sentinel-2 data for specific:
    //* Date range
    //* Cloud coverage (<30%)
    //* Region of interest (Münster geometry)
function filterSentinel2Data(s2Collection, cloudPercentage, startDate, endDate, geometry) {
  return s2Collection
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudPercentage))
    .filter(ee.Filter.date(startDate, endDate))
    .filter(ee.Filter.bounds(geometry))
    .select('B.*');
}

// Function usage for 2023
var filtered2023 = filterSentinel2Data(s2, 30, '2023-01-01', '2024-01-01', geometry);

// Function usage for 2016
var filtered2016 = filterSentinel2Data(s2, 30, '2016-01-01', '2017-01-01', geometry);

// Compute the median composite
var image2023 = filtered2023.median(); 
var image2016 = filtered2016.median();

// Clip the image to Münster's geometry
var clipped2023 = image2023.clip(geometry);
var clipped2016 = image2016.clip(geometry);

// Add the clipped image to the map
Map.addLayer(clipped2023, rgbVis, 'Clipped Münster');
Map.addLayer(clipped2016, rgbVis, 'Clipped Münster');

//--------------------------------------------------------------------------------------------------
// COMPUTING NDVI (NORMALIZED VEGETATION INDEX)

// Function to compute yearly mean NDVI
// NDVI Formula:
// NDVI= (NIR+RED)/ (NIR−RED)
// Where NIR = Band 8, RED = Band 4.

function getYearlyNDVI(year) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = start.advance(1, 'year');

  var filtered = s2.filter(ee.Filter.date(start, end))
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .filter(ee.Filter.bounds(geometry));
  
  var medianImage = filtered.median();
  
  var ndvi = medianImage.normalizedDifference(['B8', 'B4']).rename('NDVI');

  var meanNdvi = ee.Number(ndvi.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geometry,
    scale: 10,
    bestEffort: true
  }).get('NDVI', 0)); // Provide fallback value 0 if NDVI key is missing

  return ee.Feature(null, { 'date': start.format('YYYY'), 'NDVI': meanNdvi });
}

// List of years to process
var years = ee.List.sequence(2016, 2023);

// Map the function over the list of years
var ndviTimeSeries = ee.FeatureCollection(years.map(function(year) {
  return getYearlyNDVI(year);
}));

// Create a time-series chart with desired format
var ndviChart = ui.Chart.feature.byFeature(ndviTimeSeries, 'date', 'NDVI')
  .setChartType('ScatterChart')
  .setOptions({
    title: 'NDVI Time Series for Münster',
    hAxis: { title: 'Year', format: 'YYYY' },
    vAxis: { title: 'NDVI', minValue: 0, maxValue: 1 },
    lineWidth: 1,
    pointSize: 4,
    interpolateNulls: true,
    series: { 
      0: { color: '#1a9850' } // Custom color for the NDVI line
    },
    dataTable: { showRowNumber: true }
  });

// Print the chart
print(ndviChart);

// Visualization parameters for NDVI
var ndviVis = { min: 0, max: 1, palette: ['#d73027', '#fdae61', '#fee08b', '#d9ef8b', '#045504', '#011301'] };

// Function to compute NDVI for a specific year or date range
function computeNDVI(s2Collection, startDate, endDate, cloudPercentage, geometry) {
  return s2Collection
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudPercentage))
    .filterBounds(geometry)
    .median()
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI');
}

// Example usage for 2023
var ndvi2023 = computeNDVI(s2, '2023-01-01', '2024-01-01', 30, geometry);

// Example usage for 2016
var ndvi2016 = computeNDVI(s2, '2016-01-01', '2017-01-01', 30, geometry);


Map.addLayer(ndvi2023.clip(geometry), ndviVis, 'NDVI 2023–2024');
Map.addLayer(ndvi2016.clip(geometry), ndviVis, 'NDVI 2016–2017');

//------------------------------------------------------------------------------------------------------
// COMPUTING NDBI (NORMALIZED DIFFERENCE BUILT-UP INDEX)

// Function to compute yearly mean Building Index (NDBI)
// NDBI Formula:
// NDBI= (SWIR+NIR)/(SWIR−NIR)
// Where SWIR = Band 11, NIR = Band 8.
//Purpose: Calculates the mean NDBI for each year.
// Output: A FeatureCollection containing yearly NDBI values.

function getYearlyNDBI(year) {
  var start = ee.Date.fromYMD(year, 1, 1);
  var end = start.advance(1, 'year');

  var filtered = s2.filter(ee.Filter.date(start, end))
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .filter(ee.Filter.bounds(geometry));
  
  var medianImage = filtered.median();
  
  // Calculate NDBI: (SWIR - NIR) / (SWIR + NIR)
  var ndbi = medianImage.normalizedDifference(['B11', 'B8']).rename('NDBI');
  
  var meanNdbi = ee.Number(ndbi.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geometry,
    scale: 10,
    bestEffort: true
  }).get('NDBI', 0)); // Provide fallback value 0 if NDBI key is missing

  return ee.Feature(null, { 'date': start.format('YYYY'), 'NDBI': meanNdbi });
}

// List of years to process
var years = ee.List.sequence(2016, 2023);

// Map the function over the list of years
var ndbiTimeSeries = ee.FeatureCollection(years.map(function(year) {
  return getYearlyNDBI(year);
}));

// Create a time-series chart for NDBI
var ndbiChart = ui.Chart.feature.byFeature(ndbiTimeSeries, 'date', 'NDBI')
  .setChartType('ScatterChart')
  .setOptions({
    title: 'NDBI Time Series for Münster',
    hAxis: { title: 'Year', format: 'YYYY' },
    vAxis: { title: 'NDBI', minValue: -1, maxValue: 1 },
    lineWidth: 1,
    pointSize: 4,
    interpolateNulls: true,
    series: { 
      0: { color: '#fdae61' } // Custom color for the NDBI line
    }
  });

// Print the chart
print(ndbiChart);

// Visualization parameters for NDBI
var ndbiVis = { min: -1, max: 1, palette: ['#d73027', '#fdae61', '#fee08b', '#d9ef8b', '#045504'] };

// Function to compute NDBI for a specific year or date range
function computeNDBI(s2Collection, startDate, endDate, cloudPercentage, geometry) {
  return s2Collection
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudPercentage))
    .filterBounds(geometry)
    .median()
    .normalizedDifference(['B11', 'B8'])
    .rename('NDBI');
}

// Example usage for 2023
var ndbi2023 = computeNDBI(s2, '2023-01-01', '2024-01-01', 30, geometry);

// Example usage for 2016
var ndbi2016 = computeNDBI(s2, '2016-01-01', '2017-01-01', 30, geometry);


Map.addLayer(ndbi2023.clip(geometry), ndbiVis, 'NDBI 2023–2024');
Map.addLayer(ndbi2016.clip(geometry), ndbiVis, 'NDBI 2016–2017');

//----------------------------------------------------------------------------------------------------

//LAND COVER CLASSIFICATION
// Add training points for 4 classes
// Assign the 'landcover' property as follows
// urban: 0
//bare: 1
// water: 2
// vegetation: 3
// Add training points
var urban = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([7.04036, 52.07929]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([6.82526, 52.03517]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.19032, 52.0148]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.66434, 51.99336]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.63613, 51.95739]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.64021, 51.92892]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.85813, 51.92606]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([8.03777, 51.75512]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.90542, 51.7666]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.07777, 51.68644]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([6.89741, 51.98877]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([8.02864, 51.85225]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.08803, 51.52923]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([6.96564, 51.56862]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.15189, 51.56841]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.27755, 51.63292]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.41985, 51.62769]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.39222, 51.70248]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.03764, 52.0828]), {landcover: 0}),
  ee.Feature(ee.Geometry.Point([7.55644, 52.14728]), {landcover: 0})
  
]);

var agri = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([7.04722, 51.68213]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.31237, 51.66109]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.06964, 51.62956]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([6.89591, 51.6499]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([6.86518, 52.05104]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.33364, 52.02944]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.69917, 52.166]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.21872, 52.23704]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.79199, 52.32699]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.34673, 52.25778]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.47739, 52.13601]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.76777, 52.13638]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.63851, 52.12448]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.6107, 52.1923]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.5626, 52.239]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.4954, 52.318]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.74337, 52.34409]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.91537, 52.35531]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.48939, 52.31534]), {landcover: 1}),
  ee.Feature(ee.Geometry.Point([7.68165, 52.38596]), {landcover: 1})
]);

var water = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([7.33967, 52.23663]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.2211, 51.7986]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.1919, 51.7986]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.61341, 51.95577]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.65699, 51.8863]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.6327, 51.89088]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.51039, 51.85612]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([8.01412, 51.82164]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([6.63716, 51.82836]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.65308, 52.25013]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.2419, 51.7978]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.29688, 51.74488]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.20916, 51.73914]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.10645, 51.70395]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.13513, 51.56954]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.26324, 51.56798]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([6.97047, 51.54632]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.01123, 51.6625]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([6.96411, 51.67984]), {landcover: 2}),
  ee.Feature(ee.Geometry.Point([7.6582, 51.88807]), {landcover: 2})
]);

var vegetation = ee.FeatureCollection([
  ee.Feature(ee.Geometry.Point([7.71887, 52.2408]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.88949, 52.25052]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.35722, 52.14552]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.26212, 52.14078]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.80117, 52.09588]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.63725, 51.86111]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.31045, 51.82914]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.1669, 51.6863]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([6.94785, 51.70734]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.35601, 51.64067]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.4952, 51.88118]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.8611, 51.8798]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.26752, 52.14647]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.68036, 52.25756]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.43111, 52.29842]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.08624, 52.20857]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.02891, 52.03054]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([6.81231, 52.0092]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.1155, 51.9217]), {landcover: 3}),
  ee.Feature(ee.Geometry.Point([7.2497, 51.916]), {landcover: 3})
]);

var gcps = urban.merge(agri).merge(water).merge(vegetation);

// Add a random column and split the GCPs into training and validation set
var gcp = gcps.randomColumn();

// This being a simpler classification,take 60% points for validation. Normal recommended ratio is
// 70% training, 30% validation
var trainingGcp = gcp.filter(ee.Filter.lt('random', 0.7));
var validationGcp = gcp.filter(ee.Filter.gte('random', 0.3));

// // Overlay the point on the image to get training data.
// Function to sample regions from an image
function sampleRegions(image, trainingCollection, properties, scale, tileScale) {
  return image.sampleRegions({
    collection: trainingCollection,
    properties: properties,
    scale: scale,
    tileScale: tileScale
  });
}

// Function usage for 2023
var training2023 = sampleRegions(image2023, trainingGcp, ['landcover'], 10, 16);
print(training2023);

// Function usage for 2016
var training2016 = sampleRegions(image2016, trainingGcp, ['landcover'], 10, 16);
print(training2016);

 
// Function to train a Random Forest classifier
function trainClassifier(trainingData, classProperty, inputProperties, numTrees) {
  return ee.Classifier.smileRandomForest(numTrees).train({
    features: trainingData,
    classProperty: classProperty,
    inputProperties: inputProperties
  });
}

// Function usage for 2023
var classifier2023 = trainClassifier(training2023, 'landcover', image2023.bandNames(), 50);

// Function usage for 2016
var classifier2016 = trainClassifier(training2016, 'landcover', image2016.bandNames(), 50);

// Classify the image.
 var classified2023 = image2023.classify(classifier2023);
 var classified2016 = image2016.classify(classifier2016);
 
 // // Choose a 4-color palette
// // Assign a color for each class in the following order
// // Urban, agri, Water, Vegetation
 var palette = ['#ef101f', '#38c740', '#4416e9', '#1b7a1d' ];

 Map.addLayer(classified2023.clip(geometry), {min: 0, max: 3, palette: palette}, '2023_classiied');
 Map.addLayer(classified2016.clip(geometry), {min: 0, max: 3, palette: palette}, '2016_classified');
 
 //-------------------------------------------------------------------------------------------------
 
//ACCURACY ASSESMENT

// Function to sample classified regions for accuracy assessment
function assessClassificationAccuracy(classifiedImage, validationData, classProperty, scale, tileScale) {
  return classifiedImage.sampleRegions({
    collection: validationData,
    properties: [classProperty],
    scale: scale,
    tileScale: tileScale
  });
}

// Eunction usage for 2023
var test2023 = assessClassificationAccuracy(classified2023, validationGcp, 'landcover', 10, 16);

// unction usage for 2016
var test2016 = assessClassificationAccuracy(classified2016, validationGcp, 'landcover', 10, 16);


var testConfusionMatrix2023 = test2023.errorMatrix('landcover', 'classification')
// Printing of confusion matrix
print('Confusion Matrix_2023', testConfusionMatrix2023);
print('Test Accuracy_2023', testConfusionMatrix2023.accuracy());

var testConfusionMatrix2016 = test2016.errorMatrix('landcover', 'classification')
// Printing of confusion matrix 
print('Confusion Matrix_2016', testConfusionMatrix2016);
print('Test Accuracy_2016', testConfusionMatrix2016.accuracy());

// Alternate workflow 

var validation2023 = image2023.sampleRegions({
  collection: validationGcp,
  properties: ['landcover'],
  scale: 10,
  tileScale: 16
});

var testV2023 = validation2023.classify(classifier2023);

var testConfusionMatrix2023 = testV2023.errorMatrix('landcover', 'classification_2023')
// Printing of confusion matrix may time out. Alternatively, you can export it as CSV
print('Confusion Matrix_2023', testConfusionMatrix2023);
print('Test Accuracy', testConfusionMatrix2023.accuracy());


//Export the classified imge into drive
Export.image.toDrive({
  image: classified2016.clip(geometry).toFloat(),
  description: 'Classified2016_Image_Export',
  folder: 'earthengine',
  fileNamePrefix: 'classified2016',
  region: geometry,
  scale: 10,
  maxPixels: 1e10
})

Export.image.toDrive({
  image: classified2023.clip(geometry).toFloat(),
  description: 'Classified2023_Image_Export',
  folder: 'earthengine',
  fileNamePrefix: 'classified2023',
  region: geometry,
  scale: 10,
  maxPixels: 1e10
})

//------------------------------------------------------------------------------------------------------
//AREA CALCULATION FOR LANDUSE CLASSES

// Function to calculate the area for specific landcover classes
function calculateLandcoverAreas(classifiedImage, geometry, year) {
  var classNames = ['Urban', 'Agriculture', 'Water', 'Vegetation']; // Class labels
  var classValues = [0, 1, 2, 3]; // Class values in classification image
  
  // Loop through the classes and calculate areas
  classValues.forEach(function(classValue, index) {
    var className = classNames[index]; // Get the name of the current class
    
    // Binary mask for the current class
    var classMask = classifiedImage.eq(classValue);
    
    // Multiply by pixel area to get area per pixel
    var areaImage = classMask.multiply(ee.Image.pixelArea());
    
    // Reduce the image to get the total area
    var areaResult = areaImage.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geometry,
      scale: 10,
      maxPixels: 1e10
    });
    
    // Extract the total area and convert to square kilometers
    var areaSqKm = ee.Number(areaResult.get('classification')).divide(1e6).round();
    
    // Print the area for the current class
    print('Area for ' + className + ' in ' + year + ' (SqKm):', areaSqKm);
  });
}


var munsterGeometry = munster.geometry();

// Call the function for 2023
print('--- Areas for 2023 ---');
calculateLandcoverAreas(classified2023, munsterGeometry, 2023);

// Call the function for 2016
print('--- Areas for 2016 ---');
calculateLandcoverAreas(classified2016, munsterGeometry, 2016);
