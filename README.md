## Application of Google Earth Engine for Landuse Classification and Monitoring Change detection

### Introduction

Land use classification refers to the process of identifying and categorizing different types of land cover based on satellite or aerial imagery. This classification provides essential information for urban planning, environmental monitoring, and land management. The availability of high-resolution satellite data, such as that from Sentinel-2, allows for more accurate and detailed land use mapping.

Sentinel-2 is part of the **Copernicus Earth Observation Program**, providing high-resolution imagery with a revisit time of 5 days. Sentinel-2 satellites capture data in multiple spectral bands, enabling the detection of various land cover types, including vegetation, water bodies, urban areas, and agricultural land. These datasets are freely available through the Google Earth Engine (GEE) platform, making them an ideal resource for land use classification.

This project aims to explore the use of Sentinel-2 imagery for land use classification in the Münster region of Germany, with the use of Google Earth Engine, remote sensing techniques and machine learning algorithms. 

### Objectives

The primary objectives of this research are as follows:

- To perform land use classification in the Münster region using Sentinel-2 imagery using Google Earth Engine.
- To explore the use of various remote sensing indices, such as NDVI (Normalized Difference Vegetation Index) and NDBI (Normalized Difference Built-up Index), for enhancing land use classification accuracy.
- To apply machine learning techniques, particularly Random Forest Classification, to classify land cover based on labeled training data.
- To assess the temporal changes in land use, focusing on urban growth, vegetation changes, and water body dynamics, over a time span from 2016 to 2023.
- To provide a detailed analysis of land use changes in the region for urban planning and policy-making.

### Methodology

#### 1. Data Acquisition 

The project relies on Sentinel-2 satellite imagery, which provides multi-spectral data across 13 bands (visible, near-infrared, and shortwave infrared). These bands are ideal for calculating key vegetation and built-up indices, which are essential for land use classification.

- Study Area: The Münster region in Germany was selected as the area of interest for this study.
- Data Source: The satellite images were obtained from Google Earth Engine (GEE), which provides easy access to Sentinel-2 data.
- Time Range: The dataset spans from 2016 to 2023, allowing for the analysis of temporal land use changes.

#### 2. Data Preprocessing

The preprocessing step involves filtering and cleaning the raw satellite data. This includes:

- Cloud Masking: Removing cloud-covered pixels to improve classification accuracy. We use cloud percentage metadata available in the Sentinel-2 dataset to filter images with cloud cover above a threshold (e.g., 30%).
- Geometric Correction: Ensuring the images are correctly aligned to the Earth’s surface by correcting any distortions in the imagery.
- Image Mosaicking: Combining multiple Sentinel-2 images to create a composite image for the study period.

#### 3. RGB Visualization:

RGB visualization parameters are defined for true-color composite using bands B4 (Red), B3 (Green), and B2 (Blue).
Layers for the clipped images for 2023 and 2016 are added to the map for comparison.

#### 4. Calculation of Indices

Several remote sensing indices were calculated to help distinguish between land cover types:

**NDVI (Normalized Difference Vegetation Index)**: NDVI is a measure of vegetation health and density. Higher NDVI values indicate the presence of vegetation, while lower values suggest barren land or built-up areas.
*NDVI= (B8+B4)/ (B8−B4)*
​where B8 is the near-infrared band, and B4 is the red band.

**NDBI (Normalized Difference Built-up Index)**: NDBI helps identify built-up or urban areas. Higher NDBI values are indicative of urbanized land, while lower values represent non-urban areas.
*NDBI= (B11+B8)/ (B11−B8)*
where B11 is the shortwave infrared band, and B8 is the near-infrared band.

#### 5. Supervised Classification

A Random Forest Classifier was applied for land use classification. This machine learning technique uses labeled training data to classify the pixels in the image. The steps involved in supervised classification include:

- Collection of Training Data: Labeled samples were manually selected for different land cover types, such as **urban**, **agricultural**, **water**, and **vegetation**.
- Random Forest Classifier: This algorithm was chosen because of its robustness in handling high-dimensional data and its ability to deal with noise in satellite images.
- Classification: Using the Random Forest algorithm, the satellite images were classified into land cover categories.

#### 6. Temporal Analysis

The study involved the analysis of land use changes over the period from 2016 to 2023. Temporal changes in urban areas, vegetation, agriculture and water bodies were analyzed by comparing NDVI, NDBI, and land cover classification maps over time.

#### 7. Accuracy Assessment

Accuracy assessment is a crucial part of evaluating the performance of any land use classification model. In this study, we used a combination of Confusion Matrix and Kappa Statistics to assess the accuracy of the classification results. A Confusion Matrix is a table used to describe the performance of a classification model by comparing the predicted land cover classes to the actual (ground truth) classes.

#### 8. Area Calculation

After performing the land use classification, it's important to calculate the area of each land cover class. This can help in understanding the distribution of different land cover types within the study area, as well as quantifying land use changes over time.

#### 9. Export and Visualization

Exporting Results: The final classification maps were exported from Google Earth Engine to GeoTIFF files for further analysis.
Visualization: The classified images were visualized using geographic information systems (GIS) tools like ArcGIS Pro, QGIS for detailed analysis.

### Results

The results of this research include:

- **Land Use Classification Map**: A detailed map showing the classified land cover for the Münster region for the year 2023. The map distinguishes between urban, agricultural, water, and vegetation areas.
  ![https://github.com/UpekshaIndeewari/Application-of-Google-Earth-Engine-for-Landuse-Classification/blob/main/img/2023.png] 

- NDVI and NDBI Analysis: Temporal analysis of NDVI and NDBI values to observe vegetation health and built-up area dynamics from 2016 to 2023.
- Accuracy Assessment: The accuracy of the classification was assessed using confusion matrices and Kappa statistics to measure the overall classification accuracy.
