const MAX_CANVAS_AREA = 268000000;

const loadImage = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load captured image."));
    image.src = dataUrl;
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type !== "STITCH_SCREENSHOTS") {
      return;
    }

    try {
      const {
        totalWidth,
        totalHeight,
        viewportWidth,
        captures,
        overlapPx = 8,
      } = message.payload;

      if (!captures || captures.length === 0) {
        throw new Error("No captures were provided.");
      }

      const firstImage = await loadImage(captures[0].dataUrl);
      const scale = firstImage.width / viewportWidth;

      let canvasWidth = Math.floor(totalWidth * scale);
      let canvasHeight = Math.floor(totalHeight * scale);

      const canvasArea = canvasWidth * canvasHeight;

      if (canvasArea > MAX_CANVAS_AREA) {
        const shrinkRatio = Math.sqrt(MAX_CANVAS_AREA / canvasArea);
        canvasWidth = Math.max(1, Math.floor(canvasWidth * shrinkRatio));
        canvasHeight = Math.max(1, Math.floor(canvasHeight * shrinkRatio));
      }

      const outputScaleX = canvasWidth / (totalWidth * scale);
      const outputScaleY = canvasHeight / (totalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Failed to create canvas context.");
      }

      context.imageSmoothingEnabled = false;

      const overlapScaled = Math.max(1, Math.round(overlapPx * scale));

      for (let index = 0; index < captures.length; index += 1) {
        const capture = captures[index];
        const image =
          index === 0 ? firstImage : await loadImage(capture.dataUrl);

        const isFirst = index === 0;
        const sourceX = 0;
        const sourceY = isFirst ? 0 : overlapScaled;
        const sourceWidth = image.width;

        const scaledCaptureTop = capture.y * scale;
        const scaledSourceTop =
          scaledCaptureTop + (isFirst ? 0 : overlapScaled);
        const scaledRemainingHeight = Math.max(
          1,
          totalHeight * scale - scaledSourceTop
        );
        const maxAvailableHeight = Math.max(1, image.height - sourceY);

        const sourceHeight = Math.max(
          1,
          Math.min(maxAvailableHeight, Math.ceil(scaledRemainingHeight))
        );

        const destinationX = 0;
        const destinationY = Math.floor(scaledSourceTop * outputScaleY);
        const destinationWidth = Math.ceil(sourceWidth * outputScaleX);
        const maxDestinationHeight = canvas.height - destinationY;

        const destinationHeight = Math.max(
          1,
          Math.min(maxDestinationHeight, Math.ceil(sourceHeight * outputScaleY))
        );

        if (destinationY >= canvas.height || destinationHeight <= 0) {
          continue;
        }

        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          destinationX,
          destinationY,
          destinationWidth,
          destinationHeight
        );
      }

      sendResponse({
        ok: true,
        dataUrl: canvas.toDataURL("image/png"),
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  return true;
});
