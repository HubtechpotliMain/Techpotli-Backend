import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import busboy from "busboy"

/**
 * POST /admin/hero-banners/upload
 * Upload hero banner image to R2 storage via Medusa File module
 * 
 * Uses Medusa File-module-native upload flow (same pattern as Admin extensions):
 * - Resolves Modules.FILE service from container
 * - Uses createFiles() method which routes to configured R2 provider
 * - Returns file URL compatible with hero banner image_url field
 * 
 * This route is isolated and does not affect other Medusa file operations.
 * 
 * Expects multipart/form-data with a 'file' field
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const fileModuleService = req.scope.resolve(Modules.FILE)

      const contentType = req.headers["content-type"] || ""
      if (!contentType.includes("multipart/form-data")) {
        res.status(400).json({
          message: "Content-Type must be multipart/form-data",
        })
        resolve()
        return
      }

      // Parse multipart/form-data using busboy
      const bb = busboy({ headers: req.headers })
      let fileData: Buffer | null = null
      let fileName: string | null = null
      let fileMimeType: string | null = null

      bb.on("file", (name, file, info) => {
        if (name === "file") {
          fileName = info.filename
          fileMimeType = info.mimeType
          const chunks: Buffer[] = []

          file.on("data", (chunk: Buffer) => {
            chunks.push(chunk)
          })

          file.on("end", () => {
            fileData = Buffer.concat(chunks)
          })
        } else {
          file.resume()
        }
      })

      bb.on("finish", async () => {
        try {
          if (!fileData || !fileName) {
            res.status(400).json({
              message: "No file provided. Please upload a file with field name 'file'",
            })
            resolve()
            return
          }

          // Validate file size (max 10MB)
          const maxSize = 10 * 1024 * 1024
          if (fileData.length > maxSize) {
            res.status(400).json({
              message: "File size exceeds maximum allowed size of 10MB",
            })
            resolve()
            return
          }

          if (fileData.length === 0) {
            res.status(400).json({
              message: "File is empty",
            })
            resolve()
            return
          }

          // Prepare file object for Medusa File module
          const fileForUpload = {
            filename: fileName || `hero-banner-${Date.now()}.jpg`,
            content: fileData,
            contentType: fileMimeType || "image/jpeg",
          }

          // Upload via Medusa File module
          // createFiles accepts a single file DTO or an array of DTOs.
          // We pass a single file DTO and rely on the overloaded signature.
          const uploadResult = await fileModuleService.createFiles(fileForUpload)

          // When a single DTO is passed, createFiles returns a single FileDTO
          if (!uploadResult) {
            res.status(500).json({
              message: "File upload failed - no result returned",
            })
            resolve()
            return
          }

          const uploaded = uploadResult

          res.json({
            url: uploaded.url,
            key: uploaded.key || uploaded.id,
          })
          resolve()
        } catch (error) {
          console.error("Hero banner upload error:", error)
          res.status(500).json({
            message: "Failed to upload image",
            error: error instanceof Error ? error.message : String(error),
          })
          resolve()
        }
      })

      bb.on("error", (error) => {
        console.error("Busboy error:", error)
        res.status(400).json({
          message: "Failed to parse form data",
          error: error instanceof Error ? error.message : String(error),
        })
        resolve()
      })

      // Pipe the request to busboy
      // Medusa's request extends Node.js IncomingMessage, so it should be pipeable
      if (req instanceof require("stream").Readable || typeof (req as any).pipe === "function") {
        (req as any).pipe(bb)
      } else {
        // Fallback: try to access raw request
        const rawReq = (req as any).raw || (req as any).req || req
        if (rawReq && typeof rawReq.pipe === "function") {
          rawReq.pipe(bb)
        } else {
          res.status(500).json({
            message: "Request stream not available. Please ensure Content-Type is multipart/form-data.",
          })
          resolve()
        }
      }
    } catch (error) {
      console.error("Hero banner upload setup error:", error)
      res.status(500).json({
        message: "Failed to process upload",
        error: error instanceof Error ? error.message : String(error),
      })
      resolve()
    }
  })
}
