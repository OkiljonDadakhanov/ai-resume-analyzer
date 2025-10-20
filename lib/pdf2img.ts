export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  isLoading = true;
  loadPromise = Promise.race([
    import("pdfjs-dist/build/pdf.mjs").then((lib) => {
      try {
        // Set the worker source to use CDN with matching version
        lib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs";
        
        // Additional configuration for better compatibility
        lib.GlobalWorkerOptions.workerPort = null;
        
        pdfjsLib = lib;
        isLoading = false;
        console.log("PDF.js library initialized successfully");
        return lib;
      } catch (error) {
        console.error("Error setting up PDF.js worker:", error);
        isLoading = false;
        throw error;
      }
    }),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error("PDF.js loading timeout")), 10000)
    )
  ]).catch((error) => {
    console.error("Error loading PDF.js:", error);
    isLoading = false;
    throw error;
  });

  return loadPromise;
}

export async function convertPdfToImage(
  file: File
): Promise<PdfConversionResult> {
  try {
    console.log("Starting PDF conversion for file:", file.name);
    
    // Validate file type
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error("File is not a PDF");
    }
    
    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("File size exceeds 20MB limit");
    }
    
    const lib = await loadPdfJs();
    console.log("PDF.js library loaded successfully");

    const arrayBuffer = await file.arrayBuffer();
    console.log("File converted to ArrayBuffer, size:", arrayBuffer.byteLength);
    
    const pdf = await lib.getDocument({ 
      data: arrayBuffer,
      useSystemFonts: true,
      disableFontFace: false,
      disableRange: false,
      disableStream: false
    }).promise;
    console.log("PDF document loaded, pages:", pdf.numPages);
    
    if (pdf.numPages === 0) {
      throw new Error("PDF has no pages");
    }
    
    const page = await pdf.getPage(1);
    console.log("First page loaded");

    const viewport = page.getViewport({ scale: 4 });
    console.log("Viewport created:", viewport.width, "x", viewport.height);
    
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed to get 2D context from canvas");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    console.log("Starting page render...");
    const renderTask = page.render({ 
      canvasContext: context, 
      viewport,
      intent: 'display'
    });
    await renderTask.promise;
    console.log("Page render completed");

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log("Image blob created successfully, size:", blob.size);
            // Create a File from the blob with the same name as the pdf
            const originalName = file.name.replace(/\.pdf$/i, "");
            const imageFile = new File([blob], `${originalName}.png`, {
              type: "image/png",
            });

            resolve({
              imageUrl: URL.createObjectURL(blob),
              file: imageFile,
            });
          } else {
            console.error("Failed to create image blob");
            resolve({
              imageUrl: "",
              file: null,
              error: "Failed to create image blob from canvas",
            });
          }
        },
        "image/png",
        1.0
      ); // Set quality to maximum (1.0)
    });
  } catch (err) {
    console.error("PDF conversion error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      imageUrl: "",
      file: null,
      error: `Failed to convert PDF: ${errorMessage}`,
    };
  }
}