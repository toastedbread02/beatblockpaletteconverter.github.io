const imageInput = document.getElementById("imageInput");
const originalCanvas = document.getElementById("originalCanvas");
const resultCanvas = document.getElementById("resultCanvas");
const originalContext = originalCanvas.getContext("2d");
const resultContext = resultCanvas.getContext("2d");
const downloadButton = document.getElementById("downloadButton");
const status = document.getElementById("status");
const uploadBox = document.getElementById("uploadBox");

/* Keep browser scaling from inventing blended edge colors. */
originalContext.imageSmoothingEnabled = false;
resultContext.imageSmoothingEnabled = false;

/* Beatblock palette
   Only these colors are allowed in the final image.
*/
const PALETTE = [
  [255, 0, 0],    // Red
  [0, 255, 0],    // Green
  [0, 0, 255],    // Blue
  [255, 0, 255],  // Magenta
  [0, 255, 255],  // Cyan
];

/* Find the closest palette color.
   We use RGB distance:
   distance = (R1-R2)^2 + (G1-G2)^2 + (B1-B2)^2
   The smallest distance wins.
*/
function closestColor(r, g, b) {
  let closest = PALETTE[0];
  let smallestDistance = Infinity;

  for (const color of PALETTE) {
    const redDifference = r - color[0];
    const greenDifference = g - color[1];
    const blueDifference = b - color[2];
    const distance =
      redDifference * redDifference +
      greenDifference * greenDifference +
      blueDifference * blueDifference;

    if (distance < smallestDistance) {
      smallestDistance = distance;
      closest = color;
    }
  }

  return closest;
}

function processFile(file) {
  if (!file.type.startsWith("image/")) {
    status.textContent = "Please choose an image.";
    return;
  }

  status.textContent = "Processing image...";

  const image = new Image();

  image.onload = function () {
    /* Keep the original image resolution. */
    originalCanvas.width = image.width;
    originalCanvas.height = image.height;
    resultCanvas.width = image.width;
    resultCanvas.height = image.height;

    /* Draw original image. */
    originalContext.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    originalContext.imageSmoothingEnabled = false;
    originalContext.drawImage(image, 0, 0);

    /* Get all pixels. */
    const imageData = originalContext.getImageData(0, 0, image.width, image.height);
    const pixels = imageData.data;

    /* Process every pixel.
       pixels is arranged like:
       R G B A R G B A R G B A ...
    */
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      /* Keep fully transparent pixels, but flatten anti-aliased edges. */
      const alpha = pixels[i + 3];

      if (alpha === 0) {
        continue;
      }

      /* Find nearest palette color. */
      const color = closestColor(r, g, b);
      pixels[i] = color[0];
      pixels[i + 1] = color[1];
      pixels[i + 2] = color[2];
      pixels[i + 3] = 255;
    }

    /* Put the converted pixels onto the result canvas. */
    resultContext.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    resultContext.putImageData(imageData, 0, 0);
    status.textContent = "Done! Every visible pixel now uses the Beatblock palette.";
    downloadButton.disabled = false;

    /* Free the temporary image URL. */
    URL.revokeObjectURL(image.src);
  };

  image.onerror = function () {
    status.textContent = "Unable to read that image.";
    URL.revokeObjectURL(image.src);
  };

  /* Convert the selected file into a browser-readable image. */
  image.src = URL.createObjectURL(file);
}

imageInput.addEventListener("change", function () {
  const file = imageInput.files[0];

  if (file) {
    processFile(file);
  }
});

uploadBox.addEventListener("dragover", function (event) {
  event.preventDefault();
  uploadBox.classList.add("drag-over");
});

uploadBox.addEventListener("dragleave", function (event) {
  if (!uploadBox.contains(event.relatedTarget)) {
    uploadBox.classList.remove("drag-over");
  }
});

uploadBox.addEventListener("drop", function (event) {
  event.preventDefault();
  event.stopPropagation();
  uploadBox.classList.remove("drag-over");

  const file = event.dataTransfer.files[0];

  if (file) {
    processFile(file);
  }
});

/* Prevent the browser from opening dropped files as a new page. */
document.addEventListener("dragover", function (event) {
  event.preventDefault();
});

document.addEventListener("drop", function (event) {
  event.preventDefault();
});

/* Download the converted image. */
downloadButton.addEventListener("click", function () {
  const link = document.createElement("a");
  link.download = "beatblock-palette.png";
  link.href = resultCanvas.toDataURL("image/png");
  link.click();
});
