import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { R2FileService } from "./service"

const services = [R2FileService]

export default ModuleProvider(Modules.FILE, {
  services,
})

