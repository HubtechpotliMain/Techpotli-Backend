import { AbstractFileProviderService, MedusaError } from "@medusajs/framework/utils"
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

type R2FileServiceEnv = {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  endpoint: string
  publicUrl: string
}

function normalizeEnvKey(key: string): string {
  // Handles BOM / zero-width and trailing spaces that can happen in Windows-edited files.
  return key.replace(/^\uFEFF/, "").trim()
}

function getEnvValue(name: string): string | undefined {
  const direct = process.env[name]
  if (direct !== undefined) return direct

  const matchKey = Object.keys(process.env).find((k) => normalizeEnvKey(k) === name)
  if (!matchKey) return undefined

  return process.env[matchKey]
}

function loadEnv(): R2FileServiceEnv {
  const accessKeyId = getEnvValue("R2_ACCESS_KEY_ID")
  const secretAccessKey = getEnvValue("R2_SECRET_ACCESS_KEY")
  const bucket = getEnvValue("R2_BUCKET")
  const endpoint = getEnvValue("R2_ENDPOINT")
  const publicUrl = getEnvValue("R2_PUBLIC_URL")

  if (!accessKeyId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "R2_ACCESS_KEY_ID is required for R2 file provider"
    )
  }

  if (!secretAccessKey) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "R2_SECRET_ACCESS_KEY is required for R2 file provider"
    )
  }

  if (!bucket) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "R2_BUCKET is required for R2 file provider"
    )
  }

  if (!endpoint) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "R2_ENDPOINT is required for R2 file provider"
    )
  }

  if (!publicUrl) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "R2_PUBLIC_URL is required for R2 file provider"
    )
  }

  return {
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint,
    publicUrl: publicUrl.replace(/\/$/, ""),
  }
}

class R2FileService extends AbstractFileProviderService {
  static identifier = "r2"

  protected client: S3Client
  protected bucket: string
  protected publicUrl: string
  protected logger?: any

  constructor({ logger }: { logger: any }) {
    super()

    this.logger = logger

    const { accessKeyId, secretAccessKey, bucket, endpoint, publicUrl } = loadEnv()

    this.bucket = bucket
    this.publicUrl = publicUrl

    this.logger?.info?.("[r2-file-provider] Initialized Cloudflare R2 client", {
      endpoint,
      bucket,
      publicUrl: this.publicUrl,
    })

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  /**
   * Upload a file to Cloudflare R2.
   * Returns a PUBLIC URL such as: https://pub-xxxx.r2.dev/<filename>
   */
  async upload(file: any): Promise<{ key: string; url: string }> {
    if (!file) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No file provided")
    }

    // Ensure we always have a filename – different callers may use different props
    file.filename =
      file.filename ||
      file.originalname ||
      file.name ||
      `file-${Date.now()}`

    if (!file.filename) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "No filename provided")
    }

    const key = this.getFileKey(file)

    let fileBuffer: Buffer
    try {
      if (Buffer.isBuffer(file.content)) {
        fileBuffer = file.content
      } else if (typeof file.content === "string") {
        // Medusa sends file content as base64 string
        fileBuffer = Buffer.from(file.content, "base64")
      } else {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Invalid file content type: ${typeof file.content}. Expected Buffer or string.`
        )
      }
    } catch (error) {
      this.logger?.error(`Failed to process file content:`, {
        error: error instanceof Error ? error.message : String(error),
        filename: file.filename,
        contentType: typeof file.content,
      })
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to process file content: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "File buffer is empty"
      )
    }

    const contentType = file.contentType || "application/octet-stream"

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
        })
      )
    } catch (error) {
      this.logger?.error(`R2 upload exception:`, {
        error: error instanceof Error ? error.message : String(error),
        key,
        bucket: this.bucket,
      })

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Cloudflare R2 upload failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    const url = `${this.publicUrl}/${encodeURIComponent(key)}`

    this.logger?.info?.("[r2-file-provider] Uploaded file to R2", {
      key,
      bucket: this.bucket,
      url,
      contentType,
      size: fileBuffer.length,
    })

    // Return EXACTLY this format - Medusa requires both key and url
    return {
      key,
      url,
    }
  }

  /**
   * Delete a file from Cloudflare R2.
   */
  async delete(file: any): Promise<void> {
    const key = this.getFileKey(file)

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      )
    } catch (error) {
      // Ignore not-found errors; R2 S3-compatible errors use generic messages/status codes,
      // so we treat all errors as non-fatal for idempotency after best-effort logging.
      this.logger?.error?.(`R2 delete exception:`, {
        error: error instanceof Error ? error.message : String(error),
        key,
        bucket: this.bucket,
      })
    }
  }

  /**
   * Generate a unique file key/path for the file.
   * Mirrors the Supabase provider's behavior so product images keep a clean structure.
   */
  protected getFileKey(file: any): string {
    // If file already has a URL, try to extract the key from it.
    if (file.url) {
      try {
        const url = new URL(file.url)
        // Remove leading slash
        return decodeURIComponent(url.pathname.replace(/^\//, ""))
      } catch {
        // fall through to generated key
      }
    }

    // Use file ID if available, otherwise generate a unique path
    if (file.id) {
      // Extract extension from filename
      const extension = file.filename?.split(".").pop() || ""
      return `${file.id}${extension ? "." + extension : ""}`
    }

    // Format: {sanitized-filename}-{timestamp}-{random}.{extension}
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const filename = file.filename || `file-${timestamp}`

    // Extract name and extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "")
    const extension = filename.includes(".") ? filename.split(".").pop() : ""

    // Sanitize filename - remove special characters but keep dots and hyphens
    const sanitizedFilename = nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, "_")

    return `${sanitizedFilename}-${timestamp}-${random}${extension ? "." + extension : ""}`
  }
}

export { R2FileService }
export default R2FileService

